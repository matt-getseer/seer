import express, { Response } from 'express';
import { PrismaClient, MeetingType, User } from '@prisma/client';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';
import { inviteBotToMeeting } from '../services/meetingBaasService';
import { getAuthenticatedGoogleClient } from '../services/googleAuthService';
import { createCalendarEvent } from '../services/googleCalendarService';
import { createZoomMeeting, getAuthenticatedZoomClient } from '../services/zoomAuthService';
import axios from 'axios';
import { getAccessibleMeetings } from '../services/accessControlService';
import { formatInTimeZone } from 'date-fns-tz';

const router = express.Router();
const prisma = new PrismaClient();

interface RecordMeetingRequestBody {
  meetingUrl: string;
  title?: string;
  employeeId: number;
  // managerId will be derived from the authenticated user token
}

// Updated interface for scheduling, adding platform
interface ScheduleMeetingRequestBody {
  employeeId: number;
  description?: string;      // Optional agenda/description
  startDateTime: string;    // Expect ISO 8601 format string (e.g., "2024-05-15T14:00:00Z")
  endDateTime: string;      // Expect ISO 8601 format string
  timeZone: string;         // IANA Timezone (e.g., "America/New_York")
  meetingType: MeetingType; 
  platform?: 'Google Meet' | 'Zoom'; // Add optional platform, default to Google Meet
}

