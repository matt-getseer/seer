import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';
import { setupLogging } from './utils/logger';
import { initializeSupabase } from './services/supabaseService';
import { initializeEmailService } from './services/emailService';

// Setup logging first
const logger = setupLogging();

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
logger.info('Loading environment variables from:', { path: envPath });
const result = dotenv.config({ path: envPath });

if (result.error) {
  logger.error('Error loading .env file:', result.error);
} else {
  logger.info('Environment variables loaded successfully');
  // Initialize services that depend on environment variables
  initializeSupabase();
  initializeEmailService();
}

const app = express();
const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup routes
setupRoutes(app);

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
}); 