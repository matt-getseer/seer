const { PrismaClient } = require('@prisma/client');

async function fixUserIssue() {
  const prisma = new PrismaClient();
  
  try {
    // Get all users
    const allUsers = await prisma.user.findMany();
    console.log('All users in the system:');
    console.log(allUsers);
    
    // Check user 1's data
    const user1Data = await checkUserData(prisma, 1);
    
    // Check user with your email's data
    const userByEmail = await prisma.user.findUnique({
      where: { email: 'matt@getseer.io' }
    });
    
    if (userByEmail) {
      console.log(`\nFound user with email matt@getseer.io: ID ${userByEmail.id}`);
      const userByEmailData = await checkUserData(prisma, userByEmail.id);
      
      // If user 1 has data but the user with your email doesn't, we need to transfer the Clerk ID
      if (user1Data.hasData && !userByEmailData.hasData) {
        console.log('\nUser 1 has data but your account does not. Updating user 1 with your Clerk ID...');
        
        // Update user 1 with the Clerk ID from your account
        await prisma.user.update({
          where: { id: 1 },
          data: { clerkId: userByEmail.clerkId }
        });
        
        console.log(`Updated user 1 with Clerk ID: ${userByEmail.clerkId}`);
      }
    }
    
  } catch (error) {
    console.error('Error in fixUserIssue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkUserData(prisma, userId) {
  console.log(`\nChecking data for user ID ${userId}:`);
  
  const teams = await prisma.team.findMany({
    where: { userId }
  });
  
  const employees = await prisma.employee.findMany({
    where: { userId }
  });
  
  const interviews = await prisma.interview.findMany({
    where: { userId }
  });
  
  console.log(`Teams: ${teams.length}`);
  console.log(`Employees: ${employees.length}`);
  console.log(`Interviews: ${interviews.length}`);
  
  const hasData = teams.length > 0 || employees.length > 0 || interviews.length > 0;
  
  return {
    teams,
    employees,
    interviews,
    hasData
  };
}

fixUserIssue()
  .then(() => console.log('\nDone!'))
  .catch(error => console.error('Script error:', error)); 