import 'dotenv/config';
import * as fs from 'fs';
import {spawn} from 'child_process';
import {baseUrl} from './common.js';
import {uploadToS3} from './uploadCommon.js';
import {cleanBuild} from '../cleanBuildCommon.js';

interface CmdWithArgs {
	cmd: string;
	args: string[];
}

const npm_execpath = process.env.npm_execpath;
const packageManager = npm_execpath ? (/yarn/.test(npm_execpath) ? 'yarn' : 'npm') : 'yarn';

function prefixCommandByPackageManager(cmdWithArgs: CmdWithArgs): CmdWithArgs {
	switch (packageManager) {
		case 'yarn': {
			const args: string[] = [cmdWithArgs.cmd, ...cmdWithArgs.args];
			const cmd = `yarn`;
			return {cmd, args};
		}
		case 'npm': {
			const args: string[] = ['run', cmdWithArgs.cmd, ...cmdWithArgs.args];
			const cmd = `npm`;
			return {cmd, args};
		}
	}
}

const VITE_CONFIG = `
import {defineConfig, PluginOption} from 'vite';
// import {visualizer} from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import BASE_CONFIG from './vite.config';

// https://vitejs.dev/config/
export default defineConfig({
	...BASE_CONFIG,
	build: {
		manifest: true,
		rollupOptions: {
			output: {
				entryFileNames: \`assets/[name].js\`,
				chunkFileNames: \`assets/[name].js\`,
				assetFileNames: \`assets/[name].[ext]\`,
			},
		},
	},
});
`;

async function executeCommand(command: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const spawnedProcess = spawn(command, args, {stdio: 'inherit', shell: true});

		spawnedProcess.on('error', (error) => {
			reject(error);
		});

		spawnedProcess.on('close', (/*code:number|null*/) => {
			resolve();
		});
	});
}

interface BuildForS3Options {
	typescript: boolean;
}
export async function buildForS3(options: BuildForS3Options) {
	// write config
	const s3ConfigFileName = `vite.config.s3.ts`;
	fs.writeFileSync(s3ConfigFileName, VITE_CONFIG);

	// build
	const cmdsWithArgs: CmdWithArgs[] = [];
	if (options.typescript) {
		cmdsWithArgs.push({cmd: `tsc`, args: []});
	}
	cmdsWithArgs.push({cmd: `vite`, args: ['build', '--base', baseUrl, '--config', s3ConfigFileName]});

	for (const cmdWithArgs of cmdsWithArgs) {
		const prefixedCmd = prefixCommandByPackageManager(cmdWithArgs);
		await executeCommand(prefixedCmd.cmd, prefixedCmd.args);
	}
	await cleanBuild();
	await uploadToS3();

	// delete config
	fs.rmSync(s3ConfigFileName);
}
