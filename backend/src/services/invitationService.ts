import { PrismaClient, UserRole, InvitationStatus } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { v4 as uuidv4 } from 'uuid';
import { isOrganizationsEnabled, DEFAULT_ORGANIZATION_ID, getOrganizationId } from '../config/featureFlags.js';
import { getQueryOrganizationId } from '../utils/queryBuilder.js';
import { sendNotificationEmail } from './emailService.js';

const prisma = new PrismaClient();

// Maximum number of active invitations a manager can have
const MAX_ACTIVE_INVITATIONS = 3;
// Invitation expiry in days
const INVITATION_EXPIRY_DAYS = 7;

// --- Helper Interfaces for Raw Query Results ---
interface CountResult {
  count: bigint; // Prisma $queryRaw for COUNT(*) returns bigint
}

interface DbInvitation {
  id: string;
  email: string;
  status: InvitationStatus; // Use imported enum
  expiresAt: Date;
  teamId: number;
  managerId: number;
  organizationId: string;
  clerkInvitationId: string;
  // Add other fields if selected by '*' and used, e.g., createdAt, updatedAt
  createdAt: Date; 
  updatedAt: Date;
}

interface DbManagerInvitation extends DbInvitation {
  teamName: string;
}
// --- End Helper Interfaces ---

/**
 * Create a new team invitation
 */
