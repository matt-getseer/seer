import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Link as LinkIcon, CheckCircle, WarningCircle } from '@phosphor-icons/react'; // Example icon
import { userService } from '../api/client'; // Keep named import for userService
import apiClient from '../api/client'; // Add default import for apiClient
import { useQuery } from '@tanstack/react-query'; // Assuming react-query is used

// Define expected user data shape
interface UserData {
  id: number;
  email: string;
  name: string | null;
  hasGoogleAuth: boolean;
  // Add other fields if returned by /users/me
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user data including Google Auth status
  const { data: userData, isLoading: isLoadingUser, error: userError } = useQuery<UserData, Error>({
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
            throw new Error(`Failed to fetch user data. Status: ${status}. Detail: ${detail}`);
         } 
         // Handle errors previously thrown by our status/data checks
         else if (err instanceof Error) {
             throw err;
         } 
         // Handle other unexpected errors
         else {
             throw new Error(String(err || 'An unknown error occurred'));
         }
      }
    },
    staleTime: 60 * 1000, 
    retry: 1, 
  }); 

  useEffect(() => {
    const success = searchParams.get('google_auth_success');
    const error = searchParams.get('google_auth_error');

    if (success) {
      setSuccessMessage('Google Calendar connected successfully!');
      // Clear query params after displaying message
      searchParams.delete('google_auth_success');
      setSearchParams(searchParams, { replace: true });
      // Optionally refetch user data here if needed immediately after connect
      // queryClient.invalidateQueries(['currentUser']); 
    } else if (error) {
      // Decode error message if needed, provide fallback
      const decodedError = decodeURIComponent(error);
      setErrorMessage(`Failed to connect Google Calendar: ${decodedError || 'Unknown error'}. Please try again.`);
      // Clear query params
      searchParams.delete('google_auth_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.get<{ authUrl: string }>('auth/google'); 
      const authUrl = response.data.authUrl;
      
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('Did not receive auth URL from server.');
      }
    } catch (error: any) {
      console.error('Failed to get Google Auth URL:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to initiate Google connection. Please try again.');
      setIsLoading(false);
    }
  };

  // Determine button text and status based on user data
  const isConnected = userData?.hasGoogleAuth ?? false;
  const connectionStatusText = isConnected ? 'Connected' : 'Not Connected';
  const buttonText = isConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      {/* Display Feedback Messages */}
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
      {userError && (
         <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
             Error loading user settings: {userError.message}
         </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Integrations</h2>
          
          {/* Google Calendar Integration */}
          <div className="border-t border-gray-200 pt-4">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium text-gray-700">Google Calendar</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Connect your Google Calendar to enable meeting scheduling directly within the app.
                  </p>
                  {/* Display connection status */} 
                  <div className={`mt-2 text-sm flex items-center ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                     {isLoadingUser ? (
                         <span className="text-gray-500">Loading status...</span>
                     ) : isConnected ? (
                         <><CheckCircle size={16} className="mr-1" /> {connectionStatusText}</>
                     ) : (
                         <><WarningCircle size={16} className="mr-1" /> {connectionStatusText}</>
                     )}
                  </div>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  disabled={isLoadingUser || isLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isConnected ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                >
                  <LinkIcon size={18} className="mr-2 -ml-1" />
                  {isLoadingUser ? 'Loading...' : isLoading ? 'Connecting...' : buttonText}
                </button>
             </div>
          </div>

          {/* Other settings sections can go here */}
          
        </div>
      </div>
    </div>
  );
};

export default Settings; 