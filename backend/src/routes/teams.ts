import express, { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, extractUserInfo } from '../middleware/auth';

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

interface Interview {
  id: number;
  name: string;
  team: string;
  interviewName: string;
  dateTaken: Date;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
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
    
    console.log(`Looking for teams for user ID: ${req.user.userId}`);
    
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
    
    const teams = await typedPrismaClient.team.findMany({
      where: {
        userId: req.user.userId
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
    
    // Get all interviews for this user
    const interviews = await typedPrismaClient.interview.findMany({
      where: {
        userId: req.user.userId
      }
    });
    
    // Add interview counts for each employee
    const teamsWithEmployeeInterviewCounts = teams.map((team: Team) => {
      // Process employees to add interview counts
      const employeesWithInterviewCounts = team.employees.map((employee: any) => {
        // Count interviews for this employee by name match
        const interviewCount = interviews.filter((interview: Interview) => 
          interview.name.toLowerCase() === employee.name.toLowerCase()
        ).length;
        
        // Add interview count to employee data
        return {
          ...employee,
          interviewCount
        };
      });
      
      // Return team with updated employees array
      return {
        ...team,
        employees: employeesWithInterviewCounts
      };
    });
    
    console.log(`Found ${teams.length} teams for user ${req.user.userId}`);
    res.json(teamsWithEmployeeInterviewCounts);
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

// Register routes
router.get('/debug', debugHandler);
router.get('/', authenticate, extractUserInfo, getAllTeams);
router.get('/:id', authenticate, extractUserInfo, getTeamById);
router.put('/:id', authenticate, extractUserInfo, updateTeam);
router.delete('/:id', authenticate, extractUserInfo, deleteTeam);

export default router; 