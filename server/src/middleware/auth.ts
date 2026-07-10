import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError';

export interface AdminRequest extends Request {
  admin?: { id: string; email: string };
}

export function requireAdmin(req: AdminRequest, _res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.adminToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) throw new ApiError(401, 'Authentication required');

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new ApiError(500, 'JWT secret not configured');

    const payload = jwt.verify(token, secret) as { id: string; email: string };
    req.admin = payload;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Invalid or expired token'));
  }
}
