import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

interface JwtPayload {
  userId: number;
  email: string;
}

const prisma = new PrismaClient();

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
    
    const decodedToken = jwt.verify(token, secretKey) as JwtPayload;
    console.log('Decoded token:', decodedToken);
    
    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId }
    });
    
    if (!user) {
      console.log('User not found in database!');
    } else {
      console.log('User found in database:', {
        id: user.id,
        email: user.email,
        name: user.name
      });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyToken(); 