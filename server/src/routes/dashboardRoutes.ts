import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, getDashboard);

export default router;
