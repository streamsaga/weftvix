import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import logger from './logger';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || 'vid';
const R2_ENDPOINT =
  process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const isR2Enabled = (): boolean =>
  !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID);

export const s3Client = isR2Enabled()
  ? new S3Client({
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      region: 'auto',
      forcePathStyle: true,
    })
  : null;

/**
 * Build a public-facing URL for an R2 object key.
 * Uses R2_PUBLIC_URL if set, otherwise falls back to the server-proxy path.
 */
export function buildPublicUrl(key: string, host?: string, protocol?: string): string {
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  const encodedKey = key
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${encodedKey}`;
  }
  // Fall back to server-side stream proxy
  return `${protocol || 'https'}://${host || 'localhost:5000'}/api/stream/r2/${encodedKey}`;
}

/**
 * Upload a local file to R2 and return its public URL.
 */
export async function uploadFile(
  localPath: string,
  key: string,
  contentType: string
): Promise<string> {
  if (!s3Client) throw new Error('R2 is not configured');

  const fileStream = fs.createReadStream(localPath);
  const parallelUploads3 = new Upload({
    client: s3Client,
    params: {
      Bucket: R2_BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    },
    queueSize: 4, // Concurrency: 4 simultaneous uploads
    partSize: 5 * 1024 * 1024, // Chunk size: 5MB parts
  });

  await parallelUploads3.done();

  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  logger.info(`Uploaded to R2: ${key}`);
  return buildPublicUrl(key);
}

/**
 * Delete an object from R2 by key.
 */
export async function deleteFile(key: string): Promise<void> {
  if (!s3Client) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  logger.info(`Deleted from R2: ${key}`);
}

/**
 * Generate a presigned PUT URL for direct browser-to-R2 uploads.
 */
export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  if (!s3Client) throw new Error('R2 is not configured');
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export { GetObjectCommand, HeadObjectCommand, R2_BUCKET };
