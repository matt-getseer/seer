import express, { Request, Response } from 'express';
import { PrismaClient, Prisma, User, UserRole } from '@prisma/client';
import { authenticate, extractUserInfo } from '../middleware/auth';
import { getAccessibleTeams } from '../../src/services/accessControlService';

// Define AuthenticatedRequest interface
interface AuthenticatedRequest extends Request {
  user?: {
    clerkId?: string;
    userId?: number;
    email?: string;
    iat?: number;
    exp?: number;
  };
  auth?: {
    userId: string;
    sessionId: string;
  };
}

// Add types for Team and Interview near the top of the file
interface Team {
  id: number;
  name: string;
  department: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  employees: any[];
  [key: string]: any; // To allow adding interviewCount
}

const router = express.Router();
const prisma = new PrismaClient();

// Use type assertion to make TypeScript happy with the prisma client
// This is a workaround for the type error with prisma.team
const typedPrismaClient = prisma as any;

// Debug route to check if teams endpoint is accessible
const debugHandler = async (req: Request, res: Response): Promise<void> => {
  console.log('Debug endpoint accessed');
  res.status(200).json({ message: 'Teams endpoint is accessible' });
};

// Get all teams
const getAllTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('GET /teams - Headers:', req.headers);
    console.log('GET /teams - Auth:', req.auth);
    console.log('GET /teams - User:', req.user);
    
    if (!req.user?.userId) {
      console.log('No userId found in the request');
      res.status(401).json({ error: 'User not authenticated properly' });
      return;
    }
    
    console.log(`Fetching full user object for ID: ${req.user.userId}`);
    const currentUser = await typedPrismaClient.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!currentUser) {
      console.log(`User with ID ${req.user.userId} not found in database`);
      res.status(404).json({ error: 'User not found for access control' });
      return;
    }
    
    console.log(`Fetching teams for user ID: ${currentUser.id} with role: ${currentUser.role}`);
    
    // Test database connection
    try {
      await typedPrismaClient.$connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      res.status(500).json({ error: 'Database connection failed' });
      return;
    }

    // First, verify the user exists
    const user = await typedPrismaClient.user.findUnique({
      where: {
        id: req.user.userId
      }
    });

    if (!user) {
      console.log(`User with ID ${req.user.userId} not found in database`);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log(`Found user: ${user.email}`);
    
    const teams = await getAccessibleTeams(currentUser);
    
    console.log(`Found ${teams.length} teams for user ${currentUser.id} via access control service`);
    res.json(teams);
  } catch (error) {
    console.error('Error in getAllTeams:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to fetch teams',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  } finally {
    await typedPrismaClient.$disconnect();
  }
};

// Get a specific team
const getTeamById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await typedPrismaClient.team.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user?.userId
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true,
            startDate: true
          }
        }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json(team);
  } catch {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

// Update a team
const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, department } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const team = await typedPrismaClient.team.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      },
      data: {
        name,
        department
      }
    });

    if (team.count === 0) {
      res.status(404).json({ error: 'Team not found or unauthorized' });
      return;
    }

    const updatedTeam = await typedPrismaClient.team.findFirst({
      where: {
        id: parseInt(id)
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true,
            startDate: true
          }
        }
      }
    });

    res.json(updatedTeam);
  } catch {
    res.status(500).json({ error: 'Failed to update team' });
  }
};

// Delete a team
const deleteTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const team = await typedPrismaClient.team.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      }
    });

    if (team.count === 0) {
      res.status(404).json({ error: 'Team not found or unauthorized' });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

// Get teams managed by a specific manager ID (Admin only)
const getTeamsByManagerId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated properly' });
      return;
    }

    // Fetch the current user from DB to check their role
    const currentUser = await typedPrismaClient.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!currentUser) {
      res.status(404).json({ error: 'Authenticated user not found' });
      return;
    }

    // Check if the current user is an ADMIN
    if (currentUser.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Only admins can access this resource.' });
      return;
    }

    const { managerId } = req.params;
    if (!managerId || isNaN(parseInt(managerId))) {
      res.status(400).json({ error: 'Invalid manager ID provided.' });
      return;
    }

    const teams = await typedPrismaClient.team.findMany({
      where: {
        userId: parseInt(managerId) // Assuming Team.userId is the manager of the team
      },
      select: {
        id: true,
        name: true,
        department: true,
        // Add other team fields you might want to display in the modal
      }
    });

    if (!teams) {
      // findMany returns an array, so it will be an empty array if no teams are found, not null/undefined.
      // This check might be redundant if an empty array is an acceptable response.
      res.status(404).json({ error: 'No teams found for this manager or manager does not exist.' });
      return;
    }

    res.json(teams);
  } catch (error) {
    console.error('Error in getTeamsByManagerId:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to fetch teams for manager',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  } finally {
    // Disconnecting the client might not be necessary here if it's managed globally
    // await typedPrismaClient.$disconnect(); 
  }
};

