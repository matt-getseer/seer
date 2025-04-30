import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import querystring from 'querystring';

const prisma = new PrismaClient();

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI;

if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_REDIRECT_URI) {
  console.error("Zoom OAuth environment variables (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI) are missing!");
  // Consider throwing an error or handling this more gracefully depending on application needs
  // process.exit(1); 
}

// Construct the Zoom authorization URL
export const getZoomAuthorizationUrl = (state?: string): string => {
  console.log(`DEBUG: Using ZOOM_REDIRECT_URI: ${ZOOM_REDIRECT_URI}`);
  const params: Record<string, string> = {
    response_type: 'code',
    client_id: ZOOM_CLIENT_ID!,
    redirect_uri: ZOOM_REDIRECT_URI!,
  };
  if (state) {
    params.state = state;
    console.log(`DEBUG: Including state in Zoom auth URL: ${state}`);
  }
  return `https://zoom.us/oauth/authorize?${querystring.stringify(params)}`;
};

interface ZoomTokenResponse {
  access_token: string;
  token_type: string; // Typically "bearer"
  refresh_token: string;
  expires_in: number; // Seconds until expiry
  scope: string; // Scopes granted
}

// Exchange authorization code for tokens
export const exchangeCodeForZoomTokens = async (code: string): Promise<ZoomTokenResponse> => {
  const tokenUrl = 'https://zoom.us/oauth/token';
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post<ZoomTokenResponse>(
      tokenUrl,
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: ZOOM_REDIRECT_URI!,
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log("Successfully exchanged code for Zoom tokens.");
    return response.data;
  } catch (error: any) {
    console.error('Error exchanging code for Zoom tokens:', error.response?.data || error.message);
    throw new Error(`Failed to exchange code for Zoom tokens: ${error.response?.data?.reason || error.message}`);
  }
};

// Save tokens to the database
export const saveZoomTokens = async (userId: number, tokens: ZoomTokenResponse): Promise<void> => {
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000); // Calculate expiry date

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        zoomAccessToken: tokens.access_token,
        zoomRefreshToken: tokens.refresh_token,
        zoomTokenExpiry: expiryDate,
      },
    });
    console.log(`Zoom tokens saved successfully for user ID: ${userId}`);
  } catch (error) {
    console.error(`Error saving Zoom tokens for user ID ${userId}:`, error);
    throw new Error('Failed to save Zoom tokens to database.');
  }
};

// Refresh Zoom access token using the refresh token
export const refreshZoomToken = async (refreshToken: string): Promise<ZoomTokenResponse> => {
    const tokenUrl = 'https://zoom.us/oauth/token';
    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.post<ZoomTokenResponse>(
            tokenUrl,
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        console.log("Successfully refreshed Zoom token.");
        // Note: Zoom might return a new refresh token, handle if necessary (docs seem to suggest it might not always)
        return response.data;
    } catch (error: any) {
        console.error('Error refreshing Zoom token:', error.response?.data || error.message);
        // If refresh fails (e.g., token revoked), might need specific handling like clearing tokens
        if (error.response?.status === 401 || error.response?.data?.reason === 'Invalid Token!') {
             // Consider clearing the invalid tokens from the DB here
             console.error('Zoom refresh token appears invalid or revoked.');
        }
        throw new Error(`Failed to refresh Zoom token: ${error.response?.data?.reason || error.message}`);
    }
};


