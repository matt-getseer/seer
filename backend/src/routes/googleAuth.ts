import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, extractUserInfo } from '../middleware/auth.js'; // Added .js
import { RequestWithUser } from '../middleware/types.js'; // Import RequestWithUser directly from types.js
import { getGoogleAuthUrl, oauth2Client } from '../services/googleAuthService.js'; // Added .js
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient(); // Instantiate Prisma client

// Define where to redirect the user after successful auth
const FRONTEND_REDIRECT_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/auth/google - Redirects user to Google consent screen
router.get('/google', authenticate, extractUserInfo, (req: RequestWithUser, res: Response) => {
  // Get user ID from middleware
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const userId = req.user.id;
    // Return the auth URL instead of redirecting
    const authUrl = getGoogleAuthUrl(userId);
    console.log(`Generated Google Auth URL for user ${userId}: ${authUrl}`);
    res.json({ authUrl }); // Send URL back to frontend
  } catch (error: any) {
    console.error('Error generating Google Auth URL:', error);
    res.status(500).json({ message: 'Failed to initiate Google authentication.', error: error.message });
  }
});

// GET /api/auth/google/callback - Handles the redirect from Google
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    console.error('Google Auth Callback Error: No code received');
    // Redirect user to an error page or back to settings with an error message
    return res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_error=nocode`);
  }

  let userId: number;
  try {
    // Extract userId from state parameter
    const stateData = JSON.parse(state);
    userId = stateData.userId;
    if (!userId) {
      throw new Error('User ID missing from state parameter.');
    }
    console.log(`Received Google callback for user ID: ${userId}`);
  } catch (error) {
    console.error('Google Auth Callback Error: Invalid state parameter', state, error);
    return res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_error=invalidstate`);
  }

  try {
    // Exchange authorization code for tokens
    console.log(`Exchanging code for tokens for user ${userId}...`);
    const { tokens } = await oauth2Client.getToken(code);
    console.log(`Tokens received for user ${userId}:`, {
      access_token_present: !!tokens.access_token,
      refresh_token_present: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });

    if (!tokens.access_token) {
       throw new Error('Failed to retrieve access token from Google.');
    }

    // Calculate expiry date as DateTime object
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Store tokens in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        // Only update refresh token if a new one is provided
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
        googleTokenExpiry: expiryDate,
      } as any, // Bypass type checking for update data
    });

    console.log(`Successfully stored Google tokens for user ${userId}`);

    // Redirect user back to the frontend (e.g., settings page)
    res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_success=true`);

  } catch (error: any) {
    console.error(`Google Auth Callback Error for user ${userId}:`, error.response?.data || error.message);
    // Redirect user to an error page or back to settings
    const errorMessage = encodeURIComponent(error.response?.data?.error_description || error.message || 'token_exchange_failed');
    res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_error=${errorMessage}`);
  }
});

export default router; 