import { Router } from 'express';
import { login, logout, getMe } from '../controllers/authController';
import { requireAdmin } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', requireAdmin, logout);
router.get('/me', requireAdmin, getMe);

export default router;
