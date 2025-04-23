"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
async function seedEmployees() {
    try {
        console.log('Starting employee seeding...');
        // First, get a valid user to assign as the owner of these employees
        const user = await prisma.user.findFirst({
            where: { email: 'test@example.com' }
        });
        if (!user) {
            console.error('No test user found! Please run the seed script first.');
            return;
        }
        console.log(`Using user with ID: ${user.id}`);
        // Get existing teams or create some if none exist
        let teams = await prisma.team.findMany({
            where: { userId: user.id }
        });
        if (teams.length === 0) {
            console.log('No teams found. Creating sample teams...');
            const teamNames = [
                { name: 'Engineering', department: 'Technology' },
                { name: 'Product', department: 'Product' },
                { name: 'Design', department: 'Product' },
                { name: 'Marketing', department: 'Marketing' },
                { name: 'Sales', department: 'Revenue' },
                { name: 'Customer Success', department: 'Revenue' },
                { name: 'Finance', department: 'Operations' },
                { name: 'HR', department: 'Operations' },
                { name: 'Legal', department: 'Operations' },
                { name: 'Executive', department: 'Leadership' }
            ];
            for (const team of teamNames) {
                await prisma.team.create({
                    data: {
                        name: team.name,
                        department: team.department,
                        userId: user.id
                    }
                });
            }
            // Get the newly created teams
            teams = await prisma.team.findMany({
                where: { userId: user.id }
            });
            console.log(`Created ${teams.length} teams`);
        }
        else {
            console.log(`Found ${teams.length} existing teams`);
        }
        // Job titles by department
        const jobTitlesByTeam = {
            'Engineering': [
                'Software Engineer', 'Senior Software Engineer', 'Principal Engineer',
                'DevOps Engineer', 'QA Engineer', 'Frontend Engineer', 'Backend Engineer',
                'Full Stack Engineer', 'Engineering Manager', 'CTO'
            ],
            'Product': [
                'Product Manager', 'Senior Product Manager', 'Product Director',
                'Product Owner', 'Product Analyst', 'Product Designer', 'CPO'
            ],
            'Design': [
                'UX Designer', 'UI Designer', 'UX/UI Designer', 'Visual Designer',
                'Product Designer', 'Design Manager', 'Creative Director'
            ],
            'Marketing': [
                'Marketing Manager', 'Content Strategist', 'SEO Specialist',
                'Digital Marketing Manager', 'Growth Marketer', 'CMO'
            ],
            'Sales': [
                'Sales Representative', 'Account Executive', 'Sales Manager',
                'Sales Director', 'Business Development Rep', 'CRO'
            ],
            'Customer Success': [
                'Customer Success Manager', 'Support Specialist', 'Account Manager',
                'Customer Experience Manager', 'VP of Customer Success'
            ],
            'Finance': [
                'Financial Analyst', 'Accountant', 'Controller', 'CFO'
            ],
            'HR': [
                'HR Manager', 'Recruiter', 'People Operations Manager', 'CHRO'
            ],
            'Legal': [
                'Legal Counsel', 'Contract Specialist', 'General Counsel'
            ],
            'Executive': [
                'CEO', 'COO', 'President', 'Vice President'
            ]
        };
        // Default to generic titles if team not found in mapping
        const defaultTitles = [
            'Associate', 'Manager', 'Director', 'VP', 'Specialist', 'Coordinator'
        ];
        // Generate 100 employee records
        const employees = [];
        const existingEmails = new Set();
        for (let i = 0; i < 100; i++) {
            // Select a random team
            const team = teams[Math.floor(Math.random() * teams.length)];
            // Get appropriate job titles for this team
            const teamTitles = jobTitlesByTeam[team.name] || defaultTitles;
            const title = teamTitles[Math.floor(Math.random() * teamTitles.length)];
            // Generate a unique email
            let email;
            do {
                email = faker_1.faker.internet.email().toLowerCase();
            } while (existingEmails.has(email));
            existingEmails.add(email);
            // Create an employee record with a random start date in the past 5 years
            const startDate = faker_1.faker.date.past({ years: 5 });
            employees.push({
                name: faker_1.faker.person.fullName(),
                title,
                email,
                teamId: team.id,
                userId: user.id,
                startDate
            });
        }
        // Insert the employee records in batches
        console.log('Inserting employee records...');
        // We'll use createMany but need to handle in batches if the database doesn't support it
        const BATCH_SIZE = 25;
        for (let i = 0; i < employees.length; i += BATCH_SIZE) {
            const batch = employees.slice(i, i + BATCH_SIZE);
            await prisma.employee.createMany({
                data: batch,
                skipDuplicates: true
            });
            console.log(`Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(employees.length / BATCH_SIZE)}`);
        }
        console.log('Employee seeding completed successfully!');
    }
    catch (error) {
        console.error('Error during employee seeding:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the seed function
seedEmployees()
    .catch(e => {
    console.error('Error executing seed script:', e);
    process.exit(1);
})
    .finally(() => {
    console.log('Seed script execution completed');
});
