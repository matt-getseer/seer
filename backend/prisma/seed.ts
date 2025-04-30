/* eslint-env node */
/* global console, process */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// List of countries to randomly assign
const countries = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Australia',
  'Japan',
  'Brazil',
  'India',
  'Mexico',
  'Netherlands',
  'Singapore',
  'Spain',
  'Italy',
  'Sweden'
];

// Function to get a random country from the list
function getRandomCountry(): string {
  const randomIndex = Math.floor(Math.random() * countries.length);
  return countries[randomIndex];
}

async function main() {
  console.log('Starting country seeding...');

  // Fetch all employees that don't have a country assigned yet
  const employeesToUpdate = await prisma.employee.findMany({
    where: {
      country: null, // Only update employees where country is not set
    },
    select: {
      id: true, // Only select the ID
    },
  });

  if (employeesToUpdate.length === 0) {
    console.log('No employees found needing a country assigned.');
    return;
  }

  console.log(`Found ${employeesToUpdate.length} employees to update with a country.`);

  // Create an array of update promises
  const updatePromises = employeesToUpdate.map((employee) => {
    const randomCountry = getRandomCountry();
    console.log(`Assigning ${randomCountry} to employee ${employee.id}`);
    return prisma.employee.update({
      where: { id: employee.id },
      data: { country: randomCountry },
    });
  });

  // Execute all update promises
  try {
    await Promise.all(updatePromises);
    console.log(`Successfully assigned countries to ${employeesToUpdate.length} employees.`);
  } catch (error) {
    console.error('Error occurred during seeding:', error);
    // Depending on the error, you might want more specific handling
  }

  console.log('Country seeding finished.');
}

main()
  .catch((e) => {
    console.error('An error occurred while seeding the database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  }); 