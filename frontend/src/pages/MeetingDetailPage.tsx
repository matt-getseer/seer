import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const MeetingDetailPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const id = meetingId ? (typeof meetingId === 'string' ? parseInt(meetingId) : meetingId) : null;

  const { data: meeting, isLoading, error: queryError } = useMeeting<MeetingDetail>(id);

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

  // Back button handler
  const handleBackClick = () => {
    navigate('/meetings');
  };

  // Helper to render insights grouped by type
  const renderInsights = () => {
    if (!meeting || !meeting.insights || meeting.insights.length === 0) {
      return <p className="text-gray-500 italic">No insights generated yet.</p>;
    }

    const groupedInsights = meeting.insights.reduce((acc, insight) => {
      (acc[insight.type] = acc[insight.type] || []).push(insight);
      return acc;
    }, {} as Record<string, typeof meeting.insights>);

    return (
      <div className="space-y-4">
        {groupedInsights['SUMMARY'] && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">Summary</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{groupedInsights['SUMMARY'][0].content}</p>
          </div>
        )}
        {groupedInsights['ACTION_ITEM'] && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">Action Items</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {groupedInsights['ACTION_ITEM'].map(item => <li key={item.id}>{item.content}</li>)}
            </ul>
          </div>
        )}
        {groupedInsights['KEY_TOPIC'] && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">Key Topics</h3>
             <ul className="list-disc list-inside text-gray-600 space-y-1">
              {groupedInsights['KEY_TOPIC'].map(item => <li key={item.id}>{item.content}</li>)}
            </ul>
          </div>
        )}
        {/* Add rendering for other insight types if needed */}
      </div>
    );
  };

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
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }
  
  // Display not found state (if hook returns null/undefined data after loading without error)
  if (!meeting) {
     return (
      <div className="text-center text-gray-500 mt-10">Meeting not found.</div>
    );
  }

  // Display meeting details using data from hook
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header - Apply EmployeeProfile style */}
      <div className="flex items-center">
        <button
          onClick={handleBackClick}
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
       <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
                <p className="text-gray-500">Manager</p>
                <p className="text-gray-900 font-medium">{meeting.manager?.name || 'N/A'}</p>
                <p className="text-gray-600">{meeting.manager?.email || ''}</p>
            </div>
             <div>
                <p className="text-gray-500">Employee</p>
                <p className="text-gray-900 font-medium">{meeting.employee?.name || 'N/A'}</p>
                 <p className="text-gray-600">{meeting.employee?.email || ''}</p>
                 <p className="text-gray-600">{meeting.employee?.title || ''}</p>
            </div>
          </div>
       </div>

      {/* Insights */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 md:p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Meeting Insights</h2>
        {renderInsights()}
      </div>

      {/* Transcript */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 md:p-6">
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
           <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4 md:p-6">
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
    </div>
  );
};

export default MeetingDetailPage; 