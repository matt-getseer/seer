import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Define the user select fields based on the Prisma schema
const userSelectFields = {
  id: true,
  email: true,
  name: true,
  clerkId: true,
  createdAt: true,
  updatedAt: true
} as const;

// Get all users
const getAllUsers: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelectFields
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getUserById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Only allow admins or the user themselves to access user data
    if (req.user?.userId !== Number(id)) {
      return res.status(403).json({ error: 'Not authorized to access this user data' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: userSelectFields
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Get the current authenticated user
const getCurrentUser = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        clerkId: true,
        createdAt: true,
        updatedAt: true,
        googleRefreshToken: true,
      } as any,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = {
      ...user,
      hasGoogleAuth: !!(user as any).googleRefreshToken
    };
    delete (userData as any).googleRefreshToken;

    res.json(userData);
  } catch (error) {
    next(error);
  }
};

// Route handlers - protected by Clerk authentication
router.get('/me', authenticate, extractUserInfo, getCurrentUser);
router.get('/:id', authenticate, extractUserInfo, getUserById);
// Admin-only endpoint
router.get('/', authenticate, extractUserInfo, getAllUsers);

export { router as userRouter }; 