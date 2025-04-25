const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to add a benchmark interview for all employees
 * This will be the first interview in their timeline
 */
async function addBenchmarkInterviews() {
  try {
    console.log('Starting benchmark interview creation...');
    
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    let benchmarksAdded = 0;
    
    // For each user, find their employees and add benchmark interviews
    for (const user of users) {
      // Get all employees for this user
      const employees = await prisma.employee.findMany({
        where: { userId: user.id },
        include: {
          team: true
        }
      });
      
      console.log(`Processing ${employees.length} employees for user ${user.email}`);
      
      // For each employee, add a benchmark interview
      for (const employee of employees) {
        // Check if this employee already has a benchmark interview
        const existingBenchmark = await prisma.interview.findFirst({
          where: {
            userId: user.id,
            name: employee.name,
            interviewName: 'Initial Benchmark Assessment'
          }
        });
        
        if (existingBenchmark) {
          console.log(`Benchmark already exists for ${employee.name}, skipping...`);
          continue;
        }
        
        // Calculate benchmark date (30 days after start date or creation)
        const startDate = employee.startDate || new Date();
        const benchmarkDate = new Date(startDate);
        benchmarkDate.setDate(benchmarkDate.getDate() - 30); // Set 30 days before to ensure it's first
        
        // Find the employee's earliest existing interview date
        const earliestInterview = await prisma.interview.findFirst({
          where: {
            userId: user.id,
            name: employee.name
          },
          orderBy: {
            dateTaken: 'asc'
          }
        });
        
        // If there's an existing interview, set the benchmark date before it
        if (earliestInterview) {
          const earliestDate = new Date(earliestInterview.dateTaken);
          earliestDate.setDate(earliestDate.getDate() - 7); // 7 days before earliest
          benchmarkDate.setTime(earliestDate.getTime()); 
        }
        
        // Create the benchmark interview
        const benchmark = await prisma.interview.create({
          data: {
            name: employee.name,
            team: employee.team ? employee.team.name : 'General',
            interviewName: 'Initial Benchmark Assessment',
            dateTaken: benchmarkDate.toISOString(),
            userId: user.id
          }
        });
        
        console.log(`Created benchmark interview for ${employee.name}`);
        benchmarksAdded++;
        
        // Create benchmark answers without the score fields that aren't in the schema
        await prisma.interviewAnswer.create({
          data: {
            interviewId: benchmark.id,
            firstAnswer: `Initial technical assessment for ${employee.name}. This benchmark interview establishes baseline performance metrics for future evaluations.\n\nTechnical Score: 70/100\nStrengths: Basic technical skills, foundational knowledge\nAreas for Improvement: Advanced technical concepts, specialized skills`,
            secondAnswer: `Initial cultural assessment for ${employee.name}. This benchmark interview establishes baseline engagement and team fit metrics for future evaluations.\n\nCulture Score: 75/100\nCommunication Score: 72/100\nOverall Rating: 72/100\nNotes: Good starting point with room for growth and development.`
          }
        });
        
        console.log(`Added interview answers for ${employee.name}'s benchmark`);
      }
    }
    
    console.log(`Successfully added ${benchmarksAdded} benchmark interviews`);
    
  } catch (error) {
    console.error('Error adding benchmark interviews:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
addBenchmarkInterviews()
  .then(() => {
    console.log('Benchmark interview script completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 