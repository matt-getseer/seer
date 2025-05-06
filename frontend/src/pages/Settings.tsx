import React, { useState, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Link as LinkIcon, CheckCircle, WarningCircle, X } from '@phosphor-icons/react'; // Example icon, Added X
import { userService } from '../api/client'; // Keep named import for userService
import apiClient from '../api/client'; // Add default import for apiClient
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import QueryClient
import { useAuth } from '@clerk/clerk-react'; // Import useAuth
import { Dialog, Transition } from '@headlessui/react'; // Added Dialog and Transition

// Define expected user data shape
interface UserData {
  id: number;
  email: string;
  name: string | null;
  hasGoogleAuth: boolean;
  hasZoomAuth: boolean; // Add Zoom auth status
  role: string; // Ensure role is part of UserData
  // Add other fields if returned by /users/me
}

// Define manager data shape
interface ManagerData {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Define managed team data shape
interface ManagedTeamData {
  id: number;
  name: string;
  department: string;
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // Specific loading state for Google
  const [isZoomLoading, setIsZoomLoading] = useState(false); // Specific loading state for Zoom

  // State for CSV Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  // State for Manager List
  const [isManagerListLoading, setIsManagerListLoading] = useState(false);
  const [managerListError, setManagerListError] = useState<string | null>(null);

  // State for Manager Teams Modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedManagerForModal, setSelectedManagerForModal] = useState<ManagerData | null>(null);

  const queryClient = useQueryClient(); // Get query client instance
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth(); // Get isSignedIn and isLoaded from useAuth

  // Fetch user data including Google & Zoom Auth status
  const { data: userData, isLoading: isLoadingUser, error: userError, refetch: refetchUserData } = useQuery<UserData, Error>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await userService.getMe(); // Assuming this returns AxiosResponse

        // Explicit status check remains useful
        if (!response || response.status < 200 || response.status >= 300) {
           console.error("Error fetching user data, status:", response?.status, response);
           let detail = 'No error body';
           // Check if response.data exists and is an object before accessing properties
           if (response?.data && typeof response.data === 'object') {
              detail = (response.data as any).message || (response.data as any).detail || JSON.stringify(response.data);
           }
           throw new Error(`Failed to fetch user data. Status: ${response?.status || 'unknown'}. Detail: ${detail}`);
        }

        // Check if response.data exists
        if (typeof response.data === 'undefined') {
           console.error("Error fetching user data: No data property in response", response);
           throw new Error("No data received in user response.");
        }

