"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Interview types that could be used based on department or role
const interviewTypes = {
    technical: [
        'Technical Assessment',
        'Coding Challenge',
        'System Design Interview',
        'Architecture Review',
        'Problem Solving Session',
        'Algorithm Challenge',
        'Technical Deep Dive'
    ],
    product: [
        'Product Strategy Discussion',
        'User Experience Workshop',
        'Product Vision Session',
        'Roadmap Planning',
        'Customer Needs Analysis',
        'Feature Prioritization Exercise'
    ],
    design: [
        'Design Portfolio Review',
        'UX Evaluation',
        'Design Challenge',
        'Design System Discussion',
        'Usability Testing Review',
        'Visual Design Assessment'
    ],
    leadership: [
        'Leadership Assessment',
        'Team Building Exercise',
        'Management Style Evaluation',
        'Strategic Planning Session',
        'Leadership Philosophy Discussion',
        'Executive Assessment'
    ],
    general: [
        'Cultural Fit Interview',
        'Values Alignment Discussion',
        'Behavioral Interview',
        'Career Progression Discussion',
        'Competency Assessment',
        'Team Collaboration Evaluation'
    ]
};
// Map department/team to the appropriate interview types
function getInterviewTypesByTeam(teamName) {
    const lowerTeam = teamName.toLowerCase();
    if (['engineering', 'development', 'devops', 'qa', 'tech'].some(t => lowerTeam.includes(t))) {
        return [...interviewTypes.technical, ...interviewTypes.general];
    }
    if (['product', 'marketing', 'growth'].some(t => lowerTeam.includes(t))) {
        return [...interviewTypes.product, ...interviewTypes.general];
    }
    if (['design', 'ux', 'ui', 'creative'].some(t => lowerTeam.includes(t))) {
        return [...interviewTypes.design, ...interviewTypes.general];
    }
    if (['executive', 'ceo', 'cto', 'cfo', 'leadership'].some(t => lowerTeam.includes(t)) ||
        ['manager', 'director', 'head', 'lead', 'chief'].some(t => lowerTeam.includes(t))) {
        return [...interviewTypes.leadership, ...interviewTypes.general];
    }
    return interviewTypes.general;
}
async function seedInterviewsFromEmployees() {
    try {
        console.log('Starting interview data seeding from employee records...');
        // Get employees from the database
        const employees = await prisma.employee.findMany({
            include: {
                team: true,
                user: true
            }
        });
        if (employees.length === 0) {
            console.error('No employees found in the database. Run the employee seed script first.');
            return;
        }
        console.log(`Found ${employees.length} employees to create interviews for`);
        // We'll create between 1-3 interviews for a random selection of 60% of employees
        const employeesToInterview = employees
            .sort(() => Math.random() - 0.5) // Shuffle array
            .slice(0, Math.floor(employees.length * 0.6)); // Take 60% of employees
        console.log(`Selected ${employeesToInterview.length} employees to create interviews for`);
        const interviews = [];
        for (const employee of employeesToInterview) {
            // Determine how many interviews to create for this employee (1-3)
            const interviewCount = Math.floor(Math.random() * 3) + 1;
            // Get appropriate interview types based on team/role
            const suitableInterviewTypes = getInterviewTypesByTeam(employee.team.name);
            // Create randomized interview dates
            // - Some happen before the employee start date (part of hiring process)
            // - Some happen after start date (performance reviews, promotions, etc.)
            const employeeStartDate = employee.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            for (let i = 0; i < interviewCount; i++) {
                // 70% chance of interview being before start date, 30% after
                const isBeforeStartDate = Math.random() < 0.7;
                let interviewDate;
                if (isBeforeStartDate) {
                    // Interview up to 60 days before start date
                    const daysBeforeStart = Math.floor(Math.random() * 60) + 1;
                    interviewDate = new Date(employeeStartDate.getTime() - daysBeforeStart * 24 * 60 * 60 * 1000);
                }
                else {
                    // Interview up to 180 days after start date
                    const daysAfterStart = Math.floor(Math.random() * 180) + 30;
                    interviewDate = new Date(employeeStartDate.getTime() + daysAfterStart * 24 * 60 * 60 * 1000);
                }
                // Select a random interview type from suitable types
                const interviewType = suitableInterviewTypes[Math.floor(Math.random() * suitableInterviewTypes.length)];
                interviews.push({
                    name: employee.name,
                    team: employee.team.name,
                    interviewName: interviewType,
                    dateTaken: interviewDate,
                    userId: employee.userId
                });
            }
        }
        console.log(`Generated ${interviews.length} interviews from employee data`);
        // Clear existing interviews first (optional, comment out if you want to keep existing data)
        if (interviews.length > 0) {
            console.log('Clearing existing interview data...');
            await prisma.interview.deleteMany({});
        }
        // Insert the interviews
        const BATCH_SIZE = 50;
        for (let i = 0; i < interviews.length; i += BATCH_SIZE) {
            const batch = interviews.slice(i, i + BATCH_SIZE);
            await prisma.interview.createMany({
                data: batch
            });
            console.log(`Created batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(interviews.length / BATCH_SIZE)}`);
        }
        console.log(`Successfully created ${interviews.length} interviews from employee data`);
    }
    catch (error) {
        console.error('Error seeding interview data:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the seed function
seedInterviewsFromEmployees()
    .catch(e => {
    console.error('Error executing interview seed script:', e);
    process.exit(1);
})
    .finally(() => {
    console.log('Interview seeding completed');
});
