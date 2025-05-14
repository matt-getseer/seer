import express, { Request, Response } from 'express';
import { PrismaClient, Prisma, UserRole } from '@prisma/client'; // Import necessary types
import { authenticate, extractUserInfo } from '../middleware/auth.js'; // Use existing auth middleware, add .js
import { RequestWithUser } from '../middleware/types.js'; // Import RequestWithUser directly
import { withOrganizationFilter, getQueryOrganizationId } from '../utils/queryBuilder.js'; // add .js

// Define AuthenticatedRequest if not already globally available
// (Copied from teams.ts for encapsulation, consider moving to a shared types file later)
// interface AuthenticatedRequest extends Request {
//   user?: {
//     clerkId?: string;
//     userId?: number;
//     email?: string;
//     iat?: number;
//     exp?: number;
//     organizationId?: string; // Ensure organizationId is expected here from middleware
//   };
//   auth?: {
//     userId: string;
//     sessionId: string;
//   };
// }

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/departments - List all departments for the user's organization
const getAllDepartments = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }

    // Get organization ID from request (middleware should have set this already)
    // Use the utility function that respects feature flags
    const organizationId = getQueryOrganizationId(req as RequestWithUser);

    // Use the withOrganizationFilter utility to build query
    const departments = await prisma.department.findMany({
      where: withOrganizationFilter({}, organizationId),
      orderBy: {
        name: 'asc', // Order alphabetically by name
      },
      select: { // Select only needed fields
        id: true,
        name: true,
        headId: true, 
        head: { 
          select: { 
            id: true, 
            name: true,
            email: true 
          } 
        } 
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
const createDepartment = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id || !req.user.role || !req.user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing role/organization information.' });
    }
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    // Authorization: Only ADMIN or MANAGER can create departments
    if (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.MANAGER) {
      return res.status(403).json({ error: 'Forbidden: Only admins or managers can create departments.' });
    }

    // Get department name from request body
    const { name } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Department name is required and must be a non-empty string.' });
    }
    const trimmedName = name.trim();

    // Check if department with the same name already exists in the organization
    // Use the withOrganizationFilter utility with simplified case insensitive check
    const existingDepartment = await prisma.department.findFirst({
      where: withOrganizationFilter({
        name: {
          mode: Prisma.QueryMode.insensitive,
          equals: trimmedName
        }
      }, currentUserOrganizationId),
      select: { id: true } // Only need to know if it exists
    });

    if (existingDepartment) {
      return res.status(409).json({ error: `A department named "${trimmedName}" already exists in your organization.` });
    }

    // Create the new department
    const newDepartment = await prisma.department.create({
      data: {
        name: trimmedName,
        organizationId: currentUserOrganizationId,
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

// PUT /api/departments/:departmentId/assign-head - Assign a user as department head (Admin only)
const assignDepartmentHead = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id || !req.user.role || !req.user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing role/organization information.' });
    }
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    // 1. Verify the requesting user is an ADMIN
    // const requestingUser = await prisma.user.findUnique({ // REMOVED
    //   where: { id: req.user.id },
    //   select: { role: true, organizationId: true },
    // });

    // if (!requestingUser) { // Should not happen if req.user.id is valid
    //   return res.status(404).json({ error: 'Requesting user not found.' });
    // }
    if (currentUserRole !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can assign department heads.' });
    }
    // if (!currentUserOrganizationId) { // Covered by initial check
    //     return res.status(400).json({ message: 'Admin user is not associated with an organization.'});
    // }


    // 2. Get departmentId from URL params and userIdToAssign from request body
    const { departmentId } = req.params;
    const { userId: userIdToAssign } = req.body; // userIdToAssign can be number or null

    if (!departmentId || isNaN(parseInt(departmentId))) {
      return res.status(400).json({ error: 'Invalid department ID provided.' });
    }
    const numericDepartmentId = parseInt(departmentId);

    // Allow userIdToAssign to be null (for unassigning) or a number
    if (userIdToAssign !== null && typeof userIdToAssign !== 'number') {
      return res.status(400).json({ error: 'User ID to assign must be a number or null to unassign.' });
    }

    // 3. Validate the department exists and belongs to the admin's organization
    const department = await prisma.department.findUnique({
      where: { id: numericDepartmentId },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found.' });
    }
    if (department.organizationId !== currentUserOrganizationId) {
        return res.status(403).json({ error: "Forbidden: Department does not belong to the admin\'s organization." });
    }

    // 4. Validate the user to be assigned as head exists, belongs to the same organization, and is a MANAGER (only if userIdToAssign is not null)
    if (userIdToAssign !== null) {
      const userToAssign = await prisma.user.findUnique({
        where: { id: userIdToAssign },
      });

      if (!userToAssign) {
        return res.status(404).json({ error: 'User to assign as department head not found.' });
      }
      if (userToAssign.organizationId !== currentUserOrganizationId) {
          return res.status(403).json({ error: "Forbidden: User to assign does not belong to the admin\'s organization." });
      }
      if (userToAssign.role !== UserRole.MANAGER) {
        return res.status(400).json({ error: 'User to assign must have the MANAGER role.' });
      }
    }

    // 5. Update the department with the new headId (can be number or null)
    const updatedDepartment = await prisma.department.update({
      where: { id: numericDepartmentId },
      data: { headId: userIdToAssign },
      select: {
        id: true,
        name: true,
        headId: true,
        head: { // Include basic info of the newly assigned head
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    res.json(updatedDepartment);

  } catch (error) {
    console.error('Error assigning department head:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ error: 'Database error while assigning department head.', details: error.code });
    } else if (error instanceof Error) {
      return res.status(500).json({
        error: 'Failed to assign department head',
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
router.put('/:departmentId/assign-head', authenticate, extractUserInfo, assignDepartmentHead); // New PUT handler

// Export the router
export default router; 