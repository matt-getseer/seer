const { PrismaClient } = require('@prisma/client');

async function updateUser1WithClerkId() {
  const prisma = new PrismaClient();
  
  // Use the Clerk ID we already have
  const clerkId = 'user_2wDyW3GSyFNPoyZIjKcMf4KEILj';
  const email = 'matt@getseer.io';
  
  try {
    // First, let's see what user 1 looks like
    const user1 = await prisma.user.findUnique({
      where: { id: 1 }
    });
    
    console.log('Current User 1:', user1);
    
    // Update user 1 with the Clerk ID and also update the email if needed
    const updatedUser = await prisma.user.update({
      where: { id: 1 },
      data: { 
        clerkId,
        email
      }
    });
    
    console.log(`Updated user ID 1 with Clerk ID: ${updatedUser.clerkId}`);
    console.log(`Updated user ID 1 email: ${updatedUser.email}`);
    
    // Now let's check the newly created user 2
    const user2 = await prisma.user.findUnique({
      where: { id: 2 }
    });
    
    if (user2) {
      console.log('User 2 exists. We should delete it to avoid confusion.');
      
      // Delete user 2 since we don't need it
      await prisma.user.delete({
        where: { id: 2 }
      });
      
      console.log('User 2 deleted successfully.');
    }
    
  } catch (error) {
    console.error('Error in updateUser1WithClerkId:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUser1WithClerkId()
  .then(() => console.log('Done!'))
  .catch(error => console.error('Script error:', error)); 