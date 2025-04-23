"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function registerTestUser() {
    try {
        const email = 'test@example.com';
        const password = 'password';
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            console.log('Test user already exists');
            return;
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                name: 'Test User',
                password: hashedPassword
            }
        });
        console.log('Test user created:', user);
    }
    catch (error) {
        console.error('Error creating test user:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
registerTestUser();
