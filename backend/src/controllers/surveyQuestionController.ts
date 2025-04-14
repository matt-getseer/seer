import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService';
import { AppError } from '../middleware/errorHandler';

export class SurveyQuestionController {
  static async getSurveyQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('order_number');

      if (error) throw new AppError(500, 'Error fetching questions');

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async addSurveyQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { question, type, options, required, order_number } = req.body;
      const { data, error } = await supabase
        .from('survey_questions')
        .insert([
          {
            survey_id: id,
            question,
            type,
            options,
            required,
            order_number,
          },
        ])
        .select()
        .single();

      if (error) throw new AppError(500, 'Error adding question');

      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async updateSurveyQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, questionId } = req.params;
      const { question, type, options, required, order_number } = req.body;
      const { data, error } = await supabase
        .from('survey_questions')
        .update({ question, type, options, required, order_number })
        .eq('id', questionId)
        .eq('survey_id', id)
        .select()
        .single();

      if (error) throw new AppError(404, 'Question not found');

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async deleteSurveyQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, questionId } = req.params;
      const { error } = await supabase
        .from('survey_questions')
        .delete()
        .eq('id', questionId)
        .eq('survey_id', id);

      if (error) throw new AppError(404, 'Question not found');

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
} 