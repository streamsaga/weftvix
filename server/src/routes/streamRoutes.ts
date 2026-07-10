import { Router } from 'express';
import { streamR2 } from '../controllers/streamController';

const router = Router();

// Wildcard route to proxy any R2 key (for private bucket fallback)
router.get('/r2/*', streamR2);

export default router;
