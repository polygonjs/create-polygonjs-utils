import {rimraf} from 'rimraf';

const pathsToRemove = ['dist/polygonjs/backup'];

// Function to remove a path using rimraf
function removePath(path: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const result = await rimraf(path);
		if (!result) {
			console.error(`Error removing the path ${path}:`, result);
			return reject(result);
		}
		console.log(`Successfully removed ${path}`);
		resolve();
	});
}

// Function to remove all paths in the array
async function removeAllPaths(paths: string[]) {
	return await Promise.all(paths.map(removePath));
}

export async function cleanBuild() {
	// Execute the path removals
	await removeAllPaths(pathsToRemove).catch((/*err*/) => {
		process.exit(1); // Exit with a failure code if any path removal fails
	});
}
