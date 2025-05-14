import express, { Request, Response } from 'express';
import { PrismaClient, Prisma, User, UserRole } from '@prisma/client';
import { authenticate, extractUserInfo } from '../middleware/auth.js';
import { RequestWithUser } from '../middleware/types.js';
import { getAccessibleTeams } from '../../src/services/accessControlService.js';
import { withOrganizationFilter, getQueryOrganizationId } from '../utils/queryBuilder.js';
import { isOrganizationsEnabled, DEFAULT_ORGANIZATION_ID } from '../config/featureFlags.js';

const UNASSIGNED_TEAM_NAME = "NO TEAM ASSIGNED";
// const UNASSIGNED_TEAM_DEPARTMENT = "SYSTEM"; // No longer used directly as a string for team creation
const SYSTEM_DEPARTMENT_NAME = "SYSTEM"; // Or "Unassigned", "Default" etc.

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
export async function getOrCreateSystemDepartment(
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
const getAllTeams = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id }
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
const getTeamById = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get organization ID using the utility function that respects feature flags
    const organizationId = getQueryOrganizationId(req);
    
    // Use the withOrganizationFilter utility to apply organization filtering
    const team = await prisma.team.findFirst({
      where: withOrganizationFilter({
        id: parseInt(id)
      }, organizationId),
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
const updateTeam = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    const teamIdToUpdate = parseInt(req.params.id);
    if (isNaN(teamIdToUpdate)) {
      return res.status(400).json({ error: 'Invalid team ID format.' });
    }

    const { name, departmentId } = req.body; 

    if (!req.user?.id || !req.user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or not associated with an organization.' });
    }
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    const existingTeam = await prisma.team.findUnique({
      where: { id: teamIdToUpdate },
      include: { department: true } 
    });

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (existingTeam.organizationId !== currentUserOrganizationId) {
        return res.status(403).json({ error: 'Forbidden: Team does not belong to your organization.' });
    }
    
    if (currentUserRole !== UserRole.ADMIN && existingTeam.userId !== currentUserId) {
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
                organizationId: currentUserOrganizationId,
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
            where: { id: departmentId, organizationId: currentUserOrganizationId }
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
const deleteTeam = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    const teamIdToDelete = parseInt(req.params.id);
    if (isNaN(teamIdToDelete)) {
      return res.status(400).json({ error: 'Invalid team ID.' });
    }

    if (!req.user?.id || !req.user.organizationId || !req.user.role) {
      return res.status(401).json({ error: 'User not authenticated or missing organization/role information.' });
    }
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    const team = await prisma.team.findUnique({
      where: { id: teamIdToDelete },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.organizationId !== currentUserOrganizationId) {
      return res.status(403).json({ error: "Forbidden: Team does not belong to your organization." });
    }

    if (currentUserRole !== UserRole.ADMIN && team.userId !== currentUserId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this team or are not an admin.' });
    }

    if (team.name === UNASSIGNED_TEAM_NAME) {
      return res.status(400).json({ error: `The \"${UNASSIGNED_TEAM_NAME}\" team cannot be deleted.` });
    }
    
    // Check if team has employees assigned before deletion
    const employeesInTeam = await prisma.employee.count({
        where: { teamId: teamIdToDelete }
    });

    if (employeesInTeam > 0) {
        return res.status(400).json({ 
            error: 'Cannot delete team: Team has employees assigned.', 
            message: 'Please reassign or remove employees from this team before deleting it.'
        });
    }

    await prisma.team.delete({ where: { id: teamIdToDelete } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting team:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2014: The change you are trying to make would violate the required relation 'TeamToEmployee' between Team and Employee
        // This specific error might not be hit if the count check above is effective,
        // but kept for robustness or other potential relational issues.
        if (error.code === 'P2014' || error.code === 'P2003') { 
             return res.status(400).json({ error: 'Cannot delete team: It may have dependent records (like employees).' });
        }
        return res.status(500).json({ error: 'Database error during team deletion.', details: error.code });
    } else if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to delete team',
        message: error.message,
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Get teams managed by a specific manager ID (Admin only)
const getTeamsByManagerId = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
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
const getAllSelectableTeams = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated properly' });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
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

// PUT /api/teams/:teamId/assign-manager/:managerId - Assign a manager to a team
const assignManagerToTeam = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const managerIdToAssign = parseInt(req.params.managerId, 10);

    if (isNaN(teamId) || isNaN(managerIdToAssign)) {
      return res.status(400).json({ error: 'Invalid team ID or manager ID.' });
    }

    if (!req.user?.id || !req.user.organizationId || !req.user.role) {
      return res.status(401).json({ error: 'User not authenticated or missing organization/role information.' });
    }
    // const adminUserId = req.user.id; // Not needed directly if using role and orgId from req.user
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    // REMOVED: Fetch the admin user to verify role and get their organization ID
    // const requestingAdmin = await prisma.user.findUnique({
    //   where: { id: adminUserId },
    //   select: { role: true, organizationId: true },
    // });

    // if (!requestingAdmin || !requestingAdmin.organizationId) {
    //   return res.status(400).json({ message: 'Requesting user not found or not associated with an organization.' });
    // }

    if (currentUserRole !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can assign managers to teams.' });
    }

    // Validate the team exists and belongs to the admin's organization
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }
    if (team.organizationId !== currentUserOrganizationId) {
      return res.status(403).json({ error: "Forbidden: Team does not belong to your organization." });
    }

    // Validate the user to be assigned as manager exists, is a MANAGER, and belongs to the same organization
    const managerUser = await prisma.user.findUnique({
      where: { id: managerIdToAssign },
    });

    if (!managerUser) {
      return res.status(404).json({ error: 'Manager user to assign not found.' });
    }
    if (managerUser.organizationId !== currentUserOrganizationId) {
      return res.status(403).json({ error: "Forbidden: Manager to assign does not belong to your organization." });
    }
    if (managerUser.role !== UserRole.MANAGER) {
      return res.status(400).json({ error: 'User to assign as manager must have the MANAGER role.' });
    }
    
    // Prevent assigning a manager to the "NO TEAM ASSIGNED" team
    if (team.name === UNASSIGNED_TEAM_NAME) {
        return res.status(400).json({ error: `Cannot assign a manager to the \"${UNASSIGNED_TEAM_NAME}\" team.` });
    }

    // Update the team with the new managerId
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { userId: managerIdToAssign }, // userId on Team model refers to the manager
      include: { 
        user: true, // Include the manager details
        department: true // Include department details
      }
    });

    res.json(updatedTeam);

  } catch (error) {
    console.error('Error assigning manager to team:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // e.g. P2025: Record to update not found (if team or managerId is invalid despite checks)
        return res.status(400).json({ error: 'Database error during manager assignment.', details: error.code });
    } else if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to assign manager to team',
        message: error.message,
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Create a new team
const createTeam = async (req: RequestWithUser, res: Response): Promise<Response | void> => {
  try {
    const { name, departmentId, managerId } = req.body;

    if (!req.user?.id || !req.user.organizationId || !req.user.role) {
      return res.status(401).json({ error: 'User not authenticated, or missing organization/role information.' });
    }
    // const currentUserId = req.user.id; // Not directly used here, but role and orgId are.
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    // Fetch the user creating the team to check their role and get their organization ID -- REMOVED, using req.user directly
    // const adminUser = await prisma.user.findUnique({
    //   where: { id: currentUserId },
    //   select: { role: true, organizationId: true },
    // });

    // if (!adminUser || !adminUser.organizationId) { // Handled by initial check
    //   return res.status(400).json({ message: 'User (admin) not found or not associated with an organization.' });
    // }

    if (currentUserRole !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Only admins can create teams.' });
    }

    // Validate input: name and departmentId are required
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Team name is required and must be a non-empty string.' });
    }
    const trimmedName = name.trim();

    if (departmentId === undefined || typeof departmentId !== 'number') {
      return res.status(400).json({ error: 'Department ID is required and must be a number.' });
    }
    
    // Validate managerId if provided
    if (managerId !== undefined && managerId !== null && typeof managerId !== 'number') {
        return res.status(400).json({ error: 'Manager ID must be a number or null.' });
    }

    // Check if department exists and belongs to the admin's organization
    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        organizationId: currentUserOrganizationId,
      },
      select: { id: true }, 
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found in your organization or department ID is invalid.' });
    }

    // Check if team with the same name already exists in the organization
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: {
          mode: Prisma.QueryMode.insensitive,
          equals: trimmedName,
        },
        organizationId: currentUserOrganizationId,
      },
      select: { id: true }, 
    });

    if (existingTeam) {
      return res.status(409).json({ error: `A team named "${trimmedName}" already exists in your organization.` });
    }

    // If managerId is provided, validate the manager exists, belongs to the same org, and has MANAGER role
    if (managerId !== null && managerId !== undefined) {
        const managerUser = await prisma.user.findUnique({
            where: { id: managerId },
        });
        if (!managerUser) {
            return res.status(404).json({ error: 'Specified manager not found.' });
        }
        if (managerUser.organizationId !== currentUserOrganizationId) {
            return res.status(403).json({ error: "Manager does not belong to the admin\'s organization." });
        }
        if (managerUser.role !== UserRole.MANAGER) {
            return res.status(400).json({ error: 'Specified user to be manager does not have the MANAGER role.' });
        }
    }

    // Create the new team
    const newTeamData: Prisma.TeamCreateInput = {
      name: trimmedName,
      Organization: {
        connect: { id: currentUserOrganizationId },
      },
      department: {
        connect: { id: departmentId },
      },
      // Conditionally connect user if managerId is provided and not null
      ...(managerId !== null && managerId !== undefined && { user: { connect: { id: managerId } } }),
    };

    const newTeam = await prisma.team.create({
      data: newTeamData,
      select: { // Select specific fields to return
        id: true,
        name: true,
        departmentId: true,
        userId: true, // managerId
        organizationId: true,
        department: {
            select: {
                id: true,
                name: true
            }
        },
        user: { // manager details
            select: {
                id: true,
                name: true,
                email: true
            }
        }
      },
    });

    res.status(201).json(newTeam);

  } catch (error) {
    console.error('Error creating team:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // e.g., unique constraint violation if name+org is somehow missed by above check (should not happen)
      // Or foreign key constraint if departmentId or managerId is invalid despite checks (should not happen)
      return res.status(400).json({ error: 'Database error while creating team.', details: error.code });
    } else if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to create team',
        message: error.message,
      });
    } else {
      return res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

// Register routes
router.get('/debug', debugHandler);
router.get('/', authenticate, extractUserInfo, getAllTeams);
router.get('/selectable', authenticate, extractUserInfo, getAllSelectableTeams);
router.get('/managed-by/:managerId', authenticate, extractUserInfo, getTeamsByManagerId);
router.put('/:teamId/assign-manager/:managerId', authenticate, extractUserInfo, assignManagerToTeam);
router.get('/:id', authenticate, extractUserInfo, getTeamById);
router.post('/', authenticate, extractUserInfo, createTeam);
router.put('/:id', authenticate, extractUserInfo, updateTeam);
router.delete('/:id', authenticate, extractUserInfo, deleteTeam);

export default router; 