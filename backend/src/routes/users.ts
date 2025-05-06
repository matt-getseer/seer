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

// Update assigned teams for a manager (Admin only)
const updateManagerAssignedTeams = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can update team assignments.' });
    }

    const { managerId } = req.params;
    const { teamIds } = req.body; // Expecting an array of team IDs, e.g., { teamIds: [1, 2, 3] }

    if (!managerId || isNaN(parseInt(managerId))) {
      return res.status(400).json({ error: 'Invalid manager ID provided.' });
    }
    const numericManagerId = parseInt(managerId);

    if (!Array.isArray(teamIds) || !teamIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ error: 'Invalid team IDs provided. Expecting an array of numbers.' });
    }

    // Ensure the target user is actually a manager (optional, but good practice)
    const managerUser = await prisma.user.findUnique({
      where: { id: numericManagerId },
      select: { role: true }
    });

    if (!managerUser || managerUser.role !== UserRole.MANAGER) {
        // Or if you allow assigning teams to non-managers, this check can be removed/modified
        return res.status(404).json({ error: 'Target user is not a manager or does not exist.'});
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unassign all teams currently managed by this manager ID
      //    This means setting Team.userId to the ID of the admin making the change.
      await tx.team.updateMany({
        where: { userId: numericManagerId },
        data: { userId: req.user!.userId },
      });

      // 2. Assign the new set of teams to this manager ID
      //    This means setting Team.userId to numericManagerId for the provided teamIds.
      if (teamIds.length > 0) {
        await tx.team.updateMany({
          where: {
            id: { in: teamIds },
            // Optionally, add a check to ensure these teams are not already managed by someone else
            // or that they are explicitly being taken over. For now, we allow direct assignment.
          },
          data: { userId: numericManagerId },
        });
      }
    });

    res.json({ message: `Successfully updated team assignments for manager ID ${numericManagerId}.` });

  } catch (error) {
    console.error('Error updating manager team assignments:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // This error code can occur if one of the team IDs in `teamIds` doesn't exist.
        return res.status(404).json({ error: 'One or more specified teams not found.'});
    }
    next(error); // Pass to global error handler
  }
};

// Route handlers - protected by Clerk authentication
router.get('/me', authenticate, extractUserInfo, getCurrentUser);
router.get('/managers', authenticate, extractUserInfo, getAllManagers);
router.put('/:managerId/assigned-teams', authenticate, extractUserInfo, updateManagerAssignedTeams);
router.get('/:id', authenticate, extractUserInfo, getUserById);
// Admin-only endpoint
router.get('/', authenticate, extractUserInfo, getAllUsers);

export { router as userRouter }; 