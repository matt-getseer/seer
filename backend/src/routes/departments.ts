import express, { Request, Response } from 'express';
import { PrismaClient, Prisma, UserRole } from '@prisma/client'; // Import necessary types
import { authenticate, extractUserInfo } from '../middleware/auth'; // Use existing auth middleware

// Define AuthenticatedRequest if not already globally available
// (Copied from teams.ts for encapsulation, consider moving to a shared types file later)
interface AuthenticatedRequest extends Request {
  user?: {
    clerkId?: string;
    userId?: number;
    email?: string;
    iat?: number;
    exp?: number;
    organizationId?: string; // Ensure organizationId is expected here from middleware
  };
  auth?: {
    userId: string;
    sessionId: string;
  };
}

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/departments - List all departments for the user's organization
const getAllDepartments = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }

    // Fetch organizationId directly from the authenticated user's token/session info
    // Assumes your extractUserInfo middleware adds organizationId to req.user
    let organizationId = req.user.organizationId; // Use let to allow reassignment if fetched

    if (!organizationId) {
        // If orgId is not in the token, try fetching the user from DB
        console.warn(`Organization ID not found directly on req.user for userId: ${req.user.userId}. Fetching from DB.`);
        const userWithOrg = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { organizationId: true }
        });
        if (!userWithOrg?.organizationId) {
            console.error(`User ${req.user.userId} is not associated with an organization.`);
            return res.status(400).json({ message: 'User is not associated with an organization.' });
        }
        // Assign fetched organizationId if found
        organizationId = userWithOrg.organizationId; 
    }


    const departments = await prisma.department.findMany({
      where: {
        organizationId: organizationId, // Use the determined organizationId
      },
      orderBy: {
        name: 'asc', // Order alphabetically by name
      },
      select: { // Select only needed fields
        id: true,
        name: true,
        // Optionally include headId or related head info if needed later
        // headId: true, 
        // head: { select: { id: true, name: true } } 
      },
    });

    res.json(departments);

  } catch (error) {
    console.error('Error fetching departments:', error);
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to fetch departments',
        message: error.message,
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// POST /api/departments - Create a new department
const createDepartment = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }

    // Determine organizationId (same logic as GET)
    let organizationId = req.user.organizationId;
    if (!organizationId) {
      console.warn(`Organization ID not found directly on req.user for userId: ${req.user.userId} during create. Fetching from DB.`);
      const userWithOrg = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { organizationId: true }
      });
      if (!userWithOrg?.organizationId) {
          console.error(`User ${req.user.userId} is not associated with an organization.`);
          return res.status(400).json({ message: 'User is not associated with an organization.' });
      }
      organizationId = userWithOrg.organizationId; 
    }

    // Get department name from request body
    const { name } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Department name is required and must be a non-empty string.' });
    }
    const trimmedName = name.trim();

    // Check if department with the same name already exists in the organization
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' }, // Case-insensitive check
        organizationId: organizationId,
      },
      select: { id: true } // Only need to know if it exists
    });

    if (existingDepartment) {
      return res.status(409).json({ error: `A department named "${trimmedName}" already exists in your organization.` });
    }

    // Create the new department
    const newDepartment = await prisma.department.create({
      data: {
        name: trimmedName,
        organizationId: organizationId,
        // headId: null // Head is not assigned on creation via this endpoint
      },
       select: { // Select only needed fields to return
        id: true,
        name: true,
      },
    });

    res.status(201).json(newDepartment);

  } catch (error) {
    console.error('Error creating department:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Handle potential DB errors like unique constraints if any other than name+orgId
        return res.status(400).json({ error: 'Database error while creating department.', details: error.code });
    } else if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to create department',
        message: error.message,
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Register the route handlers
router.get('/', authenticate, extractUserInfo, getAllDepartments);
router.post('/', authenticate, extractUserInfo, createDepartment); // Added POST handler

// Export the router
export default router; 