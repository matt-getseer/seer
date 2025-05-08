import express, { Request, Response } from 'express';
import { PrismaClient, Prisma, User, UserRole } from '@prisma/client';
import { authenticate, extractUserInfo } from '../middleware/auth';
import { getAccessibleTeams } from '../../src/services/accessControlService';

const UNASSIGNED_TEAM_NAME = "NO TEAM ASSIGNED";
// const UNASSIGNED_TEAM_DEPARTMENT = "SYSTEM"; // No longer used directly as a string for team creation
const SYSTEM_DEPARTMENT_NAME = "SYSTEM"; // Or "Unassigned", "Default" etc.

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

// Updated Team interface
interface Team {
  id: number;
  name: string;
  departmentId: number; // Foreign key
  department?: {        // For eager loading the related department
    id: number;
    name: string;
    // include other department fields if necessary
  };
  userId: number | null; // Manager of the team
  createdAt: Date;
  updatedAt: Date;
  employees?: any[]; // Consider defining a proper Employee interface if used
  [key: string]: any; 
}

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to find or create the \"SYSTEM\" department for an organization
async function getOrCreateSystemDepartment(
  organizationId: string
): Promise<{ id: number }> {
  let systemDepartment = await prisma.department.findFirst({
    where: {
      name: SYSTEM_DEPARTMENT_NAME,
      organizationId: organizationId,
    },
    select: { id: true },
  });

  if (!systemDepartment) {
    console.log(`\"${SYSTEM_DEPARTMENT_NAME}\" department not found for organization ${organizationId}. Creating it now.`);
    try {
      systemDepartment = await prisma.department.create({
        data: {
          name: SYSTEM_DEPARTMENT_NAME,
          organizationId: organizationId,
        },
        select: { id: true },
      });
      console.log(`\"${SYSTEM_DEPARTMENT_NAME}\" department created with ID: ${systemDepartment.id} for organization ${organizationId}`);
    } catch (error) {
      console.error(`Failed to create \"${SYSTEM_DEPARTMENT_NAME}\" department for organization ${organizationId}:`, error);
      throw new Error(`Failed to create \"${SYSTEM_DEPARTMENT_NAME}\" department. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!systemDepartment || typeof systemDepartment.id !== 'number') {
    throw new Error('\"SYSTEM\" department ID is invalid or department could not be retrieved/created.');
  }
  return systemDepartment;
}

// Helper function to find or create the \"NO TEAM ASSIGNED\" team
async function getOrCreateUnassignedTeam(
  organizationId: string,
  userId: number // userId passed into the function
): Promise<{ id: number }> {
  let unassignedTeam = await prisma.team.findFirst({
    where: {
      name: UNASSIGNED_TEAM_NAME,
      organizationId: organizationId,
    },
    select: { id: true },
  });

  if (!unassignedTeam) {
    console.log(`\"NO TEAM ASSIGNED\" team not found for organization ${organizationId}. Creating it now.`);
    try {
      const systemDepartment = await getOrCreateSystemDepartment(organizationId);

      // Start of the corrected prisma.team.create call
      unassignedTeam = await prisma.team.create({
        data: {
          name: UNASSIGNED_TEAM_NAME,
          Organization: { // Connect via the Organization relation field
            connect: {
              id: organizationId // organizationId variable holds the UUID string
            }
          },
          department: { 
            connect: {
              id: systemDepartment.id
            }
          },
          // organizationId: organizationId, // Scalar foreign key field is NOT part of TeamCreateInput
          user: { // <<< CHANGED: Use the 'user' relation field
            connect: {
              id: userId // Connect using the userId passed to the function
            }
          }
          // userId: userId, // REMOVED - Use 'user' relation instead
        },
        select: { id: true },
      });
      // End of the corrected prisma.team.create call

      console.log(`\"NO TEAM ASSIGNED\" team created with ID: ${unassignedTeam.id} for organization ${organizationId}`);
    } catch (error) {
      console.error(`Failed to create \"NO TEAM ASSIGNED\" team for organization ${organizationId}:`, error);
      throw new Error(`Failed to create \"NO TEAM ASSIGNED\" team. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!unassignedTeam || typeof unassignedTeam.id !== 'number') {
    throw new Error('\"NO TEAM ASSIGNED\" team ID is invalid or team could not be retrieved/created.');
  }
  return unassignedTeam;
}

// Debug route to check if teams endpoint is accessible
const debugHandler = async (req: Request, res: Response): Promise<void> => {
  console.log('Debug endpoint accessed');
  res.status(200).json({ message: 'Teams endpoint is accessible' });
};

// Get all teams
const getAllTeams = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found for access control' });
    }
    const teams = await getAccessibleTeams(currentUser);
    res.json(teams);
  } catch (error) {
    console.error('Error in getAllTeams:', error);
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to fetch teams',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Get a specific team
const getTeamById = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const team = await prisma.team.findFirst({
      where: {
        id: parseInt(id),
        organizationId: (await prisma.user.findUnique({where: {id: req.user.userId}}))?.organizationId ?? undefined
      },
      include: {
        Employee: {
          select: { id: true, name: true, title: true, email: true, startDate: true }
        },
        department: true
      }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found or not accessible' });
    }
    res.json(team);
  } catch(e) {
    const error = e as Error;
    console.error('Failed to fetch team by id:', error);
    return res.status(500).json({ error: 'Failed to fetch team', message: error.message });
  }
};

// Update a team
const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const teamIdToUpdate = parseInt(req.params.id);
    if (isNaN(teamIdToUpdate)) {
      return res.status(400).json({ error: 'Invalid team ID format.' });
    }

    const { name, departmentId } = req.body; 

    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const currentUserId = req.user.userId;

    const adminUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { role: true, organizationId: true },
    });

    if (!adminUser || !adminUser.organizationId) {
        return res.status(400).json({ message: 'User not found or not associated with an organization.' });
    }
    const organizationId = adminUser.organizationId;

    const existingTeam = await prisma.team.findUnique({
      where: { id: teamIdToUpdate },
      include: { department: true } 
    });

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (existingTeam.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Forbidden: Team does not belong to your organization.' });
    }
    
    if (adminUser.role !== UserRole.ADMIN && existingTeam.userId !== currentUserId) {
        return res.status(403).json({ error: 'Forbidden: You do not own this team or are not authorized to update it.'});
    }

    if (existingTeam.name === UNASSIGNED_TEAM_NAME) {
      if (name && name.trim().toUpperCase() !== UNASSIGNED_TEAM_NAME) {
        return res.status(400).json({ error: `Cannot rename the \"${UNASSIGNED_TEAM_NAME}\" team.` });
      }
      if (departmentId !== undefined && existingTeam.department?.name === SYSTEM_DEPARTMENT_NAME && existingTeam.departmentId !== departmentId) {
         const targetDepartment = await prisma.department.findUnique({ where: {id: departmentId }});
         if (!targetDepartment || targetDepartment.name !== SYSTEM_DEPARTMENT_NAME) {
            return res.status(400).json({ error: `Cannot change the department of the \"${UNASSIGNED_TEAM_NAME}\" team from \"${SYSTEM_DEPARTMENT_NAME}\".` });
         }
      }
    }

    const updateData: Prisma.TeamUpdateInput = {}; 

    if (name && typeof name === 'string') {
      const trimmedName = name.trim();
      if (trimmedName === '') {
        return res.status(400).json({ error: 'Team name cannot be empty.'});
      }
      if (trimmedName.toUpperCase() === UNASSIGNED_TEAM_NAME && existingTeam.name !== UNASSIGNED_TEAM_NAME) {
        return res.status(400).json({ error: `Cannot rename a team to the reserved name \"${UNASSIGNED_TEAM_NAME}\".` });
      }
      if (trimmedName !== existingTeam.name) {
        const duplicateTeam = await prisma.team.findFirst({
            where: {
                name: trimmedName,
                organizationId: organizationId,
                id: { not: teamIdToUpdate }, 
            },
        });
        if (duplicateTeam) {
            return res.status(409).json({ error: `Another team with the name \"${trimmedName}\" already exists in your organization.` });
        }
      }
      updateData.name = trimmedName;
    }

    if (departmentId !== undefined) { 
        if (typeof departmentId !== 'number') {
            return res.status(400).json({ error: 'departmentId must be a number.'});
        }
        const departmentExists = await prisma.department.findFirst({
            where: { id: departmentId, organizationId: organizationId }
        });
        if (!departmentExists) {
            return res.status(400).json({ error: 'Specified departmentId does not exist or does not belong to your organization.'});
        }
        updateData.department = { 
            connect: { 
                id: departmentId 
            }
        };
    }
    
    if (Object.keys(updateData).length === 0) {
        return res.status(200).json(existingTeam); 
    }

    const updatedTeamResult = await prisma.team.update({
      where: { id: teamIdToUpdate },
      data: updateData,
      include: {
        Employee: {
          select: { id: true, name: true, title: true, email: true, startDate: true }
        },
        department: true 
      }
    });

    res.json(updatedTeamResult);
  } catch (error) {
    console.error('Failed to update team:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(400).json({ error: 'Database error during update.', details: error.message });
    } else {
        return res.status(500).json({ error: 'Failed to update team' });
    }
  }
};

// Delete a team
const deleteTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const teamIdToDelete = parseInt(req.params.id);
    if (isNaN(teamIdToDelete)) {
      return res.status(400).json({ error: 'Invalid team ID format.' });
    }

    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const currentUserId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { organizationId: true },
    });

    if (!user || !user.organizationId) {
      return res.status(400).json({ message: 'User is not associated with an organization. Cannot manage teams.' });
    }
    const organizationId = user.organizationId;

    const teamToDeleteDetails = await prisma.team.findUnique({
      where: { id: teamIdToDelete },
    });

    if (!teamToDeleteDetails) {
      return res.status(404).json({ error: 'Team to delete not found' });
    }

    if (teamToDeleteDetails.name === UNASSIGNED_TEAM_NAME && teamToDeleteDetails.organizationId === organizationId) {
      return res.status(400).json({ error: `Cannot delete the \"${UNASSIGNED_TEAM_NAME}\" team.` });
    }
    
    if (teamToDeleteDetails.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Forbidden: Team does not belong to your organization.'});
    }

    const unassignedTeam = await getOrCreateUnassignedTeam(organizationId, currentUserId); 

    if (teamIdToDelete === unassignedTeam.id) {
      return res.status(400).json({ error: `Cannot delete the \"${UNASSIGNED_TEAM_NAME}\" team.` });
    }

    await prisma.$transaction(async (tx) => {
      const typedTx = tx as Prisma.TransactionClient;
      await typedTx.employee.updateMany({
        where: {
          teamId: teamIdToDelete,
        },
        data: {
          teamId: unassignedTeam.id,
        },
      });

      await typedTx.team.delete({
        where: {
          id: teamIdToDelete,
          organizationId: organizationId,
        },
      });
    });

    res.status(204).send();
  } catch (e) {
    const error = e as Error;
    console.error('Failed to delete team:', error);
    if (error.message.includes('Cannot delete the')) {
        return res.status(400).json({ error: error.message });
    } else if (error.message.includes('Failed to create "NO TEAM ASSIGNED" team')) {
        return res.status(500).json({ error: 'System error: Could not ensure unassigned team exists.' });
    } else {
        return res.status(500).json({ error: 'Failed to delete team' });
    }
  }
};