// Get all teams suitable for selection (Admin only)
const getAllSelectableTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated properly' });
      return;
    }

    // Fetch the current user from DB to check their role
    const currentUser = await typedPrismaClient.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!currentUser) {
      res.status(404).json({ error: 'Authenticated user not found' });
      return;
    }

    // Check if the current user is an ADMIN
    if (currentUser.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Only admins can access this resource.' });
      return;
    }

    const teams = await typedPrismaClient.team.findMany({
      select: {
        id: true,
        name: true,
        department: true, // Included department for potentially better context in selection
        userId: true, // Include current manager ID, could be useful for the frontend
      },
      orderBy: {
        name: 'asc' // Order by team name, ascending
      }
    });

    res.json(teams);
  } catch (error) {
    console.error('Error in getAllSelectableTeams:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to fetch selectable teams',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Assign a manager to a team or assign to current admin if managerIdToAssign is null (Admin only)
const assignManagerToTeam = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }

    const adminUserId = req.user.userId; // ID of the admin making the request

    // Verify the requesting user is an ADMIN
    const requestingAdmin = await typedPrismaClient.user.findUnique({
      where: { id: adminUserId },
      select: { role: true }
    });

    if (!requestingAdmin || requestingAdmin.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can assign managers to teams.' });
    }

    const { teamId } = req.params;
    const { managerIdToAssign } = req.body; // Expects { managerIdToAssign: number | null }

    if (!teamId || isNaN(parseInt(teamId))) {
      return res.status(400).json({ error: 'Invalid team ID provided.' });
    }
    const numericTeamId = parseInt(teamId);

    let finalUserIdToAssign: number;

    if (managerIdToAssign === null) {
      // Assign to the admin making the request
      finalUserIdToAssign = adminUserId;
    } else if (typeof managerIdToAssign === 'number') {
      // Verify the provided managerIdToAssign is a valid user with MANAGER role
      const targetManager = await typedPrismaClient.user.findUnique({
        where: { id: managerIdToAssign },
        select: { role: true, id: true }
      });
      if (!targetManager) {
        return res.status(404).json({ error: 'Specified manager to assign not found.' });
      }
      if (targetManager.role !== UserRole.MANAGER) {
        return res.status(400).json({ error: 'Specified user is not a manager.' });
      }
      finalUserIdToAssign = targetManager.id;
    } else {
      return res.status(400).json({ error: 'Invalid managerIdToAssign value. Must be a user ID (number) or null.' });
    }

    // Update the team with the new managerId
    const updatedTeam = await typedPrismaClient.team.update({
      where: { id: numericTeamId },
      data: { userId: finalUserIdToAssign },
      select: { id: true, name: true, userId: true } // Return some confirmation data
    });

    if (!updatedTeam) {
        // Should not happen if teamId is valid, but as a safeguard
        return res.status(404).json({ error: 'Team not found or update failed.' });
    }

    res.json({ message: `Team '${updatedTeam.name}' successfully assigned.`, team: updatedTeam });

  } catch (error) {
    console.error('Error in assignManagerToTeam:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // Record to update not found
            return res.status(404).json({ error: 'Team not found for assignment.' });
        }
    }
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to assign manager to team',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Register routes
router.get('/debug', debugHandler);
router.get('/', authenticate, extractUserInfo, getAllTeams);
router.get('/selectable', authenticate, extractUserInfo, getAllSelectableTeams);
router.get('/managed-by/:managerId', authenticate, extractUserInfo, getTeamsByManagerId);
router.put('/:teamId/assign-manager', authenticate, extractUserInfo, assignManagerToTeam);
router.get('/:id', authenticate, extractUserInfo, getTeamById);
router.put('/:id', authenticate, extractUserInfo, updateTeam);
router.delete('/:id', authenticate, extractUserInfo, deleteTeam);

export default router; 