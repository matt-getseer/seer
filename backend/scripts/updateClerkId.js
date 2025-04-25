const { PrismaClient } = require('@prisma/client');

async function updateClerkId() {
  const prisma = new PrismaClient();
  const email = 'matt@getseer.io';
  
  // Replace this with your actual Clerk ID after signing in
  const clerkId = 'user_2wDyW3GSyFNPoyZIjKcMf4KEILj'; 
  
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`No user found with email: ${email}`);
      return;
    }

    // Update the Clerk ID
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { clerkId }
    });
    
    console.log(`Updated user ${updatedUser.email} with Clerk ID: ${updatedUser.clerkId}`);
    
  } catch (error) {
    console.error('Error in updateClerkId:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClerkId()
  .then(() => console.log('Done!'))
  .catch(error => console.error('Script error:', error)); 