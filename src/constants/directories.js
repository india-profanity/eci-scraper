import * as dotenv from 'dotenv';
dotenv.config();

export const OUTPUT_DIR = process.env.MINIO_BUCKET_NAME || 'output';
