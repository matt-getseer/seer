import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SurveyAnalytics from '../components/SurveyAnalytics';

interface SharedLink {
  survey_id: string;
  expires_at: string | null;
  is_active: boolean;
  surveys: {
    title: string;
  } | null;
}

const SharedAnalytics: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('shared_analytics_links')
          .select(`
            survey_id,
            expires_at,
            is_active,
            surveys (
              title
            )
          `)
          .eq('token', token)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Invalid or expired link');
        if (!data.is_active) throw new Error('This link has been deactivated');
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          throw new Error('This link has expired');
        }

        const sharedLink = data as unknown as SharedLink;
        setSurveyId(sharedLink.survey_id);
        setSurveyTitle(sharedLink.surveys?.title || null);
      } catch (err) {
        console.error('Error verifying token:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while verifying the link');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !surveyId) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
          <div className="mt-2 text-sm text-red-700">{error || 'Invalid link'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{surveyTitle || 'Survey Analytics'}</h1>
        </div>
        <SurveyAnalytics surveyId={surveyId} isPublicView={true} />
      </div>
    </div>
  );
};

export default SharedAnalytics; 
