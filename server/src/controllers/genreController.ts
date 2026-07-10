import { Request, Response } from 'express';
import { Genre } from '../models/Genre';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

function slugify(t: string) {
  return t.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
}

export const listGenres = asyncHandler(async (_req: Request, res: Response) => {
  const genres = await Genre.find().sort({ name: 1 });
  res.json({ success: true, data: genres });
});

export const createGenre = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const genre = await Genre.create({ name: name.trim(), slug: slugify(name) });
  res.status(201).json({ success: true, data: genre });
});

export const deleteGenre = asyncHandler(async (req: Request, res: Response) => {
  await Genre.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Genre deleted' });
});
