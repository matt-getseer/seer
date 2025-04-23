"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
exports.userRouter = router;
const prisma = new client_1.PrismaClient();
// Get all users
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
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
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
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
// Create a new user (register)
const registerUser = async (req, res, next) => {
    try {
        const { email, name, password } = req.body;
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.status(201).json(user);
    }
    catch (error) {
        next(error);
    }
};
// Login
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email, password: '******' });
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            console.log('User not found:', email);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        console.log('User found:', { id: user.id, email: user.email });
        // Compare passwords
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        console.log('Password comparison result:', isPasswordValid);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret-key', { expiresIn: '1h' });
        console.log('Login successful for:', email);
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};
// Route handlers
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/register', registerUser);
router.post('/login', loginUser);
