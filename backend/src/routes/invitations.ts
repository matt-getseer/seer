import express, { Request, Response, NextFunction } from 'express';
import { authenticate, extractUserInfo } from '../middleware/auth.js';
import { RequestWithUser } from '../middleware/types.js';
import { UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { 
  createInvitation, 
  getManagerInvitations, 
  revokeInvitation, 
  cleanupExpiredInvitations 
} from '../services/invitationService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Verify the user has manager permissions
const verifyManagerRole = (req: Request, res: Response, next: NextFunction) => {
  const reqWithUser = req as RequestWithUser;
  // After extractUserInfo, req.user should be populated if successful
  if (!reqWithUser.user || (reqWithUser.user.role !== UserRole.MANAGER && reqWithUser.user.role !== UserRole.ADMIN)) {
    return res.status(403).json({ error: 'Forbidden: Manager or Admin role required' });
  }
  next();
};

/**
 * Create a new team invitation
 * POST /api/invitations
 */
const createTeamInvitation = async (req: Request, res: Response, next: NextFunction) => {
  const reqWithUser = req as RequestWithUser;
  if (!reqWithUser.user) {
    return res.status(401).json({ error: 'User not authenticated or user data not processed.' });
  }
  try {
    // req.user and its properties should be guaranteed by preceding middleware if execution reaches here
    if (!reqWithUser.user?.id || !reqWithUser.user.clerkId || reqWithUser.user.organizationId === undefined) {
       // Check organizationId against undefined now
      return res.status(400).json({ error: 'User information incomplete for creating invitation.' });
    }
      
    const { email, teamId } = req.body;
    const managerId = reqWithUser.user.id; // internal DB ID
    const managerClerkId = reqWithUser.user.clerkId; // Clerk ID
    const organizationId = reqWithUser.user.organizationId; 


    if (!email || !teamId) {
      return res.status(400).json({ error: 'Email and team ID are required' });
    }
    
    // Ensure organizationId is not null before passing if your service expects string
    // For now, assuming createInvitation can handle null or feature flag logic will provide default.
    // If createInvitation requires a non-null string, add check:
    if (organizationId === null) {
        // This case should ideally be handled by feature flag logic defaulting to a specific org ID
        // or the user should always have an organization if ENABLE_ORGANIZATIONS is true.
        // Depending on mvp.txt, if ENABLE_ORGANIZATIONS is false, a default should be used.
        // This check might be better placed in the service or based on feature flag.
        // For now, if it can be null based on DB and req.user type, this check is important IF createInvitation needs string.
        // Let's assume createInvitation or getOrganizationId (in service) handles nullable organizationId.
        console.warn('[createTeamInvitation] organizationId is null. Ensure service layer or feature flags handle this.')
    }


    // Pass organizationId (which can be string | null) to the service.
    // The service (createInvitation) is responsible for using DEFAULT_ORGANIZATION_ID if this is null AND feature flag is off.
    const invitation = await createInvitation(managerId, managerClerkId, email, teamId, organizationId);
    res.status(201).json(invitation);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Get manager's invitations
 * GET /api/invitations
 */
const getInvitations = async (req: Request, res: Response, next: NextFunction) => {
  const reqWithUser = req as RequestWithUser;
  if (!reqWithUser.user) {
    return res.status(401).json({ error: 'User not authenticated or user data not processed.' });
  }
  try {
    if (!reqWithUser.user?.id) {
      return res.status(400).json({ error: 'User ID not found for fetching invitations.' });
    }
    const managerId = reqWithUser.user.id; // internal DB ID
    const invitations = await getManagerInvitations(managerId);
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke an invitation
 * DELETE /api/invitations/:id
 */
const revokeTeamInvitation = async (req: Request, res: Response, next: NextFunction) => {
  const reqWithUser = req as RequestWithUser;
  if (!reqWithUser.user) {
    return res.status(401).json({ error: 'User not authenticated or user data not processed.' });
  }
  try {
    if (!reqWithUser.user?.id) {
      return res.status(400).json({ error: 'User ID not found for revoking invitation.' });
    }
    const invitationId = req.params.id;
    const managerId = reqWithUser.user.id; // internal DB ID

    await revokeInvitation(invitationId, managerId);
    res.json({ message: 'Invitation revoked successfully' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Clean up expired invitations (for cron job)
 * POST /api/invitations/cleanup
 */
const cleanupInvitations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await cleanupExpiredInvitations();
    res.json({ message: `Cleaned up ${count} expired invitations` });
  } catch (error) {
    next(error);
  }
};

// Routes
router.post('/', authenticate, extractUserInfo, verifyManagerRole, createTeamInvitation);
router.get('/', authenticate, extractUserInfo, verifyManagerRole, getInvitations);
router.delete('/:id', authenticate, extractUserInfo, verifyManagerRole, revokeTeamInvitation);
router.post('/cleanup', cleanupInvitations);

export { router as invitationRouter }; 