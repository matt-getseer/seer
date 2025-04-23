/* eslint-env node */
/* global console, process */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Interview types based on department/team
const interviewTypes: Record<string, string[]> = {
  Engineering: [
    'Technical Assessment',
    'Coding Challenge',
    'System Design Interview',
    'Architecture Review'
  ],
  Product: [
    'Product Strategy Discussion',
    'User Experience Workshop',
    'Product Vision Session',
    'Roadmap Planning'
  ],
  Design: [
    'Design Portfolio Review',
    'UX Evaluation',
    'Design Challenge',
    'Design System Discussion'
  ],
  Marketing: [
    'Marketing Strategy Interview',
    'Campaign Planning',
    'Brand Development Discussion',
    'Content Strategy Review'
  ],
  Sales: [
    'Sales Performance Review',
    'Pipeline Review',
    'Deal Strategy Session',
    'Client Relationship Assessment'
  ],
  'Customer Success': [
    'Customer Journey Mapping',
    'Account Management Review',
    'Client Satisfaction Assessment',
    'Retention Strategy Planning'
  ],
  'Data Science': [
    'Analytics Framework Planning',
    'Machine Learning Methodology Review',
    'Data Pipeline Architecture',
    'Prediction Model Assessment'
  ],
  HR: [
    'Employee Experience Discussion',
    'Talent Acquisition Planning',
    'Performance Management Review',
    'Culture Development Strategy'
  ],
  Operations: [
    'Process Improvement Interview',
    'Operational Efficiency Review',
    'Supply Chain Assessment',
    'Logistics Planning Session'
  ],
  default: [
    'Performance Review',
    'Career Development Discussion',
    'Skills Assessment',
    'Team Fit Evaluation'
  ]
}

// Define simplified types for our script
type Employee = {
  id: number;
  name: string;
  title: string;
  team: {
    id: number;
    name: string;
  };
}

type Interview = {
  id: number;
  name: string;
  team: string;
  interviewName: string;
  dateTaken: Date;
}

async function main() {
  try {
    // Get the user ID to use for the interviews
    const user = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    })

    if (!user) {
      console.error('No test user found. Please run the seed script first.')
      return
    }

    // Get 10 random employees
    const employees = await prisma.$queryRaw<Employee[]>`
      SELECT e.id, e.name, e.title, t.id as "teamId", t.name as "teamName"
      FROM "Employee" e
      JOIN "Team" t ON e."teamId" = t.id
      ORDER BY RANDOM()
      LIMIT 10
    `

    // Since the raw query doesn't exactly match our Employee type,
    // we need to transform the results
    const processedEmployees = employees.map(emp => ({
      ...emp,
      team: {
        id: (emp as any).teamId,
        name: (emp as any).teamName
      }
    }))

    if (processedEmployees.length === 0) {
      console.error('No employees found. Please run the employee seed script first.')
      return
    }

    console.log(`Found ${processedEmployees.length} employees`)

    // Create interviews based on these employees
    const interviewData = processedEmployees.map((employee) => {
      // Get interview types for the employee's team
      const teamName = employee.team.name
      const teamInterviewTypes = interviewTypes[teamName] || interviewTypes.default
      
      // Pick a random interview type
      const interviewType = teamInterviewTypes[Math.floor(Math.random() * teamInterviewTypes.length)]
      
      // Generate a random date in the last month
      const today = new Date()
      const oneMonthAgo = new Date(today)
      oneMonthAgo.setMonth(today.getMonth() - 1)
      const dateTaken = new Date(
        oneMonthAgo.getTime() + Math.random() * (today.getTime() - oneMonthAgo.getTime())
      )

      return {
        name: employee.name,
        team: employee.team.name,
        interviewName: interviewType,
        dateTaken,
        userId: user!.id
      }
    })

    // Create the interviews
    const createdInterviews = await prisma.$transaction(
      interviewData.map((interview) => 
        prisma.interview.create({ data: interview })
      )
    )

    console.log(`Created ${createdInterviews.length} interviews`)

    // Print details of the interviews created
    createdInterviews.forEach((interview, idx) => {
      console.log(`${idx + 1}. ${interview.name} - ${interview.interviewName} (ID: ${interview.id})`)
    })

    console.log('\nInterview IDs for creating answers:')
    console.log(createdInterviews.map(i => i.id).join(', '))

  } catch (error) {
    console.error('Error creating interviews from employees:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }) 