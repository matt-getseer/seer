"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth"); // Assuming middleware path
const googleAuthService_1 = require("../services/googleAuthService"); // Import oauth2Client
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient(); // Instantiate Prisma client
// Define where to redirect the user after successful auth
const FRONTEND_REDIRECT_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// GET /api/auth/google - Redirects user to Google consent screen
router.get('/google', auth_1.authenticate, auth_1.extractUserInfo, (req, res) => {
    // Get user ID from middleware
    if (!req.user?.userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const userId = req.user.userId;
        // Return the auth URL instead of redirecting
        const authUrl = (0, googleAuthService_1.getGoogleAuthUrl)(userId);
        console.log(`Generated Google Auth URL for user ${userId}: ${authUrl}`);
        res.json({ authUrl }); // Send URL back to frontend
    }
    catch (error) {
        console.error('Error generating Google Auth URL:', error);
        res.status(500).json({ message: 'Failed to initiate Google authentication.', error: error.message });
    }
});
// GET /api/auth/google/callback - Handles the redirect from Google
router.get('/google/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    if (!code) {
        console.error('Google Auth Callback Error: No code received');
        // Redirect user to an error page or back to settings with an error message
        return res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_error=nocode`);
    }
    let userId;
    try {
        // Extract userId from state parameter
        const stateData = JSON.parse(state);
        userId = stateData.userId;
        if (!userId) {
            throw new Error('User ID missing from state parameter.');
        }
        console.log(`Received Google callback for user ID: ${userId}`);
    }
    catch (error) {
        console.error('Google Auth Callback Error: Invalid state parameter', state, error);
        return res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_error=invalidstate`);
    }
    try {
        // Exchange authorization code for tokens
        console.log(`Exchanging code for tokens for user ${userId}...`);
        const { tokens } = await googleAuthService_1.oauth2Client.getToken(code);
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
            }, // Bypass type checking for update data
        });
        console.log(`Successfully stored Google tokens for user ${userId}`);
        // Redirect user back to the frontend (e.g., settings page)
        res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_success=true`);
    }
    catch (error) {
        console.error(`Google Auth Callback Error for user ${userId}:`, error.response?.data || error.message);
        // Redirect user to an error page or back to settings
        const errorMessage = encodeURIComponent(error.response?.data?.error_description || error.message || 'token_exchange_failed');
        res.redirect(`${FRONTEND_REDIRECT_URL}/settings?google_auth_error=${errorMessage}`);
    }
});
exports.default = router;
