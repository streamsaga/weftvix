import { Request, Response } from 'express';
import { Video } from '../models/Video';
import { Genre } from '../models/Genre';
import { Category } from '../models/Category';
import { asyncHandler } from '../utils/asyncHandler';

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalVideos,
    publishedVideos,
    draftVideos,
    totalGenres,
    totalCategories,
    recentVideos,
    topVideos,
  ] = await Promise.all([
    Video.countDocuments(),
    Video.countDocuments({ status: 'published' }),
    Video.countDocuments({ status: 'draft' }),
    Genre.countDocuments(),
    Category.countDocuments(),
    Video.find().sort({ createdAt: -1 }).limit(5).select('title status poster createdAt views'),
    Video.find({ status: 'published' }).sort({ views: -1 }).limit(5).select('title views poster'),
  ]);

  const totalViews = await Video.aggregate([
    { $group: { _id: null, total: { $sum: '$views' } } },
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalVideos,
        publishedVideos,
        draftVideos,
        totalGenres,
        totalCategories,
        totalViews: totalViews[0]?.total || 0,
      },
      recentVideos,
      topVideos,
    },
  });
});
