import { Request, Response } from 'express';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  region: 'auto',
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET || 'vid';

/**
 * Proxy endpoint: streams R2 objects with HTTP Range support for seeking.
 * Only needed when R2_PUBLIC_URL is not set (private bucket).
 */
export const streamR2 = asyncHandler(async (req: Request, res: Response) => {
  let key = req.params[0] || '';
  try { key = decodeURIComponent(key); } catch { /* use raw key */ }
  if (!key) throw new ApiError(400, 'File key is required');

  const range = req.headers.range;

  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    const fileSize = head.ContentLength || 0;
    const contentType = head.ContentType || 'application/octet-stream';

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      }

      const r2 = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: `bytes=${start}-${end}` })
      );
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      });
      (r2.Body as Readable).pipe(res);
    } else {
      const r2 = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      });
      (r2.Body as Readable).pipe(res);
    }
  } catch (err: any) {
    throw new ApiError(404, `Not found in R2: ${key}`);
  }
});
