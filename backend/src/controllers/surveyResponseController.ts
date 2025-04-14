import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService';
import { AppError } from '../middleware/errorHandler';

export class SurveyResponseController {
  static async getSurveyResponses(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', id);

      if (error) throw new AppError(500, 'Error fetching responses');

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async addSurveyResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { participant_id, answers } = req.body;
      const { data, error } = await supabase
        .from('survey_responses')
        .insert([
          {
            survey_id: id,
            participant_id,
            answers,
            completed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw new AppError(500, 'Error adding response');

      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
} 