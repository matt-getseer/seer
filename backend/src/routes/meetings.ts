import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';
import { inviteBotToMeeting } from '../services/meetingBaasService';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

interface RecordMeetingRequestBody {
  meetingUrl: string;
  title?: string;
  employeeId: number;
  // managerId will be derived from the authenticated user token
}

// POST /api/meetings/record - Invite bot and create meeting record
router.post('/record', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  const { meetingUrl, title, employeeId } = req.body as RecordMeetingRequestBody;
  const managerId = req.user?.userId;

  if (!meetingUrl || !employeeId || !managerId) {
    return res.status(400).json({ message: 'Missing required fields: meetingUrl, employeeId, or managerId could not be determined from token' });
  }

  let meetingRecord;
  let meetingBaasId: string | undefined = undefined; // Define variable in outer scope
  try {
    // 1. Create initial meeting record in DB
    meetingRecord = await prisma.meeting.create({
      data: {
        title: title || `Meeting with Employee ${employeeId}`,
        scheduledTime: new Date(),
        platform: extractPlatform(meetingUrl),
        status: 'PENDING_BOT_INVITE',
        managerId: managerId,
        employeeId: employeeId,
      },
    });

    // 2. Call Meeting BaaS to invite the bot
    console.log(`Inviting bot for meeting ID: ${meetingRecord.id}`);
    const botInviteResponse = await inviteBotToMeeting({ meetingUrl });

    // --- Store the Meeting BaaS ID --- 
    // Use type assertion - replace 'bot_id' if actual key differs
    meetingBaasId = (botInviteResponse as any)?.bot_id; 
    if (!meetingBaasId) {
      console.warn(`Meeting BaaS invite response did not contain expected ID field (e.g., bot_id) for meeting ${meetingRecord.id}`);
    }

    // 3. Update meeting status AND save the meetingBaasId
    await prisma.meeting.update({
      where: { id: meetingRecord.id },
      data: { 
        status: 'BOT_INVITED',
        meetingBaasId: meetingBaasId // Save the ID
      },
    });

    console.log(`Bot invited successfully for meeting ID: ${meetingRecord.id}, MeetingBaas ID: ${meetingBaasId}`);
    res.status(201).json({ 
      message: 'Bot invited successfully', 
      meetingId: meetingRecord.id, 
      meetingBaasId: meetingBaasId 
    });

  } catch (error) {
    console.error(`Error processing meeting record request for URL ${meetingUrl}:`, error);

    // Attempt to update status to FAILED
    if (meetingRecord) {
      try {
        // Update status and include meetingBaasId if we got it before the error
        await prisma.meeting.update({
          where: { id: meetingRecord.id },
          data: { 
            status: 'ERROR_BOT_INVITE', 
            meetingBaasId: meetingBaasId // Include ID if available
          },
        });
      } catch (updateError) {
        console.error(`Failed to update meeting ${meetingRecord.id} status to ERROR_BOT_INVITE:`, updateError);
      }
    }

    // Type check the error
    let errorMessage = 'Failed to process meeting recording request.';
    let statusCode = 500;

    // Corrected Axios error check
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as any; // Use type assertion carefully or check further
      errorMessage = axiosError.response?.data?.message || axiosError.message;
      statusCode = axiosError.response?.status || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({ message: errorMessage });
  }
});

// Helper function to guess platform (simple example)
function extractPlatform(url: string): string | undefined {
  if (url.includes('zoom.us')) return 'Zoom';
  if (url.includes('meet.google.com')) return 'Google Meet';
  if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
  return undefined;
}

// --- GET Endpoints --- 

// GET /api/meetings - List meetings for the logged-in manager
router.get('/', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  const managerId = req.user?.userId;

  if (!managerId) {
    // This shouldn't happen if extractUserInfo middleware is working
    return res.status(401).json({ message: 'User ID not found on request.' });
  }

  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        managerId: managerId,
      },
      include: {
        employee: { // Include employee basic info
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledTime: 'desc', // Show most recent first
      },
    });
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: 'Failed to fetch meetings.' });
  }
});

// GET /api/meetings/:meetingId - Get details for a specific meeting
router.get('/:meetingId', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  const managerId = req.user?.userId;
  const { meetingId } = req.params;

  if (!managerId) {
    return res.status(401).json({ message: 'User ID not found on request.' });
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: parseInt(meetingId, 10),
        // Also ensure the meeting belongs to the requesting manager for security
        managerId: managerId, 
      },
      include: {
        employee: { // Include employee details
          select: {
            id: true,
            name: true,
            email: true,
            title: true,
          },
        },
        manager: { // Include manager details
           select: {
             id: true,
             name: true,
             email: true,
           },
        },
        transcript: true, // Include the full transcript
        insights: true,   // Include all related insights
      },
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found or you do not have access.' });
    }

    res.json(meeting);
  } catch (error) {
    console.error(`Error fetching meeting ${meetingId}:`, error);
    // Handle potential parseInt errors or Prisma errors
    if (error instanceof Error && error.message.includes('Argument `where.id` must not be null')) { // Crude check for invalid ID format
        return res.status(400).json({ message: `Invalid meeting ID format: ${meetingId}` });
    }
    res.status(500).json({ message: 'Failed to fetch meeting details.' });
  }
});

// TODO: Add Webhook endpoint for Meeting BaaS notifications

export default router; 