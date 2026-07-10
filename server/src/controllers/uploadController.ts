import { Request, Response } from 'express';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { s3Client, isR2Enabled, buildPublicUrl, createPresignedPutUrl, R2_BUCKET } from '../utils/r2Service';
import { uploadFile } from '../utils/r2Service';

// ─── GET presigned PUT URL for direct browser-to-R2 upload ──────────────────
export const getPresignedUrl = asyncHandler(async (req: Request, res: Response) => {
  const { filename, contentType, kind } = req.query as {
    filename?: string;
    contentType?: string;
    kind?: string;
  };

  if (!filename || !contentType) {
    throw new ApiError(400, 'filename and contentType are required query parameters');
  }

  if (!isR2Enabled() || !s3Client) {
    throw new ApiError(500, 'Cloudflare R2 is not configured');
  }

  const ext = path.extname(filename);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  const folderMap: Record<string, string> = {
    video: 'raw-videos',
    poster: 'posters',
    banner: 'banners',
    trailer: 'trailers',
  };
  const folder = folderMap[kind || ''] || 'misc';
  const key = `${folder}/${unique}${ext}`;

  // Create presigned PUT URL (1-hour expiry)
  const presignedUrl = await createPresignedPutUrl(key, contentType, 3600);

  // Calculate the future public URL for this object
  const publicUrl = buildPublicUrl(key, req.get('host'), req.protocol);

  res.json({
    success: true,
    data: { presignedUrl, key, publicUrl },
  });
});

// ─── POST after upload: confirm and return public URL ───────────────────────
// Used when admin has finished uploading via presigned URL
export const confirmUpload = asyncHandler(async (req: Request, res: Response) => {
  const { key, kind } = req.body as { key?: string; kind?: string };

  if (!key) throw new ApiError(400, 'key is required');

  const publicUrl = buildPublicUrl(key, req.get('host'), req.protocol);

  res.json({
    success: true,
    data: { key, publicUrl, kind },
  });
});

// ─── POST upload image asset directly through server (poster/banner/trailer) ─
// For smaller files where presigned upload isn't strictly needed
export const uploadAsset = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new ApiError(400, 'No file uploaded');

  const ext = path.extname(file.originalname);
  const kind = (req.body.kind || req.query.kind || file.fieldname || 'misc') as string;
  const folderMap: Record<string, string> = {
    video: 'raw-videos',
    poster: 'posters',
    banner: 'banners',
    trailer: 'trailers',
  };
  const folder = folderMap[kind] || 'misc';
  const key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const publicUrl = await uploadFile(file.path, key, file.mimetype);

  res.status(201).json({
    success: true,
    data: { url: publicUrl, key, originalName: file.originalname, size: file.size },
  });
});
