import { Router } from 'express';
import { SurveyController } from '../controllers/surveyController';
import { SurveyQuestionController } from '../controllers/surveyQuestionController';
import { SurveyResponseController } from '../controllers/surveyResponseController';
import { validateSurveyCreate, validateSurveyUpdate } from '../middleware/validators';
import { sendSurveyEmails } from '../services/emailService';
import { supabase } from '../services/supabaseService';

const router = Router();

// Survey routes
router.get('/', SurveyController.getSurveys);
router.get('/:id', SurveyController.getSurveyById);
router.post('/', validateSurveyCreate, SurveyController.createSurvey);
router.put('/:id', validateSurveyUpdate, SurveyController.updateSurvey);
router.delete('/:id', SurveyController.deleteSurvey);

// Add email sending route
router.post('/:id/send-invites', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get survey details
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('title')
      .eq('id', id)
      .single();

    if (surveyError) throw surveyError;

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('name, email, participation_token')
      .eq('survey_id', id);

    if (participantsError) throw participantsError;
    if (!participants?.length) {
      return res.status(400).json({ error: 'No participants found for this survey' });
    }

    // Send emails
    await sendSurveyEmails(participants, survey.title);
    res.json({ success: true, count: participants.length });
  } catch (error) {
    next(error);
  }
});

// Question routes
router.get('/:id/questions', SurveyQuestionController.getSurveyQuestions);
router.post('/:id/questions', SurveyQuestionController.addSurveyQuestion);
router.put('/:id/questions/:questionId', SurveyQuestionController.updateSurveyQuestion);
router.delete('/:id/questions/:questionId', SurveyQuestionController.deleteSurveyQuestion);

// Response routes
router.get('/:id/responses', SurveyResponseController.getSurveyResponses);
router.post('/:id/responses', SurveyResponseController.addSurveyResponse);

export { router as surveyRoutes }; 