import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { meetingService } from '../api/client';
import { format } from 'date-fns';
import { useMeeting } from '../hooks/useQueryHooks';
import { AxiosError } from 'axios';
import { ArrowLeft } from '@phosphor-icons/react';

// Define the detailed meeting structure (should match backend includes)
interface MeetingDetail {
  id: number;
  title: string | null;
  scheduledTime: string;
  platform: string | null;
  status: string;
  audioFileUrl?: string | null;
  employee: {
    id: number;
    name: string | null;
    email?: string;
    title?: string;
  };
  manager: {
    id: number;
    name: string | null;
    email?: string;
  };
  transcript: {
    id: number;
    content: string;
    languageCode?: string | null;
  } | null;
  insights: {
    id: number;
    type: string;
    content: string;
  }[];
}

// Define possible tab values for Meeting Overview
type MeetingOverviewTab = 'Overview' | 'Transcript';

const MeetingOverviewPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const id = meetingId ? (typeof meetingId === 'string' ? parseInt(meetingId) : meetingId) : null;

  // Log the ID being used for fetching
  console.log('[MeetingOverviewPage] Fetching meeting with ID:', id);

  const { data: meeting, isLoading, error: queryError } = useMeeting<MeetingDetail>(id);

  // Log fetched data state
  console.log('[MeetingOverviewPage] isLoading:', isLoading);
  console.log('[MeetingOverviewPage] queryError:', queryError);
  console.log('[MeetingOverviewPage] meeting data:', meeting);

  // NEW: Tab state and items for MeetingOverviewPage
  const [activeOverviewTab, setActiveOverviewTab] = useState<MeetingOverviewTab>('Overview');
  const overviewTabItems: { id: MeetingOverviewTab; label: string }[] = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Transcript', label: 'Transcript & Recording' },
  ];

  // NEW: Handler for tab clicks
  const handleOverviewTabClick = (tabId: MeetingOverviewTab) => {
    setActiveOverviewTab(tabId);
  };

  const error = queryError 
  ? (
      (queryError instanceof AxiosError && 
       queryError.response?.data && 
       typeof queryError.response.data === 'object' && 
       'message' in queryError.response.data && 
       typeof queryError.response.data.message === 'string'
      ) 
        ? queryError.response.data.message
        : (queryError as Error).message
    ) || 'Failed to load meeting details. Please try again later.'
  : null;

  // Log the final error state being used
  console.log('[MeetingOverviewPage] Final calculated error state:', error);

  // Display loading state from hook
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Display error state from hook
  if (error) {
    console.log('[MeetingOverviewPage] Rendering error state.'); // Log entering error block
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }
  
  // Display not found state (if hook returns null/undefined data after loading without error)
  if (!meeting) {
    console.log('[MeetingOverviewPage] Rendering not found state (meeting data is null/undefined).'); // Log entering not found block
     return (
      <div className="text-center text-gray-500 mt-10">Meeting not found.</div>
    );
  }

  // If we reach here, meeting data should be available
  console.log('[MeetingOverviewPage] Proceeding to render meeting details.');

  // NEW: Calculate groupedInsights after loading and error checks, and if meeting exists
  let groupedInsights: Record<string, MeetingDetail['insights']> | null = null;
  if (meeting.insights && meeting.insights.length > 0) { // meeting is guaranteed here
    groupedInsights = meeting.insights.reduce((acc, insight) => {
      (acc[insight.type] = acc[insight.type] || []).push(insight);
      return acc;
    }, {} as Record<string, MeetingDetail['insights']>);
  }

  // Display meeting details using data from hook
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header - Apply EmployeeProfile style */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/meetings')}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back to meetings"
        >
          <ArrowLeft size={20} />
        </button>
        {/* Use h1 for semantic correctness, but style like profile */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            {meeting.title}
          </h2>
          {/* Apply mt-1 max-w-2xl text-sm text-gray-500 */}
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {format(new Date(meeting.scheduledTime), 'PPPPpppp')} ({meeting.platform || 'Unknown Platform'})
          </p>
          {/* Status badge remains, no longer indented */}
          <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ meeting.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : meeting.status.startsWith('ERROR') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800' }`}>
            Status: {meeting.status}
          </span>
        </div>
      </div>
      
      {/* Participants - Simple display */}
       <div className="bg-white overflow-hidden border border-gray-200 sm:rounded-lg p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
                <p className="text-gray-500">Manager</p>
                <p className="text-gray-900 font-medium">{meeting.manager ? (meeting.manager.name || `Manager ID: ${meeting.manager.id}`) : 'N/A'}</p>
            </div>
             <div>
                <p className="text-gray-500">Employee</p>
                <p className="text-gray-900 font-medium">{meeting.employee?.name || 'N/A'}</p>
                 <p className="text-gray-600">{meeting.employee?.title || ''}</p>
            </div>
          </div>
       </div>

      {/* NEW: Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Overview Tabs">
          {overviewTabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleOverviewTabClick(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm 
                ${activeOverviewTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              aria-current={activeOverviewTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeOverviewTab === 'Overview' && (
          <>
            {/* Executive Summary (formerly Meeting Insights) */}
            <div className="bg-white border border-gray-200 overflow-hidden sm:rounded-lg p-4 md:p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Executive Summary</h2>
              {groupedInsights && groupedInsights['SUMMARY'] ? (
                <p className="text-gray-600 whitespace-pre-wrap">{groupedInsights['SUMMARY'][0].content}</p>
              ) : (
                <p className="text-gray-500 italic">No summary available.</p>
              )}
            </div>

            {/* Action Items, Strengths, Areas for Support */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Action Items */}
              <div className="bg-white border border-gray-200 sm:rounded-lg">
                <div className="px-4 pt-5 pb-0 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Action Items</h3>
                </div>
                <div className="px-4 py-5 sm:px-6">
                  {/* ACTION ITEMS - simplified conditional and removed border-t */}
                  { groupedInsights && groupedInsights['ACTION_ITEM'] ? (
                    <div className="">
                        <ul className="space-y-2">
                            {groupedInsights['ACTION_ITEM'].map(item => 
                                <li key={item.id} className="p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm text-gray-700">
                                    {item.content}
                                </li>
                            )}
                        </ul>
                    </div>
                  ) : (
                    <p className="mt-4 text-gray-500 italic text-sm">No action items identified.</p> /* Show this if no action items */
                  )}
                </div>
              </div>

              {/* Strengths */}
              <div className="bg-white border border-gray-200 sm:rounded-lg">
                <div className="px-4 pt-5 pb-0 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Strengths</h3>
                </div>
                <div className="px-4 py-5 sm:px-6">
                  { groupedInsights && groupedInsights['STRENGTHS'] ? (
                    <div className="">
                        <ul className="space-y-2">
                            {groupedInsights['STRENGTHS'].map(item => 
                                <li key={item.id} className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-gray-700">
                                    {item.content}
                                </li>
                            )}
                        </ul>
                    </div>
                  ) : (
                    <p className="mt-4 text-gray-500 italic text-sm">No strengths identified.</p>
                  )}
                </div>
              </div>

              {/* Areas for Support */}
              <div className="bg-white border border-gray-200 sm:rounded-lg">
                <div className="px-4 pt-5 pb-0 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Areas for Support</h3>
                </div>
                <div className="px-4 py-5 sm:px-6">
                  { groupedInsights && groupedInsights['AREAS_FOR_SUPPORT'] ? (
                    <div className="">
                        <ul className="space-y-2">
                            {groupedInsights['AREAS_FOR_SUPPORT'].map(item => 
                                <li key={item.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700">
                                    {item.content}
                                </li>
                            )}
                        </ul>
                    </div>
                  ) : (
                    <p className="mt-4 text-gray-500 italic text-sm">No areas for support identified.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeOverviewTab === 'Transcript' && (
          <>
            {/* Transcript */}
            <div className="bg-white border border-gray-200 overflow-hidden sm:rounded-lg p-4 md:p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Transcript</h2>
              {meeting.transcript ? (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {meeting.transcript.content}
                </div>
              ) : (
                <p className="text-gray-500 italic">Transcript not available yet.</p>
              )}
            </div>
            
            {/* Optional: Add link to recording if URL exists */}
            {meeting.audioFileUrl && (
                 <div className="bg-white border border-gray-200 overflow-hidden sm:rounded-lg p-4 md:p-6">
                   <h2 className="text-xl font-semibold text-gray-800 mb-4">Recording</h2>
                      <a 
                          href={meeting.audioFileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                          View Recording (Opens in new tab)
                      </a>
                  </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};

export default MeetingOverviewPage; 