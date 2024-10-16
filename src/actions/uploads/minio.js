import {
  startPeriodicUpload,
  uploadOutputToMinio,
} from '../../helper/minio.js';
import * as dotenv from 'dotenv';
dotenv.config();

const OutputDirectory = process.env.MINIO_BUCKET_NAME || './output';

/**
 * One time upload of the output directory to Minio
 */
export async function runOneTimeUpload() {
  await uploadOutputToMinio(OutputDirectory);
}

/**
 * Start a backup process that uploads the output directory to Minio at a specified interval
 */
export function startBackupProcess() {
  const intervalMinutes = process.env.BACKUP_INTERVAL; // Upload every hour
  startPeriodicUpload(OutputDirectory, intervalMinutes);
}
