"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const accessControlService_1 = require("../../src/services/accessControlService");
const UNASSIGNED_TEAM_NAME = "NO TEAM ASSIGNED";
const UNASSIGNED_TEAM_DEPARTMENT = "SYSTEM";
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Use type assertion to make TypeScript happy with the prisma client
// This is a workaround for the type error with prisma.team
const typedPrismaClient = prisma;
// Helper function to find or create the "NO TEAM ASSIGNED" team
async function getOrCreateUnassignedTeam(prismaInstance, // Use PrismaClient type
organizationId, userId // Needed to associate the team if created by a user initially
) {
    let unassignedTeam = await prismaInstance.team.findFirst({
        where: {
            name: UNASSIGNED_TEAM_NAME,
            organizationId: organizationId,
        },
        select: { id: true },
    });
    if (!unassignedTeam) {
        console.log(`"NO TEAM ASSIGNED" team not found for organization ${organizationId}. Creating it now.`);
        try {
            unassignedTeam = await prismaInstance.team.create({
                data: {
                    name: UNASSIGNED_TEAM_NAME,
                    department: UNASSIGNED_TEAM_DEPARTMENT,
                    organizationId: organizationId,
                    userId: userId, // Associate with the user initiating the action or a system user ID
                    // For simplicity, using the current admin's ID.
                    // Consider if a dedicated system user ID or null userId is more appropriate if schema allows.
                },
                select: { id: true },
            });
            console.log(`"NO TEAM ASSIGNED" team created with ID: ${unassignedTeam.id} for organization ${organizationId}`);
        }
        catch (error) {
            console.error(`Failed to create "NO TEAM ASSIGNED" team for organization ${organizationId}:`, error);
            // If creation fails, this is a critical issue. Rethrow or handle appropriately.
            // For now, rethrowing to ensure it's not silently ignored.
            throw new Error(`Failed to create "NO TEAM ASSIGNED" team. ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    if (!unassignedTeam || typeof unassignedTeam.id !== 'number') {
        // This should ideally not be reached if the logic above is correct.
        throw new Error('"NO TEAM ASSIGNED" team ID is invalid or team could not be retrieved/created.');
    }
    return unassignedTeam;
}
// Debug route to check if teams endpoint is accessible
const debugHandler = async (req, res) => {
    console.log('Debug endpoint accessed');
    res.status(200).json({ message: 'Teams endpoint is accessible' });
};
// Get all teams
const getAllTeams = async (req, res) => {
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
        }
        catch (dbError) {
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
        const teams = await (0, accessControlService_1.getAccessibleTeams)(currentUser);
        console.log(`Found ${teams.length} teams for user ${currentUser.id} via access control service`);
        res.json(teams);
    }
    catch (error) {
        console.error('Error in getAllTeams:', error);
        if (error instanceof Error) {
            res.status(500).json({
                error: 'Failed to fetch teams',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
        else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
    finally {
        await typedPrismaClient.$disconnect();
    }
};
// Get a specific team
const getTeamById = async (req, res) => {
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
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch team' });
    }
};
// Update a team
const updateTeam = async (req, res) => {
    try {
        const teamIdToUpdate = parseInt(req.params.id);
        if (isNaN(teamIdToUpdate)) {
            res.status(400).json({ error: 'Invalid team ID format.' });
            return;
        }
        const { name, department } = req.body;
        if (!req.user?.userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const currentUserId = req.user.userId;
        // Fetch the current user to get their organizationId and role
        const adminUser = await typedPrismaClient.user.findUnique({
            where: { id: currentUserId },
            select: { role: true, organizationId: true },
        });
        if (!adminUser || !adminUser.organizationId) {
            res.status(400).json({ message: 'User not found or not associated with an organization.' });
            return;
        }
        // We might not strictly need adminUser.role here if we rely on Team.userId for ownership,
        // but it's good for potential future admin override logic.
        const organizationId = adminUser.organizationId;
        // Fetch the team to be updated to check its current name and for authorization
        const existingTeam = await typedPrismaClient.team.findUnique({
            where: { id: teamIdToUpdate },
        });
        if (!existingTeam) {
            res.status(404).json({ error: 'Team not found' });
            return;
        }
        // Authorization check: Ensure team belongs to the user's organization
        if (existingTeam.organizationId !== organizationId) {
            res.status(403).json({ error: 'Forbidden: Team does not belong to your organization.' });
            return;
        }
        // Ownership check (original logic from updateMany was based on userId)
        // If only admins can update any team, or if specific ownership is different, this needs adjustment.
        // For now, let's assume an ADMIN can update any team in their org, 
        // and a non-ADMIN user can only update a team if their userId matches Team.userId.
        if (adminUser.role !== client_1.UserRole.ADMIN && existingTeam.userId !== currentUserId) {
            res.status(403).json({ error: 'Forbidden: You do not own this team or are not authorized to update it.' });
            return;
        }
        // Prevent modifications to the "NO TEAM ASSIGNED" team's core properties
        if (existingTeam.name === UNASSIGNED_TEAM_NAME && existingTeam.organizationId === organizationId) {
            if (name && name.trim().toUpperCase() !== UNASSIGNED_TEAM_NAME) {
                return res.status(400).json({ error: `Cannot rename the "${UNASSIGNED_TEAM_NAME}" team.` });
            }
            if (department && department.trim() !== UNASSIGNED_TEAM_DEPARTMENT) {
                return res.status(400).json({ error: `Cannot change the department of the "${UNASSIGNED_TEAM_NAME}" team.` });
            }
            // Allow only manager changes for this team through the dedicated endpoint, not name/dept here.
            // If name/department in body are same as existing, effectively it's a no-op for these fields.
        }
        const updateData = {};
        if (name && typeof name === 'string') {
            const trimmedName = name.trim();
            if (trimmedName === '') {
                return res.status(400).json({ error: 'Team name cannot be empty.' });
            }
            if (trimmedName.toUpperCase() === UNASSIGNED_TEAM_NAME && existingTeam.name !== UNASSIGNED_TEAM_NAME) {
                return res.status(400).json({ error: `Cannot rename a team to the reserved name "${UNASSIGNED_TEAM_NAME}".` });
            }
            // Check for duplicate name if the name is actually changing
            if (trimmedName !== existingTeam.name) {
                const duplicateTeam = await typedPrismaClient.team.findFirst({
                    where: {
                        name: trimmedName,
                        organizationId: organizationId,
                        id: { not: teamIdToUpdate }, // Exclude the current team from the check
                    },
                });
                if (duplicateTeam) {
                    return res.status(409).json({ error: `Another team with the name "${trimmedName}" already exists in your organization.` });
                }
            }
            updateData.name = trimmedName;
        }
        if (department && typeof department === 'string') {
            const trimmedDepartment = department.trim();
            if (trimmedDepartment === '') {
                return res.status(400).json({ error: 'Department cannot be empty.' });
            }
            updateData.department = trimmedDepartment;
        }
        if (Object.keys(updateData).length === 0) {
            // If nothing to update (e.g. trying to change protected fields of unassigned team to same values, or empty body)
            // return the existing team details or a message
            return res.status(200).json(existingTeam); // Or 304 Not Modified, or a specific message
        }
        const updatedTeamResult = await typedPrismaClient.team.update({
            where: {
                id: teamIdToUpdate,
                // No userId in where clause here, as authorization is handled above based on role/ownership.
            },
            data: updateData,
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
        res.json(updatedTeamResult);
    }
    catch (error) {
        console.error('Failed to update team:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ error: 'Database error during update.', details: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to update team' });
        }
    }
};
// Delete a team
const deleteTeam = async (req, res) => {
    try {
        const teamIdToDelete = parseInt(req.params.id);
        if (isNaN(teamIdToDelete)) {
            res.status(400).json({ error: 'Invalid team ID format.' });
            return;
        }
        if (!req.user?.userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const currentUserId = req.user.userId;
        // Fetch user's organizationId
        const user = await typedPrismaClient.user.findUnique({
            where: { id: currentUserId },
            select: { organizationId: true },
        });
        if (!user || !user.organizationId) {
            res.status(400).json({ message: 'User is not associated with an organization. Cannot manage teams.' });
            return;
        }
        const organizationId = user.organizationId;
        // Fetch the team to be deleted to check its name and ensure it's not the "NO TEAM ASSIGNED" team
        const teamToDeleteDetails = await typedPrismaClient.team.findUnique({
            where: { id: teamIdToDelete },
        });
        if (!teamToDeleteDetails) {
            res.status(404).json({ error: 'Team to delete not found' });
            return;
        }
        if (teamToDeleteDetails.name === UNASSIGNED_TEAM_NAME && teamToDeleteDetails.organizationId === organizationId) {
            res.status(400).json({ error: `Cannot delete the "${UNASSIGNED_TEAM_NAME}" team.` });
            return;
        }
        // Ensure the operation is authorized (e.g., user owns the team or is an admin of the org)
        // The original deleteMany had `userId: req.user.userId` in its where clause.
        // If team ownership is strictly by `userId` on the Team model, that check should be maintained.
        // For an admin deleting any team in their org, this check might be different.
        // Assuming an admin can delete any team in their org for now, but this needs to align with your access control.
        if (teamToDeleteDetails.organizationId !== organizationId) {
            res.status(403).json({ error: 'Forbidden: Team does not belong to your organization.' });
            return;
        }
        // Add back a check for specific user ownership if that's the policy, e.g.:
        // if (teamToDeleteDetails.userId !== currentUserId && currentUserRole !== 'ADMIN') { // (assuming currentUserRole is fetched)
        //    res.status(403).json({ error: 'Forbidden: You do not own this team.'});
        //    return;
        // }
        const unassignedTeam = await getOrCreateUnassignedTeam(typedPrismaClient, organizationId, currentUserId);
        // Double check: Prevent deleting the unassigned team if somehow it was targeted by ID directly
        if (teamIdToDelete === unassignedTeam.id) {
            res.status(400).json({ error: `Cannot delete the "${UNASSIGNED_TEAM_NAME}" team.` });
            return;
        }
        // Start a transaction to ensure atomicity
        await typedPrismaClient.$transaction(async (tx) => {
            // 1. Reassign employees to the "NO TEAM ASSIGNED" team
            const updatedEmployees = await tx.employee.updateMany({
                where: {
                    teamId: teamIdToDelete,
                    // Optionally, add organizationId check for employees if they are directly linked to org
                    // Or ensure employees are tied to users/teams within the same org.
                },
                data: {
                    teamId: unassignedTeam.id,
                },
            });
            console.log(`Reassigned ${updatedEmployees.count} employees from team ${teamIdToDelete} to team ${unassignedTeam.id}.`);
            // 2. Delete the original team
            const deletedTeam = await tx.team.delete({
                where: {
                    id: teamIdToDelete,
                    // Add organizationId here for safety, though checked above
                    organizationId: organizationId,
                },
            });
            if (!deletedTeam) {
                // This should ideally not happen if the team was found initially
                throw new Error('Failed to delete the team after reassigning employees.');
            }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Failed to delete team:', error);
        if (error instanceof Error && error.message.includes('Cannot delete the')) {
            res.status(400).json({ error: error.message });
        }
        else if (error instanceof Error && error.message.includes('Failed to create "NO TEAM ASSIGNED" team')) {
            res.status(500).json({ error: 'System error: Could not ensure unassigned team exists.' });
        }
        else {
            res.status(500).json({ error: 'Failed to delete team' });
        }
    }
};
// Get teams managed by a specific manager ID (Admin only)
const getTeamsByManagerId = async (req, res) => {
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
        if (currentUser.role !== client_1.UserRole.ADMIN) {
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
    }
    catch (error) {
        console.error('Error in getTeamsByManagerId:', error);
        if (error instanceof Error) {
            res.status(500).json({
                error: 'Failed to fetch teams for manager',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
        else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
    finally {
        // Disconnecting the client might not be necessary here if it's managed globally
        // await typedPrismaClient.$disconnect(); 
    }
};
// Get all teams suitable for selection (Admin only)
const getAllSelectableTeams = async (req, res) => {
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
        if (currentUser.role !== client_1.UserRole.ADMIN) {
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
    }
    catch (error) {
        console.error('Error in getAllSelectableTeams:', error);
        if (error instanceof Error) {
            res.status(500).json({
                error: 'Failed to fetch selectable teams',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
        else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
// Assign a manager to a team or assign to current admin if managerIdToAssign is null (Admin only)
const assignManagerToTeam = async (req, res) => {
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
        if (!requestingAdmin || requestingAdmin.role !== client_1.UserRole.ADMIN) {
            return res.status(403).json({ error: 'Forbidden: Only admins can assign managers to teams.' });
        }
        const { teamId } = req.params;
        const { managerIdToAssign } = req.body; // Expects { managerIdToAssign: number | null }
        if (!teamId || isNaN(parseInt(teamId))) {
            return res.status(400).json({ error: 'Invalid team ID provided.' });
        }
        const numericTeamId = parseInt(teamId);
        let finalUserIdToAssign;
        if (managerIdToAssign === null) {
            // Assign to the admin making the request
            finalUserIdToAssign = adminUserId;
        }
        else if (typeof managerIdToAssign === 'number') {
            // Verify the provided managerIdToAssign is a valid user with MANAGER role
            const targetManager = await typedPrismaClient.user.findUnique({
                where: { id: managerIdToAssign },
                select: { role: true, id: true }
            });
            if (!targetManager) {
                return res.status(404).json({ error: 'Specified manager to assign not found.' });
            }
            if (targetManager.role !== client_1.UserRole.MANAGER) {
                return res.status(400).json({ error: 'Specified user is not a manager.' });
            }
            finalUserIdToAssign = targetManager.id;
        }
        else {
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
    }
    catch (error) {
        console.error('Error in assignManagerToTeam:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
        }
        else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
// Get employee count for a specific team
const getTeamEmployeeCount = async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        if (isNaN(teamId)) {
            res.status(400).json({ error: 'Invalid team ID format.' });
            return;
        }
        // Optional: Add authorization check to ensure user can access this team info
        // For now, assuming if the user can see the team list, they can get the count.
        // This might need to be tied to `getAccessibleTeams` logic or similar if more stringent control is needed.
        // A simple check could be to ensure the team belongs to the user's organization if that info is readily available.
        const count = await typedPrismaClient.employee.count({
            where: {
                teamId: teamId,
            },
        });
        res.json({ teamId, employeeCount: count });
    }
    catch (error) {
        console.error(`Failed to get employee count for team ${req.params.teamId}:`, error);
        res.status(500).json({ error: 'Failed to get employee count for team' });
    }
};
// Create a new team (Admin only)
const createTeam = async (req, res) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const currentUserId = req.user.userId;
        // Verify the user is an ADMIN and get their organizationId
        const adminUser = await typedPrismaClient.user.findUnique({
            where: { id: currentUserId },
            select: { role: true, organizationId: true },
        });
        if (!adminUser || !adminUser.organizationId) {
            res.status(400).json({ message: 'Admin user not found or not associated with an organization.' });
            return;
        }
        if (adminUser.role !== client_1.UserRole.ADMIN) {
            res.status(403).json({ error: 'Forbidden: Only admins can create teams.' });
            return;
        }
        const organizationId = adminUser.organizationId;
        const { name, department } = req.body;
        // Validate input
        if (!name || typeof name !== 'string' || name.trim() === '' ||
            !department || typeof department !== 'string' || department.trim() === '') {
            res.status(400).json({ error: 'Team name and department are required and must be non-empty strings.' });
            return;
        }
        const trimmedName = name.trim();
        if (trimmedName.toUpperCase() === UNASSIGNED_TEAM_NAME) {
            res.status(400).json({ error: `Cannot create a team with the reserved name "${UNASSIGNED_TEAM_NAME}".` });
            return;
        }
        // Check if a team with the same name already exists in the organization
        const existingTeam = await typedPrismaClient.team.findFirst({
            where: {
                name: trimmedName,
                organizationId: organizationId,
            },
        });
        if (existingTeam) {
            res.status(409).json({ error: `A team with the name "${trimmedName}" already exists in your organization.` });
            return;
        }
        // Create the new team
        const newTeam = await typedPrismaClient.team.create({
            data: {
                name: trimmedName,
                department: department.trim(),
                userId: currentUserId, // Admin creating the team
                organizationId: organizationId,
            },
            // Optionally select fields to return, including employees if needed later by frontend
            include: {
                employees: true, // Or set to false if not immediately needed
            }
        });
        res.status(201).json(newTeam);
    }
    catch (error) {
        console.error('Error creating team:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            // Handle specific Prisma errors if necessary, e.g., unique constraints if any other than name+orgId
            res.status(400).json({ error: 'Database error while creating team.', details: error.message });
        }
        else {
            res.status(500).json({ error: 'Failed to create team' });
        }
    }
};
// Register routes
router.get('/debug', debugHandler);
router.get('/', auth_1.authenticate, auth_1.extractUserInfo, getAllTeams);
router.get('/selectable', auth_1.authenticate, auth_1.extractUserInfo, getAllSelectableTeams);
router.get('/managed-by/:managerId', auth_1.authenticate, auth_1.extractUserInfo, getTeamsByManagerId);
router.put('/:teamId/assign-manager', auth_1.authenticate, auth_1.extractUserInfo, assignManagerToTeam);
router.get('/:id', auth_1.authenticate, auth_1.extractUserInfo, getTeamById);
router.post('/', auth_1.authenticate, auth_1.extractUserInfo, createTeam);
router.put('/:id', auth_1.authenticate, auth_1.extractUserInfo, updateTeam);
router.delete('/:id', auth_1.authenticate, auth_1.extractUserInfo, deleteTeam);
router.get('/:teamId/employee-count', auth_1.authenticate, auth_1.extractUserInfo, getTeamEmployeeCount);
exports.default = router;
