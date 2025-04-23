import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

// Typed prisma client
interface TypedPrismaClient extends PrismaClient {
  employee: any;
  team: any;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
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

    res.json(employee);
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

// Route handlers
router.get('/', authenticate, getAllEmployees);
router.get('/team/:teamId', authenticate, getTeamEmployees);
router.get('/:id', authenticate, getEmployeeById);
router.post('/', authenticate, createEmployee);
router.put('/:id', authenticate, updateEmployee);
router.delete('/:id', authenticate, deleteEmployee);

export default router; 