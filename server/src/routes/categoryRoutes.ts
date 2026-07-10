import { Router } from 'express';
import { listCategories, createCategory, deleteCategory } from '../controllers/categoryController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listCategories); // public
router.post('/', requireAdmin, createCategory);
router.delete('/:id', requireAdmin, deleteCategory);

export default router;
