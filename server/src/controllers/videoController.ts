import { Request, Response } from 'express';
import { z } from 'zod';
import { Video } from '../models/Video';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { deleteFile } from '../utils/r2Service';

// ─── Helper: slugify ────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Validation schemas ──────────────────────────────────────────────────────
const videoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  releaseYear: z.number().int().optional(),
  duration: z.number().optional(),
  ageRating: z.string().optional(),
  genres: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  director: z.string().optional(),
  poster: z.string().optional(),
  banner: z.string().optional(),
  trailerUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  hlsMasterPlaylistUrl: z.string().optional(),
  qualities: z.array(z.object({ label: z.string(), url: z.string(), bitrate: z.number().optional() })).optional(),
  rawVideoKey: z.string().optional(),
  status: z.enum(['draft', 'published', 'processing']).optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().optional(),
});

// ─── PUBLIC: List published videos ──────────────────────────────────────────
export const listPublicVideos = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const search = (req.query.search as string) || '';
  const genre = req.query.genre as string;
  const category = req.query.category as string;
  const featured = req.query.featured === 'true';
  const trending = req.query.trending === 'true';

  const filter: Record<string, any> = { status: 'published' };
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (genre) filter.genres = genre;
  if (category) filter.categories = category;
  if (featured) filter.isFeatured = true;
  if (trending) filter.isTrending = true;

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .populate('genres', 'name slug')
      .populate('categories', 'name slug')
      .select('-rawVideoKey')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Video.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ─── PUBLIC: Get single video by slug (increments views) ────────────────────
export const getPublicVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findOneAndUpdate(
    { slug: req.params.slug, status: 'published' },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate('genres', 'name slug')
    .populate('categories', 'name slug')
    .select('-rawVideoKey');

  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ success: true, data: video });
});

// ─── ADMIN: List all videos ──────────────────────────────────────────────────
export const listAdminVideos = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const search = (req.query.search as string) || '';
  const status = req.query.status as string;
  const filter: Record<string, any> = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .populate('genres', 'name slug')
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Video.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ─── ADMIN: Get single video by ID ──────────────────────────────────────────
export const getAdminVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findById(req.params.id)
    .populate('genres', 'name slug')
    .populate('categories', 'name slug');
  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ success: true, data: video });
});

// ─── ADMIN: Create video ─────────────────────────────────────────────────────
export const createVideo = asyncHandler(async (req: Request, res: Response) => {
  const parsed = videoSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const data = parsed.data;
  const slug = slugify(data.title) + '-' + Date.now();

  const video = await Video.create({ ...data, slug });
  res.status(201).json({ success: true, data: video });
});

// ─── ADMIN: Update video ─────────────────────────────────────────────────────
export const updateVideo = asyncHandler(async (req: Request, res: Response) => {
  const parsed = videoSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const video = await Video.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ success: true, data: video });
});

// ─── ADMIN: Delete video ─────────────────────────────────────────────────────
export const deleteVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  // Delete raw video from R2 if key exists
  if (video.rawVideoKey) {
    await deleteFile(video.rawVideoKey).catch(() => {});
  }

  await video.deleteOne();
  res.json({ success: true, message: 'Video deleted' });
});

// ─── ADMIN: Toggle publish ────────────────────────────────────────────────────
export const publishVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  video.status = video.status === 'published' ? 'draft' : 'published';
  await video.save();
  res.json({ success: true, data: video });
});

// ─── ADMIN: Toggle featured ───────────────────────────────────────────────────
export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  video.isFeatured = !video.isFeatured;
  await video.save();
  res.json({ success: true, data: video });
});

// ─── ADMIN: Toggle trending ───────────────────────────────────────────────────
export const toggleTrending = asyncHandler(async (req: Request, res: Response) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  video.isTrending = !video.isTrending;
  await video.save();
  res.json({ success: true, data: video });
});
