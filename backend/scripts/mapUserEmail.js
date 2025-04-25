const { PrismaClient } = require('@prisma/client');

async function mapUserEmail() {
  const prisma = new PrismaClient();
  const email = 'matt@getseer.io';
  
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`No user found with email: ${email}`);
      
      // Create a new user if one doesn't exist
      const newUser = await prisma.user.create({
        data: {
          email,
          name: 'Matt',
          password: 'clerk-auth-user', // Not used with Clerk auth
        }
      });
      
      console.log(`Created new user with ID: ${newUser.id}`);
      return;
    }

    // Get the Clerk ID from the current session
    console.log(`Found user with ID: ${user.id}`);
    console.log(`Current ClerkID: ${user.clerkId || 'none'}`);
    
    // List all tables accessible to the user
    const allTeams = await prisma.team.findMany({
      where: { userId: user.id }
    });
    
    const allEmployees = await prisma.employee.findMany({
      where: { userId: user.id }
    });
    
    const allInterviews = await prisma.interview.findMany({
      where: { userId: user.id }
    });
    
    console.log(`Teams: ${allTeams.length}`);
    console.log(`Employees: ${allEmployees.length}`);
    console.log(`Interviews: ${allInterviews.length}`);

  } catch (error) {
    console.error('Error in mapUserEmail:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mapUserEmail()
  .then(() => console.log('Done!'))
  .catch(error => console.error('Script error:', error)); 