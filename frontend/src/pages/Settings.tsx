import React, { useState, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Link as LinkIcon, CheckCircle, WarningCircle, X } from '@phosphor-icons/react'; // Example icon, Added X
import { userService } from '../api/client'; // Keep named import for userService
import apiClient from '../api/client'; // Add default import for apiClient
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // Import QueryClient and useMutation
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

// Define selectable team data shape (all teams available for assignment)
interface SelectableTeamData {
  id: number;
  name: string;
  department: string;
  userId: number | null; // ID of the user currently managing this team, or null
}

// Define possible tab values
type SettingsTab = 'Users' | 'Teams' | 'Integrations' | 'Employees';

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

  // NEW State for the new "Assign Manager to Team" Modal
  const [isAssignManagerModalOpen, setIsAssignManagerModalOpen] = useState(false);
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<SelectableTeamData | null>(null);
  const [managerToAssign, setManagerToAssign] = useState<number | null>(null); // Stores the ID of the manager to assign, or null for "Assign to me"
  const [assignManagerModalSaveLoading, setAssignManagerModalSaveLoading] = useState(false);
  const [assignManagerModalSaveError, setAssignManagerModalSaveError] = useState<string | null>(null);
  const [assignManagerModalSuccessMessage, setAssignManagerModalSuccessMessage] = useState<string | null>(null);

  const queryClient = useQueryClient(); // Get query client instance
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth(); // Get isSignedIn and isLoaded from useAuth

  // Update tabItems to be defined before being used in isValidTab and state init
  const tabItems = [
    { id: 'Users' as SettingsTab, label: 'Users' },
    { id: 'Teams' as SettingsTab, label: 'Teams' },
    { id: 'Integrations' as SettingsTab, label: 'Integrations' },
    { id: 'Employees' as SettingsTab, label: 'Employee Data' },
  ];

  // Helper function to check if a string is a valid SettingsTab ID
  const isValidTab = (tabId: string | null): tabId is SettingsTab => {
    return tabItems.some(tab => tab.id === tabId);
  };

  // Initialize activeTab from URL search parameter or default to 'Users'
  const initialTabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isValidTab(initialTabFromUrl) ? initialTabFromUrl : 'Users'
  );

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

  // Fetch all selectable teams (for the new "All Teams" list card)
  const { 
    data: allTeamsForList, // Renamed from allSelectableTeams to avoid confusion with modal-specific data
    isLoading: isLoadingAllTeamsForList, 
    error: allTeamsForListError,
    refetch: refetchAllTeamsForList // Destructure refetch here
  } = useQuery<SelectableTeamData[], Error>({
    queryKey: ['allTeamsForList'], // Changed queryKey for clarity
    queryFn: async () => {
      try {
        const response = await apiClient.get('/teams/selectable'); // Endpoint provides all teams
        if (!response || response.status < 200 || response.status >= 300) {
          throw new Error(`Failed to fetch all teams list. Status: ${response?.status || 'unknown'}`);
        }
        return response.data;
      } catch (err: any) {
        throw new Error(err.message || 'An unknown error occurred while fetching all teams list');
      }
    },
    // This query can be enabled once the user (ADMIN) is loaded, as it's for a primary list view
    enabled: !!userData && userData.role === 'ADMIN', 
    staleTime: 5 * 60 * 1000,
  });

  // Function to handle tab click and update URL search parameter
  const handleTabClick = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setSearchParams(prevParams => {
      prevParams.set('tab', tabId);
      return prevParams;
    }, { replace: true }); // Use replace to avoid bloating browser history
  };

  // Effect to sync activeTab if URL changes from external navigation (e.g., back/forward button)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (isValidTab(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // This effect should only run when searchParams changes from external sources,
    // not when we internally set it with handleTabClick. 
    // However, a simple dependency on searchParams is usually fine.
  }, [searchParams, activeTab]); // Removed isValidTab from deps as it depends on tabItems defined in component scope

  useEffect(() => {
    const googleSuccess = searchParams.get('google_auth_success');
    const googleError = searchParams.get('google_auth_error');
    const zoomSuccess = searchParams.get('zoom_auth_success');
    const zoomError = searchParams.get('zoom_auth_error');
    let needsUserRefetch = false;
    // Create a new SearchParams object to modify, to avoid issues with stale closures if only searchParams is modified directly.
    const newSearchParams = new URLSearchParams(searchParams.toString());

    if (googleSuccess) {
      setSuccessMessage('Google Calendar connected successfully!');
      newSearchParams.delete('google_auth_success');
      needsUserRefetch = true;
    } else if (googleError) {
      const decodedError = decodeURIComponent(googleError);
      setErrorMessage(`Failed to connect Google Calendar: ${decodedError || 'Unknown error'}. Please try again.`);
      newSearchParams.delete('google_auth_error');
    }

    if (zoomSuccess) {
      setSuccessMessage('Zoom account connected successfully!');
      newSearchParams.delete('zoom_auth_success');
      needsUserRefetch = true;
    } else if (zoomError) {
      const decodedError = decodeURIComponent(zoomError);
      setErrorMessage(`Failed to connect Zoom account: ${decodedError || 'Unknown error'}. Please try again.`);
      newSearchParams.delete('zoom_auth_error');
    }

    // Only update search params if they have actually changed.
    if (searchParams.toString() !== newSearchParams.toString()) {
        setSearchParams(newSearchParams, { replace: true });
    }

    if (needsUserRefetch) {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  }, [searchParams, setSearchParams, queryClient]); // queryClient is stable, setSearchParams is stable

  // Update local state based on managers query
  useEffect(() => {
    setIsManagerListLoading(isLoadingManagers);
    if (managersError) {
      setManagerListError(managersError.message);
    } else {
      setManagerListError(null);
    }
  }, [isLoadingManagers, managersError]);

  // Modal handlers for the NEW "Assign Manager to Team" modal
  const openAssignManagerModal = (team: SelectableTeamData) => {
    setSelectedTeamForAssignment(team);
    setManagerToAssign(team.userId); // Pre-select current manager or null if unassigned/admin-assigned
    setIsAssignManagerModalOpen(true);
    setAssignManagerModalSaveError(null);
    setAssignManagerModalSuccessMessage(null);
  };

  const closeAssignManagerModal = () => {
    setIsAssignManagerModalOpen(false);
    setSelectedTeamForAssignment(null);
    setManagerToAssign(null);
    // queryClient.resetQueries({ queryKey: ['assignManagerModalManagers'] }); // If we had a separate query for managers in modal
  };
  
  // Handler for saving changes in the NEW "Assign Manager to Team" Modal
  const handleAssignManagerSave = () => {
    if (!selectedTeamForAssignment) return;

    // The actual API call will be done via a useMutation hook
    assignManagerMutation.mutate({
        teamId: selectedTeamForAssignment.id,
        managerIdToAssign: managerToAssign
    });
  };

  // NEW Mutation for assigning a manager to a team
  const assignManagerMutation = useMutation<
    any, // Response type from backend
    Error, // Error type
    { teamId: number; managerIdToAssign: number | null } // Variables type
  >({
    mutationFn: async ({ teamId, managerIdToAssign }) => {
      setAssignManagerModalSaveLoading(true);
      setAssignManagerModalSaveError(null);
      setAssignManagerModalSuccessMessage(null);
      try {
        const response = await apiClient.put(`/teams/${teamId}/assign-manager`, { managerIdToAssign });
        if (!response || response.status < 200 || response.status >= 300) {
          const errorData = response?.data as any;
          throw new Error(errorData?.message || `Failed to assign manager. Status: ${response?.status}`);
        }
        return response.data;
      } catch (err: any) {
        throw new Error(err.message || 'An unknown error occurred while assigning manager');
      }
    },
    onSuccess: async (data) => {
      setAssignManagerModalSaveLoading(false);
      setAssignManagerModalSuccessMessage(data.message || "Manager assigned successfully!");
      try {
        await refetchAllTeamsForList(); // Explicitly await the refetch
      } catch (error) {
        console.error("Failed to refetch all teams list after assignment:", error);
        // Optionally, you could set a specific error message here if refetch fails
        // but the main operation (assignment) was successful.
      }
      // Close modal after a short delay to show success message AND after refetch
      setTimeout(() => {
        closeAssignManagerModal();
      }, 1500); 
    },
    onError: (error) => {
      setAssignManagerModalSaveLoading(false);
      setAssignManagerModalSaveError(error.message);
    },
  });

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

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm 
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Feedback Messages & User Loading Error (remains at top, outside tab content) */}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded-md">{successMessage}</div>}
      {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">{errorMessage}</div>}
      {userError && !userData && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">Error loading user settings: {userError.message}</div>}

      {/* Tab Content */}
      <div>
        {activeTab === 'Users' && (
          <>
            {/* Managers List Card - ADMINS ONLY */}
            {userData && userData.role === 'ADMIN' && (
              <div className="">
                <div className="">
                  {isLoadingManagers && (
                    <div className="mt-4 text-sm text-gray-500">Loading managers...</div>
                  )}
                  {managersError && (
                    <div className="mt-4 text-sm text-red-600">
                      <WarningCircle size={20} className="inline mr-2" />
                      Error loading managers: {managersError.message}
                    </div>
                  )}
                  {!isLoadingManagers && !managersError && managersData && managersData.length > 0 && (
                    <div className="mt-4 flow-root">
                      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                  Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                  Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                  Role
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {managersData.map((manager) => (
                                <tr key={manager.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {manager.name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {manager.email}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {manager.role}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  {!isLoadingManagers && !managersError && (!managersData || managersData.length === 0) && (
                     <div className="mt-4 text-sm text-gray-500">No users with the manager role found.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'Teams' && (
          <>
            {/* === "All Teams" List Card - ADMINS ONLY === */}
            {userData && userData.role === 'ADMIN' && (
              <div className="">
                <div className="">
                  {isLoadingAllTeamsForList && (
                    <div className="mt-4 text-sm text-gray-500">Loading all teams...</div>
                  )}
                  {allTeamsForListError && (
                    <div className="mt-4 text-sm text-red-600">
                      <WarningCircle size={20} className="inline mr-2" />
                      Error loading teams: {allTeamsForListError.message}
                    </div>
                  )}
                  {!isLoadingAllTeamsForList && !allTeamsForListError && allTeamsForList && (
                    <div className="mt-4 flow-root">
                      {allTeamsForList.length === 0 ? (
                        <p className="text-sm text-gray-500">No teams found in the system.</p>
                      ) : (
                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                    Team
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                    Department
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                    Manager
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                                    <span className="sr-only">Assign Manager</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {allTeamsForList.map((team) => {
                                  const managerDetails = team.userId ? managersData?.find(m => m.id === team.userId) : null;
                                  let displayManager = 'Unassigned';
                                  if (managerDetails) {
                                      displayManager = managerDetails.name || managerDetails.email;
                                  } else if (team.userId && team.userId === userData?.id) {
                                      displayManager = `${userData.name || 'You'} (Admin)`;
                                  }
                                  return (
                                    <tr key={team.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {team.name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {team.department}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {displayManager}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                          onClick={() => openAssignManagerModal(team)} 
                                          className="text-indigo-600 hover:text-indigo-900"
                                        >
                                          Assign Manager<span className="sr-only">, {team.name}</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'Integrations' && (
          <>
            {/* Integrations Card - Remove card shell styling and inner padding */}
            <div className=""> 
              <div className=""> {/* Removed p-6 space-y-6 */}
                {/* Google Calendar Integration */}
                <div className="border-t border-gray-200 pt-4">
                   <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-md font-medium text-gray-700">Google Calendar</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Connect your Google Calendar to schedule meetings and check availability.
                        </p>
                        <div className={`mt-2 text-sm flex items-center ${isGoogleConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                           {isLoadingUser ? (<span className="text-gray-500">Loading status...</span>) 
                            : isGoogleConnected ? (<><CheckCircle size={16} className="mr-1" /> {googleConnectionStatusText}</>) 
                            : (<><WarningCircle size={16} className="mr-1" /> {googleConnectionStatusText}</>)
                           }
                        </div>
                      </div>
                      <button onClick={handleConnectGoogle} disabled={isLoadingUser || isGoogleLoading} 
                              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isGoogleConnected ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}>
                        <LinkIcon size={18} className="mr-2 -ml-1" />
                        {isLoadingUser ? 'Loading...' : isGoogleLoading ? 'Connecting...' : googleButtonText}
                      </button>
                   </div>
                </div>
                {/* Zoom Integration */}
                <div className="border-t border-gray-200 pt-4">
                   <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-md font-medium text-gray-700">Zoom</h3>
                        <p className="text-sm text-gray-500 mt-1">Connect your Zoom account to schedule meetings directly.</p>
                        <div className={`mt-2 text-sm flex items-center ${isZoomConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                           {isLoadingUser ? (<span className="text-gray-500">Loading status...</span>) 
                            : isZoomConnected ? (<><CheckCircle size={16} className="mr-1" /> {zoomConnectionStatusText}</>) 
                            : (<><WarningCircle size={16} className="mr-1" /> {zoomConnectionStatusText}</>)
                           }
                        </div>
                      </div>
                      <button onClick={handleConnectZoom} disabled={isLoadingUser || isZoomLoading} 
                              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isZoomConnected ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}>
                        <LinkIcon size={18} className="mr-2 -ml-1" />
                        {isLoadingUser ? 'Loading...' : isZoomLoading ? 'Connecting...' : zoomButtonText}
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'Employees' && (
          <div className="employee-data-tab-content">
            {/* Upload Data Card - Remove card shell styling and inner padding */}
            <div className=""> 
              <div className=""> {/* Removed p-6 */}
                <h3 className="text-md font-medium text-gray-700">Import Employees via CSV</h3>
                <p className="text-sm text-gray-500 mt-1">Upload a CSV file to add multiple employees.</p>
                {csvSuccessMessage && (<div className="mt-3 mb-3 p-3 bg-green-100 text-green-700 text-sm rounded-md">{csvSuccessMessage}</div>)}
                {csvErrorMessage && (<div className="mt-3 mb-3 p-3 bg-red-100 text-red-700 text-sm rounded-md">{csvErrorMessage}</div>)}
                <div className="mt-4">
                  <label htmlFor="csvFileInput" className="sr-only">Choose CSV file</label>
                  <input type="file" id="csvFileInput" name="csvFileInput" accept=".csv" onChange={handleFileChange} 
                         className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"/>
                </div>
                {selectedFile && (
                  <div className="mt-4 flex items-center space-x-3">
                    <button type="button" onClick={handleUploadCsv} disabled={isCsvUploading || !selectedFile} 
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
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
                    <a href="/employee_upload_template.csv" download="employee_upload_template.csv" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">Download CSV template</a>
                    <p className="text-xs text-gray-400 mt-1">Make sure the date format for `employee_start_date` is YYYY-MM-DD.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* "Assign Manager to Team" Modal (its rendering is controlled by isAssignManagerModalOpen, independent of tabs) */}
      <Transition appear show={isAssignManagerModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeAssignManagerModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                    <span>Assign Manager for: {selectedTeamForAssignment?.name || 'Team'}</span>
                    <button type="button" className="text-gray-400 hover:text-gray-500" onClick={closeAssignManagerModal}><X size={24} /></button>
                  </Dialog.Title>
                  <div className="mt-4">
                    {isLoadingManagers && <p className="text-sm text-gray-500">Loading managers list...</p>}
                    {managersError && <div className="text-sm text-red-600"><WarningCircle size={20} className="inline mr-1" /> Error loading managers: {managersError.message}</div>}
                    {!isLoadingManagers && !managersError && managersData && (
                      <fieldset className="space-y-3">
                        <legend className="sr-only">Select a Manager</legend>
                        <div>
                          <label htmlFor="assign-to-me-admin" className="flex items-center text-sm">
                            <input id="assign-to-me-admin" name="manager-assignment" type="radio" className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                              checked={managerToAssign === null || managerToAssign === userData?.id}
                              onChange={() => setManagerToAssign(null)} />
                            <span className="ml-2 text-gray-700">Assign to me ({userData?.name || 'Admin'})</span>
                          </label>
                        </div>
                        {managersData.filter(m => m.id !== userData?.id).map(manager => (
                          <div key={manager.id}>
                            <label htmlFor={`manager-${manager.id}`} className="flex items-center text-sm">
                              <input id={`manager-${manager.id}`} name="manager-assignment" type="radio" className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                checked={managerToAssign === manager.id}
                                onChange={() => setManagerToAssign(manager.id)} />
                              <span className="ml-2 text-gray-700">{manager.name} ({manager.email})</span>
                            </label>
                          </div>
                        ))}
                        {managersData.filter(m => m.id !== userData?.id).length === 0 && !isLoadingManagers && (
                            <p className="text-sm text-gray-500">No other managers available to assign.</p>
                        )}
                      </fieldset>
                    )}
                    {!isLoadingManagers && !managersError && !managersData && (
                        <p className="text-sm text-gray-500">No managers found to assign.</p>
                    )}
                    {assignManagerModalSaveLoading && <p className="mt-3 text-sm text-blue-600">Saving changes...</p>}
                    {assignManagerModalSaveError && <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded-md"><WarningCircle size={16} className="inline mr-1" /> {assignManagerModalSaveError}</div>}
                    {assignManagerModalSuccessMessage && <div className="mt-3 p-2 bg-green-50 text-green-700 text-sm rounded-md"><CheckCircle size={16} className="inline mr-1" /> {assignManagerModalSuccessMessage}</div>}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" 
                            onClick={closeAssignManagerModal} disabled={assignManagerModalSaveLoading}>Cancel</button>
                    <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400" 
                            onClick={handleAssignManagerSave} disabled={isLoadingManagers || assignManagerModalSaveLoading}>{assignManagerModalSaveLoading ? 'Saving...' : 'Save Assignment'}</button>
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