export const createInvitation = async (
  managerId: number,
  managerClerkId: string,
  email: string,
  teamId: number,
  organizationId?: string
) => {
  // Get the effective organization ID (using default if feature flag is off)
  const effectiveOrgId = getOrganizationId(organizationId);

  // Check if the manager has reached their invitation limit
  const activeInvitationsResult = await prisma.$queryRaw<CountResult[]>`
    SELECT COUNT(*) as count FROM "Invitation" 
    WHERE "managerId" = ${managerId} AND "status" = ${InvitationStatus.PENDING}::text::"InvitationStatus"
  `;
  // Ensure result and count property exist before parsing
  const invitationCount = activeInvitationsResult && activeInvitationsResult.length > 0 && activeInvitationsResult[0].count
    ? parseInt(activeInvitationsResult[0].count.toString(), 10)
    : 0;

  if (invitationCount >= MAX_ACTIVE_INVITATIONS) {
    throw new Error(`Manager has reached the maximum limit of ${MAX_ACTIVE_INVITATIONS} active invitations.`);
  }

  // Calculate expiry date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  // Verify the team exists and the manager has access to it
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      userId: managerId,
    },
  });

  if (!team) {
    throw new Error('Team not found or manager does not have access to this team.');
  }

  // Verify the organization exists
  const organization = await prisma.organization.findUnique({
    where: {
      id: effectiveOrgId,
    },
  });

  if (!organization) {
    throw new Error('Organization not found.');
  }

  // Check if the user is already a member of the team
  const existingEmployee = await prisma.employee.findFirst({
    where: {
      email,
      teamId,
    },
  });

  if (existingEmployee) {
    throw new Error('User is already a member of this team.');
  }

  // Check for an existing active invitation
  const existingInvitations = await prisma.$queryRaw<DbInvitation[]>`
    SELECT * FROM "Invitation" 
    WHERE "email" = ${email} AND "teamId" = ${teamId} 
    AND "status" = ${InvitationStatus.PENDING}::text::"InvitationStatus"
    LIMIT 1
  `;

  if (existingInvitations && existingInvitations.length > 0) {
    throw new Error('An active invitation already exists for this email and team.');
  }

  // Create the invitation in Clerk first
  const redirectUrl = process.env.CLERK_INVITATION_REDIRECT_URL || `${process.env.FRONTEND_URL}/accept-invitation`;
  const clerkOrgRole = 'org:member';
  const newDbInvitationId = uuidv4(); // Generate ID for our DB
  const clerkInvitationAppMetadataId = uuidv4(); // Generate ID for Clerk metadata tracking

  try {
    const clerkInvitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: organization.clerkOrganizationId,
      emailAddress: email,
      inviterUserId: managerClerkId,
      role: clerkOrgRole,
      publicMetadata: { 
        app_role: UserRole.USER,
        team_id: teamId,
        manager_id: managerId,
        app_invitation_id: clerkInvitationAppMetadataId // Use a consistent name like app_invitation_id
      },
      redirectUrl,
    });

    // Create the invitation in our database
    // $executeRaw does not return the record, so we use the generated ID
    await prisma.$executeRaw`
      INSERT INTO "Invitation" ("id", "email", "status", "expiresAt", "teamId", "managerId", "organizationId", "clerkInvitationId", "createdAt", "updatedAt")
      VALUES (${newDbInvitationId}, ${email}, ${InvitationStatus.PENDING}::text::"InvitationStatus", ${expiresAt}, ${teamId}, ${managerId}, ${effectiveOrgId}, ${clerkInvitation.id}, NOW(), NOW())
    `;

    return {
      id: newDbInvitationId, // Return the ID we generated and inserted
      email,
      status: InvitationStatus.PENDING,
      expiresAt,
      teamId,
      managerId,
      organizationId: effectiveOrgId,
      clerkInvitationId: clerkInvitation.id
    };
  } catch (error: any) {
    console.error('Error creating Clerk invitation:', error.response?.data || error.message);
    throw new Error(`Failed to create invitation: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
};

/**
 * Get all invitations for a manager
 */
export const getManagerInvitations = async (managerId: number) => {
  return prisma.$queryRaw<DbManagerInvitation[]>`
    SELECT i.*, t.name as "teamName"
    FROM "Invitation" i
    JOIN "Team" t ON i."teamId" = t.id
    WHERE i."managerId" = ${managerId}
    ORDER BY i."createdAt" DESC
  `;
};

/**
 * Revoke an invitation
 */
export const revokeInvitation = async (invitationId: string, managerId: number) => {
  const invitations = await prisma.$queryRaw<DbInvitation[]>`
    SELECT * FROM "Invitation"
    WHERE "id" = ${invitationId}
    AND "managerId" = ${managerId}
    AND "status" = ${InvitationStatus.PENDING}::text::"InvitationStatus"
    LIMIT 1
  `;

  if (!invitations || invitations.length === 0) {
    throw new Error('Invitation not found or already processed.');
  }

  const invitationData = invitations[0];

  try {
    // Revoke the invitation in Clerk
    await clerkClient.organizations.revokeOrganizationInvitation({
      organizationId: invitationData.organizationId,
      invitationId: invitationData.clerkInvitationId,
      requestingUserId: managerId.toString() // Add the required param
    });

    // Update the invitation status in our database
    await prisma.$executeRaw`
      UPDATE "Invitation"
      SET "status" = ${InvitationStatus.REVOKED}::text::"InvitationStatus", "updatedAt" = NOW()
      WHERE "id" = ${invitationId}
    `;

    return { id: invitationId, status: InvitationStatus.REVOKED };
  } catch (error: any) {
    console.error('Error revoking Clerk invitation:', error.response?.data || error.message);
    throw new Error(`Failed to revoke invitation: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
};

/**
 * Mark an invitation as accepted
 */
export const acceptInvitation = async (clerkInvitationId: string, userId: number) => {
  const invitations = await prisma.$queryRaw<DbInvitation[]>`
    SELECT * FROM "Invitation"
    WHERE "clerkInvitationId" = ${clerkInvitationId}
    LIMIT 1
  `;

  if (!invitations || invitations.length === 0 || invitations[0].status !== InvitationStatus.PENDING) {
    throw new Error('Invitation not found or already processed.');
  }

  const invitationData = invitations[0];

  // Update the invitation status
  await prisma.$executeRaw`
    UPDATE "Invitation"
    SET "status" = ${InvitationStatus.ACCEPTED}::text::"InvitationStatus", "updatedAt" = NOW()
    WHERE "id" = ${invitationData.id}
  `;

  return { id: invitationData.id, status: InvitationStatus.ACCEPTED };
};

/**
 * Clean up expired invitations
 */
export const cleanupExpiredInvitations = async () => {
  const now = new Date();
  
  const expiredInvitations = await prisma.$queryRaw<DbInvitation[]>`
    SELECT * FROM "Invitation"
    WHERE "status" = ${InvitationStatus.PENDING}::text::"InvitationStatus"
    AND "expiresAt" < ${now}
  `;

  // Update expired invitations in our database
  await prisma.$executeRaw`
    UPDATE "Invitation"
    SET "status" = ${InvitationStatus.EXPIRED}::text::"InvitationStatus", "updatedAt" = NOW()
    WHERE "status" = ${InvitationStatus.PENDING}::text::"InvitationStatus"
    AND "expiresAt" < ${now}
  `;

  // Try to revoke the expired invitations in Clerk
  for (const invitation of expiredInvitations) {
    try {
      await clerkClient.organizations.revokeOrganizationInvitation({
        organizationId: invitation.organizationId,
        invitationId: invitation.clerkInvitationId,
        requestingUserId: invitation.managerId.toString()
      });
    } catch (error) {
      console.error(`Failed to revoke expired invitation ${invitation.id} in Clerk:`, error);
      // Continue with the next invitation even if this one fails
    }
  }

  return expiredInvitations.length;
}; 