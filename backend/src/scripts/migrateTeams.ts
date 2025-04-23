import { PrismaClient } from '@prisma/client';

async function migrateTeamsFromInterviews() {
  const prisma = new PrismaClient();

  try {
    console.log('Starting team migration...');

    // Get all unique team names from interviews
    const interviews = await prisma.interview.findMany({
      select: {
        team: true,
        userId: true
      }
    });

    // Create a unique set of team-userId combinations
    const uniqueTeams = new Set(
      interviews.map(interview => JSON.stringify({
        team: interview.team,
        userId: interview.userId
      }))
    );

    console.log(`Found ${uniqueTeams.size} unique teams to migrate`);

    // Convert back to array of objects
    const teamsToCreate = Array.from(uniqueTeams).map(team => JSON.parse(team));

    // Create teams
    for (const teamData of teamsToCreate) {
      const existingTeam = await prisma.team.findFirst({
        where: {
          name: teamData.team,
          userId: teamData.userId
        }
      });

      if (!existingTeam) {
        await prisma.team.create({
          data: {
            name: teamData.team,
            department: teamData.team, // Using team name as department initially
            userId: teamData.userId
          }
        });
        console.log(`Created team: ${teamData.team}`);
      } else {
        console.log(`Team ${teamData.team} already exists for user ${teamData.userId}`);
      }
    }

    console.log('Team migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTeamsFromInterviews(); 