        // Assume response.data matches UserData including hasZoomAuth
        return response.data;

      } catch (err: any) {
         console.error("Caught error within queryFn for currentUser:", err);

         // Handle AxiosError specifically
         if (err.isAxiosError) {
            const axiosError = err as import('axios').AxiosError;
            const status = axiosError.response?.status || 'Axios Error (No Response Status)';
            let detail = axiosError.message; // Default to Axios error message
            // Check if response.data exists and is an object before accessing properties
            if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
                const errorData = axiosError.response.data as any; // Cast to any to access potential properties
                detail = errorData.message || errorData.detail || JSON.stringify(errorData);
            } else if (axiosError.response?.data) {
                // If data exists but isn't an object, stringify it
                detail = String(axiosError.response.data);
            }
            // Rethrow as a standard Error for React Query
             throw new Error(`Failed to fetch user data. Status: ${status}. Detail: ${detail}`);
         }
         // Handle errors previously thrown by our status/data checks
         else if (err instanceof Error) {
             throw err; // Rethrow the original error
         }
         // Handle other unexpected errors
         else {
             // Rethrow as a standard Error
             throw new Error(String(err || 'An unknown error occurred while fetching user data'));
         }
      }
    },
    staleTime: 5 * 60 * 1000, // Increase stale time slightly
    retry: 1,
  });

  // Fetch managers list (only if user is admin)
  const { data: managersData, isLoading: isLoadingManagers, error: managersError } = useQuery<ManagerData[], Error>({
    queryKey: ['managersList'],
    queryFn: async () => {
      try {
        // userService.getManagers() should be defined in your api client
        // For now, using apiClient directly as an example
        const response = await apiClient.get('/users/managers');
        if (!response || response.status < 200 || response.status >= 300) {
          let detail = 'No error body';
          if (response?.data && typeof response.data === 'object') {
            detail = (response.data as any).message || (response.data as any).detail || JSON.stringify(response.data);
          }
          throw new Error(`Failed to fetch managers. Status: ${response?.status || 'unknown'}. Detail: ${detail}`);
        }
        if (typeof response.data === 'undefined') {
          throw new Error("No data received in managers response.");
        }
        return response.data;
      } catch (err: any) {
        console.error("Caught error within queryFn for managersList:", err);
        if (err.isAxiosError) {
          const axiosError = err as import('axios').AxiosError;
          const status = axiosError.response?.status || 'Axios Error (No Response Status)';
          let detail = axiosError.message;
          if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
            const errorData = axiosError.response.data as any;
            detail = errorData.message || errorData.detail || JSON.stringify(errorData);
          } else if (axiosError.response?.data) {
            detail = String(axiosError.response.data);
          }
          throw new Error(`Failed to fetch managers. Status: ${status}. Detail: ${detail}`);
        } else if (err instanceof Error) {
          throw err;
        } else {
          throw new Error(String(err || 'An unknown error occurred while fetching managers list'));
        }
      }
    },
    enabled: !!userData && userData.role === 'ADMIN', // Only enable if user is ADMIN
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch teams for the selected manager (enabled when modal is open and manager is selected)
  const { 
    data: managedTeamsData, 
    isLoading: isLoadingManagedTeams, 
    error: managedTeamsError,
  } = useQuery<ManagedTeamData[], Error>({
    queryKey: ['managedTeams', selectedManagerForModal?.id], // Include manager ID in queryKey
    queryFn: async () => {
      if (!selectedManagerForModal) {
        throw new Error("No manager selected to fetch teams.");
      }
      try {
        const response = await apiClient.get(`/teams/managed-by/${selectedManagerForModal.id}`);
        if (!response || response.status < 200 || response.status >= 300) {
          let detail = 'No error body';
          if (response?.data && typeof response.data === 'object') {
            detail = (response.data as any).message || (response.data as any).detail || JSON.stringify(response.data);
          }
          throw new Error(`Failed to fetch managed teams. Status: ${response?.status || 'unknown'}. Detail: ${detail}`);
        }
        if (typeof response.data === 'undefined') {
          throw new Error("No data received in managed teams response.");
        }
        return response.data;
      } catch (err: any) {
        console.error("Caught error within queryFn for managedTeams:", err);
        if (err.isAxiosError) {
          const axiosError = err as import('axios').AxiosError;
          const status = axiosError.response?.status || 'Axios Error (No Response Status)';
          let detail = axiosError.message;
          if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
            const errorData = axiosError.response.data as any;
            detail = errorData.message || errorData.detail || JSON.stringify(errorData);
          } else if (axiosError.response?.data) {
            detail = String(axiosError.response.data);
          }
          throw new Error(`Failed to fetch managed teams. Status: ${status}. Detail: ${detail}`);
        } else if (err instanceof Error) {
          throw err;
        } else {
          throw new Error(String(err || 'An unknown error occurred while fetching managed teams'));
        }
      }
    },
    enabled: !!selectedManagerForModal && isTeamModalOpen, // Only enable if modal is open and manager is selected
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    const googleSuccess = searchParams.get('google_auth_success');
    const googleError = searchParams.get('google_auth_error');
    const zoomSuccess = searchParams.get('zoom_auth_success'); // Check for Zoom success
    const zoomError = searchParams.get('zoom_auth_error'); // Check for Zoom error

    let needsRefetch = false;

    if (googleSuccess) {
      setSuccessMessage('Google Calendar connected successfully!');
      searchParams.delete('google_auth_success');
      needsRefetch = true;
    } else if (googleError) {
      const decodedError = decodeURIComponent(googleError);
      setErrorMessage(`Failed to connect Google Calendar: ${decodedError || 'Unknown error'}. Please try again.`);
      searchParams.delete('google_auth_error');
    }

    if (zoomSuccess) { // Handle Zoom success
      setSuccessMessage('Zoom account connected successfully!'); // Update message
      searchParams.delete('zoom_auth_success');
      needsRefetch = true;
    } else if (zoomError) { // Handle Zoom error
      const decodedError = decodeURIComponent(zoomError);
      setErrorMessage(`Failed to connect Zoom account: ${decodedError || 'Unknown error'}. Please try again.`); // Update message
      searchParams.delete('zoom_auth_error');
    }

    // Update search params in URL (only if changed)
    setSearchParams(searchParams, { replace: true });

    // Refetch user data if an auth flow succeeded to update status immediately
    if (needsRefetch) {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      // Optionally use refetchUserData();
    }

  }, [searchParams, setSearchParams, queryClient]); // Add queryClient dependency

  // Update local state based on managers query
  useEffect(() => {
    setIsManagerListLoading(isLoadingManagers);
    if (managersError) {
      setManagerListError(managersError.message);
    } else {
      setManagerListError(null);
    }
  }, [isLoadingManagers, managersError]);

  // Modal handlers
  const openTeamModal = (manager: ManagerData) => {
    setSelectedManagerForModal(manager);
    setIsTeamModalOpen(true);
    // queryClient.invalidateQueries({ queryKey: ['managedTeams', manager.id] }); // Invalidate if data might be stale from a previous open
    // No, let enabled and queryKey change handle refetch
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
    setSelectedManagerForModal(null); // Clear selected manager
    // Optionally reset or clear the managedTeamsData if desired upon close
    // queryClient.resetQueries({ queryKey: ['managedTeams'] }); // Resets query to initial state
  };

  const handleConnectGoogle = async () => {
    console.log('[SettingsPage] handleConnectGoogle called.');
    if (!isAuthLoaded) {
      console.log('[SettingsPage] Clerk auth not loaded yet. Aborting Google connection attempt.');
      setErrorMessage('Authentication system is still loading. Please try again in a moment.');
      return;
    }
    if (!isSignedIn) {
      console.log('[SettingsPage] User is not signed in. Aborting Google connection attempt.');
      setErrorMessage('You must be signed in to connect your Google Calendar. Please sign in and try again.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null); // Clear previous messages

    try {
      const response = await apiClient.get<{ authUrl: string }>('/auth/google'); // Use relative path
      const authUrl = response.data.authUrl;

      if (authUrl) {
        window.location.href = authUrl;
        // No need to set loading to false here, page will redirect
      } else {
        throw new Error('Did not receive Google auth URL from server.');
      }
    } catch (error: any) {
      console.error('Failed to get Google Auth URL:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to initiate Google connection. Please try again.');
      setIsGoogleLoading(false); // Set loading false on error
    }
  };

  // New handler for Zoom connection
  const handleConnectZoom = async () => {
    console.log('[SettingsPage] handleConnectZoom called.');
    if (!isAuthLoaded) {
      console.log('[SettingsPage] Clerk auth not loaded yet. Aborting Zoom connection attempt.');
      setErrorMessage('Authentication system is still loading. Please try again in a moment.');
      return;
    }
    if (!isSignedIn) {
      console.log('[SettingsPage] User is not signed in. Aborting Zoom connection attempt.');
      setErrorMessage('You must be signed in to connect your Zoom account. Please sign in and try again.');
      return;
    }

    setIsZoomLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null); // Clear previous messages

    try {
      const response = await apiClient.get<{ authUrl: string }>('/auth/zoom'); // Call the new Zoom endpoint
      const authUrl = response.data.authUrl;

      if (authUrl) {
        window.location.href = authUrl;
        // No need to set loading to false here, page will redirect
      } else {
        throw new Error('Did not receive Zoom auth URL from server.');
      }
    } catch (error: any) {
      console.error('Failed to get Zoom Auth URL:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to initiate Zoom connection. Please try again.');
      setIsZoomLoading(false); // Set loading false on error
    }
  };

  // Determine connection statuses and button texts
  const isGoogleConnected = userData?.hasGoogleAuth ?? false;
  const googleConnectionStatusText = isGoogleConnected ? 'Connected' : 'Not Connected';
  const googleButtonText = isGoogleConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar';

  const isZoomConnected = userData?.hasZoomAuth ?? false; // Check Zoom status
  const zoomConnectionStatusText = isZoomConnected ? 'Connected' : 'Not Connected';
  const zoomButtonText = isZoomConnected ? 'Reconnect Zoom Account' : 'Connect Zoom Account';

  // Handler for CSV file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setCsvErrorMessage(null); // Clear previous errors
      setCsvSuccessMessage(null); // Clear previous success messages
    } else {
      setSelectedFile(null);
    }
  };

  // Handler for CSV upload
  const handleUploadCsv = async () => {
    if (!selectedFile) {
      setCsvErrorMessage('Please select a CSV file to upload.');
      return;
    }

    setIsCsvUploading(true);
    setCsvErrorMessage(null);
    setCsvSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Replace '/api/employees/upload-csv' with your actual backend endpoint
      const response = await apiClient.post('/employees/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Assuming the backend responds with a success message or relevant data
      setCsvSuccessMessage(response.data.message || 'Employees uploaded successfully!');
      setSelectedFile(null); // Clear the selected file
      // Optionally, refetch employee list or other relevant data
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // Invalidate employee list query

      // TODO: Show the manager list card here, if the user is ADMIN
      // You would map over `managersData` if it exists and is not loading/error

    } catch (error: any) {
      console.error('CSV Upload Error:', error);
      setCsvErrorMessage(error.response?.data?.message || error.message || 'Failed to upload CSV. Please check the file format and try again.');
    } finally {
      setIsCsvUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      {/* Display Feedback Messages (Unified) */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded-md">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
          {errorMessage}
        </div>
      )}
      {/* User Fetching Error */}
      {userError && !userData && ( // Only show if loading failed and we have no data
         <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
             Error loading user settings: {userError.message}
         </div>
      )}

      {/* Integrations Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6"> {/* Added mb-6 for spacing below this card */}
        <div className="p-6 space-y-6"> 
          <h2 className="text-lg font-medium text-gray-900">Integrations</h2>

          {/* Google Calendar Integration */}
          <div className="border-t border-gray-200 pt-4">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium text-gray-700">Google Calendar</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Connect your Google Calendar to schedule meetings and check availability.
                  </p>
                  {/* Display connection status */}
                  <div className={`mt-2 text-sm flex items-center ${isGoogleConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                     {isLoadingUser ? (
                         <span className="text-gray-500">Loading status...</span>
                     ) : isGoogleConnected ? (
                         <><CheckCircle size={16} className="mr-1" /> {googleConnectionStatusText}</>
                     ) : (
                         <><WarningCircle size={16} className="mr-1" /> {googleConnectionStatusText}</>
                     )}
                  </div>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  disabled={isLoadingUser || isGoogleLoading} // Disable if user loading OR google loading
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isGoogleConnected ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                >
                  <LinkIcon size={18} className="mr-2 -ml-1" />
                  {isLoadingUser ? 'Loading...' : isGoogleLoading ? 'Connecting...' : googleButtonText}
                </button>
             </div>
          </div>

          {/* Zoom Integration - NEW SECTION */}
          <div className="border-t border-gray-200 pt-4">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium text-gray-700">Zoom</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Connect your Zoom account to schedule meetings directly.
                  </p>
                  {/* Display connection status */}
                  <div className={`mt-2 text-sm flex items-center ${isZoomConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                     {isLoadingUser ? (
                         <span className="text-gray-500">Loading status...</span>
                     ) : isZoomConnected ? (
                         <><CheckCircle size={16} className="mr-1" /> {zoomConnectionStatusText}</>
                     ) : (
                         <><WarningCircle size={16} className="mr-1" /> {zoomConnectionStatusText}</>
                     )}
                  </div>
                </div>
                <button
                  onClick={handleConnectZoom} // Use the Zoom handler
                  disabled={isLoadingUser || isZoomLoading} // Disable if user loading OR zoom loading
                  // Use similar styling, adjust colors if desired
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isZoomConnected ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                >
                  <LinkIcon size={18} className="mr-2 -ml-1" />
                  {/* Update button text */}
                  {isLoadingUser ? 'Loading...' : isZoomLoading ? 'Connecting...' : zoomButtonText}
                </button>
             </div>
          </div>
          {/* End of Zoom Integration */}
        </div>
      </div>
      {/* End of Integrations Card */}

      {/* Upload Data Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Data</h2>
          
          {/* Bulk Employee Upload Section - Content of the card */}
          {/* No border-t needed here as it's the start of a new card's content */}
            <h3 className="text-md font-medium text-gray-700">Import Employees via CSV</h3>
            <p className="text-sm text-gray-500 mt-1">
              Upload a CSV file to add multiple employees.
            </p>
            {/* Display upload-specific feedback messages */}
            {csvSuccessMessage && (
              <div className="mt-3 mb-3 p-3 bg-green-100 text-green-700 text-sm rounded-md">
                {csvSuccessMessage}
              </div>
            )}
            {csvErrorMessage && (
              <div className="mt-3 mb-3 p-3 bg-red-100 text-red-700 text-sm rounded-md">
                {csvErrorMessage}
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="csvFileInput" className="sr-only">Choose CSV file</label>
              <input
                type="file"
                id="csvFileInput"
                name="csvFileInput"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              />
            </div>

            {selectedFile && (
              <div className="mt-4 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleUploadCsv}
                  disabled={isCsvUploading || !selectedFile}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isCsvUploading ? 'Uploading...' : `Upload ${selectedFile.name}`}
                </button>
                {isCsvUploading && (
                   <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                )}
              </div>
            )}
            <div className="mt-3">
                <a
                  href="/employee_upload_template.csv" // Note: Create this template file in your public directory
                  download="employee_upload_template.csv"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Download CSV template
                </a>
                <p className="text-xs text-gray-400 mt-1">
                  Make sure the date format for `employee_start_date` is YYYY-MM-DD.
                </p>
            </div>
          {/* End of Bulk Employee Upload Section Content */}
        </div>
      </div>
      {/* End of Upload Data Card */}

      {/* Manager List Card - ADMINS ONLY */}
      {userData && userData.role === 'ADMIN' && (
        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800">Managers</h3>
            <p className="mt-1 text-sm text-gray-600">
              View and manage users with the manager role.
            </p>
            
            {isManagerListLoading && (
              <div className="mt-4 text-sm text-gray-500">Loading managers...</div>
            )}
            {managerListError && (
              <div className="mt-4 text-sm text-red-600">
                <WarningCircle size={20} className="inline mr-2" />
                Error loading managers: {managerListError}
              </div>
            )}
            {!isManagerListLoading && !managerListError && managersData && managersData.length > 0 && (
              <div className="mt-4 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {managersData.map((manager) => (
                          <tr key={manager.id} onClick={() => openTeamModal(manager)} className="hover:bg-gray-50 cursor-pointer">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{manager.name || 'N/A'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{manager.email}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{manager.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {!isManagerListLoading && !managerListError && managersData && managersData.length === 0 && (
               <div className="mt-4 text-sm text-gray-500">No users with the manager role found.</div>
            )}
          </div>
        </div>
      )}

      {/* Manager's Teams Modal */}
      <Transition appear show={isTeamModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeTeamModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    <span>Teams Managed by {selectedManagerForModal?.name || 'Manager'}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={closeTeamModal}
                    >
                      <X size={24} />
                    </button>
                  </Dialog.Title>
                  <div className="mt-4">
                    {isLoadingManagedTeams && (
                      <p className="text-sm text-gray-500">Loading teams...</p>
                    )}
                    {managedTeamsError && (
                      <div className="text-sm text-red-600">
                        <WarningCircle size={20} className="inline mr-1" /> Error: {managedTeamsError.message}
                      </div>
                    )}
                    {!isLoadingManagedTeams && !managedTeamsError && managedTeamsData && managedTeamsData.length > 0 && (
                      <ul className="space-y-2">
                        {managedTeamsData.map(team => (
                          <li key={team.id} className="p-2 border rounded-md">
                            <p className="font-semibold">{team.name}</p>
                            <p className="text-sm text-gray-600">{team.department}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!isLoadingManagedTeams && !managedTeamsError && (!managedTeamsData || managedTeamsData.length === 0) && (
                      <p className="text-sm text-gray-500">This manager is not currently managing any teams.</p>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      onClick={closeTeamModal}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
};

export default Settings; 