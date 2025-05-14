import { Request } from 'express';
import { UserRole } from '@prisma/client'; // Import UserRole

// Extended Request interface
export interface RequestWithUser extends Request {
  auth?: { // Populated by Clerk's authenticate middleware
    userId: string;    // Clerk User ID (e.g., "user_...")
    sessionId?: string; // Clerk Session ID
    orgId?: string | null; // Clerk Organization ID (if any, e.g. "org_...")
    // Add other claims from Clerk token if needed, e.g., org_role, org_slug
  };
  user?: { // Populated by our custom extractUserInfo middleware from our DB
    id: number;          // Our internal database User ID (integer PK)
    clerkId: string;     // Clerk User ID (string, from req.auth.userId)
    email: string;       // User's email
    role: UserRole;      // User's role in our system (ADMIN, MANAGER, USER)
    organizationId?: string; // Our internal database Organization ID (UUID string, optional)
    // Add any other consistently available and necessary user properties from DB
  };
} 