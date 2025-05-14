import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { findOrCreateUser } from '../utils/clerkUserHandler.js';
import { RequestWithUser } from './types.js'; // Added .js extension
import { UserRole } from '@prisma/client'; // Import UserRole

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
// export interface RequestWithUser extends Request {
//   auth?: {
//     userId: string;
//     sessionId: string;
//   };
//   user?: {
//     userId: number;
//     clerkId: string;
//     email?: string;
//     organizationId?: string | undefined;
//     id?: number;
//     role?: string;
//     [key: string]: any;
//   };
// }

// Middleware for Clerk authentication
export const authenticate = clerkAuth;

// Middleware to extract user info from Clerk and add to our database context
export const extractUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[AuthMiddleware] Extract user info middleware called');
    // Use the imported RequestWithUser for type assertion
    const reqWithAuth = req as RequestWithUser;

    if (!reqWithAuth.auth?.userId) {
      console.warn('[AuthMiddleware] Authentication required: Clerk user ID (req.auth.userId) missing.');
      return res.status(401).json({ error: 'Authentication required: Clerk user ID missing.' });
    }
    
    const clerkId = reqWithAuth.auth.userId;
    console.log('[AuthMiddleware] Clerk user ID found:', clerkId);
    
    try {
      // findOrCreateUser now returns a user with guaranteed email and role (UserRole.MANAGER for new users)
      const userFromDb = await findOrCreateUser(clerkId); 
      
      // Safeguard checks, though findOrCreateUser should guarantee these.
      if (!userFromDb.email) {
        console.error('[AuthMiddleware] Critical error: User email not found after findOrCreateUser for clerkId:', clerkId);
        return res.status(500).json({ error: 'User data incomplete: email missing after DB operation.' });
      }
      // userFromDb.role is now guaranteed by findOrCreateUser to be UserRole type.
      if (!userFromDb.role) { 
        console.error('[AuthMiddleware] Critical error: User role not found after findOrCreateUser for clerkId:', clerkId);
        return res.status(500).json({ error: 'User data incomplete: role missing after DB operation.' });
      }

      // Populate req.user according to the RequestWithUser interface from types.ts
      reqWithAuth.user = {
        id: userFromDb.id,
        clerkId: userFromDb.clerkId || clerkId, // Use clerkId from DB, fallback to auth if needed
        email: userFromDb.email,               // Ensured to be string by findOrCreateUser
        role: userFromDb.role,                 // Ensured to be UserRole by findOrCreateUser
        organizationId: userFromDb.organizationId === null ? undefined : userFromDb.organizationId,
      };
      console.log('[AuthMiddleware] req.user populated:', { id: reqWithAuth.user.id, email: reqWithAuth.user.email, role: reqWithAuth.user.role, organizationId: reqWithAuth.user.organizationId });
      
      next();
    } catch (error) {
      // Log the error from findOrCreateUser or subsequent processing
      console.error('[AuthMiddleware] Error during findOrCreateUser or populating req.user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process user information.';
      return res.status(500).json({ error: errorMessage });
    }
  } catch (error) {
    // This outer catch handles errors like req.auth not being present or other unexpected errors.
    console.error('[AuthMiddleware] Unexpected error in extractUserInfo middleware:', error);
    return res.status(500).json({ error: 'Server error during user authentication process.' });
  }
}; 