// Helper function to format meeting type enum
function formatMeetingType(type: MeetingType): string {
  switch (type) {
    case MeetingType.ONE_ON_ONE:
      return '1:1';
    case MeetingType.SIX_MONTH_REVIEW:
      return '6 Month Review';
    case MeetingType.TWELVE_MONTH_REVIEW:
      return '12 Month Review';
    default:
      // Fallback for potential future types or unexpected values
      // Cast to string to satisfy TS in default case
      return (type as string).replace('_', ' '); 
  }
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
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    meetingRecord = await prisma.meeting.create({
      data: {
        title: title || `Meeting with Employee ${employeeId}`,
        scheduledTime: new Date(),
        timeZone: systemTimeZone, // Store the system timezone
        platform: extractPlatform(meetingUrl),
        status: 'PENDING_BOT_INVITE',
        managerId: managerId,
        employeeId: employeeId,
      },
    });

    // 2. Call Meeting BaaS to invite the bot
    console.log(`Inviting bot for meeting ID: ${meetingRecord.id}`);
    const botInviteResponse = await inviteBotToMeeting({ 
      meetingUrl
    });

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

// POST /api/meetings/schedule - Updated to handle different platforms
router.post('/schedule', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  // Destructure platform, default to Google Meet if not provided
  const { 
    employeeId, 
    description, 
    startDateTime, 
    endDateTime, 
    timeZone, 
    meetingType, 
    platform = 'Google Meet' // Default to Google Meet
  } = req.body as ScheduleMeetingRequestBody;
  
  const managerId = req.user?.userId;

  // Basic validation
  if (!employeeId || !startDateTime || !endDateTime || !timeZone || !meetingType || !managerId) {
    return res.status(400).json({ message: 'Missing required fields: employeeId, startDateTime, endDateTime, timeZone, meetingType, or managerId could not be determined.' });
  }
  if (!['Google Meet', 'Zoom'].includes(platform)) {
      return res.status(400).json({ message: 'Invalid platform specified. Only "Google Meet" or "Zoom" are supported.'});
  }

  let meetingRecord; // Define meetingRecord in outer scope for error handling
  let meetingUrl: string | undefined;
  let externalMeetingId: string | number | undefined; // Can be string (Google) or number (Zoom)
  let meetingBaasId: string | undefined = undefined; // For bot invite response

  try {
    // --- Shared logic: Get Manager and Employee details ---
    const manager = await prisma.user.findUnique({ where: { id: managerId }, select: { email: true, name: true } });
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { email: true, name: true } });

    if (!manager || !manager.email) return res.status(404).json({ message: `Manager with ID ${managerId} not found or missing email.` });
    if (!employee || !employee.email) return res.status(404).json({ message: `Employee with ID ${employeeId} not found or missing email.` });

    const managerName = manager.name || manager.email;
    const employeeName = employee.name || `Employee ID ${employeeId}`;
    const meetingTypeFormatted = formatMeetingType(meetingType);
    const meetingTitle = `${meetingTypeFormatted} with ${employeeName} & ${managerName}`;

    // Convert incoming UTC ISO strings to local time strings for the target timezone
    // The format 'yyyy-MM-dd\'T\'HH:mm:ss' is crucial for Google and Zoom.
    // Note: The original startDateTime and endDateTime are UTC. We are converting them
    // to the *wall clock time* in the user's specified `timeZone`.
    const localStartDateTime = formatInTimeZone(new Date(startDateTime), timeZone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    const localEndDateTime = formatInTimeZone(new Date(endDateTime), timeZone, 'yyyy-MM-dd\'T\'HH:mm:ss');

    // --- Platform-Specific Scheduling Logic ---
    if (platform === 'Zoom') {
        console.log(`Scheduling Zoom meeting for manager ${managerId}, employee ${employeeId}`);
        
        // Calculate duration in minutes
        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

        if (durationMinutes <= 0) {
             return res.status(400).json({ message: 'End date/time must be after start date/time.' });
        }

        // Call Zoom service
        const zoomMeeting = await createZoomMeeting(managerId, {
            topic: meetingTitle,
            start_time: localStartDateTime, // Use local time string
            duration: durationMinutes,
            timezone: timeZone, // Pass the original IANA timezone
            agenda: description || '', // Use description as agenda
        });

        meetingUrl = zoomMeeting.join_url;
        externalMeetingId = zoomMeeting.id; // Zoom's numeric ID
        console.log(`Zoom meeting created: ${meetingUrl}, ID: ${externalMeetingId}`);

    } else if (platform === 'Google Meet') { // Explicitly check for Google Meet
        console.log(`Scheduling Google Meet for manager ${managerId}, employee ${employeeId}`);
        
        // Get authenticated Google Client
        const authClient = await getAuthenticatedGoogleClient(managerId);
        console.log(`Successfully obtained authenticated Google client for manager ${managerId}`);
        
        // Prepare attendees (assuming service expects simple email array)
        const attendeesEmails = [manager.email, employee.email];

        // Call Google Calendar service using the original signature
        const event = await createCalendarEvent(
            authClient,
            meetingTitle,
            description || '',
            localStartDateTime, // Use local time string
            localEndDateTime,   // Use local time string
            attendeesEmails, 
            timeZone // Pass the original IANA timezone
        );

        // Original checks after event creation
        if (!event?.hangoutLink) {
            console.error('Google Calendar event created, but hangoutLink (Meet URL) is missing.', event);
            throw new Error('Failed to retrieve Google Meet link after creating calendar event.');
        }
        meetingUrl = event.hangoutLink;
        // Use nullish coalescing to handle potential null id
        externalMeetingId = event.id ?? undefined;
        console.log(`Google Meet URL created: ${meetingUrl}, Event ID: ${externalMeetingId}`);
        
    } else {
        // This case should not be reached if validation is correct, but handle defensively
        console.error(`Unsupported platform requested: ${platform}`);
        return res.status(400).json({ message: `Unsupported platform: ${platform}`});
    }

    // --- Shared logic: Create DB record, invite bot ---
    if (!meetingUrl) {
         console.error('Meeting URL was not generated by platform logic.');
         throw new Error('Failed to obtain meeting URL from scheduling platform.');
    }

    console.log(`Creating meeting record in DB for manager ${managerId}, employee ${employeeId}, platform ${platform}`);
    meetingRecord = await prisma.meeting.create({
      data: {
        title: meetingTypeFormatted, // Use formatted meeting type as title in DB
        scheduledTime: new Date(startDateTime), // Store the original UTC time in DB
        timeZone: timeZone, // Store the timezone provided by the client
        platform: platform, // Save the correct platform
        meetingUrl: meetingUrl, // Save the obtained URL
        status: 'PENDING_BOT_INVITE',
        meetingType: meetingType,
        managerId: managerId,
        employeeId: employeeId,
        // Correctly assign Google ID only if platform is Google Meet AND id is a string
        googleCalendarEventId: platform === 'Google Meet' && typeof externalMeetingId === 'string' ? externalMeetingId : undefined,
        // NOTE: If storing Zoom ID is needed, add a `zoomMeetingId Int?` field to schema
      },
    });
    console.log(`Meeting record created with ID: ${meetingRecord.id}`);

    // Invite Meeting BaaS Bot
    console.log(`Inviting Meeting BaaS bot to ${meetingUrl} for meeting ID: ${meetingRecord.id}`);
    const botInviteResponse = await inviteBotToMeeting({ 
      meetingUrl: meetingUrl,
      startDateTime: new Date(startDateTime) // Pass the start date/time directly
    });

    meetingBaasId = (botInviteResponse as any)?.bot_id; // Extract BaaS ID
    if (!meetingBaasId) {
      console.warn(`Meeting BaaS invite response did not contain expected ID field for meeting ${meetingRecord.id}`);
    } else {
       console.log(`Meeting BaaS Bot ID received: ${meetingBaasId}`);
    }

    // Update Meeting Status and BaaS ID
    await prisma.meeting.update({
      where: { id: meetingRecord.id },
      data: {
        status: 'BOT_INVITED',
        meetingBaasId: meetingBaasId,
      },
    });

    console.log(`Meeting ${meetingRecord.id} successfully scheduled via ${platform} and bot invited.`);
    // Return consistent response structure
    res.status(201).json({
      message: `Meeting scheduled successfully via ${platform} and bot invited.`,
      meetingId: meetingRecord.id,
      meetingUrl: meetingUrl,
      platform: platform,
      externalMeetingId: externalMeetingId, // Include Google Event ID or Zoom ID
      meetingBaasId: meetingBaasId,
    });

  } catch (error: any) {
    console.error(`Error during meeting scheduling process (Platform: ${platform || 'N/A'}) for manager ${managerId}, employee ${employeeId}:`, error);

    // Enhanced error handling for different stages/platforms
    let errorStatus = 'ERROR_SCHEDULING'; 
    let errorMessage = error.message || 'Failed to schedule meeting.';
    let statusCode = 500;

    if (error.message.includes('authentication required')) { // Covers both Google and Zoom auth errors from services
       errorStatus = 'ERROR_PLATFORM_AUTH';
       statusCode = 401; // Unauthorized or Forbidden might be appropriate
    } else if (platform === 'Google Meet' && error.message.includes('Failed to create Google Calendar event')) {
        errorStatus = 'ERROR_CALENDAR_EVENT';
    } else if (platform === 'Google Meet' && error.message.includes('Failed to retrieve Google Meet link')) {
        errorStatus = 'ERROR_CALENDAR_LINK';
    } else if (platform === 'Zoom' && error.message.includes('Failed to create Zoom meeting')) {
         errorStatus = 'ERROR_ZOOM_MEETING';
    } else if (meetingRecord && !meetingBaasId) { // If DB record created but bot invite failed
        errorStatus = 'ERROR_BOT_INVITE';
    } 
    // Check for Axios errors specifically (e.g., from BaaS service)
    else if (typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError && error.response) {
       errorMessage = error.response.data?.message || error.message;
       statusCode = error.response.status || 500;
    }

    // Attempt to update meeting status in DB if record exists
    if (meetingRecord) {
      try {
        await prisma.meeting.update({
          where: { id: meetingRecord.id },
          data: {
             status: errorStatus,
             meetingBaasId: meetingBaasId // Store BaaS ID even if subsequent update fails
           },
        });
      } catch (updateError) {
        console.error(`Failed to update meeting ${meetingRecord.id} status to ${errorStatus}:`, updateError);
      }
    } else if (platform === 'Google Meet' && externalMeetingId) {
       // If Google event was created but DB record failed
       console.warn(`DB record creation failed for Google Event ${externalMeetingId}. Consider manual cleanup.`);
       // Potentially try to delete the Google Calendar event here (complex rollback)
    } else if (platform === 'Zoom' && externalMeetingId) {
        // If Zoom meeting created but DB record failed
        console.warn(`DB record creation failed for Zoom Meeting ${externalMeetingId}. Consider manual cleanup.`);
        // Potentially try to delete the Zoom meeting here (complex rollback)
    }

    res.status(statusCode).json({ message: errorMessage, errorDetails: error.response?.data }); // Include details if available
  }
});

