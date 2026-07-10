import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { getPresignedUrl, confirmUpload, uploadAsset } from '../controllers/uploadController';
import { requireAdmin } from '../middleware/auth';

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB for server-proxied uploads
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

const router = Router();

// All upload routes require admin auth
router.get('/presigned-url', requireAdmin, getPresignedUrl);
router.post('/confirm', requireAdmin, confirmUpload);
router.post('/asset', requireAdmin, upload.single('file'), uploadAsset);

export default router;
