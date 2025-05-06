import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// Import only needed functions/objects from Google service
import { getGoogleAuthUrl, oauth2Client } from '../services/googleAuthService';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';
import { getZoomAuthorizationUrl, exchangeCodeForZoomTokens, saveZoomTokens } from '../services/zoomAuthService';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key'; // Use environment variable
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Use environment variable for frontend URL

// ... existing code ...

// --- Google Auth Routes ---

router.get('/google', authenticate, extractUserInfo, (req: RequestWithUser, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
         // Should be caught by authenticate, but good practice to check
         return res.status(401).json({ message: 'User not authenticated' });
    }
    // Pass userId to generate state correctly if needed by getGoogleAuthUrl implementation
    // Assuming getGoogleAuthUrl handles state generation or doesn't require it here
    const authUrl = getGoogleAuthUrl(userId);
    console.log("Generating Google Auth URL for user:", userId);
    res.json({ authUrl }); // Send URL to frontend for redirection
});

router.get('/google/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const state = req.query.state as string; // Assuming state contains { userId }
    // const requestUserId = req.user?.userId; // User ID from JWT/session - NO LONGER AVAILABLE DIRECTLY

    // --- State Validation (Example) ---
    let stateUserId: number | null = null;
    if (state) {
        try {
             const parsedState = JSON.parse(state);
             stateUserId = parsedState.userId;
        } catch (e) {
             console.error("Error parsing state:", e);
             // Handle invalid state error - redirect with error
             const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
             redirectUrl.searchParams.set('google_auth_error', 'Invalid state parameter');
             return res.redirect(redirectUrl.toString());
        }
    }

    // --- Basic Checks ---
    if (error) {
        console.error('Error during Google OAuth callback:', error);
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('google_auth_error', encodeURIComponent(error));
        return res.redirect(redirectUrl.toString());
    }

    if (!code) {
        console.error('No code received in Google OAuth callback');
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('google_auth_error', 'Authorization code missing');
        return res.redirect(redirectUrl.toString());
    }

     // --- User ID Verification ---
     // Make sure the logged-in user matches the user who started the flow (if state was used)
     // if (!requestUserId) { // NO LONGER VALID TO CHECK requestUserId here
     //     console.error('User ID not found in authenticated request during Google callback');
     //     const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
     //     redirectUrl.searchParams.set('google_auth_error', 'User authentication context lost');
     //     return res.redirect(redirectUrl.toString());
     // }
     // if (stateUserId && stateUserId !== requestUserId) {
     //     console.error(`State user ID (${stateUserId}) does not match authenticated user ID (${requestUserId})`);
     //     const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
     //     redirectUrl.searchParams.set('google_auth_error', 'State mismatch during authentication');
     //     return res.redirect(redirectUrl.toString());
     // }
     // Use requestUserId as the definitive ID after checks pass
     // const userId = requestUserId; // THIS NEEDS TO BE REPLACED WITH stateUserId

     if (!stateUserId) {
        console.error('User ID not found in state parameter during Google callback');
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('google_auth_error', 'User context missing from state');
        return res.redirect(redirectUrl.toString());
    }
    const userId = stateUserId; // Use userId from state

    // --- Token Exchange and Saving (kept within the route) ---
    try {
        console.log(`Exchanging Google auth code for user ID: ${userId}`);
        // Use the imported oauth2Client to exchange the code
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token || !tokens.refresh_token) {
            // Might happen if user denies offline access or other issues
            console.error('Missing access_token or refresh_token from Google.');
            throw new Error('Could not retrieve necessary tokens from Google. Please ensure offline access was granted.');
        }

        console.log(`Received Google tokens for user ID: ${userId}`);
        // Calculate expiry date
        const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

        // Save tokens directly using Prisma
        await prisma.user.update({
            where: { id: userId },
            data: {
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                googleTokenExpiry: expiryDate,
            },
        });

        console.log(`Successfully saved Google tokens for user ID: ${userId}`);

        // Redirect back to frontend settings page with success parameter
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('google_auth_success', 'true');
        res.redirect(redirectUrl.toString());

    } catch (err: any) {
        console.error('Failed to exchange code or save Google tokens:', err.response?.data || err.message);
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        // Provide a more specific error if possible (e.g., from Google's response)
        const errorMessage = err.response?.data?.error_description || err.message || 'Failed to process Google authentication';
        redirectUrl.searchParams.set('google_auth_error', encodeURIComponent(errorMessage));
        res.redirect(redirectUrl.toString());
    }
});

