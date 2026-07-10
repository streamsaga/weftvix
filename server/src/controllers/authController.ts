import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Admin } from '../models/Admin';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import { AdminRequest } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }

  const { email, password } = parsed.data;
  const admin = await Admin.findOne({ email: email.toLowerCase() });

  if (!admin || !(await admin.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, 'JWT secret not configured');

  const token = jwt.sign(
    { id: admin._id.toString(), email: admin.email },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );

  res.cookie('adminToken', token, COOKIE_OPTIONS);
  res.json({
    success: true,
    data: {
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('adminToken', COOKIE_OPTIONS);
  res.json({ success: true, message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: AdminRequest, res: Response) => {
  const admin = await Admin.findById(req.admin?.id).select('-password');
  if (!admin) throw new ApiError(404, 'Admin not found');
  res.json({ success: true, data: admin });
});
