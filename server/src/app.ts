import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { apiLimiter } from './middleware/rateLimiter';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

import authRoutes from './routes/authRoutes';
import videoRoutes from './routes/videoRoutes';
import uploadRoutes from './routes/uploadRoutes';
import streamRoutes from './routes/streamRoutes';
import genreRoutes from './routes/genreRoutes';
import categoryRoutes from './routes/categoryRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

export function createApp(): Application {
  const app = express();

  // disables ETag generation, which was causing 304s with empty bodies
  app.set('etag', false);

  const rawOrigins = [
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
  ].filter(Boolean) as string[];

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? rawOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    morgan('combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
    })
  );

  app.use('/api', apiLimiter);

  // extra safety net, tells browser/Vercel edge never to cache API responses
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Health check — used by Railway
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Weftvix API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/stream', streamRoutes);
  app.use('/api/genres', genreRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
