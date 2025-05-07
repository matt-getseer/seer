"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteBotToMeeting = void 0;
const axios_1 = __importDefault(require("axios"));
const MEETINGBAAS_API_URL = 'https://api.meetingbaas.com';
const API_KEY = process.env.MEETINGBAAS_API_KEY;
if (!API_KEY) {
    console.error('MEETINGBAAS_API_KEY environment variable is not set.');
    // Optionally throw an error or exit, depending on desired behavior
    // throw new Error('MEETINGBAAS_API_KEY environment variable is not set.');
}
/**
 * Invites a Meeting BaaS bot to the specified meeting URL.
 */
const inviteBotToMeeting = async (params) => {
    if (!API_KEY) {
        throw new Error('Meeting BaaS API Key is not configured.');
    }
    const { meetingUrl, botName = 'Seer', entryMessage = 'Hello! I am joining this meeting to minutes and generate action plans.' } = params;
    try {
        console.log(`Attempting to invite bot to: ${meetingUrl}`);
        const response = await axios_1.default.post(`${MEETINGBAAS_API_URL}/bots`, {
            meeting_url: meetingUrl,
            reserved: false, // Assuming we want instantly available bots
            bot_name: botName,
            bot_image: 'C:\Users\matt\Documents\seer\frontend\public\favicon.png', // Optional: Add your branding
            entry_message: entryMessage,
            speech_to_text: 'Gladia', // Or configure based on user preference/settings
            // deduplication_key: null // Optional: Prevent duplicate bots
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-spoke-api-key': API_KEY,
            },
        });
        console.log('Meeting BaaS Bot Invite Response:', response.data);
        // The response likely contains a bot ID or meeting ID from Meeting BaaS
        // which might be useful to store or log.
        return response.data; // Return the response data (e.g., bot info)
    }
    catch (error) {
        // Add type checking for the error
        if (typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError) {
            // Now TypeScript knows error has AxiosError properties (potentially)
            const axiosError = error; // Use type assertion carefully or check further
            console.error('Error inviting Meeting BaaS bot (Axios):', axiosError.response?.status, axiosError.response?.data || axiosError.message);
        }
        else if (error instanceof Error) {
            console.error('Error inviting Meeting BaaS bot (General):', error.message);
        }
        else {
            console.error('Unknown error inviting Meeting BaaS bot:', error);
        }
        // Rethrow or handle the error appropriately
        throw error;
    }
};
exports.inviteBotToMeeting = inviteBotToMeeting;
// Add other functions here to interact with Meeting BaaS API as needed
// e.g., getBotStatus(botId), getMeetingDetails(meetingId), etc. 
