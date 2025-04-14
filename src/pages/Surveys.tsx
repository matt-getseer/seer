import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSurveyContext } from '../contexts/SurveyContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

const Surveys: React.FC = () => {
  const navigate = useNavigate();
  const { surveys, loading, error, retryConnection } = useSurveyContext();
  const { user } = useAuth();

  useEffect(() => {
    logger.info('Surveys component mounted', { 
      user: user?.id,
      surveyCount: surveys.length,
      loading,
      error
    }, { context: 'Surveys' });
  }, [user, surveys.length, loading, error]);

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-[1024px] mx-auto">
          <div className="rounded-lg bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">Error loading surveys</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <button
              onClick={retryConnection}
              className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="max-w-[1024px] mx-auto">
          <div className="rounded-lg bg-yellow-50 p-4">
            <h3 className="text-sm font-medium text-yellow-800">Not Authenticated</h3>
            <div className="mt-2 text-sm text-yellow-700">
              Please sign in to view your surveys.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-[1024px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center rounded-lg bg-white px-4 py-2 shadow-sm">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search surveys..."
                className="ml-2 border-none bg-transparent outline-none"
              />
            </div>
            <button 
              onClick={() => navigate('/surveys/new')}
              className="flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <span>+ Survey</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                </div>
                <div className="mb-4 h-6 w-3/4 rounded bg-gray-200" />
                <div className="mb-4 h-4 w-full rounded bg-gray-200" />
                <div className="flex space-x-4">
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900">No surveys yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first survey to get started.
            </p>
            <button
              onClick={() => navigate('/surveys/new')}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              Create Survey
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                onClick={() => navigate(`/surveys/${survey.id}`)}
                className="group relative cursor-pointer rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-8 w-8 rounded-full bg-gray-200">
                    <span className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-600">
                      {survey.author.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <ArrowUpRightIcon className="h-5 w-5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h3 className="mb-4 text-lg font-medium text-gray-900">{survey.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{survey.description}</p>
                <div className="mt-4 flex space-x-4">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{survey.stats?.participants ?? 0}</span>
                    <span className="ml-1 text-sm text-gray-500">Participants</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Surveys; 
