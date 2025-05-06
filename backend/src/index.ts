import dotenv from 'dotenv';
import path from 'path';

// --- DOTENV CONFIG FIRST --- 
console.log('Loading environment variables...');
// Ensure the path is correct if your .env file is in `backend/.env` and index.ts is in `backend/src/index.ts`
dotenv.config({ path: path.resolve(__dirname, '../.env') }); 
// More targeted debug log, check this when server starts
console.log('DEBUG: After dotenv.config(), CLERK_SECRET_KEY is:', process.env.CLERK_SECRET_KEY); 

// --- THEN OTHER IMPORTS ---
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';

// Import Clerk SDK AFTER dotenv has run
// You only need to import what you use. If `ClerkExpressRequireAuth` is what you need for middleware,
// and `users` (from the SDK) is used in `clerkUserHandler`, those are the key parts.
// The `import * as clerk` might not be necessary if you use named imports.
import { ClerkExpressRequireAuth, users } from '@clerk/clerk-sdk-node';

import { userRouter } from './routes/users';
import employeeRouter from './routes/employees';
import teamRouter from './routes/teams';
import meetingsRouter from './routes/meetings';
import webhooksRouter, { handleClerkWebhook } from './routes/webhooks'; // handleClerkWebhook is already imported here
import authRouter from './routes/auth';

// Check CLERK_SECRET_KEY after dotenv.config() and before SDK usage that might depend on it implicitly
const CLERK_SECRET_KEY_FROM_ENV = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY_FROM_ENV) {
  console.error("FATAL ERROR: CLERK_SECRET_KEY is not defined in process.env after dotenv.config(). Check .env file and path.");
  process.exit(1); // Exit if Clerk secret key is not set
}
console.log('Clerk Secret Key is confirmed in process.env.');

// Initialize Prisma Client
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Setup Helmet with CSP for Clerk
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': [
          "'self'",
          'https://together-honeybee-3.clerk.accounts.dev', // Allow Clerk scripts
          "'unsafe-inline'" // Allow inline scripts (temporary fix for CSP error)
        ],
        'connect-src': [
          "'self'",
          'https://together-honeybee-3.clerk.accounts.dev', // Allow connections to Clerk
          // Add any other domains your frontend needs to connect to (e.g., your API if served separately)
          process.env.VITE_API_URL || 'http://localhost:3001' 
        ],
        // Add other directives as needed, e.g., img-src, style-src
        'img-src': ["'self'", "https://img.clerk.com", "data:"], // Allow Clerk images
        'style-src': ["'self'", "'unsafe-inline'"] // Allow inline styles if needed
      },
    },
    // Optional: Configure other Helmet features if needed
    crossOriginEmbedderPolicy: false, 
    crossOriginOpenerPolicy: false,
  })
);


// CORS Configuration - Allow requests from your frontend
// Add the development server origin (e.g., Vite's default port)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000', 
  'http://localhost:5173' // Add Vite dev server origin
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies
}));

// Clerk Webhook route - needs raw body, so it's defined before express.json()
// The actual handler function 'handleClerkWebhook' will be in 'webhooks.ts'
app.post('/api/webhooks/clerk', express.raw({type: 'application/json'}), handleClerkWebhook);

// Body parsing middleware - now applied after the Clerk webhook route
app.use(express.json());

// Define API routes (Consider prefixing all with /api)
app.use('/api/users', userRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/teams', teamRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/webhooks', webhooksRouter); // Note: Webhooks might need raw body, check Clerk/Stripe docs
app.use('/api/auth', authRouter); // Mount the correct auth router

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Serve static files from React app (if building for production)
// Adjust the path according to your project structure
const staticPath = path.join(__dirname, '../../../frontend/dist'); 
if (fs.existsSync(staticPath)) {
  console.log(`Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));

  // Handles any requests that don't match the ones above
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  console.warn(`Static path not found: ${staticPath}. Frontend will not be served by this server.`);
}

// Global error handler (Example)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Handler Caught:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    // Optionally include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app; 