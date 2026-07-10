import { Router } from 'express';
import {
  listPublicVideos,
  getPublicVideo,
  listAdminVideos,
  getAdminVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  publishVideo,
  toggleFeatured,
  toggleTrending,
} from '../controllers/videoController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// ── Public routes (no auth) ──────────────────────────────────────────────────
router.get('/public', listPublicVideos);
router.get('/public/:slug', getPublicVideo);

// ── Admin routes (require admin JWT) ────────────────────────────────────────
router.get('/', requireAdmin, listAdminVideos);
router.get('/:id', requireAdmin, getAdminVideo);
router.post('/', requireAdmin, createVideo);
router.put('/:id', requireAdmin, updateVideo);
router.delete('/:id', requireAdmin, deleteVideo);
router.patch('/:id/publish', requireAdmin, publishVideo);
router.patch('/:id/featured', requireAdmin, toggleFeatured);
router.patch('/:id/trending', requireAdmin, toggleTrending);

export default router;
