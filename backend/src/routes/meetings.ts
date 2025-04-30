import express, { Response } from 'express';
import { PrismaClient, MeetingType } from '@prisma/client';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';
import { inviteBotToMeeting } from '../services/meetingBaasService';
import { getAuthenticatedGoogleClient } from '../services/googleAuthService';
import { createCalendarEvent } from '../services/googleCalendarService';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

interface RecordMeetingRequestBody {
  meetingUrl: string;
  title?: string;
  employeeId: number;
  // managerId will be derived from the authenticated user token
}

// New interface for scheduling
interface ScheduleMeetingRequestBody {
  employeeId: number;
  title: string;
  description?: string;
  startDateTime: string; // Expect ISO 8601 format string
  endDateTime: string;   // Expect ISO 8601 format string
  timeZone: string;      // Added timezone
  meetingType: MeetingType; // Added meeting type
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

// POST /api/meetings/schedule - Schedule via Google Calendar and invite bot
router.post('/schedule', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  const { employeeId, title, description, startDateTime, endDateTime, timeZone, meetingType } = req.body as ScheduleMeetingRequestBody;
  const managerId = req.user?.userId;

  if (!employeeId || !title || !startDateTime || !endDateTime || !timeZone || !meetingType || !managerId) {
    return res.status(400).json({ message: 'Missing required fields: employeeId, title, startDateTime, endDateTime, timeZone, meetingType, or managerId could not be determined.' });
  }

  let meetingRecord; // Define meetingRecord in outer scope for error handling
  let googleEvent;   // To store created event details temporarily
  let meetingBaasId: string | undefined = undefined; // For bot invite response

  try {
    // 1. Get Manager and Employee emails
    const manager = await prisma.user.findUnique({ where: { id: managerId }, select: { email: true } });
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { email: true } });

    if (!manager || !manager.email) {
      return res.status(404).json({ message: `Manager with ID ${managerId} not found or missing email.` });
    }
    if (!employee || !employee.email) {
      return res.status(404).json({ message: `Employee with ID ${employeeId} not found or missing email.` });
    }

    const attendees = [manager.email, employee.email];

    // 2. Get authenticated Google Client for the manager
    console.log(`Getting authenticated Google client for manager ID: ${managerId}`);
    const authClient = await getAuthenticatedGoogleClient(managerId);
    console.log(`Successfully obtained authenticated Google client for manager ${managerId}`);

    // 3. Create Google Calendar Event (pass timezone)
    console.log(`Attempting to schedule meeting: "${title}" for manager ${managerId} and employee ${employeeId} in timezone ${timeZone}`);
    googleEvent = await createCalendarEvent(
      authClient,
      title,
      description || '',
      startDateTime,
      endDateTime,
      attendees,
      timeZone // Pass timezone
    );

    if (!googleEvent?.hangoutLink) {
      console.error('Google Calendar event created, but hangoutLink (Meet URL) is missing.', googleEvent);
      throw new Error('Failed to retrieve Google Meet link after creating calendar event.');
    }
    const googleMeetUrl = googleEvent.hangoutLink;
    console.log(`Google Meet URL created: ${googleMeetUrl}`);

    // 4. Create initial Meeting Record in DB
    // Store the Google Meet URL, perhaps in the 'platform' field or a dedicated one if added later
    // scheduledTime should come from the request body now
    console.log(`Creating meeting record in DB for manager ${managerId}, employee ${employeeId}`);
    meetingRecord = await prisma.meeting.create({
      data: {
        title: title,
        scheduledTime: new Date(startDateTime), // Use startDateTime from request
        // durationMinutes: calculateDuration(startDateTime, endDateTime), // Optional: calculate duration
        platform: 'Google Meet', // Identify platform
        meetingUrl: googleMeetUrl, // Store the Google Meet URL
        status: 'PENDING_BOT_INVITE',
        meetingType: meetingType, // Added meetingType
        managerId: managerId,
        employeeId: employeeId,
        googleCalendarEventId: googleEvent.id, // Store Google Event ID if needed later
      },
    });
    console.log(`Meeting record created with ID: ${meetingRecord.id}`);


    // 5. Invite Meeting BaaS Bot using the Google Meet URL
    console.log(`Inviting Meeting BaaS bot to ${googleMeetUrl} for meeting ID: ${meetingRecord.id}`);
    const botInviteResponse = await inviteBotToMeeting({ meetingUrl: googleMeetUrl });

    meetingBaasId = (botInviteResponse as any)?.bot_id; // Extract BaaS ID
    if (!meetingBaasId) {
      console.warn(`Meeting BaaS invite response did not contain expected ID field (e.g., bot_id) for meeting ${meetingRecord.id}`);
      // Proceed but log warning, might need manual check
    } else {
       console.log(`Meeting BaaS Bot ID received: ${meetingBaasId}`);
    }

    // 6. Update Meeting Status and BaaS ID
    await prisma.meeting.update({
      where: { id: meetingRecord.id },
      data: {
        status: 'BOT_INVITED',
        meetingBaasId: meetingBaasId // Save the ID
      },
    });

    console.log(`Meeting ${meetingRecord.id} successfully scheduled and bot invited.`);
    res.status(201).json({
      message: 'Meeting scheduled successfully via Google Calendar and bot invited.',
      meetingId: meetingRecord.id,
      googleMeetUrl: googleMeetUrl,
      googleEventId: googleEvent.id,
      meetingBaasId: meetingBaasId,
    });

  } catch (error: any) {
    console.error(`Error during meeting scheduling process for manager ${managerId}, employee ${employeeId}:`, error);

    // Determine error stage and set appropriate status
    let errorStatus = 'ERROR_SCHEDULING'; // Default scheduling error
    if (error.message.includes('Google authentication required')) {
       errorStatus = 'ERROR_GOOGLE_AUTH';
    } else if (error.message.includes('Failed to create Google Calendar event')) {
        errorStatus = 'ERROR_CALENDAR_EVENT';
    } else if (error.message.includes('Failed to retrieve Google Meet link')) {
        errorStatus = 'ERROR_CALENDAR_LINK';
    } else if (meetingRecord && !meetingBaasId) { // If meeting record created but bot invite failed
        errorStatus = 'ERROR_BOT_INVITE';
    }

    // Attempt to update status if meeting record was created
    if (meetingRecord) {
      try {
        await prisma.meeting.update({
          where: { id: meetingRecord.id },
          data: {
             status: errorStatus,
             meetingBaasId: meetingBaasId // Store BaaS ID even if update fails later
           },
        });
      } catch (updateError) {
        console.error(`Failed to update meeting ${meetingRecord.id} status to ${errorStatus}:`, updateError);
      }
    } else if (googleEvent?.id) {
       // If calendar event was created but DB record failed, maybe try to delete calendar event? (Complex rollback)
       console.warn(`DB record creation failed for Google Event ${googleEvent.id}. Consider manual cleanup.`);
    }

    // Respond with appropriate error
    let errorMessage = error.message || 'Failed to schedule meeting.';
    let statusCode = 500;

    if (error.message.includes('Google authentication required')) {
        statusCode = 401; // Or 403? User needs to re-auth
    } else if (typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError && error.response) {
       // Handle potential Axios errors from Meeting BaaS service
       errorMessage = error.response.data?.message || error.message;
       statusCode = error.response.status || 500;
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