import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { userRouter } from './routes/users';
import interviewRouter from './routes/interviews';
import teamRouter from './routes/teams';
import employeeRouter from './routes/employees';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API test: http://localhost:${PORT}/api-test`);
  console.log(`API with prefix test: http://localhost:${PORT}/api/test`);
});

// Handle shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database connection closed');
  process.exit(0);
}); 