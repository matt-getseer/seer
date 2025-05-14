// backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path'; // For static path if you keep it here
import fs from 'fs'; // For static path check if you keep it here

// --- Route Imports ---
import teamsRouter from './routes/teams.js';
import employeesRouter from './routes/employees.js';
import authRouter from './routes/auth.js';
import meetingsRouter from './routes/meetings.js';
import { userRouter as usersRouter } from './routes/users.js'; // Assuming userRouter is the correct export name
import departmentsRouter from './routes/departments.js';
import webhooksRouter, { handleClerkWebhook } from './routes/webhooks.js'; // Ensure handleClerkWebhook is correctly imported/exported
import { invitationRouter } from './routes/invitations.js'; // Import the new invitations router
import { RequestWithUser } from './middleware/types.js';
import { organizationFeatureMiddleware, adminFeatureMiddleware } from './middleware/featureFlags.js';
import { ensureOrganizationContext } from './middleware/orgContext.js';
import { authenticate } from './middleware/auth.js';

// Create Express application
const app = express();

// --- Middleware Configuration ---
app.use(helmet()); // Security headers
app.use(cors());   // Cross-Origin Resource Sharing

// IMPORTANT: Define the Clerk webhook route with its raw body parser BEFORE global express.json()
app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), handleClerkWebhook);

// Global JSON parser for other routes - MUST come AFTER webhook routes that need raw body
app.use(express.json()); 

// --- Custom Middleware ---

// First check feature flags
app.use('/api', organizationFeatureMiddleware); // Handles default organization when feature is disabled

// Then ensure organization context is set in request
app.use('/api', ensureOrganizationContext);

// --- Route Definitions ---

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes (authentication required)
app.use('/api/teams', authenticate, teamsRouter);
app.use('/api/employees', authenticate, employeesRouter);
app.use('/api/users', authenticate, usersRouter); 
app.use('/api/meetings', authenticate, meetingsRouter);
app.use('/api/invitations', authenticate, invitationRouter); // Add the new invitations routes

// Admin-only routes
app.use('/api/departments', authenticate, adminFeatureMiddleware, departmentsRouter);

// Serve frontend in production if necessary
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }
}

export default app;