import { Router } from 'express';
import { SurveyController } from '../controllers/surveyController';
import { SurveyQuestionController } from '../controllers/surveyQuestionController';
import { SurveyResponseController } from '../controllers/surveyResponseController';
import { validateSurveyCreate, validateSurveyUpdate } from '../middleware/validators';

const router = Router();

// Survey routes
router.get('/', SurveyController.getSurveys);
router.get('/:id', SurveyController.getSurveyById);
router.post('/', validateSurveyCreate, SurveyController.createSurvey);
router.put('/:id', validateSurveyUpdate, SurveyController.updateSurvey);
router.delete('/:id', SurveyController.deleteSurvey);

// Question routes
router.get('/:id/questions', SurveyQuestionController.getSurveyQuestions);
router.post('/:id/questions', SurveyQuestionController.addSurveyQuestion);
router.put('/:id/questions/:questionId', SurveyQuestionController.updateSurveyQuestion);
router.delete('/:id/questions/:questionId', SurveyQuestionController.deleteSurveyQuestion);

// Response routes
router.get('/:id/responses', SurveyResponseController.getSurveyResponses);
router.post('/:id/responses', SurveyResponseController.addSurveyResponse);

export { router as surveyRoutes }; 