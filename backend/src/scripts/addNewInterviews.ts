/* eslint-env node */
/* global console, process */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // First, get the user ID to use for the interviews
    const user = await prisma.user.findFirst({
      where: { email: 'test@example.com' }
    })

    if (!user) {
      console.error('No test user found. Please run the seed script first.')
      return
    }

    console.log(`Using user with ID: ${user.id}`)

    // Create 10 new interviews with interesting job titles and teams
    const newInterviews = [
      {
        name: 'Alexander Lee',
        team: 'Engineering',
        interviewName: 'Senior Backend Developer',
        dateTaken: new Date('2024-05-10'),
        userId: user.id
      },
      {
        name: 'Rebecca Chen',
        team: 'Product',
        interviewName: 'Product Manager - Growth',
        dateTaken: new Date('2024-05-12'),
        userId: user.id
      },
      {
        name: 'Marcus Johnson',
        team: 'Design',
        interviewName: 'UX/UI Lead Designer',
        dateTaken: new Date('2024-05-15'),
        userId: user.id
      },
      {
        name: 'Sofia Rodriguez',
        team: 'Data Science',
        interviewName: 'Machine Learning Engineer',
        dateTaken: new Date('2024-05-18'),
        userId: user.id
      },
      {
        name: 'Daniel Kim',
        team: 'Engineering',
        interviewName: 'DevOps Specialist',
        dateTaken: new Date('2024-05-20'),
        userId: user.id
      },
      {
        name: 'Aisha Patel',
        team: 'Marketing',
        interviewName: 'Digital Marketing Director',
        dateTaken: new Date('2024-05-22'),
        userId: user.id
      },
      {
        name: 'Thomas Nguyen',
        team: 'Engineering',
        interviewName: 'Frontend Developer',
        dateTaken: new Date('2024-05-25'),
        userId: user.id
      },
      {
        name: 'Hannah Wilson',
        team: 'Customer Success',
        interviewName: 'Customer Success Manager',
        dateTaken: new Date('2024-05-27'),
        userId: user.id
      },
      {
        name: 'Jamal Ahmed',
        team: 'Sales',
        interviewName: 'Enterprise Sales Executive',
        dateTaken: new Date('2024-05-29'),
        userId: user.id
      },
      {
        name: 'Olivia Thompson',
        team: 'HR',
        interviewName: 'Talent Acquisition Specialist',
        dateTaken: new Date('2024-05-31'),
        userId: user.id
      }
    ]

    // Insert the new interviews
    const createdInterviews = await prisma.$transaction(
      newInterviews.map(interview => 
        prisma.interview.create({ data: interview })
      )
    )

    console.log(`Added ${createdInterviews.length} new interviews to the database`)
    
    // Output the IDs of the new interviews for reference
    console.log('New interview IDs:')
    createdInterviews.forEach((interview, index) => {
      console.log(`${index + 1}. ${interview.name} - ID: ${interview.id}`)
    })

  } catch (error) {
    console.error('Error adding new interviews:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }) 