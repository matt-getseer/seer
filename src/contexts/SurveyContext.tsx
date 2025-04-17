import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Survey } from '../types/survey';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';
import { api } from '../services/api';
import { useLocation } from 'react-router-dom';

interface SurveyContextType {
  surveys: Survey[];
  loading: boolean;
  error: string | null;
  addSurvey: (survey: { 
    title: string; 
    description?: string;
    questions?: Array<{
      question: string;
      type: "text" | "multiple_choice" | "boolean" | "rating";
      required: boolean;
      order_number: number;
    }>;
  }) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  updateSurvey: (id: string, data: { title: string; description?: string }) => Promise<void>;
  retryConnection: () => Promise<void>;
  refreshSurveys: () => Promise<void>;
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
  const location = useLocation();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check if we're on an auth-related route
  const isAuthRoute = useCallback(() => {
    const authRoutes = ['/sign-in', '/sign-up', '/set-password', '/auth/callback', '/reset-password', '/email-verification'];
    return authRoutes.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  // Check if we're on a route that needs surveys
  const needsSurveys = useCallback(() => {
    const surveyRoutes = ['/surveys'];
    return surveyRoutes.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  const fetchSurveys = useCallback(async () => {
    if (!user || isAuthRoute()) {
      logger.info('Skipping survey fetch', { 
        userId: user?.id, 
        path: location.pathname,
        reason: !user ? 'No user' : 'Auth route'
      }, { context: 'SurveyContext' });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.info('Starting survey fetch', { userId: user.id }, { context: 'SurveyContext' });
      
      const data = await api.getSurveys();
      logger.info('Survey fetch response', { 
        count: data.length 
      }, { context: 'SurveyContext' });

      setSurveys(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching surveys';
      logger.error('Error in fetchSurveys', { error: errorMessage }, { context: 'SurveyContext' });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthRoute, location.pathname]);

  // Only fetch surveys when we're on a route that needs them
  useEffect(() => {
    if (user && !isAuthRoute() && needsSurveys()) {
      logger.info('Route requires surveys, fetching', { 
        userId: user.id,
        path: location.pathname
      }, { context: 'SurveyContext' });
      fetchSurveys();
    } else {
      logger.info('Route does not require surveys, clearing', { 
        userId: user?.id,
        path: location.pathname,
        reason: !user ? 'No user' : isAuthRoute() ? 'Auth route' : 'Route does not need surveys'
      }, { context: 'SurveyContext' });
      setSurveys([]);
    }
  }, [user, retryCount, isAuthRoute, needsSurveys, location.pathname, fetchSurveys]);

  const refreshSurveys = useCallback(async () => {
    if (needsSurveys()) {
      await fetchSurveys();
    }
  }, [needsSurveys, fetchSurveys]);

  const addSurvey = async (survey: { 
    title: string; 
    description?: string;
    questions?: Array<{
      question: string;
      type: "text" | "multiple_choice" | "boolean" | "rating";
      required: boolean;
      order_number: number;
    }>;
  }) => {
    try {
      // First create the survey
      const newSurvey = await api.createSurvey({
        title: survey.title,
        description: survey.description
      });

      // Then add questions if they exist
      if (survey.questions && survey.questions.length > 0) {
        for (const question of survey.questions) {
          await api.addSurveyQuestion(newSurvey.id, question);
        }
      }

      // Update local state instead of fetching again
      setSurveys(prev => [newSurvey, ...prev]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error adding survey';
      logger.error('Error adding survey', { error: errorMessage }, { context: 'SurveyContext' });
      throw error;
    }
  };

  const deleteSurvey = async (id: string) => {
    try {
      logger.info('Starting survey deletion', { surveyId: id }, { context: 'SurveyContext' });
      await api.deleteSurvey(id);
      logger.info('Survey deleted successfully', { surveyId: id }, { context: 'SurveyContext' });
      
      // Just update local state, no need to fetch again
      setSurveys(prev => {
        const newSurveys = prev.filter(s => s.id !== id);
        logger.info('Updated local state', { 
          surveyId: id, 
          previousCount: prev.length, 
          newCount: newSurveys.length 
        }, { context: 'SurveyContext' });
        return newSurveys;
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error deleting survey';
      logger.error('Error deleting survey', { 
        surveyId: id, 
        error: errorMessage 
      }, { context: 'SurveyContext' });
      throw error;
    }
  };

  const updateSurvey = async (id: string, data: { title: string; description?: string }) => {
    try {
      logger.info('Starting survey update', { surveyId: id }, { context: 'SurveyContext' });
      await api.updateSurvey(id, data);
      logger.info('Survey updated successfully', { surveyId: id }, { context: 'SurveyContext' });
      
      // Update local state instead of fetching again
      setSurveys(prev => prev.map(survey => 
        survey.id === id 
          ? { ...survey, ...data }
          : survey
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating survey';
      logger.error('Error updating survey', { 
        surveyId: id, 
        error: errorMessage 
      }, { context: 'SurveyContext' });
      throw error;
    }
  };

  const retryConnection = async () => {
    logger.info('Retrying connection', { retryCount }, { context: 'SurveyContext' });
    setRetryCount(prev => prev + 1);
  };

  return (
    <SurveyContext.Provider value={{
      surveys,
      loading,
      error,
      addSurvey,
      deleteSurvey,
      updateSurvey,
      retryConnection,
      refreshSurveys,
    }}>
      {children}
    </SurveyContext.Provider>
  );
}; 
