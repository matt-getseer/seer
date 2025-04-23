"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function updateTestUserPassword() {
    try {
        const email = 'test@example.com';
        const newPassword = 'password';
        // Find the user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            console.log('Test user not found');
            return;
        }
        // Hash the new password
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        // Update the user's password
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        console.log('Updated password for user:', { id: updatedUser.id, email: updatedUser.email });
        console.log('New password hash:', hashedPassword);
    }
    catch (error) {
        console.error('Error updating password:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
updateTestUserPassword();
