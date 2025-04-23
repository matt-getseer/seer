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
// Get all employees for a team
const getTeamEmployees = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Create a new employee
const createEmployee = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Update an employee
const updateEmployee = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Delete an employee
const deleteEmployee = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Get an employee by id
const getEmployeeById = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Get all employees for the authenticated user
const getAllEmployees = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Route handlers
router.get('/', auth_1.authenticate, getAllEmployees);
router.get('/team/:teamId', auth_1.authenticate, getTeamEmployees);
router.get('/:id', auth_1.authenticate, getEmployeeById);
router.post('/', auth_1.authenticate, createEmployee);
router.put('/:id', auth_1.authenticate, updateEmployee);
router.delete('/:id', auth_1.authenticate, deleteEmployee);
exports.default = router;
