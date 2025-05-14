import { UserRole } from '@prisma/client'; // Adjust path if necessary

// This is based on the structure in backend/src/middleware/types.ts
interface AppUser {
  id: number;
  clerkId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

interface AppAuth {
  userId: string;
  sessionId?: string;
  orgId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AppAuth;
      user?: AppUser;
      organizationId?: string; // Added from orgContext.ts
    }
  }
}

// Export something to make it a module, if necessary, or leave as global augmentation.
// For .d.ts files that only contain global declarations, no export is needed.
export {}; 