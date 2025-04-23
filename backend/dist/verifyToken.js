"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function verifyToken() {
    try {
        // This is just an example token - you would provide your actual token
        // When testing, copy a token from your browser's local storage
        const token = process.argv[2]; // Take token from command line arguments
        if (!token) {
            console.error('Please provide a token as a command line argument');
            return;
        }
        console.log('Token:', token.substring(0, 15) + '...');
        const secretKey = process.env.JWT_SECRET || 'fallback-secret-key';
        console.log('Using secret key:', secretKey === 'fallback-secret-key' ? 'fallback' : 'from env');
        const decodedToken = jsonwebtoken_1.default.verify(token, secretKey);
        console.log('Decoded token:', decodedToken);
        // Check if user exists in database
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId }
        });
        if (!user) {
            console.log('User not found in database!');
        }
        else {
            console.log('User found in database:', {
                id: user.id,
                email: user.email,
                name: user.name
            });
            // Check if user has interviews
            const interviews = await prisma.interview.findMany({
                where: { userId: user.id }
            });
            console.log(`User has ${interviews.length} interviews`);
            if (interviews.length > 0) {
                console.log('Sample interview:', interviews[0]);
            }
        }
    }
    catch (error) {
        console.error('Error verifying token:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
verifyToken();
