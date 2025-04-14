import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { analyzeWithGemini } from '../lib/gemini';
import { logger } from '../lib/logger';

interface AnalyticsProps {
  surveyId: string;
  isPublicView?: boolean;
}

interface AnalysisResult {
  id: string;
  survey_id: string;
  sentiment_score: number;
  key_themes: string[];
  actionable_insights: string[];
  created_at: string;
}

interface SurveyMetrics {
  totalParticipants: number;
  completedResponses: number;
  completionRate: number;
  averageTimeToComplete: number;
  responseRate: number;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  question: string;
  answer: string;
  created_at: string;
  completed_at: string | null;
}

const SurveyAnalytics: React.FC<AnalyticsProps> = ({ surveyId, isPublicView = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [metrics, setMetrics] = useState<SurveyMetrics | null>(null);
  const [isApiConfigured, setIsApiConfigured] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch total participants
      const { count: totalParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('count', { count: 'exact', head: true })
        .eq('survey_id', surveyId);

      if (participantsError) {
        logger.error('Error fetching participants count', participantsError, { context: 'SurveyAnalytics' });
        throw participantsError;
      }

      console.log('Participants count:', totalParticipants); // Debug log

      // Fetch completed responses
      const { data: completedResponses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .not('completed_at', 'is', null);

      if (responsesError) throw responsesError;

      // Calculate average time to complete
      const totalTime = completedResponses.reduce((sum, response) => {
        const startTime = new Date(response.created_at).getTime();
        const endTime = new Date(response.completed_at).getTime();
        return sum + (endTime - startTime);
      }, 0);

      const averageTimeToComplete = completedResponses.length > 0 
        ? Math.round(totalTime / completedResponses.length / 1000 / 60) // Convert to minutes
        : 0;

      setMetrics({
        totalParticipants: totalParticipants || 0,
        completedResponses: completedResponses.length,
        completionRate: totalParticipants ? (completedResponses.length / totalParticipants) * 100 : 0,
        averageTimeToComplete,
        responseRate: totalParticipants ? (completedResponses.length / totalParticipants) * 100 : 0
      });

      logger.info('Survey metrics calculated', {
        surveyId,
        totalParticipants,
        completedResponses: completedResponses.length,
        context: 'SurveyAnalytics'
      });

    } catch (err) {
      logger.error('Error fetching metrics', err, { context: 'SurveyAnalytics' });
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    }
  }, [surveyId]);

  const fetchResponses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId);

      if (error) throw error;
      setResponses(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `Failed to fetch survey responses: ${err.message}`
        : 'An unexpected error occurred while fetching survey responses';
      logger.error('Error fetching responses', { error: err, message: errorMessage }, { context: 'SurveyAnalytics' });
      setError(errorMessage);
    }
  }, [surveyId]);

  const fetchLatestAnalysis = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('survey_analysis')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch survey analysis: ${error.message}`);
      }
      setAnalysisResults(data);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message
        : 'An unexpected error occurred while fetching survey analysis';
      logger.error('Error fetching analysis', { error: err, message: errorMessage }, { context: 'SurveyAnalytics' });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    setIsApiConfigured(!!import.meta.env.VITE_GEMINI_API_KEY);
    fetchResponses();
    fetchLatestAnalysis();
    fetchMetrics();
  }, [surveyId, fetchResponses, fetchLatestAnalysis, fetchMetrics]);

  const runAnalysis = async () => {
    if (!isApiConfigured) {
      setError('Gemini API is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
      return;
    }

    if (responses.length === 0) {
      setError('No responses to analyze');
      return;
    }

    setLoading(true);
    try {
      const formattedResponses = responses.map(response => ({
        question: response.question,
        answer: response.answer
      }));

      const analysis = await analyzeWithGemini(formattedResponses);
      
      const { error } = await supabase
        .from('survey_analysis')
        .insert([
          {
            survey_id: surveyId,
            sentiment_score: analysis.sentiment_score,
            key_themes: analysis.key_themes,
            actionable_insights: analysis.actionable_insights,
          },
        ]);

      if (error) throw error;
      await fetchLatestAnalysis();
    } catch (err) {
      logger.error('Error running analysis', err, { context: 'SurveyAnalytics' });
      setError(err instanceof Error ? err.message : 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!isApiConfigured) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4">
        <h3 className="text-sm font-medium text-yellow-800">Configuration Required</h3>
        <div className="mt-2 text-sm text-yellow-700">
          Gemini API is not configured. Please set the VITE_GEMINI_API_KEY environment variable to enable analytics.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isPublicView && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Survey Analytics</h2>
          <button
            onClick={runAnalysis}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Run Analysis
          </button>
        </div>
      )}

      {/* Survey Metrics Section */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Participants</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.totalParticipants}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {metrics.completionRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Average Time</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {metrics.averageTimeToComplete} min
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Response Rate</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {metrics.responseRate.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {analysisResults ? (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4">Sentiment Analysis</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200">
                    Score: {analysisResults.sentiment_score}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                <div
                  style={{ width: `${analysisResults.sentiment_score}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4">Key Themes</h3>
            <div className="space-y-2">
              {analysisResults.key_themes.map((theme, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 bg-gray-50 rounded-md p-3"
                >
                  {theme}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4">Actionable Insights</h3>
            <div className="space-y-4">
              {analysisResults.actionable_insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-primary-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No analysis results available. Run analysis to generate insights.</p>
        </div>
      )}
    </div>
  );
};

export default SurveyAnalytics; 
