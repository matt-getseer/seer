import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from './errorHandler';

export const validateSurveyCreate = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'Validation error: ' + JSON.stringify(errors.array()));
    }
    next();
  },
];

export const validateSurveyUpdate = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, 'Validation error: ' + JSON.stringify(errors.array()));
    }
    next();
  },
]; 