// Helper function to guess platform (simple example)
function extractPlatform(url: string): string | undefined {
  if (!url) return undefined;
  if (url.includes('zoom.us')) return 'Zoom';
  if (url.includes('meet.google.com')) return 'Google Meet';
  if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
  return undefined;
}

// GET /api/meetings - Temporarily removing Redis caching
router.get('/', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  const managerId = req.user?.userId;
  // const skipCache = req.query.skipCache === 'true'; // Cache logic commented out

  if (!managerId) {
    return res.status(401).json({ message: 'User not authenticated or manager ID not found.' });
  }

  // const cacheKey = `meetings_user_${managerId}`;
  // if (!skipCache) { ... cache check logic commented out ... }

  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        managerId: managerId,
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        scheduledTime: 'desc',
      },
    });

    // try { ... cache set logic commented out ... } catch (cacheError) { ... }

    res.status(200).json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ message: 'Failed to retrieve meetings.' });
  }
});

// GET /api/meetings/:id - Temporarily removing Redis caching
router.get('/:id', authenticate, extractUserInfo, async (req: RequestWithUser, res: Response) => {
  const meetingId = parseInt(req.params.id, 10);
  const userId = req.user?.userId;

  if (isNaN(meetingId)) {
    return res.status(400).json({ message: 'Invalid meeting ID.' });
  }
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    // 1. Fetch the requesting user's details (including role)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ message: 'Authenticated user not found.' });
    }

    // 2. Fetch the requested meeting with relevant details
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { 
        manager: { select: { id: true, name: true, email: true } }, 
        employee: { select: { id: true, name: true, email: true, title: true } },
        transcript: true,
        insights: true,
      } 
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }

    // 3. Check Permissions
    let isAllowed = false;
    if (currentUser.role === 'ADMIN') {
      isAllowed = true;
    } else if (currentUser.role === 'MANAGER') {
      // For Managers, check if they are the manager of this meeting OR
      // if the meeting's manager is within their hierarchy (requires accessControlService logic)
      // Simple check for now: are they the direct manager?
      if (meeting.managerId === currentUser.id) {
          isAllowed = true;
      }
      // TODO: Implement proper hierarchical check for managers if needed, potentially calling a function
      // like `canManagerAccessMeeting(currentUser.id, meetingId)` from accessControlService.
      // For now, only direct managers or admins can access via this check.
      
    } else if (currentUser.role === 'USER') {
      // For Users, check if they are the manager OR the employee involved
      const employeeUser = await prisma.employee.findUnique({ where: { id: meeting.employeeId }, select: { userId: true } });
      if (meeting.managerId === currentUser.id || employeeUser?.userId === currentUser.id) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // 4. Return the meeting data
    res.json(meeting);

  } catch (error) {
    console.error(`Error fetching meeting ${meetingId}:`, error);
    res.status(500).json({ message: 'Failed to fetch meeting details.' });
  }
});

// Function to get all meetings accessible by the current user
const getAllAccessibleMeetings = async (req: RequestWithUser, res: Response) => {
  const managerId = req.user?.userId; // Assuming userId from token is the managerId or current user ID

  if (!managerId) {
    return res.status(401).json({ message: 'User not authenticated or userId not found in token' });
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    const meetings = await getAccessibleMeetings(currentUser);
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching accessible meetings:', error);
    let errorMessage = 'Failed to fetch meetings.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ message: errorMessage });
  }
};

// Register the new GET route for all accessible meetings
router.get('/', authenticate, extractUserInfo, getAllAccessibleMeetings);

// TODO: Add Webhook endpoint for Meeting BaaS notifications

export default router; 