// --- Zoom Auth Routes ---

console.log("DEBUG: Defining GET /zoom route in auth.ts");
// Route to initiate Zoom OAuth flow
router.get('/zoom', authenticate, extractUserInfo, (req: RequestWithUser, res: Response) => {
    console.log("DEBUG: GET /zoom route handler executing");
    const userId = req.user?.userId;

    if (!userId) {
      // Should be caught by middleware, but good defensive check
      console.error('User ID not found in authenticated request during Zoom initiation');
      return res.status(401).json({ message: 'User authentication context lost during initiation' });
    }

    // Create state object containing the user ID
    const state = JSON.stringify({ userId: userId });
    console.log(`DEBUG: Generated state for Zoom OAuth: ${state}`);

    // Pass the state string to the function generating the URL
    const authUrl = getZoomAuthorizationUrl(state);
    console.log("Generating Zoom auth URL for user...");
    res.json({ authUrl }); // Send URL to frontend to initiate redirection
});

console.log("DEBUG: Defining GET /zoom/callback route in auth.ts");
// Route to handle the callback from Zoom
// Middleware is removed here because request comes directly from Zoom redirect
router.get('/zoom/callback', /* authenticate, extractUserInfo, */ async (req: Request, res: Response) => { // Use standard Request type now
    console.log("DEBUG: GET /zoom/callback route handler executing");
    const code = req.query.code as string;
    const error = req.query.error as string; 
    const state = req.query.state as string; // Get state from query parameters

    let userId: number | undefined;

    // --- State Validation ---
    if (state) {
        try {
            const parsedState = JSON.parse(state);
            userId = parsedState.userId;
            console.log(`DEBUG: Parsed userId from state: ${userId}`);
            if (typeof userId !== 'number') {
                // Ensure userId is a number after parsing
                throw new Error('User ID parsed from state is not a number.');
            }
        } catch (e) {
            console.error("Error parsing state or invalid userId type:", e);
            const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
            redirectUrl.searchParams.set('zoom_auth_error', 'Invalid state parameter received from Zoom');
            return res.redirect(redirectUrl.toString());
        }
    } else {
        console.error("No state parameter received from Zoom callback");
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('zoom_auth_error', 'Missing state parameter from Zoom callback');
        return res.redirect(redirectUrl.toString());
    }
    // userId is now populated from the state

    // --- Basic Checks ---
    if (error) {
        console.error('Error during Zoom OAuth callback:', error);
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('zoom_auth_error', encodeURIComponent(`Zoom Error: ${error}`));
        return res.redirect(redirectUrl.toString());
    }

    if (!code) {
        console.error('No code received in Zoom OAuth callback');
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('zoom_auth_error', 'Authorization code missing from Zoom');
        return res.redirect(redirectUrl.toString());
    }

    // --- User ID Check (already retrieved from state) ---
    if (!userId) {
        // This check should technically be redundant now if state parsing worked, but keep as safety
        console.error('User ID could not be determined from state during Zoom callback');
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('zoom_auth_error', 'User authentication context lost during callback');
        return res.redirect(redirectUrl.toString());
    }

    // --- Token Exchange and Saving ---
    try {
        console.log(`Exchanging Zoom auth code for user ID: ${userId}`);
        const tokens = await exchangeCodeForZoomTokens(code);
        await saveZoomTokens(userId, tokens); // Use userId obtained from state
        console.log(`Successfully saved Zoom tokens for user ID: ${userId}`);

        // Redirect back to frontend settings page with success parameter
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        redirectUrl.searchParams.set('zoom_auth_success', 'true');
        res.redirect(redirectUrl.toString());

    } catch (err: any) {
        console.error('Failed to exchange code or save Zoom tokens:', err);
        const redirectUrl = new URL(`${FRONTEND_URL}/settings`);
        const errorMessage = err.message || 'Failed to process Zoom authentication';
        redirectUrl.searchParams.set('zoom_auth_error', encodeURIComponent(errorMessage));
        res.redirect(redirectUrl.toString());
    }
});

export default router; 