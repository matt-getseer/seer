"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Use type assertion to make TypeScript happy with the prisma client
// This is a workaround for the type error with prisma.team
const typedPrismaClient = prisma;
// Debug route to check if teams endpoint is accessible
const debugHandler = async (req, res) => {
    console.log('Debug endpoint accessed');
    res.status(200).json({ message: 'Teams endpoint is accessible' });
};
// Get all teams
const getAllTeams = async (req, res) => {
    try {
        console.log('GET /teams - Headers:', req.headers);
        console.log('GET /teams - Auth user:', req.user);
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
        const teamsWithEmployeeInterviewCounts = teams.map((team) => {
            // Process employees to add interview counts
            const employeesWithInterviewCounts = team.employees.map((employee) => {
                // Count interviews for this employee by name match
                const interviewCount = interviews.filter((interview) => interview.name.toLowerCase() === employee.name.toLowerCase()).length;
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
    }
    catch {
        res.status(500).json({ error: 'Failed to update team' });
    }
};
// Delete a team
const deleteTeam = async (req, res) => {
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
    }
    catch {
        res.status(500).json({ error: 'Failed to delete team' });
    }
};
// Route handlers
router.get('/debug', debugHandler);
router.get('/', auth_1.authenticate, getAllTeams);
router.get('/:id', auth_1.authenticate, getTeamById);
router.put('/:id', auth_1.authenticate, updateTeam);
router.delete('/:id', auth_1.authenticate, deleteTeam);
exports.default = router;
