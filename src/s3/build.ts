import {buildForS3} from './buildCommon.js';

const argv = process.argv;
const typescript: boolean = argv.includes('--typescript');

buildForS3({typescript});
