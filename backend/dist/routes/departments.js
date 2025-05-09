"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client"); // Import necessary types
const auth_1 = require("../middleware/auth"); // Use existing auth middleware
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// GET /api/departments - List all departments for the user's organization
const getAllDepartments = async (req, res) => {
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
            select: {
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
    }
    catch (error) {
        console.error('Error fetching departments:', error);
        if (error instanceof Error) {
            return res.status(500).json({
                error: 'Failed to fetch departments',
                message: error.message,
            });
        }
        else {
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
// POST /api/departments - Create a new department
const createDepartment = async (req, res) => {
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
            select: {
                id: true,
                name: true,
            },
        });
        res.status(201).json(newDepartment);
    }
    catch (error) {
        console.error('Error creating department:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            // Handle potential DB errors like unique constraints if any other than name+orgId
            return res.status(400).json({ error: 'Database error while creating department.', details: error.code });
        }
        else if (error instanceof Error) {
            return res.status(500).json({
                error: 'Failed to create department',
                message: error.message,
            });
        }
        else {
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
// PUT /api/departments/:departmentId/assign-head - Assign a user as department head (Admin only)
const assignDepartmentHead = async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ error: 'User not authenticated properly' });
        }
        // 1. Verify the requesting user is an ADMIN
        const requestingUser = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { role: true, organizationId: true },
        });
        if (!requestingUser) {
            return res.status(404).json({ error: 'Requesting user not found.' });
        }
        if (requestingUser.role !== client_1.UserRole.ADMIN) {
            return res.status(403).json({ error: 'Forbidden: Only admins can assign department heads.' });
        }
        if (!requestingUser.organizationId) {
            return res.status(400).json({ message: 'Admin user is not associated with an organization.' });
        }
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
        if (department.organizationId !== requestingUser.organizationId) {
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
            if (userToAssign.organizationId !== requestingUser.organizationId) {
                return res.status(403).json({ error: "Forbidden: User to assign does not belong to the admin\'s organization." });
            }
            if (userToAssign.role !== client_1.UserRole.MANAGER) {
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
                head: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });
        res.json(updatedDepartment);
    }
    catch (error) {
        console.error('Error assigning department head:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return res.status(400).json({ error: 'Database error while assigning department head.', details: error.code });
        }
        else if (error instanceof Error) {
            return res.status(500).json({
                error: 'Failed to assign department head',
                message: error.message,
            });
        }
        else {
            return res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
};
// Register the route handlers
router.get('/', auth_1.authenticate, auth_1.extractUserInfo, getAllDepartments);
router.post('/', auth_1.authenticate, auth_1.extractUserInfo, createDepartment); // Added POST handler
router.put('/:departmentId/assign-head', auth_1.authenticate, auth_1.extractUserInfo, assignDepartmentHead); // New PUT handler
// Export the router
exports.default = router;
