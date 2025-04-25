import { PrismaClient } from '@prisma/client';
import { users } from '@clerk/clerk-sdk-node';

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
    // First check if user exists by clerkId
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId }
    });

    // If user exists, return it
    if (user) {
      return user;
    }

    // User doesn't exist, fetch info from Clerk
    const userInfo = await getClerkUserInfo(clerkUserId);

    // Try to find user by email (for migrated users)
    user = await prisma.user.findUnique({
      where: { email: userInfo.email }
    });

    // If user exists by email, update with clerkId and return
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerkId: clerkUserId }
      });
      return user;
    }

    // User doesn't exist at all, create new user
    user = await prisma.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name,
        clerkId: clerkUserId,
        // For existing schema compatibility
        password: 'clerk-auth-user' // Not used with Clerk auth
      }
    });

    return user;
  } catch (error) {
    console.error('Error finding or creating user:', error);
    throw new Error('Failed to find or create user');
  }
} 