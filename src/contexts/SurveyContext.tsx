import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase, Survey } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';

interface SurveyContextType {
  surveys: Survey[];
  loading: boolean;
  error: string | null;
  addSurvey: (survey: Omit<Survey, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  retryConnection: () => Promise<void>;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export const useSurveyContext = () => {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error('useSurveyContext must be used within a SurveyProvider');
  }
  return context;
};

export const SurveyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchSurveys = useCallback(async () => {
    if (!user) {
      logger.info('No user authenticated, skipping survey fetch', null, { context: 'SurveyContext' });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.info('Starting survey fetch', { userId: user.id }, { context: 'SurveyContext' });
      
      // First fetch the surveys for the current user
      const { data: surveysData, error: fetchError } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      logger.info('Survey fetch response', { 
        data: surveysData, 
        error: fetchError,
        count: surveysData?.length 
      }, { context: 'SurveyContext' });

      if (fetchError) {
        logger.error('Error fetching surveys', fetchError, { context: 'SurveyContext' });
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!surveysData || surveysData.length === 0) {
        logger.info('No surveys found for user', { userId: user.id }, { context: 'SurveyContext' });
        setSurveys([]);
        return;
      }

      // Then fetch participant counts for each survey
      const surveysWithCounts = await Promise.all(surveysData.map(async (survey) => {
        const { count, error: countError } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', survey.id);

        logger.info('Participant count fetch response', { 
          surveyId: survey.id,
          count,
          error: countError
        }, { context: 'SurveyContext' });

        if (countError) {
          logger.error('Error fetching participant count', countError, { context: 'SurveyContext' });
          return {
            ...survey,
            stats: {
              participants: 0
            }
          };
        }

        return {
          ...survey,
          stats: {
            participants: count || 0
          }
        };
      }));

      logger.info('Final surveys with counts', { 
        count: surveysWithCounts.length,
        surveys: surveysWithCounts
      }, { context: 'SurveyContext' });
      
      setSurveys(surveysWithCounts);
    } catch (err) {
      logger.error('Error in fetchSurveys', err, { context: 'SurveyContext' });
      setError(err instanceof Error ? err.message : 'An error occurred while fetching surveys');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch surveys when user changes
  useEffect(() => {
    if (user) {
      logger.info('User authenticated, fetching surveys', { userId: user.id }, { context: 'SurveyContext' });
      fetchSurveys();
    } else {
      logger.info('No user authenticated, clearing surveys', null, { context: 'SurveyContext' });
      setSurveys([]);
    }
  }, [user, retryCount, fetchSurveys]);

  const retryConnection = async () => {
    logger.info('Retrying connection', { retryCount }, { context: 'SurveyContext' });
    setRetryCount(prev => prev + 1);
  };

  const addSurvey = async (newSurvey: Omit<Survey, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) {
      logger.error('Attempt to add survey without user', null, { context: 'SurveyContext' });
      throw new Error('User must be logged in to create a survey');
    }

    try {
      setLoading(true);
      setError(null);
      logger.info('Adding new survey', { ...newSurvey, userId: user.id }, { context: 'SurveyContext' });
      
      // First create the survey
      const { data: surveyData, error: insertError } = await supabase
        .from('surveys')
        .insert([{
          ...newSurvey,
          user_id: user.id,
          stats: { participants: 0 }
        }])
        .select()
        .single();

      if (insertError) {
        logger.error('Error adding survey', insertError, { context: 'SurveyContext' });
        throw new Error(`Database error: ${insertError.message}`);
      }

      // Then create the questions in the survey_questions table
      if (newSurvey.questions && newSurvey.questions.length > 0) {
        const questionsToInsert = newSurvey.questions.map((question: { question: string; type: string; required: boolean; order_number: number }, index: number) => ({
          survey_id: surveyData.id,
          question: question.question,
          type: question.type,
          required: question.required,
          order_number: question.order_number
        }));

        const { error: questionsError } = await supabase
          .from('survey_questions')
          .insert(questionsToInsert);

        if (questionsError) {
          logger.error('Error adding questions', questionsError, { context: 'SurveyContext' });
          throw new Error(`Database error: ${questionsError.message}`);
        }
      }

      setSurveys(prev => [surveyData, ...prev]);
    } catch (err) {
      logger.error('Error in addSurvey', err, { context: 'SurveyContext' });
      setError(err instanceof Error ? err.message : 'An error occurred while adding the survey');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSurvey = async (id: string) => {
    if (!user) {
      logger.error('Attempt to delete survey without user', null, { context: 'SurveyContext' });
      throw new Error('User must be logged in to delete a survey');
    }

    try {
      setLoading(true);
      setError(null);
      logger.info('Deleting survey', { surveyId: id, userId: user.id }, { context: 'SurveyContext' });

      const { error: deleteError } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      logger.info('Delete survey response', { error: deleteError }, { context: 'SurveyContext' });

      if (deleteError) {
        logger.error('Error deleting survey', deleteError, { context: 'SurveyContext' });
        throw new Error(`Database error: ${deleteError.message}`);
      }

      setSurveys(prev => prev.filter(survey => survey.id !== id));
    } catch (err) {
      logger.error('Error in deleteSurvey', err, { context: 'SurveyContext' });
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the survey');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SurveyContext.Provider value={{ surveys, loading, error, addSurvey, deleteSurvey, retryConnection }}>
      {children}
    </SurveyContext.Provider>
  );
}; 