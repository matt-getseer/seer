const { PrismaClient } = require('@prisma/client');

async function transferDataToUser2() {
  const prisma = new PrismaClient();
  
  try {
    // Get information about both users
    const user1 = await prisma.user.findUnique({
      where: { id: 1 }
    });
    
    const user2 = await prisma.user.findUnique({
      where: { id: 2 }
    });
    
    console.log('Source User (ID 1):', user1);
    console.log('Target User (ID 2):', user2);
    
    // Count data for user 1
    const teamsCount = await prisma.team.count({
      where: { userId: 1 }
    });
    
    const employeesCount = await prisma.employee.count({
      where: { userId: 1 }
    });
    
    const interviewsCount = await prisma.interview.count({
      where: { userId: 1 }
    });
    
    console.log(`\nData to transfer from User 1 to User 2:`);
    console.log(`Teams: ${teamsCount}`);
    console.log(`Employees: ${employeesCount}`);
    console.log(`Interviews: ${interviewsCount}`);
    
    // Start transaction to ensure all updates happen or none do
    console.log('\nStarting data transfer...');
    
    await prisma.$transaction(async (tx) => {
      // Update all teams
      await tx.team.updateMany({
        where: { userId: 1 },
        data: { userId: 2 }
      });
      console.log(`✓ Teams updated`);
      
      // Update all employees
      await tx.employee.updateMany({
        where: { userId: 1 },
        data: { userId: 2 }
      });
      console.log(`✓ Employees updated`);
      
      // Update all interviews
      await tx.interview.updateMany({
        where: { userId: 1 },
        data: { userId: 2 }
      });
      console.log(`✓ Interviews updated`);
    });
    
    console.log('\nVerifying data transfer...');
    
    // Verify the transfer was successful
    const newTeamsCount = await prisma.team.count({
      where: { userId: 2 }
    });
    
    const newEmployeesCount = await prisma.employee.count({
      where: { userId: 2 }
    });
    
    const newInterviewsCount = await prisma.interview.count({
      where: { userId: 2 }
    });
    
    console.log(`User 2 now has:`);
    console.log(`Teams: ${newTeamsCount}`);
    console.log(`Employees: ${newEmployeesCount}`);
    console.log(`Interviews: ${newInterviewsCount}`);
    
    if (newTeamsCount === teamsCount && 
        newEmployeesCount === employeesCount && 
        newInterviewsCount === interviewsCount) {
      console.log('\n✅ Data transfer completed successfully!');
    } else {
      console.log('\n⚠️ Data transfer may be incomplete. Please check the counts above.');
    }
    
  } catch (error) {
    console.error('Error during data transfer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

transferDataToUser2()
  .then(() => console.log('\nScript complete.'))
  .catch(error => console.error('Script failed:', error)); 