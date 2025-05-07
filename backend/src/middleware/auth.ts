import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { findOrCreateUser } from '../utils/clerkUserHandler';

// Clerk middleware setup with debug logging
console.log('Setting up Clerk authentication middleware');

// Check if CLERK_SECRET_KEY is properly set
if (!process.env.CLERK_SECRET_KEY) {
  console.error('WARNING: CLERK_SECRET_KEY environment variable is not set!');
  console.error('Authentication will not work properly.');
  console.error('Please set this variable in your .env file or environment.');
}

// Initialize the Clerk middleware
const clerkAuth = ClerkExpressRequireAuth();

// Extended Request interface with Clerk user data
export interface RequestWithUser extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
  user?: {
    userId: number;
    clerkId: string;
    email?: string;
    organizationId?: string | null;
  };
}

// Our auth middleware using Clerk
export const authenticate = (req: RequestWithUser, res: Response, next: NextFunction) => {
  console.log('Authenticate middleware called, headers:', req.headers.authorization ? 'Authorization present' : 'No authorization header');
  
  // Check if Clerk is properly configured
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('Authentication failed: CLERK_SECRET_KEY not set');
    return res.status(500).json({ error: 'Server authentication configuration error' });
  }
  
  // Pass through to Clerk's authentication middleware
  return clerkAuth(req, res, next);
};

// Middleware to extract user info from Clerk and add to our database context
export const extractUserInfo = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    console.log('Extract user info middleware called');
    if (!req.auth) {
      console.log('No auth object found on request');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Extract Clerk auth info
    const { userId: clerkId } = req.auth;
    console.log('Clerk user ID found:', clerkId);
    
    // Find or create the user in our database
    try {
      const user = await findOrCreateUser(clerkId);
      console.log('User found or created:', user.id);
      
      // Add to request for later use
      req.user = {
        userId: user.id,
        clerkId: user.clerkId || clerkId,
        email: user.email,
        organizationId: user.organizationId
      };
      
      next();
    } catch (error) {
      console.error('Error finding or creating user:', error);
      return res.status(500).json({ error: 'Failed to process user information' });
    }
  } catch (error) {
    console.error('Error extracting user info:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}; 