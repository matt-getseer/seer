import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../services/supabaseService';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'No authentication token provided');
    }

    const isValidToken = await SupabaseService.validateToken(token);
    if (!isValidToken) {
      throw new AppError(401, 'Invalid authentication token');
    }

    const userId = await SupabaseService.getUserId(token);
    if (!userId) {
      throw new AppError(401, 'Unable to get user ID');
    }

    req.userId = userId;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(500, 'Authentication error'));
    }
  }
}; 