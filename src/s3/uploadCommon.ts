import {PutObjectCommand, PutObjectCommandInput} from '@aws-sdk/client-s3';
import chalk from 'chalk';
import mimeTypes from 'mime-types';
import {EXPORT_FOLDER, bucketName, bucketFolder, sceneName, version, createS3Client, baseUrl} from './common.js';

import * as fs from 'fs';
import * as path from 'path';

const s3Client = createS3Client();

function updateProgress(percent: number) {
	process.stdout.write(`Upload Progress: ${Math.floor(percent)}%\r`);
}
function notifyUploadCompleted(filesCount: number) {
	const indexHtmlUrl = `${baseUrl}/index.html`;
	const embedCode = `<script type="module" crossorigin src="${baseUrl}/assets/index.js"></script>`;

	const output = `
${chalk.green('Upload Completed! (total ' + filesCount + ' files)')}

-- Open Scene:                           ${chalk.green(indexHtmlUrl)}

-- Embed Code (ie: Webflow.com):         ${chalk.green(embedCode)}

`;
	console.log(output);
}

function getContentType(filePath: string) {
	const filePathWithoutCompressionExt = filePath.replace('.gz', '').replace('.br', '');
	if (filePathWithoutCompressionExt.endsWith('.html')) {
		return 'text/html';
	}
	if (filePathWithoutCompressionExt.endsWith('.glsl')) {
		return 'text/plain';
	}
	if (filePathWithoutCompressionExt.endsWith('.js')) {
		return 'text/javascript';
	}
	if (filePathWithoutCompressionExt.endsWith('.css')) {
		return 'text/css';
	}
	if (filePathWithoutCompressionExt.endsWith('.json')) {
		return 'application/json';
	}
	// images and videos are better handled by mime-types
	return mimeTypes.lookup(filePathWithoutCompressionExt) || 'application/octet-stream';
}
function getContentEncoding(filePath: string) {
	if (filePath.endsWith('.gz')) {
		return 'gzip';
	}
	if (filePath.endsWith('.br')) {
		return 'br';
	}
	return undefined;
}

async function uploadFile(filePath: string, relativePath: string): Promise<void> {
	const fileContent = fs.readFileSync(filePath);
	const bucketPath = `${bucketFolder}/${sceneName}/v${version}/${relativePath}`;

	const contentType = getContentType(filePath);
	const contentEncoding = getContentEncoding(filePath);

	if (bucketName == null) {
		console.error('bucket name must not be empty');
		return;
	}

	const params: PutObjectCommandInput = {
		Bucket: bucketName,
		Key: bucketPath,
		Body: fileContent,
		ACL: 'public-read',
		ContentType: contentType,
		ContentEncoding: contentEncoding,
	};

	await s3Client.send(new PutObjectCommand(params));
}

type WalkCallback = (data: FileData) => void;
function walkSync(directoryPath: string, callback: WalkCallback, relativePath = '') {
	const files = fs.readdirSync(directoryPath);
	for (const file of files) {
		const filePath = path.join(directoryPath, file);
		const fileStat = fs.statSync(filePath);

		if (fileStat.isDirectory()) {
			const folderRelativePath = path.join(relativePath, file);
			walkSync(filePath, callback, folderRelativePath);
		} else {
			const fileRelativePath = path.join(relativePath, file);
			callback({filePath, relativePath: fileRelativePath});
		}
	}
}

interface FileData {
	filePath: string;
	relativePath: string;
}
async function _uploadToS3(exportFolder: string) {
	const fileDatas: FileData[] = [];
	walkSync(exportFolder, (data) => {
		fileDatas.push(data);
	});
	let i = 0;
	const totalCount = fileDatas.length;
	for (const data of fileDatas) {
		await uploadFile(data.filePath, data.relativePath);
		updateProgress(100 * (i / totalCount));
		i++;
	}
	notifyUploadCompleted(totalCount);
}

export async function uploadToS3() {
	await _uploadToS3(EXPORT_FOLDER);
}
