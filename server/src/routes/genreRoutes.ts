import { Router } from 'express';
import { listGenres, createGenre, deleteGenre } from '../controllers/genreController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listGenres); // public
router.post('/', requireAdmin, createGenre);
router.delete('/:id', requireAdmin, deleteGenre);

export default router;
