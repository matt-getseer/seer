import axios from 'axios';

const MEETINGBAAS_API_URL = 'https://api.meetingbaas.com';
const API_KEY = process.env.MEETINGBAAS_API_KEY;

if (!API_KEY) {
  console.error('MEETINGBAAS_API_KEY environment variable is not set.');
  // Optionally throw an error or exit, depending on desired behavior
  // throw new Error('MEETINGBAAS_API_KEY environment variable is not set.');
}

interface InviteBotParams {
  meetingUrl: string;
  botName?: string;
  entryMessage?: string;
  // Add other parameters as needed based on Meeting BaaS API docs
  // e.g., transcription provider, custom bot image, etc.
}

/**
 * Invites a Meeting BaaS bot to the specified meeting URL.
 */
export const inviteBotToMeeting = async (params: InviteBotParams) => {
  if (!API_KEY) {
    throw new Error('Meeting BaaS API Key is not configured.');
  }

  const { meetingUrl, botName = 'Performance Notetaker', entryMessage = 'Hello! I am joining this meeting to take notes.' } = params;

  try {
    console.log(`Attempting to invite bot to: ${meetingUrl}`);
    const response = await axios.post(
      `${MEETINGBAAS_API_URL}/bots`,
      {
        meeting_url: meetingUrl,
        reserved: false, // Assuming we want instantly available bots
        bot_name: botName,
        // bot_image: "URL_TO_YOUR_BOT_IMAGE", // Optional: Add your branding
        entry_message: entryMessage,
        speech_to_text: 'Gladia', // Or configure based on user preference/settings
        // deduplication_key: null // Optional: Prevent duplicate bots
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-spoke-api-key': API_KEY,
        },
      }
    );

    console.log('Meeting BaaS Bot Invite Response:', response.data);
    // The response likely contains a bot ID or meeting ID from Meeting BaaS
    // which might be useful to store or log.
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