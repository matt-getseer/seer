import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingService } from '../api/client'; // Keep for potential mutations
import { format } from 'date-fns'; // For date formatting
import { useMeetings } from '../hooks/useQueryHooks'; // Import the custom hook
import { AxiosError } from 'axios'; // Import AxiosError
import { ArrowUp, ArrowDown } from 'phosphor-react'; // Import Phosphor icons

// Define the expected structure of a meeting object from the API
interface Meeting {
  id: number;
  title: string | null;
  scheduledTime: string;
  platform: string | null;
  status: string;
  employee: {
    id: number;
    name: string | null;
  };
  // Add other fields if needed for the list view
}

// Define sort configuration
type SortConfig = {
  key: keyof Meeting | 'employeeName'; // Allow sorting by nested employee name
  direction: 'ascending' | 'descending';
} | null;

const MeetingsPage: React.FC = () => {
  // Use the custom hook for data fetching, loading, and error state
  const { data: meetingsData = [], isLoading, error: queryError } = useMeetings<Meeting[]>();

  // Add state for sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Keep navigation state
  const navigate = useNavigate();

  // Handle potential error from react-query
  const error = queryError 
  ? (
      (queryError instanceof AxiosError && 
       queryError.response?.data && 
       typeof queryError.response.data === 'object' && 
       'message' in queryError.response.data && 
       typeof queryError.response.data.message === 'string'
      ) 
        ? queryError.response.data.message // Use message from response data if available
        : (queryError as Error).message // Otherwise, use the general error message
    ) || 'Failed to load meetings. Please try again later.' // Fallback message
  : null;

  const handleRowClick = (meetingId: number) => {
    navigate(`/meetings/${meetingId}`);
  };

  // Memoized sorting logic
  const sortedMeetings = useMemo(() => {
    let sortableItems = [...meetingsData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Handle nested employee name sorting
        if (sortConfig.key === 'employeeName') {
            aValue = a.employee?.name || '';
            bValue = b.employee?.name || '';
        } else {
            aValue = a[sortConfig.key as keyof Meeting];
            bValue = b[sortConfig.key as keyof Meeting];
        }


        // Basic comparison, handle nulls/undefined and case-insensitivity for strings
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [meetingsData, sortConfig]);


  // Function to request sorting
  const requestSort = (key: keyof Meeting | 'employeeName') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Function to render sort icons
  const getSortIcon = (key: keyof Meeting | 'employeeName') => {
    if (!sortConfig || sortConfig.key !== key) {
      // Return a placeholder or default icon if needed, or null for no icon when not sorted
      return null; // Or <SomeDefaultIcon size={16} />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp size={16} className="inline ml-1" />;
    }
    return <ArrowDown size={16} className="inline ml-1" />;
  };

  // Display loading state from the hook
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Display error state from the hook
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // Display meeting table using data from the hook
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
         {/* TODO: Add button to trigger recording? */}
      </div>
     
      <div className="bg-white overflow-hidden border border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('title')}>
                    Title {getSortIcon('title')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('employeeName')}>
                    Employee {getSortIcon('employeeName')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('scheduledTime')}>
                    Date/Time {getSortIcon('scheduledTime')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('platform')}>
                    Platform {getSortIcon('platform')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('status')}>
                    Status {getSortIcon('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No meetings found.</td>
                  </tr>
                ) : (
                  sortedMeetings.map((meeting) => (
                    <tr key={meeting.id} onClick={() => handleRowClick(meeting.id)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.title || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.employee?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(meeting.scheduledTime), 'PPpp')} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.platform || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          const status = meeting.status;
                          if (status === 'GENERATING_INSIGHTS' || status === 'CALL_ENDED') { // Add CALL_ENDED if it's a possible status
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                {'PROCESSING...'.toUpperCase()}
                              </span>
                            );
                          } else if (status === 'COMPLETED') {
                            return (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {'COMPLETED'.toUpperCase()}
                              </span>
                            );
                          } else if (status.startsWith('ERROR')) {
                            return (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                {'ERROR'.toUpperCase()}
                              </span>
                            );
                          } else {
                            // Default: Show other statuses (e.g., SCHEDULED, BOT_INVITED) with a neutral badge
                            // You might want to format these further (e.g., replace underscores)
                            return (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {status.toUpperCase()}
                              </span>
                            );
                          }
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default MeetingsPage; 