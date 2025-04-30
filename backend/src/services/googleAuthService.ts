import { google } from 'googleapis';
import dotenv from 'dotenv';
import { PrismaClient, User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library'; // Ensure this is imported

dotenv.config(); // Ensure environment variables are loaded

const prisma = new PrismaClient(); // Instantiate Prisma

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Define this in your .env file, e.g., http://localhost:3001/api/auth/google/callback
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error('Missing Google OAuth environment variables (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)');
  // Consider throwing an error if these are critical for startup
}

export const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Define the scope needed to create calendar events
export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// Define the expected shape after select
type UserWithGoogleTokens = {
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: Date | null;
};

// Function to generate the authorization URL
export const getGoogleAuthUrl = (userId: number): string => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
     throw new Error('Google OAuth credentials are not configured.');
  }
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: GOOGLE_CALENDAR_SCOPES,
    // Include user ID in state to link tokens back on callback
    state: JSON.stringify({ userId }),
    prompt: 'consent', // Force consent screen for refresh token
  });
  return authUrl;
};

// Function to get an authenticated client, handling token refresh
export const getAuthenticatedGoogleClient = async (userId: number): Promise<OAuth2Client> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true } as any, // Bypass select type check
  }) as UserWithGoogleTokens | null;

  if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
    // Redirect user to auth flow or throw error if tokens are missing
    // For now, throw an error indicating the user needs to authenticate
    console.error(`User ${userId} has not authenticated with Google or missing tokens.`);
    throw new Error('Google authentication required. Please connect your Google account.');
  }

  // Create a new client instance for this user to avoid race conditions
  const userAuthClient = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  userAuthClient.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry?.getTime(), // expiry_date expects number | null | undefined
  });

  // Check if the token is expired or about to expire (e.g., within 5 minutes)
  const now = Date.now();
  const expiryTime = user.googleTokenExpiry?.getTime() ?? 0;
  const fiveMinutes = 5 * 60 * 1000;

  if (expiryTime < now + fiveMinutes) {
    console.log(`Google token for user ${userId} is expired or nearing expiry. Refreshing...`);
    try {
      const { credentials } = await userAuthClient.refreshAccessToken();
      console.log(`Refreshed Google token successfully for user ${userId}`);

      // Update the stored tokens in the database with the new ones
      const newExpiryDate = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
          // Refresh token might change, update if provided
          ...(credentials.refresh_token && { googleRefreshToken: credentials.refresh_token }),
          googleTokenExpiry: newExpiryDate,
        } as any, // Bypass type checking for update data
      });

      // Set the new credentials on the client instance we are returning
      userAuthClient.setCredentials(credentials);

    } catch (error: any) {
      console.error(`Failed to refresh Google token for user ${userId}:`, error.response?.data || error.message);
      // If refresh fails, the refresh token might be invalid.
      // Consider clearing stored tokens and prompting re-authentication.
      await prisma.user.update({
         where: { id: userId },
         data: {
           googleAccessToken: null,
           googleRefreshToken: null,
           googleTokenExpiry: null,
         } as any, // Bypass type checking for update data
      });
      throw new Error('Failed to refresh Google token. Please re-authenticate.');
    }
  } else {
     console.log(`Using existing Google token for user ${userId}. Expires at: ${user.googleTokenExpiry}`);
  }

  return userAuthClient;
};

// Placeholder for token exchange logic (will be built in the callback route)
// export const exchangeCodeForTokens = async (code: string) => { ... };

// Placeholder for getting an authenticated client for API calls
// export const getAuthenticatedGoogleClient = async (userId: number) => { ... };
