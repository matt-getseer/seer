"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node"); // Added Clerk SDK client
const accessControlService_1 = require("../services/accessControlService"); // Import new services
const router = express_1.default.Router();
exports.userRouter = router;
const prisma = new client_1.PrismaClient();
// Define the user select fields based on the Prisma schema
const userSelectFields = {
    id: true,
    email: true,
    name: true,
    clerkId: true,
    createdAt: true,
    updatedAt: true,
    role: true
};
// Helper function to check for valid UserRole enum values
function isValidUserRole(role) {
    return Object.values(client_1.UserRole).includes(role);
}
// Get all users
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: userSelectFields
        });
        res.json(users);
    }
    catch (error) {
        next(error);
    }
};
// Get user by ID
const getUserById = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Get the current authenticated user
const getCurrentUser = async (req, res, next) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Fetch the raw Prisma user to get role and auth tokens
        const prismaUser = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                name: true,
                clerkId: true,
                createdAt: true,
                updatedAt: true,
                googleRefreshToken: true,
                zoomRefreshToken: true,
                role: true,
                // Do NOT select password or other sensitive tokens unless explicitly needed by services
            },
        });
        if (!prismaUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Cast prismaUser to the User type expected by accessControlService.
        // This assumes the service functions correctly handle potentially missing optional fields
        // and only use the necessary ones (like id and role for USER logic).
        const currentUserForService = prismaUser; // PrismaUser is already alias for User from @prisma/client
        let employeeProfile = null;
        let meetings = [];
        // Fetch employee profile details if the user has a role (especially for USER role)
        // Admins/Managers might also get their "employee" view this way if they are also employees.
        const employeeDataArray = await (0, accessControlService_1.getAccessibleEmployees)(currentUserForService);
        if (employeeDataArray.length > 0) {
            employeeProfile = employeeDataArray[0]; // Assuming the first record is the relevant one
        }
        // Fetch meetings for the current user
        meetings = await (0, accessControlService_1.getAccessibleMeetings)(currentUserForService);
        const responseData = {
            id: prismaUser.id,
            email: prismaUser.email,
            name: prismaUser.name,
            clerkId: prismaUser.clerkId,
            createdAt: prismaUser.createdAt,
            updatedAt: prismaUser.updatedAt,
            role: prismaUser.role,
            hasGoogleAuth: !!prismaUser.googleRefreshToken,
            hasZoomAuth: !!prismaUser.zoomRefreshToken,
            employeeProfile: employeeProfile, // Add employee profile
            meetings: meetings, // Add meetings
        };
        res.json(responseData);
    }
    catch (error) {
        next(error);
    }
};
// New handler to get all managers (Admin only)
const getAllManagers = async (req, res, next) => {
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
        if (currentUser.role !== client_1.UserRole.ADMIN) {
            return res.status(403).json({ error: 'Forbidden: Only admins can access the list of managers.' });
        }
        // Fetch users with the MANAGER role
        const managers = await prisma.user.findMany({
            where: {
                role: client_1.UserRole.MANAGER
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });
        res.json(managers);
    }
    catch (error) {
        next(error);
    }
};
// Update assigned teams for a manager (Admin only)
const updateManagerAssignedTeams = async (req, res, next) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const requestingUser = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { role: true }
        });
        if (!requestingUser || requestingUser.role !== client_1.UserRole.ADMIN) {
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
        if (!managerUser || managerUser.role !== client_1.UserRole.MANAGER) {
            // Or if you allow assigning teams to non-managers, this check can be removed/modified
            return res.status(404).json({ error: 'Target user is not a manager or does not exist.' });
        }
        await prisma.$transaction(async (tx) => {
            // 1. Unassign all teams currently managed by this manager ID
            //    This means setting Team.userId to the ID of the admin making the change.
            await tx.team.updateMany({
                where: { userId: numericManagerId },
                data: { userId: req.user.userId },
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
    }
    catch (error) {
        console.error('Error updating manager team assignments:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // This error code can occur if one of the team IDs in `teamIds` doesn't exist.
            return res.status(404).json({ error: 'One or more specified teams not found.' });
        }
        next(error); // Pass to global error handler
    }
};
// New endpoint to update a user's application-specific role
const updateUserAppRole = async (req, res, next) => {
    try {
        const adminMakingRequest = req.user;
        const targetUserId = parseInt(req.params.userId, 10);
        const { role: newAppRole } = req.body;
        if (!adminMakingRequest || !adminMakingRequest.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const adminUser = await prisma.user.findUnique({
            where: { id: adminMakingRequest.userId },
            select: { role: true },
        });
        if (!adminUser || adminUser.role !== client_1.UserRole.ADMIN) {
            return res.status(403).json({ error: 'Forbidden: Only admins can change user application roles.' });
        }
        if (isNaN(targetUserId)) {
            return res.status(400).json({ error: 'Invalid target user ID.' });
        }
        if (!newAppRole || !isValidUserRole(newAppRole)) {
            return res.status(400).json({ error: `Invalid role provided. Must be one of: ${Object.values(client_1.UserRole).join(', ')}` });
        }
        if (targetUserId === adminMakingRequest.userId) {
            return res.status(400).json({ error: "Admins cannot change their own application role using this endpoint." });
        }
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found.' });
        }
        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { role: newAppRole },
            select: userSelectFields,
        });
        res.json(updatedUser);
    }
    catch (error) {
        next(error);
    }
};
// New endpoint for an admin to invite a user via Clerk, passing app_role in metadata
const inviteUserToClerkOrganization = async (req, res, next) => {
    try {
        const adminMakingRequest = req.user;
        const { email: emailAddress, appRole, organizationId } = req.body; // appRole is your ADMIN/MANAGER/USER
        if (!adminMakingRequest || !adminMakingRequest.userId || !adminMakingRequest.clerkId) {
            return res.status(401).json({ error: 'Not authenticated or admin Clerk ID missing.' });
        }
        const adminUser = await prisma.user.findUnique({ where: { id: adminMakingRequest.userId } });
        if (!adminUser || adminUser.role !== client_1.UserRole.ADMIN) {
            return res.status(403).json({ error: 'Forbidden: Only admins can invite users.' });
        }
        if (!emailAddress || !appRole || !organizationId) {
            return res.status(400).json({ error: 'Missing email, appRole, or organizationId in request body.' });
        }
        if (!isValidUserRole(appRole)) {
            return res.status(400).json({ error: `Invalid appRole. Must be one of: ${Object.values(client_1.UserRole).join(', ')}` });
        }
        const clerkOrgRole = 'org:member'; // Default role in Clerk's system for the organization
        const redirectUrl = process.env.CLERK_INVITATION_REDIRECT_URL || `${process.env.FRONTEND_URL}/accept-invitation`; // Define in .env
        const invitation = await clerk_sdk_node_1.clerkClient.organizations.createOrganizationInvitation({
            organizationId: organizationId, // Corrected to camelCase
            emailAddress: emailAddress, // Corrected to camelCase
            inviterUserId: adminMakingRequest.clerkId, // Corrected to camelCase
            role: clerkOrgRole, // role is usually as-is
            publicMetadata: { app_role: appRole }, // publicMetadata content is custom
            redirectUrl: redirectUrl, // Corrected to camelCase
        });
        res.status(201).json(invitation);
    }
    catch (error) {
        console.error("Error creating Clerk organization invitation:", error.response?.data || error.message);
        const clerkErrors = error.response?.data?.errors;
        if (clerkErrors) {
            return res.status(400).json({ error: "Clerk API error", details: clerkErrors });
        }
        next(error);
    }
};
// Route handlers - protected by Clerk authentication
router.get('/me', auth_1.authenticate, auth_1.extractUserInfo, getCurrentUser);
router.get('/managers', auth_1.authenticate, auth_1.extractUserInfo, getAllManagers);
router.put('/:managerId/assigned-teams', auth_1.authenticate, auth_1.extractUserInfo, updateManagerAssignedTeams);
router.get('/:id', auth_1.authenticate, auth_1.extractUserInfo, getUserById);
// Admin-only endpoint
router.get('/', auth_1.authenticate, auth_1.extractUserInfo, getAllUsers);
// Add new routes
router.put('/:userId/app-role', auth_1.authenticate, auth_1.extractUserInfo, updateUserAppRole);
router.post('/clerk-invite', auth_1.authenticate, auth_1.extractUserInfo, inviteUserToClerkOrganization);
