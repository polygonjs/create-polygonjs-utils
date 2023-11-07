import 'dotenv/config';
import {fromEnv} from '@aws-sdk/credential-providers';
import {S3Client} from '@aws-sdk/client-s3';

const EXPORT_FOLDER = 'dist';
const region = process.env.AWS_REGION;
const bucketName = process.env.BUCKET_NAME;
const bucketFolder = process.env.BUCKET_FOLDER;
const sceneName = process.env.SCENE_NAME;
const version = process.env.VERSION;

const baseUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${bucketFolder}/${sceneName}/v${version}`;

function createS3Client() {
	const s3Client = new S3Client({
		credentials: fromEnv(),
	});
	return s3Client;
}

export {EXPORT_FOLDER, region, bucketName, bucketFolder, sceneName, version, baseUrl, createS3Client};
