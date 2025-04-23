"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
exports.taskRouter = router;
const prisma = new client_1.PrismaClient();
// Get all tasks
router.get('/', async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});
// Get task by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const task = await prisma.task.findUnique({
            where: { id: Number(id) },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching task' });
    }
});
// Create a new task
router.post('/', async (req, res) => {
    try {
        const { title, description, dueDate, userId } = req.body;
        const task = await prisma.task.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                userId: Number(userId)
            }
        });
        res.status(201).json(task);
    }
    catch (error) {
        res.status(500).json({ error: 'Error creating task' });
    }
});
// Update task
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, completed, dueDate } = req.body;
        const task = await prisma.task.update({
            where: { id: Number(id) },
            data: {
                title,
                description,
                completed,
                dueDate: dueDate ? new Date(dueDate) : undefined
            }
        });
        res.json(task);
    }
    catch (error) {
        res.status(500).json({ error: 'Error updating task' });
    }
});
// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.task.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error deleting task' });
    }
});
