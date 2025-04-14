import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { EllipsisVerticalIcon, ShareIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { supabase, Survey } from '../lib/supabase';
import { useSurveyContext } from '../contexts/SurveyContext';
import ConfirmationDialog from '../components/ConfirmationDialog';
import ParticipantManager from '../components/ParticipantManager';
import SurveyResponses from '../components/SurveyResponses';
import SurveyAnalytics from '../components/SurveyAnalytics';
import usePageTitle from '../hooks/usePageTitle';

type TabType = 'analytics' | 'responses' | 'participants';

const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    </div>

    <div className="mb-6 border-b border-gray-200">
      <div className="-mb-px flex space-x-8">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

const SurveyOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteSurvey } = useSurveyContext();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  usePageTitle(survey ? `Survey: ${survey.title}` : 'Survey Overview');

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setSurvey(data);
      } catch (err) {
        console.error('Error fetching survey:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching the survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [id]);

  const handleDelete = async () => {
    if (!survey) return;

    try {
      setError(null);
      setShowDeleteDialog(false);
      await deleteSurvey(survey.id);
      navigate('/surveys', { replace: true });
    } catch (err) {
      console.error('Error deleting survey:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the survey');
    }
  };

  const generateShareLink = async () => {
    if (!survey) return;

    try {
      // First, generate the token using the RPC function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) throw tokenError;

      // Then insert the new share link
      const { data, error: insertError } = await supabase
        .from('shared_analytics_links')
        .insert([
          {
            survey_id: survey.id,
            token: tokenData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      const link = `${window.location.origin}/analytics/${data.token}`;
      setShareLink(link);
      setShowShareDialog(true);
    } catch (err) {
      console.error('Error generating share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    }
  };

  const copyToClipboard = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        // You might want to show a success message here
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <SkeletonLoader />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Error loading survey</h3>
          <div className="mt-2 text-sm text-red-700">{error || 'Survey not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
              <p className="mt-2 text-gray-600">{survey.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/surveys')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-md shadow-sm hover:bg-primary-50 gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
              {activeTab === 'analytics' && (
                <button
                  onClick={generateShareLink}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-md shadow-sm hover:bg-primary-50 gap-2"
                >
                  <ShareIcon className="w-4 h-4" />
                  Share
                </button>
              )}
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100">
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => window.open(`/take-survey/preview/${survey.id}`, '_blank')}
                          className={`${
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          } group flex w-full items-center px-4 py-2 text-sm`}
                        >
                          Preview Survey
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setShowDeleteDialog(true)}
                          className={`${
                            active ? 'bg-red-50 text-red-900' : 'text-red-700'
                          } group flex w-full items-center px-4 py-2 text-sm`}
                        >
                          Delete Survey
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Menu>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'responses'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Responses
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'participants'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Participants
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'analytics' && (
            <SurveyAnalytics surveyId={survey.id} />
          )}
          {activeTab === 'responses' && (
            <SurveyResponses surveyId={survey.id} />
          )}
          {activeTab === 'participants' && (
            <ParticipantManager surveyId={survey.id} />
          )}
        </div>

        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Survey"
          message={`Are you sure you want to delete "${survey.title}"? This action cannot be undone and will remove all associated data.`}
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
          isDangerous={true}
        />

        {showShareDialog && shareLink && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Share Analytics</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Copy
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyOverview; 
