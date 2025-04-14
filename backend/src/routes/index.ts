import { Express } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { surveyRoutes } from './surveyRoutes';

export const setupRoutes = (app: Express) => {
  // Health check route
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Protected routes
  app.use('/api/surveys', authenticate, surveyRoutes);
}; 