import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      auth?: {
        userId: string;    // Clerk User ID (e.g., "user_...")
        sessionId?: string; // Clerk Session ID
        orgId?: string | null; // Clerk Organization ID (if any, e.g. "org_...")
      };
      user?: {
        id: number;          // Our internal database User ID (integer PK)
        clerkId: string;     // Clerk User ID (string, from req.auth.userId)
        email: string;       // User's email
        role: UserRole;      // User's role in our system (ADMIN, MANAGER, USER)
        organizationId?: string; // Our internal database Organization ID (UUID string, optional)
      };
    }
  }
}

// This is needed to make the file a module, even if it's empty.
export {}; 