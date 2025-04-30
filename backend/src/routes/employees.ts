import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';

// Typed prisma client
interface TypedPrismaClient extends PrismaClient {
  employee: any;
  team: any;
  interview: any;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
  };
}

// Define types for our models
interface Employee {
  id: number;
  name: string;
  title: string;
  email: string;
  teamId: number;
  userId: number;
  startDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  team?: {
    id: number;
    name: string;
    department: string;
  };
}

const router = express.Router();
const prisma = new PrismaClient() as TypedPrismaClient;

// Get all employees for a team
const getTeamEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employees = await prisma.employee.findMany({
      where: {
        teamId: parseInt(teamId),
        userId: req.user.userId
      }
    });

    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// Create a new employee
const createEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, title, email, teamId, startDate } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        title,
        email,
        startDate: new Date(startDate),
        teamId: parseInt(teamId),
        userId: req.user.userId
      }
    });

    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
};

// Update an employee
const updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, title, email, teamId, startDate } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      },
      data: {
        name,
        title,
        email,
        startDate: startDate ? new Date(startDate) : undefined,
        teamId: teamId ? parseInt(teamId) : undefined
      }
    });

    if (employee.count === 0) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    const updatedEmployee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id)
      }
    });

    res.json(updatedEmployee);
  } catch (error) {
    next(error);
  }
};

// Delete an employee
const deleteEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      }
    });

    if (employee.count === 0) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get an employee by id
const getEmployeeById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      }
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    // Fetch related interviews count
    // const interviewCount = await prisma.interview.count({
    //   where: {
    //     employeeId: parseInt(id),
    //     // We might need to confirm if interviews are directly linked via employeeId
    //     // or if we need to link through user ID and potentially employee name?
    //     // Assuming direct link for now:
    //     // userId: req.user.userId 
    //   }
    // });

    // Include the interview count in the response
    res.json({ 
      ...employee,
      // interviewCount: interviewCount
     });
  } catch (error) {
    next(error);
  }
};

// Get all employees for the authenticated user
const getAllEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employees = await prisma.employee.findMany({
      where: {
        userId: req.user.userId
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      }
    });

    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// Get meetings for a specific employee (filtered by the logged-in manager)
const getEmployeeMeetings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const managerId = req.user?.userId;

    if (!managerId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!employeeId) {
       res.status(400).json({ error: 'Employee ID is required' });
       return;
    }

    // Verify the manager has access to this employee (optional but good practice)
    const employeeCheck = await prisma.employee.findFirst({
      where: {
        id: parseInt(employeeId),
        userId: managerId
      }
    });

    if (!employeeCheck) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    // Fetch meetings for this employee where the current user is the manager
    const meetings = await prisma.meeting.findMany({
      where: {
        employeeId: parseInt(employeeId),
        managerId: managerId
      },
      select: { // Select only necessary fields for the list
        id: true,
        title: true,
        scheduledTime: true,
        status: true,
        platform: true,
      },
      orderBy: {
        scheduledTime: 'desc' // Show most recent first
      }
    });

    res.json(meetings);

  } catch (error) {
    next(error);
  }
};

// Route handlers
router.get('/', authenticate, extractUserInfo, getAllEmployees);
router.get('/team/:teamId', authenticate, extractUserInfo, getTeamEmployees);
router.get('/:id', authenticate, extractUserInfo, getEmployeeById);
router.get('/:employeeId/meetings', authenticate, extractUserInfo, getEmployeeMeetings);
router.post('/', authenticate, extractUserInfo, createEmployee);
router.put('/:id', authenticate, extractUserInfo, updateEmployee);
router.delete('/:id', authenticate, extractUserInfo, deleteEmployee);

export default router; 