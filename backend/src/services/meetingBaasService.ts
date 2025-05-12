import axios from 'axios';

const MEETINGBAAS_API_URL = 'https://api.meetingbaas.com';
const API_KEY = process.env.MEETINGBAAS_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || process.env.NGROK_URL || 'http://localhost:3001';

if (!API_KEY) {
  console.error('MEETINGBAAS_API_KEY environment variable is not set.');
  // Optionally throw an error or exit, depending on desired behavior
  // throw new Error('MEETINGBAAS_API_KEY environment variable is not set.');
}

interface InviteBotParams {
  meetingUrl: string;
  botName?: string;
  entryMessage?: string;
  // Using correct field names based on MeetingBaaS API documentation
  startDateTime?: Date | string; // Date object or ISO string
  endDateTime?: Date | string;   // Date object or ISO string
  webhookUrl?: string; // Add webhook URL parameter
}

/**
 * Invites a Meeting BaaS bot to the specified meeting URL.
 */
export const inviteBotToMeeting = async (params: InviteBotParams) => {
  if (!API_KEY) {
    throw new Error('Meeting BaaS API Key is not configured.');
  }

  const { 
    meetingUrl, 
    botName = 'Seer', 
    entryMessage = 'Hello! I am joining this meeting to minutes and generate action plans.',
    startDateTime,
    endDateTime,
    webhookUrl = `${BACKEND_URL}/api/webhooks/meetingbaas` // Default webhook URL
  } = params;

  try {
    console.log(`Attempting to invite bot to: ${meetingUrl}`);
    const requestBody = {
      meeting_url: meetingUrl,
      reserved: false, // Assuming we want instantly available bots
      bot_name: botName,
      entry_message: entryMessage,
      speech_to_text: 'Gladia', // Or configure based on user preference/settings
      webhook_url: webhookUrl, // Add the webhook URL to the request body
      // deduplication_key: null // Optional: Prevent duplicate bots
    };

    // Add scheduled start time if provided
    // The API expects a Unix timestamp in seconds
    if (startDateTime) {
      const startTimeMs = typeof startDateTime === 'string' 
        ? new Date(startDateTime).getTime() 
        : startDateTime.getTime();
      
      // Convert milliseconds to seconds for the API
      const startTimeSeconds = Math.floor(startTimeMs / 1000);
      
      Object.assign(requestBody, { start_time: startTimeSeconds });
    }

    console.log(`Using webhook URL: ${webhookUrl}`); // Log the webhook URL being used

    const response = await axios.post(
      `${MEETINGBAAS_API_URL}/bots`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-spoke-api-key': API_KEY,
        },
      }
    );

    console.log('Meeting BaaS Bot Invite Response:', response.data);
    return response.data; // Return the response data (e.g., bot info)
  } catch (error) {
    // Add type checking for the error
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError) {
      // Now TypeScript knows error has AxiosError properties (potentially)
      const axiosError = error as any; // Use type assertion carefully or check further
      console.error(
        'Error inviting Meeting BaaS bot (Axios):',
        axiosError.response?.status,
        axiosError.response?.data || axiosError.message
      );
    } else if (error instanceof Error) {
      console.error('Error inviting Meeting BaaS bot (General):', error.message);
    } else {
      console.error('Unknown error inviting Meeting BaaS bot:', error);
    }
    // Rethrow or handle the error appropriately
    throw error;
  }
};

// Add other functions here to interact with Meeting BaaS API as needed
// e.g., getBotStatus(botId), getMeetingDetails(meetingId), etc. 