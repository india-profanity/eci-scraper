import { Client } from 'minio';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

// Minio client configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT, 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Bucket name where PDFs will be uploaded
const bucketName = process.env.MINIO_BUCKET_NAME;

// Function to ensure the bucket exists
async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
    console.log(chalk.green(`Bucket '${bucketName}' created successfully.`));
  }
}

// Function to check if a file exists in MinIO
export async function fileExistsInMinio(minioPath) {
  try {
    await minioClient.statObject(bucketName, minioPath);
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

// Function to upload a single file if it doesn't exist or has been modified
export async function uploadFileIfNeeded(filePath, minioPath) {
  const stats = fs.statSync(filePath);
  const fileExists = await fileExistsInMinio(minioPath);

  if (
    !fileExists ||
    (fileExists && stats.mtime > (await getMinioFileLastModified(minioPath)))
  ) {
    await minioClient.fPutObject(bucketName, minioPath, filePath);
    console.log(
      chalk.blue(`File '${filePath}' uploaded successfully to '${minioPath}'.`),
    );
  } else {
    console.log(
      chalk.yellow(
        `File '${filePath}' already exists and is up to date in MinIO.`,
      ),
    );
  }
}

// Function to get the last modified time of a file in MinIO
async function getMinioFileLastModified(minioPath) {
  const stat = await minioClient.statObject(bucketName, minioPath);
  return new Date(stat.lastModified);
}

// Function to upload all files in a directory
async function uploadDirectory(directory) {
  await ensureBucketExists();

  const files = fs.readdirSync(directory, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    const relativePath = path.relative(OUTPUT_DIR, fullPath);

    if (file.isDirectory()) {
      await uploadDirectory(fullPath);
    } else {
      await uploadFileIfNeeded(fullPath, relativePath);
    }
  }
}

// Main function to upload the output folder
export async function uploadOutputToMinio(outputDirectory) {
  try {
    await uploadDirectory(outputDirectory);
    console.log(chalk.green('All files uploaded successfully.'));
  } catch (error) {
    console.error(chalk.red('Error uploading files:'), error);
  }
}

// Function to periodically upload the output folder
export function startPeriodicUpload(outputDirectory, intervalMinutes) {
  console.log(
    chalk.cyan(
      `Starting periodic upload of '${outputDirectory}' every ${intervalMinutes} minutes.`,
    ),
  );
  setInterval(() => {
    uploadOutputToMinio(outputDirectory);
  }, intervalMinutes * 60 * 1000);
}
