import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import * as clerk from '@clerk/clerk-sdk-node';
// Don't import clerk yet, we'll do it after setting the environment variable
// FIX: Import the necessary Clerk middleware
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

import { userRouter } from './routes/users';
import employeeRouter from './routes/employees';
import teamRouter from './routes/teams';
import meetingsRouter from './routes/meetings';
import webhooksRouter from './routes/webhooks';
// import notificationRouter from './routes/notifications'; // Remove this import

// Load environment variables
console.log('Loading environment variables...');
dotenv.config();

// Add check for DATABASE_URL similar to CLERK_SECRET_KEY
if (!process.env.DATABASE_URL) {
  console.error('CRITICAL ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please set this variable in your .env file.');
  process.exit(1); // Exit if DB URL is missing
}

// Check if Clerk secret key is available in environment
if (!process.env.CLERK_SECRET_KEY) {
  console.warn('WARNING: CLERK_SECRET_KEY environment variable is not set!');
  console.warn('Authentication may not work properly.');
  console.warn('Please make sure to set this variable in your .env file or environment.');
}

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- Add Webhook routes BEFORE authentication --- 
app.use('/api/webhooks', webhooksRouter);

// Debug routes - Add these before other routes
app.get('/api-test', (req, res) => {
  res.status(200).json({ message: 'API is accessible' });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'API with /api prefix is accessible' });
});

// Log all incoming requests (after webhook route)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// ADD Clerk Authentication Middleware HERE
// This will protect all subsequent routes
app.use(ClerkExpressRequireAuth());

// Routes
app.use('/api/users', userRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/teams', teamRouter);
app.use('/api/meetings', meetingsRouter);
// app.use('/api/notifications', notificationRouter); // Remove this line

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Catch-all 404 handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API test: http://localhost:${port}/api-test`);
  console.log(`API with prefix test: http://localhost:${port}/api/test`);
});

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server closed');
    process.exit(0);
  });
});

export default app; 