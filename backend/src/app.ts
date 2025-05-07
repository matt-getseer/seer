// backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path'; // For static path if you keep it here
import fs from 'fs'; // For static path check if you keep it here

// --- Route Imports ---
import teamsRouter from './routes/teams';
import employeesRouter from './routes/employees';
import authRouter from './routes/auth';
import meetingsRouter from './routes/meetings';
import { userRouter as usersRouter } from './routes/users'; // Assuming userRouter is the correct export name
import departmentsRouter from './routes/departments';
import webhooksRouter, { handleClerkWebhook } from './routes/webhooks'; // Ensure handleClerkWebhook is correctly imported/exported

const app = express();

// --- CORS Configuration ---
// (Copied from your original index.ts, ensure FRONTEND_URL is in .env)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000', // Your main frontend URL
  'http://localhost:5173' // Vite dev server origin, if you use it
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
// Handle preflight OPTIONS requests for all routes
app.options('*', cors({ /* same options as above or simpler if needed */
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));


// --- Helmet Security Headers ---
// (Copied from your original index.ts - adjust directives as needed)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://together-honeybee-3.clerk.accounts.dev', "'unsafe-inline'"],
        'connect-src': ["'self'", 'https://together-honeybee-3.clerk.accounts.dev', process.env.VITE_API_URL || 'http://localhost:3001'],
        'img-src': ["'self'", "https://img.clerk.com", "data:"],
        'style-src': ["'self'", "'unsafe-inline'"]
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// --- Clerk Webhook Route (needs raw body, BEFORE express.json()) ---
app.post('/api/webhooks/clerk', express.raw({type: 'application/json'}), handleClerkWebhook);

// --- Standard Middleware ---
app.use(express.json()); // For parsing application/json

// --- API Routes ---
app.use('/api/teams', teamsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/auth', authRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/departments', departmentsRouter); // Your departments route is here!
app.use('/api/webhooks', webhooksRouter); // Other webhook routes (if any, besides the specific Clerk one)


// --- Health Check Route ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// --- Serve Static Frontend Files (for production) ---
// Adjust the path according to your project structure. This assumes frontend is ../../frontend from backend/src
const staticPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(staticPath)) {
  console.log(`Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));
  // Handles any requests that don't match the API ones above by serving the frontend's index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  console.warn(`Static path not found: ${staticPath}. Frontend will not be served by this server if this is a production build.`);
}

// --- Global Error Handler (must be last) ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler] Caught:', err.message);
  console.error(err.stack);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'An unexpected error occurred on the server.',
    }
  });
});

export default app; // Export the configured app