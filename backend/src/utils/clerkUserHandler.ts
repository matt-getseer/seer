import { PrismaClient, UserRole } from '@prisma/client';
import { users, OrganizationMembership } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

// Get user information from Clerk by userId
export async function getClerkUserInfo(clerkUserId: string) {
  try {
    const user = await users.getUser(clerkUserId);
    return {
      email: user.emailAddresses[0]?.emailAddress,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      clerkId: user.id
    };
  } catch (error) {
    console.error('Error fetching user from Clerk:', error);
    throw new Error('Failed to fetch user information from Clerk');
  }
}

// Find or create a user in our database based on Clerk ID
export async function findOrCreateUser(clerkUserId: string) {
  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    let wasUserNewlyCreated = false;

    if (!user) {
      const userInfo = await getClerkUserInfo(clerkUserId);

      // Ensure email is present
      if (!userInfo.email) {
        console.error(`No email found for Clerk user ${clerkUserId}. Cannot create or link user.`);
        throw new Error(`User email not found for Clerk ID ${clerkUserId}.`);
      }

      user = await prisma.user.findUnique({
        where: { email: userInfo.email },
      });

      if (user) {
        console.log(`Found user by email ${userInfo.email}, updating with Clerk ID ${clerkUserId}`);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId: clerkUserId },
        });
      } else {
        console.log(`Creating new user in local DB for Clerk ID ${clerkUserId}`);
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            clerkId: clerkUserId,
            password: 'clerk-auth-user',
            role: UserRole.MANAGER,
          },
        });
        wasUserNewlyCreated = true;
        console.log(`Successfully created local user ID ${user.id} for Clerk ID ${clerkUserId}`);
      }
    }

    // If user exists (either found or newly created) and their organizationId is not yet set,
    // or if we want to ensure it's up-to-date.
    // For simplicity, we'll attempt to link/update organization info each time if not present,
    // or if it's a new user. More complex logic could check if already linked and matches.
    if (user && (!user.organizationId || wasUserNewlyCreated)) {
      try {
        const organizationMemberships: OrganizationMembership[] = await users.getOrganizationMembershipList({ userId: clerkUserId });

        if (organizationMemberships && organizationMemberships.length > 0) {
          const primaryOrgMembership = organizationMemberships[0];
          const clerkOrganizationId = primaryOrgMembership.organization.id;

          if (clerkOrganizationId) {
            const org = await prisma.organization.findUnique({
              where: { clerkOrganizationId: clerkOrganizationId },
            });

            if (org) {
              if (user.organizationId !== org.id) { // Only update if different or not set
                user = await prisma.user.update({
                  where: { id: user.id },
                  data: { organizationId: org.id },
                });
                console.log(`User ${clerkUserId} (local ID: ${user.id}) linked/updated to organization ${clerkOrganizationId} (local Org ID: ${org.id}) in findOrCreateUser.`);
              }
            } else {
              console.warn(`Organization ${clerkOrganizationId} for user ${clerkUserId} not found locally during findOrCreateUser. The organization.created event/webhook might be pending.`);
            }
          }
        } else {
          console.log(`No organization memberships found for user ${clerkUserId} in findOrCreateUser.`);
        }
      } catch (orgError) {
        console.error(`Error fetching or linking organization for user ${clerkUserId} in findOrCreateUser:`, orgError);
        // Decide if this error should be fatal or just logged. For now, logging.
      }
    }
    
    if (!user) {
      // This case should ideally not be reached if logic above is correct
      throw new Error("Failed to find or create user after all attempts.");
    }

    return user;

  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    // Ensure the error is re-thrown so it can be handled by the caller (e.g., auth middleware)
    throw error; 
  }
} 