// Get teams managed by a specific manager ID (Admin only)
const getTeamsByManagerId = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });
    if (!currentUser) {
      return res.status(404).json({ error: 'Authenticated user not found' });
    }
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can access this resource.' });
    }
    const { managerId } = req.params;
    if (!managerId || isNaN(parseInt(managerId))) {
      return res.status(400).json({ error: 'Invalid manager ID provided.' });
    }
    const teams = await prisma.team.findMany({
      where: {
        userId: parseInt(managerId) 
      },
      select: {
        id: true,
        name: true,
        department: true,
      }
    });
    res.json(teams);
  } catch (error) {
    console.error('Error in getTeamsByManagerId:', error);
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to fetch teams for manager',
        message: error.message
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Get all teams suitable for selection (Admin only)
const getAllSelectableTeams = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });
    if (!currentUser) {
      return res.status(404).json({ error: 'Authenticated user not found' });
    }
    if (currentUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can access this resource.' });
    }
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        department: true,
        userId: true, 
      },
      orderBy: {
        name: 'asc' 
      }
    });
    res.json(teams);
  } catch (error) {
    console.error('Error in getAllSelectableTeams:', error);
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to fetch selectable teams',
        message: error.message
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Assign a manager to a team or assign to current admin if managerIdToAssign is null (Admin only)
const assignManagerToTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const adminUserId = req.user.userId; 
    const requestingAdmin = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true }
    });
    if (!requestingAdmin || requestingAdmin.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can assign managers to teams.' });
    }
    const { teamId } = req.params;
    const { managerIdToAssign } = req.body; 
    if (!teamId || isNaN(parseInt(teamId))) {
      return res.status(400).json({ error: 'Invalid team ID provided.' });
    }
    const numericTeamId = parseInt(teamId);
    let finalUserIdToAssign: number;
    if (managerIdToAssign === null) {
      finalUserIdToAssign = adminUserId;
    } else if (typeof managerIdToAssign === 'number') {
      const targetManager = await prisma.user.findUnique({
        where: { id: managerIdToAssign },
        select: { role: true, id: true }
      });
      if (!targetManager) {
        return res.status(404).json({ error: 'Specified manager to assign not found.' });
      }
      if (targetManager.role !== UserRole.MANAGER && targetManager.role !== UserRole.ADMIN) {
        return res.status(400).json({ error: 'Specified user is not a manager or admin.' });
      }
      finalUserIdToAssign = targetManager.id;
    } else {
      return res.status(400).json({ error: 'Invalid managerIdToAssign value. Must be a user ID (number) or null.' });
    }
    const updatedTeam = await prisma.team.update({
      where: { id: numericTeamId },
      data: { userId: finalUserIdToAssign },
      select: { id: true, name: true, userId: true, department: true } 
    });
    if (!updatedTeam) {
        return res.status(404).json({ error: 'Team not found or update failed.' });
    }
    res.json({ message: `Team '${updatedTeam.name}' successfully assigned.`, team: updatedTeam });
  } catch (error) {
    console.error('Error in assignManagerToTeam:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { 
            return res.status(404).json({ error: 'Team not found for assignment.' });
        }
    }
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to assign manager to team',
        message: error.message
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Create a new team (Admin only)
const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const currentUserId = req.user.userId;

    const adminUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, organizationId: true },
    });

    if (!adminUser || !adminUser.organizationId) {
      return res.status(400).json({ message: 'Admin user not found or not associated with an organization.' });
    }
    if (adminUser.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can create teams.' });
    }
    const organizationId = adminUser.organizationId; // This is the Org ID (UUID string)

    const { name, departmentId: providedDepartmentId } = req.body; // departmentId from frontend is now optional

    // Validate team name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Team name is required and must be a non-empty string.' });
    }
    const trimmedName = name.trim();
    if (trimmedName.toUpperCase() === UNASSIGNED_TEAM_NAME) {
      return res.status(400).json({ error: `Cannot create a team with the reserved name \"${UNASSIGNED_TEAM_NAME}\".` });
    }

    // Check for existing team with the same name in the organization
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: trimmedName,
        organizationId: organizationId,
      },
    });
    if (existingTeam) {
      return res.status(409).json({ error: `A team with the name \"${trimmedName}\" already exists in your organization.` });
    }

    let resolvedDepartmentId: number;

    if (providedDepartmentId !== undefined && typeof providedDepartmentId === 'number') {
      // A specific departmentId was provided, validate it
      const departmentExists = await prisma.department.findFirst({
          where: { id: providedDepartmentId, organizationId: organizationId }
      });
      if (!departmentExists) {
          console.error(`VALIDATION FAILED: Department with id ${providedDepartmentId} for org ${organizationId} NOT FOUND.`);
          return res.status(400).json({ error: 'Specified departmentId does not exist or does not belong to your organization.'});
      }
      resolvedDepartmentId = providedDepartmentId;
      console.log(`Department with id ${resolvedDepartmentId} for org ${organizationId} confirmed to exist. Details:`, JSON.stringify(departmentExists)); 
      console.log(`Creating team '${trimmedName}' with resolved departmentId: ${resolvedDepartmentId}`);
    } else {
      // departmentId was not provided or not a valid number, so default to SYSTEM department
      console.log(`No valid departmentId provided for team '${trimmedName}'. Defaulting to SYSTEM department.`);
      const systemDepartment = await getOrCreateSystemDepartment(organizationId);
      resolvedDepartmentId = systemDepartment.id;
      console.log(`Using SYSTEM departmentId: ${resolvedDepartmentId} for team '${trimmedName}'`);
    }
    
    console.log(`DEBUG: Attempting prisma.team.create for '${trimmedName}'. organizationId: ${organizationId}, departmentId: ${resolvedDepartmentId}, userId: ${currentUserId}`);
    const newTeam = await prisma.team.create({
      data: {
        name: trimmedName,
        organizationId: organizationId,       // Scalar FK for Organization (String UUID)
        departmentId: resolvedDepartmentId,   // Scalar FK for Department (Integer ID)
        // Optional: set the manager userId if currentUserId is valid
        ...(currentUserId !== null && currentUserId !== undefined && {
          userId: currentUserId             // Scalar FK for User (Integer ID)
        })
        // Removed relation connect blocks; relying on direct foreign key assignment
      },
      include: { 
        department: true, // Should still work to fetch related data
        user: true        // Should still work to fetch related data
      }
    });

    res.status(201).json(newTeam);

  } catch (error) {
    console.error('Error creating team:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(400).json({ error: 'Database error while creating team.', details: error.message });
    } else if (error instanceof Error && error.message.includes('Failed to create "SYSTEM" department')) {
        // Specific error from getOrCreateSystemDepartment helper
        return res.status(500).json({ error: 'Failed to ensure SYSTEM department exists.', details: error.message });
    } else {
        return res.status(500).json({ error: 'Failed to create team' });
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
router.post('/', authenticate, extractUserInfo, createTeam);
router.put('/:id', authenticate, extractUserInfo, updateTeam);
router.delete('/:id', authenticate, extractUserInfo, deleteTeam);

export default router; 