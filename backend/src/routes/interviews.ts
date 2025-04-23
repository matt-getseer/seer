import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    iat?: number;
    exp?: number;
  };
}

const router = express.Router();
const prisma = new PrismaClient();

// Add debug route to check if interviews endpoint is accessible
const debugHandler = async (req: Request, res: Response): Promise<void> => {
  console.log('Debug endpoint accessed');
  res.status(200).json({ message: 'Interviews endpoint is accessible' });
};

// Get all interviews
const getAllInterviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('GET /interviews - Headers:', req.headers);
    console.log('GET /interviews - Auth user:', req.user);
    
    if (!req.user?.userId) {
      console.log('No userId found in the request');
      res.status(401).json({ error: 'User not authenticated properly' });
      return;
    }
    
    console.log(`Looking for interviews for user ID: ${req.user.userId}`);
    
    // Test database connection
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      res.status(500).json({ error: 'Database connection failed' });
      return;
    }

    // First, verify the user exists
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId
      }
    });

    if (!user) {
      console.log(`User with ID ${req.user.userId} not found in database`);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log(`Found user: ${user.email}`);
    
    const interviews = await prisma.interview.findMany({
      where: {
        userId: req.user.userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`Found ${interviews.length} interviews for user ${req.user.userId}`);
    res.json(interviews);
  } catch (error) {
    console.error('Error in getAllInterviews:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Failed to fetch interviews',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  } finally {
    await prisma.$disconnect();
  }
};

// Create a new interview
const createInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, team, interviewName, dateTaken } = req.body;
    
    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const interview = await prisma.interview.create({
      data: {
        name,
        team,
        interviewName,
        dateTaken: new Date(dateTaken),
        userId: req.user.userId
      }
    });
    res.status(201).json(interview);
  } catch (error) {
    next(error);
  }
};

// Get a specific interview
const getInterviewById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const interview = await prisma.interview.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user?.userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        interviewAnswer: true
      }
    });

    if (!interview) {
      res.status(404).json({ error: 'Interview not found' });
      return;
    }

    res.json(interview);
  } catch (error) {
    next(error);
  }
};

// Update an interview
const updateInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, team, interviewName, dateTaken } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const interview = await prisma.interview.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      },
      data: {
        name,
        team,
        interviewName,
        dateTaken: new Date(dateTaken)
      }
    });

    if (interview.count === 0) {
      res.status(404).json({ error: 'Interview not found or unauthorized' });
      return;
    }

    const updatedInterview = await prisma.interview.findFirst({
      where: {
        id: parseInt(id)
      }
    });

    res.json(updatedInterview);
  } catch (error) {
    next(error);
  }
};

// Delete an interview
const deleteInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const interview = await prisma.interview.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      }
    });

    if (interview.count === 0) {
      res.status(404).json({ error: 'Interview not found or unauthorized' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get interview answers for a specific interview
const getInterviewAnswers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // First verify that the interview belongs to the user
    const interview = await prisma.interview.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      }
    });

    if (!interview) {
      res.status(404).json({ error: 'Interview not found or unauthorized' });
      return;
    }

    const interviewAnswer = await prisma.interviewAnswer.findUnique({
      where: {
        interviewId: parseInt(id)
      }
    });

    if (!interviewAnswer) {
      res.status(404).json({ error: 'Interview answers not found' });
      return;
    }

    res.json(interviewAnswer);
  } catch (error) {
    next(error);
  }
};

// Create or update interview answers
const saveInterviewAnswers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      firstAnswer, 
      secondAnswer, 
      technicalScore, 
      cultureScore, 
      communicationScore, 
      overallRating, 
      notes 
    } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // First verify that the interview belongs to the user
    const interview = await prisma.interview.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.userId
      }
    });

    if (!interview) {
      res.status(404).json({ error: 'Interview not found or unauthorized' });
      return;
    }

    // Check if answers already exist
    const existingAnswers = await prisma.interviewAnswer.findUnique({
      where: {
        interviewId: parseInt(id)
      }
    });

    let interviewAnswer;

    if (existingAnswers) {
      // Update existing answers
      interviewAnswer = await prisma.interviewAnswer.update({
        where: {
          interviewId: parseInt(id)
        },
        data: {
          firstAnswer,
          secondAnswer,
          technicalScore,
          cultureScore,
          communicationScore,
          overallRating,
          notes
        }
      });
    } else {
      // Create new answers
      interviewAnswer = await prisma.interviewAnswer.create({
        data: {
          firstAnswer,
          secondAnswer,
          technicalScore,
          cultureScore,
          communicationScore,
          overallRating,
          notes: notes || '',
          interviewId: parseInt(id)
        }
      });
    }

    res.json(interviewAnswer);
  } catch (error) {
    next(error);
  }
};

// Get all interviews for a team
router.get('/team/:teamId', authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const interviews = await prisma.interview.findMany({
      where: { team: teamId }
    });
    res.json(interviews);
  } catch (err) {
    console.error('Error fetching team interviews:', err);
    res.status(500).json({ message: 'Failed to fetch interviews' });
  }
});

// Route handlers
router.get('/debug', debugHandler);
router.get('/', authenticate, getAllInterviews);
router.post('/', authenticate, createInterview);
router.get('/:id', authenticate, getInterviewById);
router.put('/:id', authenticate, updateInterview);
router.delete('/:id', authenticate, deleteInterview);

// Interview answer routes
router.get('/:id/answers', authenticate, getInterviewAnswers);
router.post('/:id/answers', authenticate, saveInterviewAnswers);

export default router; 