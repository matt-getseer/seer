import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import * as clerk from '@clerk/clerk-sdk-node';
// Don't import clerk yet, we'll do it after setting the environment variable

import { userRouter } from './routes/users';
import interviewRouter from './routes/interviews';
import teamRouter from './routes/teams';
import employeeRouter from './routes/employees';

// Load environment variables
console.log('Loading environment variables...');
dotenv.config();

// FIX: Hardcode the database URL since it's being malformed in the .env file
// This is a temporary solution for development only
const DB_URL = "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiYzYxZjJmYjAtNmU1NS00ZjIzLWI4YmQtOTQ5YzgyZDU0OGZhIiwidGVuYW50X2lkIjoiZWFlYzFkOGU1ZWU4MTRkMGNhZjUwZmUxNDQ2MDY5MDc1NTUxYTg1ZTMwMzFmMzVhOWZiZmFlZGMwZjJjNzY5NyIsImludGVybmFsX3NlY3JldCI6IjkwMzVhZjYwLTNhMTItNDE5Mi1hZGQ3LTUwZGY5ODIzOGVjMyJ9.cFB8UVGf8FBmAUrZ9Czu70YlHQPqKl6uGlK0ZGM31cw";
process.env.DATABASE_URL = DB_URL;
console.log('DATABASE_URL has been set programmatically');

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

// Debug routes - Add these before other routes
app.get('/api-test', (req, res) => {
  res.status(200).json({ message: 'API is accessible' });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'API with /api prefix is accessible' });
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Routes
app.use('/api/users', userRouter);
app.use('/api/interviews', interviewRouter);
app.use('/api/teams', teamRouter);
app.use('/api/employees', employeeRouter);

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