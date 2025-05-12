import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// import { meetingService } from '../api/client'; // Keep if needed for mutations later
import { format } from 'date-fns';
import { useMeetings } from '../hooks/useQueryHooks';
import { AxiosError } from 'axios';
import { ArrowUp, ArrowDown, MagnifyingGlass, Spinner, WarningCircle } from '@phosphor-icons/react'; // Correct import from @phosphor-icons/react, added Spinner/Warning
import { useAppContext, Meeting as AppMeeting } from '../context/AppContext'; // Removed unused AppUser import

// Define the expected structure of a meeting object from the API (for useMeetings hook)
// Keep this if useMeetings returns slightly different structure than AppMeeting
interface HookMeeting extends AppMeeting { // Or define separately if very different
  employee: {
    id: number;
    name: string | null;
  };
  durationMinutes?: number | null;
  timeZone?: string | null; // Add timeZone field
}

// Define sort configuration
type SortKey = keyof AppMeeting | 'employeeName'; // Use AppMeeting type for keys, add employeeName

type SortConfig = {
  key: SortKey;
  direction: 'ascending' | 'descending';
} | null;

const MeetingsPage: React.FC = () => {
  // Get user info from context
  const { currentUser, isLoadingUser: isLoadingAppContextUser, errorLoadingUser: appContextUserError } = useAppContext();

  // Use the hook for fetching meetings (primarily for Admin/Manager)
  const { data: hookData = [], isLoading: isLoadingHook, error: hookQueryError } = useMeetings<HookMeeting[]>({
    // Only enable the hook if the user is loaded and is an Admin or Manager
    enabled: !!currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const navigate = useNavigate();

  // Determine which meetings data to use based on role
  const meetingsData: AppMeeting[] = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'USER') {
      return currentUser.meetings || []; // Use meetings from context for USER
    }
    // For ADMIN/MANAGER, use data from the hook
    return hookData as AppMeeting[]; // Cast or map if HookMeeting is different from AppMeeting
  }, [currentUser, hookData]);

  // Determine combined loading and error states
  const isLoading = isLoadingAppContextUser || (currentUser && currentUser.role !== 'USER' && isLoadingHook);
  const error = appContextUserError || (currentUser && currentUser.role !== 'USER' && hookQueryError) 
    ? (
        appContextUserError || 
        (hookQueryError 
          ? (hookQueryError instanceof AxiosError && 
             hookQueryError.response?.data && 
             typeof hookQueryError.response.data === 'object' && 
             'message' in hookQueryError.response.data && 
             typeof hookQueryError.response.data.message === 'string'
            ) 
              ? hookQueryError.response.data.message 
              : (hookQueryError as Error).message 
          : 'Failed to load meetings. Please try again later.') // Fallback message
      )
    : null;

  // Keep handleRowClick
  const handleRowClick = (meetingId: number) => {
    navigate(`/meetings/${meetingId}`);
  };

  // Memoized filtering logic (uses combined meetingsData)
  const filteredMeetings = useMemo(() => {
    if (!searchTerm.trim()) {
      return meetingsData;
    }
    const searchLower = searchTerm.toLowerCase();
    return meetingsData.filter((meeting: AppMeeting) => { // Use AppMeeting type
      const titleMatch = meeting.title?.toLowerCase().includes(searchLower);
      // Assuming AppMeeting might not have nested employee, adjust if needed
      // const employeeNameMatch = (meeting as HookMeeting).employee?.name?.toLowerCase().includes(searchLower);
      const platformMatch = meeting.platform?.toLowerCase().includes(searchLower);
      const statusMatch = meeting.status?.toLowerCase().includes(searchLower);
      return titleMatch /*|| employeeNameMatch*/ || platformMatch || statusMatch; // Adjust based on available fields
    });
  }, [meetingsData, searchTerm]);

  // Memoized sorting logic (uses combined filteredMeetings)
  const sortedMeetings = useMemo(() => {
    let sortableItems = [...filteredMeetings];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Handle potential employee name sorting (check if field exists)
        if (sortConfig.key === 'employeeName' && 'employee' in a && 'employee' in b) {
            aValue = (a as HookMeeting).employee?.name || '';
            bValue = (b as HookMeeting).employee?.name || '';
        } else {
            // Need to ensure sortConfig.key is a valid key of AppMeeting
            const key = sortConfig.key as keyof AppMeeting;
            if (key in a && key in b) {
              aValue = a[key];
              bValue = b[key];
            } else {
              aValue = ''; // Default if key is somehow invalid for AppMeeting
              bValue = '';
            }
        }

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredMeetings, sortConfig]);

  // Keep handleSearchChange
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Function to request sorting (use SortKey)
  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Function to render sort icons (use SortKey)
  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    if (sortConfig.direction === 'ascending') return <ArrowUp size={16} className="inline ml-1" />;
    return <ArrowDown size={16} className="inline ml-1" />;
  };

  // Combined loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size={48} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  // Combined error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow max-w-lg mx-auto mt-10" role="alert">
        <div className="flex items-center mb-3">
           <WarningCircle size={24} className="mr-2" />
           <h3 className="text-lg font-semibold">Error Loading Meetings</h3>
        </div>
        <p>{error}</p>
      </div>
    );
  }

  // Render the meeting table using sortedMeetings
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
         <div className="relative rounded-md w-1/3">
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-10 py-2"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <MagnifyingGlass size={20} className="text-gray-400" />
            </div>
          </div>
      </div>
     
      <div className="bg-white overflow-hidden border border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('title')}>
                    Title {getSortIcon('title')}
                  </th>
                  {/* Conditionally show Employee column if needed and available */}
                  {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('employeeName')}>
                      Employee {getSortIcon('employeeName')}
                    </th>
                  )}
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
                    <td colSpan={(currentUser?.role === 'USER') ? 4 : 5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {searchTerm ? `No meetings found matching "${searchTerm}"` : 'No meetings found.'}
                    </td>
                  </tr>
                ) : (
                  sortedMeetings.map((meeting) => (
                    <tr key={meeting.id} onClick={() => handleRowClick(meeting.id)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.title || '-'}</td>
                      {/* Conditionally show Employee column */}
                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(meeting as HookMeeting).employee?.name || 'N/A'}</td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(meeting.scheduledTime), 'PPpp')} 
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.platform || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {/* Status rendering logic (consider if durationMinutes exists on AppMeeting) */}
                         {(() => {
                            const status = meeting.status;
                            const scheduledTime = new Date(meeting.scheduledTime);
                            const now = new Date();
                            // Check if durationMinutes exists before using it
                            const durationMs = ('durationMinutes' in meeting ? (meeting as HookMeeting).durationMinutes || 0 : 0) * 60 * 1000;
                            const endTime = new Date(scheduledTime.getTime() + durationMs);
                            
                            // Use the meeting's timeZone if available, otherwise use the browser's timezone
                            const meetingTimeZone = (meeting as HookMeeting).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                            
                            // Helper function for timezone-aware date comparison
                            const compareWithTimezone = (date1: Date, date2: Date): number => {
                              // For accurate timezone comparison, we would ideally use date-fns-tz here
                              // But for browser compatibility, we'll use a simple comparison
                              return date1.getTime() - date2.getTime();
                            };
                            
                            // Check various status conditions
                            if (status === 'DID_NOT_HAPPEN') {
                              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Did Not Happen</span>;
                            } else if (status === 'COMPLETED') {
                              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
                            } else if (status === 'IN_PROGRESS') {
                              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">In Progress</span>;
                            } else if (compareWithTimezone(now, scheduledTime) < 0) {
                              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Scheduled</span>;
                            } else if (compareWithTimezone(now, endTime) > 0) {
                              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Missed</span>;
                            } else {
                              return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Unknown ({status})</span>;
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