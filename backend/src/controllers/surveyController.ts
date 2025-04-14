import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class SurveyController {
  static async getSurveys(req: Request, res: Response, next: NextFunction) {
    try {
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select(`
          *,
          participants:participants(count)
        `)
        .eq('user_id', req.userId);

      if (surveysError) throw new AppError(500, 'Error fetching surveys');

      // Transform the data to include participant count
      const transformedData = surveys.map(survey => ({
        ...survey,
        participant_count: survey.participants?.[0]?.count || 0
      }));

      res.json(transformedData);
    } catch (error) {
      next(error);
    }
  }

  static async getSurveyById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (error) throw new AppError(404, 'Survey not found');

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async createSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description } = req.body;
      logger.info('Creating survey', { 
        title, 
        description, 
        userId: req.userId,
        headers: req.headers 
      });

      if (!req.userId) {
        throw new AppError(401, 'User ID not found');
      }

      const surveyData = {
        title,
        description,
        user_id: req.userId,
        author: req.body.author || 'Anonymous'
      };
      
      logger.info('Attempting to insert survey with data:', surveyData);

      const { data, error } = await supabase
        .from('surveys')
        .insert([surveyData])
        .select()
        .single();

      if (error) {
        logger.error('Supabase error creating survey:', {
          error: error,
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        });
        throw new AppError(500, `Error creating survey: ${error.message}`);
      }

      logger.info('Survey created successfully', { surveyId: data.id });
      res.status(201).json(data);
    } catch (error) {
      logger.error('Error in createSurvey:', error);
      next(error);
    }
  }

  static async updateSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
      const { data, error } = await supabase
        .from('surveys')
        .update({ title, description })
        .eq('id', id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw new AppError(404, 'Survey not found');

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async deleteSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log(`Attempting to delete survey ${id} for user ${req.userId}`);

      // Delete survey responses first
      const { error: responsesError } = await supabase
        .from('survey_responses')
        .delete()
        .eq('survey_id', id);

      if (responsesError) {
        console.error('Error deleting survey responses:', responsesError);
        throw new AppError(500, 'Error deleting survey responses');
      }

      console.log(`Successfully deleted responses for survey ${id}`);

      // Delete participants
      const { error: participantsError } = await supabase
        .from('participants')
        .delete()
        .eq('survey_id', id);

      if (participantsError) {
        console.error('Error deleting participants:', participantsError);
        throw new AppError(500, 'Error deleting participants');
      }

      console.log(`Successfully deleted participants for survey ${id}`);

      // Delete survey analysis
      const { error: analysisError } = await supabase
        .from('survey_analysis')
        .delete()
        .eq('survey_id', id);

      if (analysisError) {
        console.error('Error deleting survey analysis:', analysisError);
        throw new AppError(500, 'Error deleting survey analysis');
      }

      console.log(`Successfully deleted analysis for survey ${id}`);

      // Delete survey questions
      const { error: questionsError } = await supabase
        .from('survey_questions')
        .delete()
        .eq('survey_id', id);

      if (questionsError) {
        console.error('Error deleting survey questions:', questionsError);
        throw new AppError(500, 'Error deleting survey questions');
      }

      console.log(`Successfully deleted questions for survey ${id}`);

      // Finally delete the survey
      const { error: surveyError } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id)
        .eq('user_id', req.userId);

      if (surveyError) {
        console.error('Error deleting survey:', surveyError);
        throw new AppError(surveyError.code === 'PGRST116' ? 404 : 500, surveyError.message || 'Survey not found');
      }

      console.log(`Successfully deleted survey ${id}`);
      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteSurvey controller:', error);
      next(error);
    }
  }
} 