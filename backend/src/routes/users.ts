import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
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
  updatedAt: true,
  role: true
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
      // Select necessary fields including tokens to check auth status
      select: {
        id: true,
        email: true,
        name: true,
        clerkId: true,
        createdAt: true,
        updatedAt: true,
        googleRefreshToken: true, // For Google Auth check
        zoomRefreshToken: true,   // For Zoom Auth check
        role: true
      } as any, // Use 'as any' carefully or define a more specific type
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine auth statuses based on token presence
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      clerkId: user.clerkId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasGoogleAuth: !!user.googleRefreshToken,
      hasZoomAuth: !!user.zoomRefreshToken, // Check for Zoom token presence
      role: user.role
    };
    // Note: We don't need to explicitly delete the tokens here 
    // because they are not included in the final userData object structure.

    res.json(userData);
  } catch (error) {
    next(error);
  }
};

// New handler to get all managers (Admin only)
const getAllManagers: RequestHandler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Ensure user is authenticated and user info is extracted
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch the current user from DB to check their role
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!currentUser) {
      // This should ideally not happen if authentication middleware is effective
      return res.status(404).json({ error: 'Authenticated user not found' });
    }

    // Check if the current user is an ADMIN
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can access the list of managers.' });
    }

    // Fetch users with the MANAGER role
    const managers = await prisma.user.findMany({
      where: {
        role: UserRole.MANAGER
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    res.json(managers);
  } catch (error) {
    next(error);
  }
};

// Route handlers - protected by Clerk authentication
router.get('/me', authenticate, extractUserInfo, getCurrentUser);
router.get('/managers', authenticate, extractUserInfo, getAllManagers);
router.get('/:id', authenticate, extractUserInfo, getUserById);
// Admin-only endpoint
router.get('/', authenticate, extractUserInfo, getAllUsers);

export { router as userRouter }; 