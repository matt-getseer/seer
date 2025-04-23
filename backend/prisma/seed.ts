/* eslint-env node */
/* global console, process */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, let's make sure we have at least one user
  // Check if a test user exists
  let user = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  })

  // Create test user if it doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // password is "password"
      },
    })
    console.log(`Created test user with id: ${user.id}`)
  } else {
    console.log(`Using existing user with id: ${user.id}`)
  }

  // Delete existing interviews to avoid duplicates
  await prisma.interview.deleteMany({})
  console.log('Deleted existing interviews')

  // Create 10 dummy interviews
  const dummyInterviews = [
    {
      name: 'John Smith',
      team: 'Engineering',
      interviewName: 'Technical Assessment',
      dateTaken: new Date('2023-05-15'),
      userId: user.id
    },
    {
      name: 'Sarah Johnson',
      team: 'Product',
      interviewName: 'Product Strategy Discussion',
      dateTaken: new Date('2023-06-22'),
      userId: user.id
    },
    {
      name: 'Michael Chen',
      team: 'UX Design',
      interviewName: 'Design Portfolio Review',
      dateTaken: new Date('2023-07-10'),
      userId: user.id
    },
    {
      name: 'Emily Davis',
      team: 'Marketing',
      interviewName: 'Marketing Strategy Interview',
      dateTaken: new Date('2023-08-05'),
      userId: user.id
    },
    {
      name: 'Carlos Rodriguez',
      team: 'Sales',
      interviewName: 'Sales Performance Review',
      dateTaken: new Date('2023-09-18'),
      userId: user.id
    },
    {
      name: 'Lisa Wong',
      team: 'Customer Success',
      interviewName: 'Customer Journey Mapping',
      dateTaken: new Date('2023-10-25'),
      userId: user.id
    },
    {
      name: 'David Kim',
      team: 'Engineering',
      interviewName: 'System Architecture Discussion',
      dateTaken: new Date('2023-11-12'),
      userId: user.id
    },
    {
      name: 'Priya Patel',
      team: 'Data Science',
      interviewName: 'Analytics Framework Planning',
      dateTaken: new Date('2023-12-07'),
      userId: user.id
    },
    {
      name: 'James Wilson',
      team: 'Operations',
      interviewName: 'Process Improvement Interview',
      dateTaken: new Date('2024-01-15'),
      userId: user.id
    },
    {
      name: 'Olivia Martinez',
      team: 'HR',
      interviewName: 'Employee Experience Discussion',
      dateTaken: new Date('2024-02-28'),
      userId: user.id
    }
  ]

  // Insert interviews
  const interviews = await prisma.$transaction(
    dummyInterviews.map(interview => 
      prisma.interview.create({ data: interview })
    )
  )

  console.log(`Created ${interviews.length} interviews`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 