// Placeholder for getting an authenticated client/token for API calls
// This would involve fetching tokens, checking expiry, refreshing if needed
export const getAuthenticatedZoomClient = async (userId: number): Promise<string | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zoomAccessToken: true, zoomRefreshToken: true, zoomTokenExpiry: true },
    });

    if (!user || !user.zoomAccessToken || !user.zoomRefreshToken || !user.zoomTokenExpiry) {
      console.warn(`No valid Zoom tokens found for user ID: ${userId}`);
      return null; // Or throw an error indicating user needs to authenticate
    }

    // Check if token is expired or close to expiring (e.g., within 5 minutes)
    const bufferSeconds = 5 * 60; 
    if (new Date() >= new Date(user.zoomTokenExpiry.getTime() - bufferSeconds * 1000)) {
      console.log(`Zoom token expired or expiring soon for user ${userId}. Refreshing...`);
      try {
        const refreshedTokens = await refreshZoomToken(user.zoomRefreshToken);
        // Save the potentially new tokens (including new expiry)
        await saveZoomTokens(userId, refreshedTokens); 
        console.log(`Zoom token refreshed and saved for user ${userId}.`);
        return refreshedTokens.access_token; // Return the new access token
      } catch (refreshError) {
         console.error(`Failed to refresh Zoom token for user ${userId}:`, refreshError);
         // Clear tokens if refresh failed permanently?
         await prisma.user.update({
             where: { id: userId },
             data: { zoomAccessToken: null, zoomRefreshToken: null, zoomTokenExpiry: null },
         });
         console.error(`Cleared invalid Zoom tokens for user ${userId} after refresh failure.`);
         return null; // Indicate failure to get a valid token
      }
    }

    // Token is valid, return the current access token
    return user.zoomAccessToken;

  } catch (error) {
    console.error(`Error retrieving authenticated Zoom client for user ${userId}:`, error);
    return null; // Indicate failure
  }
}; 

// Define expected structure for meeting creation details
interface ZoomMeetingDetails {
  topic: string;
  // Use ISO 8601 format string (YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss)
  start_time: string; 
  duration: number; // In minutes
  timezone: string; // e.g., "America/Los_Angeles"
  // Optional description
  agenda?: string; 
  // Attendee emails for invitation (optional, Zoom handles invites differently)
  // Note: Adding attendees here mainly adds them to Zoom's meeting info, 
  // might not send calendar invites like Google Calendar does directly.
  // Calendar invites are often handled separately or via Zoom's calendar integrations.
  attendees?: string[]; 
}

// Define the structure of the response we expect/need from Zoom API
interface ZoomMeetingResponse {
  id: number; // Zoom's numeric meeting ID
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  // Include other relevant fields as needed
}

// Function to create a Zoom meeting
export const createZoomMeeting = async (
  userId: number,
  meetingDetails: ZoomMeetingDetails
): Promise<ZoomMeetingResponse> => {
  console.log(`Attempting to create Zoom meeting for user ID: ${userId}`);
  
  // 1. Get authenticated token
  const accessToken = await getAuthenticatedZoomClient(userId);
  if (!accessToken) {
    console.error(`Failed to get authenticated Zoom client for user ID: ${userId}`);
    throw new Error('Zoom authentication required. Please connect your Zoom account in settings.');
  }

  // 2. Prepare request body for Zoom API
  // See: https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingCreate
  const requestBody = {
    topic: meetingDetails.topic,
    type: 2, // Scheduled meeting type
    start_time: meetingDetails.start_time, // Ensure ISO 8601 format
    duration: meetingDetails.duration, // In minutes
    timezone: meetingDetails.timezone, // e.g., "America/New_York"
    agenda: meetingDetails.agenda || '', // Optional description
    settings: {
      // Configure meeting settings as needed (e.g., waiting room, join before host)
      join_before_host: false,
      mute_upon_entry: true,
      participant_video: false,
      host_video: false,
      waiting_room: true,
      // auto_recording: "cloud", // Example: enable cloud recording
    },
    // Note on attendees: Zoom API v2 doesn't directly invite via this field.
    // It schedules the meeting. Invites usually happen via calendar integration or sharing the join_url.
    // We can add registrant emails if registration is required, but that's a different flow.
  };

  const apiUrl = 'https://api.zoom.us/v2/users/me/meetings';

  try {
    console.log("Sending request to Zoom API to create meeting...");
    const response = await axios.post<ZoomMeetingResponse>(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Zoom meeting created successfully. Join URL: ${response.data.join_url}`);
    return response.data; // Return the created meeting details

  } catch (error: any) {
    console.error('Error creating Zoom meeting:', error.response?.data || error.message);
    // Extract specific error message from Zoom if available
    const zoomErrorMessage = error.response?.data?.message || 'Unknown error';
    const zoomErrorCode = error.response?.data?.code;
    throw new Error(`Failed to create Zoom meeting: ${zoomErrorMessage} (Code: ${zoomErrorCode || 'N/A'})`);
  }
}; 