import React, { useState, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Link as LinkIcon, CheckCircle, WarningCircle, X } from '@phosphor-icons/react'; // Example icon, Added X and Bell for Notifications
import { userService } from '../api/client'; // Keep named import for userService
import apiClient from '../api/client'; // Add default import for apiClient
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // Removed UseMutationOptions
import { useAuth } from '@clerk/clerk-react'; // useOrganization has been removed
import { Dialog, Transition } from '@headlessui/react'; // Added Dialog and Transition
import { useAppContext, AppUser } from '../context/AppContext'; // Keep AppUser for now
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { DotsThreeVertical, Pencil, UserPlus, Trash } from '@phosphor-icons/react'; // Icons for dropdown

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

// Define selectable team data shape (all teams available for assignment)
interface SelectableTeamData {
  id: number;
  name: string;
  department: string;
  userId: number | null; // ID of the user currently managing this team, or null
}

// Define possible tab values
type SettingsTab = 'Users' | 'Teams' | 'Integrations' | 'Employees' | 'Notifications';

// Define possible UserRoles for the application
const APP_USER_ROLES = ['ADMIN', 'MANAGER', 'USER'] as const;
type AppUserRole = typeof APP_USER_ROLES[number];

interface InvitationData {
  email: string;
  appRole: AppUserRole;
  organizationId: string;
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, isLoadingUser: isLoadingAppContextUser, errorLoadingUser: appContextUserError } = useAppContext(); // <-- Use AppContext
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Keep for now
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Keep for now
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); 
  const [isZoomLoading, setIsZoomLoading] = useState(false); 

  // State for CSV Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  // NEW State for the new "Assign Manager to Team" Modal
  const [isAssignManagerModalOpen, setIsAssignManagerModalOpen] = useState(false);
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<SelectableTeamData | null>(null);
  const [managerToAssign, setManagerToAssign] = useState<number | null>(null); // Stores the ID of the manager to assign, or null for "Assign to me"
  const [assignManagerModalSaveLoading, setAssignManagerModalSaveLoading] = useState(false);
  const [assignManagerModalSaveError, setAssignManagerModalSaveError] = useState<string | null>(null);
  const [assignManagerModalSaveSuccessMessage, setAssignManagerModalSuccessMessage] = useState<string | null>(null);

  // State for Create Team Modal
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDepartment, setNewTeamDepartment] = useState('');
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  // State for User Invitation Modal
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedAppRole, setSelectedAppRole] = useState<AppUserRole>('USER');
  const [inviteUserError, setInviteUserError] = useState<string | null>(null);
  const [inviteUserSuccessMessage, setInviteUserSuccessMessage] = useState<string | null>(null);
  const [isInvitingUser, setIsInvitingUser] = useState(false);

  // State for manager list loading and error (mirroring query states)
  const [isManagerListLoading, setIsManagerListLoading] = useState(false);
  const [managerListError, setManagerListError] = useState<string | null>(null);

  // State for Edit Team Modal
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SelectableTeamData | null>(null); 
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDepartment, setEditTeamDepartment] = useState('');
  const [editTeamError, setEditTeamError] = useState<string | null>(null);

  // State for Delete Team Modal
  const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<SelectableTeamData | null>(null);
  const [deleteTeamEmployeeCount, setDeleteTeamEmployeeCount] = useState<number>(0);
  const [deleteTeamEmployeeCountLoading, setDeleteTeamEmployeeCountLoading] = useState(false);
  const [deleteTeamError, setDeleteTeamError] = useState<string | null>(null);
  // Add state for delete success message, similar to other modals
  const [deleteTeamSuccessMessage, setDeleteTeamSuccessMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded: isAuthLoaded, orgId } = useAuth(); // orgId is from useAuth

  // Update tabItems to be defined before being used in isValidTab and state init
  const allPossibleTabItems: Array<{ id: SettingsTab; label: string; icon?: React.ElementType }> = [
    { id: 'Users', label: 'Users' },
    { id: 'Teams', label: 'Teams' },
    { id: 'Integrations', label: 'Integrations' },
    { id: 'Notifications', label: 'Notifications'},
    { id: 'Employees', label: 'CSV Upload' },
  ];

  const displayedTabItems = React.useMemo(() => {
    if (!currentUser) return []; // Or a default minimal set if preferred during loading
    if (currentUser.role === 'USER') {
      return allPossibleTabItems.filter(tab => tab.id === 'Integrations' || tab.id === 'Notifications');
    }
    return allPossibleTabItems;
  }, [currentUser]);

  // Helper function to check if a string is a valid *displayed* SettingsTab ID
  const isValidDisplayedTab = (tabId: string | null): tabId is SettingsTab => {
    return displayedTabItems.some(tab => tab.id === tabId);
  };

  // Initialize activeTab from URL search parameter or default based on role and displayed tabs
  const initialTabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (isValidDisplayedTab(initialTabFromUrl)) {
      return initialTabFromUrl;
    }
    // Default to the first available displayed tab
    return displayedTabItems.length > 0 ? displayedTabItems[0].id : allPossibleTabItems[0].id; // Fallback if displayed is empty initially
  });

  // Effect to update activeTab if displayedTabItems changes and current activeTab is not in them
  useEffect(() => {
    if (displayedTabItems.length > 0 && !isValidDisplayedTab(activeTab)) {
      setActiveTab(displayedTabItems[0].id);
      // Also update URL if default changes due to role change (though less likely without page reload)
      setSearchParams(prev => { prev.set('tab', displayedTabItems[0].id); return prev; }, { replace: true });
    }
  }, [displayedTabItems, activeTab, setSearchParams]);

  // Fetch user data including Google & Zoom Auth status
  const { isLoading: isLoadingUser } = useQuery<UserData, Error>({
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
    enabled: !!currentUser && currentUser.role === 'ADMIN', // Only enable if user is ADMIN
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
    enabled: !!currentUser && currentUser.role === 'ADMIN', 
    staleTime: 5 * 60 * 1000,
  });

  // Function to handle tab click and update URL search parameter
  const handleTabClick = (tabId: SettingsTab) => {
    if (displayedTabItems.some(tab => tab.id === tabId)) { // Ensure tab is clickable
      setActiveTab(tabId);
      setSearchParams(prevParams => {
        prevParams.set('tab', tabId);
        return prevParams;
      }, { replace: true });
    }
  };

  // Effect to sync activeTab if URL changes from external navigation (e.g., back/forward button)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (isValidDisplayedTab(tabFromUrl) && tabFromUrl !== activeTab) {
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
    let updateParams = false;

    // Create a new SearchParams object to modify, to avoid issues with stale closures if only searchParams is modified directly.
    const newSearchParams = new URLSearchParams(searchParams.toString());

    if (googleSuccess) {
      setSuccessMessage('Google Calendar connected successfully!'); // Use the general success message
      newSearchParams.delete('google_auth_success');
      needsUserRefetch = true;
      updateParams = true;
    } else if (googleError) {
      const decodedError = decodeURIComponent(googleError);
      setErrorMessage(`Failed to connect Google Calendar: ${decodedError || 'Unknown error'}. Please try again.`); // Use general error message
      newSearchParams.delete('google_auth_error');
      updateParams = true;
    }

    if (zoomSuccess) {
      setSuccessMessage('Zoom account connected successfully!'); // Use general success message
      newSearchParams.delete('zoom_auth_success');
      needsUserRefetch = true;
      updateParams = true;
    } else if (zoomError) {
      const decodedError = decodeURIComponent(zoomError);
      setErrorMessage(`Failed to connect Zoom account: ${decodedError || 'Unknown error'}. Please try again.`); // Use general error message
      newSearchParams.delete('zoom_auth_error');
      updateParams = true;
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
      window.location.href = response.data.authUrl;
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
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      console.error('Failed to get Zoom Auth URL:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to initiate Zoom connection. Please try again.');
      setIsZoomLoading(false); // Set loading false on error
    }
  };

  // Determine connection statuses and button texts
  const isGoogleConnected = currentUser?.hasGoogleAuth ?? false;
  const googleConnectionStatusText = isGoogleConnected ? 'Connected' : 'Not Connected';
  const googleButtonText = isGoogleConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar';

  const isZoomConnected = currentUser?.hasZoomAuth ?? false; // Check Zoom status
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
      setSuccessMessage(response.data.message || 'Employees uploaded successfully!');
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

  // User Invitation Modal Handlers
  const openInviteUserModal = () => {
    setIsInviteUserModalOpen(true);
    setInviteEmail('');
    setSelectedAppRole('USER');
    setInviteUserError(null);
    setInviteUserSuccessMessage(null);
  };

  const closeInviteUserModal = () => {
    setIsInviteUserModalOpen(false);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !selectedAppRole) {
      setInviteUserError('Email and role are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
        setInviteUserError('Please enter a valid email address.');
        return;
    }
    if (!orgId) {
        setInviteUserError('Organization ID not found. Ensure you are part of an active organization.');
        return;
    }

    setIsInvitingUser(true);
    setInviteUserError(null);
    setInviteUserSuccessMessage(null);

    inviteUserMutation.mutate({
        email: inviteEmail,
        appRole: selectedAppRole,
        organizationId: orgId
    });
  };

  // Mutation for inviting user via backend API - CORRECTED STRUCTURE
  const inviteUserMutation = useMutation<any, Error, InvitationData>({ // Pass a single options object
    mutationFn: async (invitationData: InvitationData) => { // mutationFn is a property
      const response = await apiClient.post('/users/clerk-invite', invitationData);
      return response.data;
    },
    onSuccess: (/* removed unused data param */) => {
      setInviteUserSuccessMessage('User invited successfully!');
      setInviteUserError(null);
      // Optionally clear form or close modal after success
      closeInviteUserModal();
    },
    onError: (error) => {
      setInviteUserError(error.message || 'An unknown error occurred while inviting user');
      setInviteUserSuccessMessage(null); // Clear success message on error
    },
    onSettled: () => {
      setIsInvitingUser(false);
    },
  });

  const closeCreateTeamModal = () => {
    setIsCreateTeamModalOpen(false);
    // Resetting fields on close is good practice if modal is re-used or if values shouldn't persist
    setNewTeamName(''); 
    setNewTeamDepartment('');
    setCreateTeamError(null);
  };

  const handleCreateTeamSave = async () => {
    if (!newTeamName.trim() || !newTeamDepartment.trim()) {
      setCreateTeamError('Team name and department are required.');
      return;
    }
    setCreateTeamError(null); // Clear previous errors
    createTeamMutation.mutate({ name: newTeamName.trim(), department: newTeamDepartment.trim() });
  };

  // Mutation for creating a new team
  const createTeamMutation = useMutation<
    any, // Backend response type (expecting the new team object)
    Error, // Error type
    { name: string; department: string } // Variables type (name, department)
  >({
    mutationFn: async (teamData) => {
      // Assuming your apiClient is set up to handle POST requests
      // And that the backend route for creating a team is POST /api/teams
      // Adjust the endpoint if it's different (e.g., just '/teams' if apiClient has a base URL)
      const response = await apiClient.post('/teams', teamData); // Using '/teams' assuming apiClient baseURL is /api
      return response.data; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamsForList'] });
      closeCreateTeamModal();
      // Optionally, add a success toast/message here if desired, though modal closing often suffices
      // setSuccessMessage('Team created successfully!'); // Example if you have a general success message state
    },
    onError: (error: Error) => {
      setCreateTeamError(error.message || 'An unknown error occurred while creating the team.');
    },
    // onSettled can be used to turn off loading state regardless of success/error,
    // but setCreateTeamLoading will be handled by isPending/isLoading from the hook directly in UI.
  });

  const openEditTeamModal = (team: SelectableTeamData) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDepartment(team.department);
    setIsEditTeamModalOpen(true);
    setEditTeamError(null);
  };

  const closeEditTeamModal = () => {
    setIsEditTeamModalOpen(false);
    setEditingTeam(null);
    setEditTeamName('');
    setEditTeamDepartment('');
    setEditTeamError(null);
  };

  const handleEditTeamSave = async () => {
    if (!editingTeam) {
      setEditTeamError('No team selected for editing.');
      return;
    }
    if (!editTeamName.trim() || !editTeamDepartment.trim()) {
      setEditTeamError('Team name and department are required.');
      return;
    }
    setEditTeamError(null);
    editTeamMutation.mutate({ 
      id: editingTeam.id, 
      name: editTeamName.trim(), 
      department: editTeamDepartment.trim() 
    });
  };

  // Mutation for updating an existing team
  const editTeamMutation = useMutation<
    any, // Backend response type (expecting the updated team object)
    Error, // Error type
    { id: number; name: string; department: string } // Variables type
  >({
    mutationFn: async (teamData) => {
      const { id, ...updatePayload } = teamData;
      // Adjust endpoint if apiClient baseURL is not /api
      const response = await apiClient.put(`/teams/${id}`, updatePayload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allTeamsForList'] });
      // Optionally, update the specific item in the cache if the backend returns the updated team
      // queryClient.setQueryData(['allTeamsForList'], (oldData: SelectableTeamData[] | undefined) => 
      //   oldData ? oldData.map(team => team.id === variables.id ? { ...team, ...variables } : team) : []
      // );
      closeEditTeamModal();
    },
    onError: (error: Error) => {
      setEditTeamError(error.message || 'An unknown error occurred while updating the team.');
    },
  });

  // Delete Team Modal Handlers
  const openDeleteTeamModal = async (team: SelectableTeamData) => {
    setDeletingTeam(team);
    setIsDeleteTeamModalOpen(true); // Open modal immediately to show loading state for count
    setDeleteTeamEmployeeCountLoading(true);
    setDeleteTeamError(null); // Clear previous errors
    setDeleteTeamSuccessMessage(null); // Clear success message when opening modal
    try {
      const response = await apiClient.get<{ employeeCount: number }>(`/teams/${team.id}/employee-count`);
      setDeleteTeamEmployeeCount(response.data.employeeCount);
    } catch (error: any) {
      console.error('Failed to fetch employee count for team:', error);
      setDeleteTeamError(error.response?.data?.message || error.message || 'Failed to fetch employee count for this team.');
      setDeleteTeamEmployeeCount(0); // Sensible default or indicate error in count
    } finally {
      setDeleteTeamEmployeeCountLoading(false);
    }
  };

  const closeDeleteTeamModal = () => {
    setIsDeleteTeamModalOpen(false);
    setDeletingTeam(null);
    setDeleteTeamError(null);
    setDeleteTeamSuccessMessage(null); // Ensure success message is cleared on close
    setDeleteTeamEmployeeCount(0); // Reset count on close
  };

  const handleDeleteTeamConfirm = async () => {
    if (!deletingTeam) {
      setDeleteTeamError("No team selected for deletion."); // Should not happen if modal opened correctly
      return;
    }
    // Call the mutation to delete the team
    deleteTeamMutation.mutate(deletingTeam.id);
  };

  // NEW Mutation for deleting a team
  const deleteTeamMutation = useMutation<
    any, // Response type from backend (e.g., { message: string })
    Error, // Error type
    number // Variables type (teamId)
  >({
    mutationFn: async (teamId: number) => {
      setDeleteTeamError(null); 
      setDeleteTeamSuccessMessage(null); 
      const response = await apiClient.delete(`/teams/${teamId}`);
      return response.data;
    },
    onSuccess: async (data: any) => { // Made onSuccess async and explicitly typed data for now
      try {
        await refetchAllTeamsForList(); // Explicitly call refetch
        setDeleteTeamSuccessMessage(data?.message || 'Team deleted successfully!');
      } catch (error) {
        console.error("Failed to refetch teams list after deletion:", error);
        setDeleteTeamError('Team deleted, but failed to refresh the list. Please refresh manually.');
      }
      
      setTimeout(() => {
        closeDeleteTeamModal();
        setDeleteTeamSuccessMessage(null); 
      }, 1500);
    },
    onError: (error: Error) => {
      setDeleteTeamError(error.message || 'An unknown error occurred while deleting the team.');
      setDeleteTeamSuccessMessage(null);
    },
  });

  // Loading state for the whole page based on AppContext user loading
  if (isLoadingAppContextUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-4 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  // Error state for the whole page if AppContext user failed to load
  if (appContextUserError || !currentUser) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow max-w-lg mx-auto mt-10">
        <div className="flex items-center mb-3">
          <WarningCircle size={24} className="mr-2" />
          <h3 className="text-lg font-semibold">Error Loading Settings</h3>
        </div>
        <p>{appContextUserError || 'Your user information could not be loaded. Please try again later.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="mb-px flex space-x-2 sm:space-x-8 overflow-x-auto pb-0.5" aria-label="Tabs">
          {displayedTabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                whitespace-nowrap py-3 px-3 sm:py-4 sm:px-4 border-b-2 font-medium text-sm transition-colors duration-150 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0
                ${tab.id === activeTab
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={tab.id === activeTab ? 'page' : undefined}
            >
              {tab.icon && <tab.icon className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-8">
        {/* Conditional rendering of tab content */}
        {activeTab === 'Users' && currentUser.role === 'ADMIN' && (
          <div>
            {/* User Management and Invite Button - ADMINS ONLY */}
            {currentUser && currentUser.role === 'ADMIN' && (
              <div className="bg-white shadow sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">User Invitations</h3>
                    <button
                      type="button"
                      onClick={openInviteUserModal}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Invite User
                    </button>
                  </div>
                  {/* Feedback messages for invite user action */}
                  {inviteUserSuccessMessage && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 text-sm rounded-md">
                      {inviteUserSuccessMessage}
                    </div>
                  )}
                  {inviteUserError && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 text-sm rounded-md">
                      <WarningCircle size={20} className="inline mr-2" />
                      {inviteUserError}
                    </div>
                  )}
                   <div className="mt-6">
                     <p className="text-sm text-gray-500">
                       Invite new users to the organization and assign their application role.
                     </p>
                   </div>
                </div>
              </div>
            )}

            {/* Managers List Card - ADMINS ONLY (existing) */}
            {currentUser && currentUser.role === 'ADMIN' && (
              <div className="bg-white shadow sm:rounded-lg"> {/* Added card styling for consistency */}
                <div className="px-4 py-5 sm:p-6"> {/* Added padding for consistency */}
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Current Managers</h3> {/* Added title */}
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
                    <div className="mt-4 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
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
                  )}
                  {!isLoadingManagers && !managersError && (!managersData || managersData.length === 0) && (
                     <div className="mt-4 text-sm text-gray-500">No users with the manager role found.</div>
                  )}
                </div>
              </div>
            )}
            {/* If user is not admin and on Users tab, show a message or different content */}
            {currentUser && currentUser.role !== 'ADMIN' && (
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <p className="text-sm text-gray-600">User management and invitations are available for administrators.</p>
                </div>
            )}
          </div>
        )}

        {activeTab === 'Teams' && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') && (
          <>
            {/* === "All Teams" List Card - ADMINS ONLY === */}
            {currentUser && currentUser.role === 'ADMIN' && (
              <div className="">
                {/* Add New Team Button */} 
                <div className="mb-4 flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateTeamModalOpen(true);
                      setNewTeamName(''); // Reset form fields when opening
                      setNewTeamDepartment('');
                      setCreateTeamError(null); // Clear previous errors
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add New Team
                  </button>
                </div>

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
                    <div className="mt-4 rounded-lg overflow-hidden">
                      {allTeamsForList.length === 0 ? (
                        <p className="px-6 py-4 text-sm text-gray-500">No teams found in the system.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
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
                                } else if (team.userId && team.userId === currentUser?.id) {
                                    displayManager = `${currentUser.name || 'You'} (Admin)`;
                                }
                                const isUnassignedTeam = team.name === "NO TEAM ASSIGNED"; // Check if it's the special team

                                return (
                                  <tr key={team.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {team.name}
                                      {isUnassignedTeam && <span className="ml-2 text-xs text-gray-500 italic">(System Team)</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {team.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {displayManager}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      {!isUnassignedTeam ? (
                                        <DropdownMenu.Root>
                                          <DropdownMenu.Trigger asChild>
                                            <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
                                              <DotsThreeVertical size={20} weight="bold" />
                                              <span className="sr-only">Actions for {team.name}</span>
                                            </button>
                                          </DropdownMenu.Trigger>
                                          <DropdownMenu.Portal>
                                            <DropdownMenu.Content 
                                              className="min-w-[180px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50" 
                                              sideOffset={5}
                                              align="end"
                                            >
                                              <DropdownMenu.Item 
                                                className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-indigo-50 hover:text-indigo-600 focus:bg-indigo-50 focus:text-indigo-600 focus:outline-none cursor-pointer"
                                                onSelect={() => {
                                                  openEditTeamModal(team);
                                                }}
                                              >
                                                <Pencil size={16} className="mr-2.5" /> Edit Team Details
                                              </DropdownMenu.Item>
                                              <DropdownMenu.Item 
                                                className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-indigo-50 hover:text-indigo-600 focus:bg-indigo-50 focus:text-indigo-600 focus:outline-none cursor-pointer"
                                                onSelect={() => openAssignManagerModal(team)}
                                              >
                                                <UserPlus size={16} className="mr-2.5" /> Assign Manager
                                              </DropdownMenu.Item>
                                              <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                                              <DropdownMenu.Item 
                                                className="flex items-center px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 focus:bg-red-50 focus:text-red-700 focus:outline-none cursor-pointer"
                                                onSelect={() => openDeleteTeamModal(team)}
                                              >
                                                <Trash size={16} className="mr-2.5" /> Delete Team
                                              </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                          </DropdownMenu.Portal>
                                        </DropdownMenu.Root>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">N/A</span> // No actions for "NO TEAM ASSIGNED"
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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

        {activeTab === 'Employees' && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') && (
          <div className="employee-data-tab-content">
            {/* Upload Data Card - Remove card shell styling and inner padding */}
            <div className=""> 
              <div className=""> {/* Removed p-6 */}
                <h3 className="text-md font-medium text-gray-700">Import Employees via CSV</h3>
                <p className="text-sm text-gray-500 mt-1">Upload a CSV file to add multiple employees.</p>
                {successMessage && (<div className="mt-3 mb-3 p-3 bg-green-100 text-green-700 text-sm rounded-md">{successMessage}</div>)}
                {errorMessage && (<div className="mt-3 mb-3 p-3 bg-red-100 text-red-700 text-sm rounded-md">{errorMessage}</div>)}
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

        {activeTab === 'Notifications' && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              <p className="mt-2 text-sm text-gray-600">
                Notification settings and preferences will be available here in the future.
              </p>
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
                              checked={managerToAssign === null || managerToAssign === currentUser?.id}
                              onChange={() => setManagerToAssign(null)} />
                            <span className="ml-2 text-gray-700">Assign to me ({currentUser?.name || 'Admin'})</span>
                          </label>
                        </div>
                        {managersData.filter(m => m.id !== currentUser?.id).map(manager => (
                          <div key={manager.id}>
                            <label htmlFor={`manager-${manager.id}`} className="flex items-center text-sm">
                              <input id={`manager-${manager.id}`} name="manager-assignment" type="radio" className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                checked={managerToAssign === manager.id}
                                onChange={() => setManagerToAssign(manager.id)} />
                              <span className="ml-2 text-gray-700">{manager.name} ({manager.email})</span>
                            </label>
                          </div>
                        ))}
                        {managersData.filter(m => m.id !== currentUser?.id).length === 0 && !isLoadingManagers && (
                            <p className="text-sm text-gray-500">No other managers available to assign.</p>
                        )}
                      </fieldset>
                    )}
                    {!isLoadingManagers && !managersError && !managersData && (
                        <p className="text-sm text-gray-500">No managers found to assign.</p>
                    )}
                    {assignManagerModalSaveLoading && <p className="mt-3 text-sm text-blue-600">Saving changes...</p>}
                    {assignManagerModalSaveError && <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded-md"><WarningCircle size={16} className="inline mr-1" /> {assignManagerModalSaveError}</div>}
                    {assignManagerModalSaveSuccessMessage && <div className="mt-3 p-2 bg-green-50 text-green-700 text-sm rounded-md"><CheckCircle size={16} className="inline mr-1" /> {assignManagerModalSaveSuccessMessage}</div>}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" 
                            onClick={closeAssignManagerModal} disabled={assignManagerModalSaveLoading}>Cancel</button>
                    <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" 
                            onClick={handleAssignManagerSave} disabled={isLoadingManagers || assignManagerModalSaveLoading}>{assignManagerModalSaveLoading ? 'Saving...' : 'Save Assignment'}</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Invite User Modal */}
      <Transition.Root show={isInviteUserModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeInviteUserModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <div className="mt-3 text-center sm:mt-2">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Invite New User
                      </Dialog.Title>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 text-left">
                            Email address
                          </label>
                          <div className="mt-1">
                            <input
                              type="email"
                              name="invite-email"
                              id="invite-email"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                              placeholder="you@example.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="app-role" className="block text-sm font-medium text-gray-700 text-left">
                            Application Role
                          </label>
                          <div className="mt-1">
                            <select
                              id="app-role"
                              name="app-role"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                              value={selectedAppRole}
                              onChange={(e) => setSelectedAppRole(e.target.value as AppUserRole)}
                            >
                              {APP_USER_ROLES.map(role => (
                                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {inviteUserError && (
                           <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                                <WarningCircle size={18} className="inline mr-1" /> {inviteUserError}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                      onClick={handleInviteUser}
                      disabled={isInvitingUser}
                    >
                      {isInvitingUser ? 'Sending...' : 'Send Invitation'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                      onClick={closeInviteUserModal}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Edit Team Modal */}
      <Transition.Root show={isEditTeamModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeEditTeamModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <div className="mt-3 text-center sm:mt-2">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Edit Team: {editingTeam?.name}
                      </Dialog.Title>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="edit-team-name" className="block text-sm font-medium text-gray-700 text-left">
                            Team Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="edit-team-name"
                              id="edit-team-name"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                              value={editTeamName}
                              onChange={(e) => setEditTeamName(e.target.value)}
                              disabled={editTeamMutation.isPending}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="edit-team-department" className="block text-sm font-medium text-gray-700 text-left">
                            Department
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="edit-team-department"
                              id="edit-team-department"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                              value={editTeamDepartment}
                              onChange={(e) => setEditTeamDepartment(e.target.value)}
                              disabled={editTeamMutation.isPending}
                            />
                          </div>
                        </div>
                        {editTeamError && (
                           <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                                <WarningCircle size={18} className="inline mr-1" /> {editTeamError}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                      onClick={handleEditTeamSave}
                      disabled={editTeamMutation.isPending}
                    >
                      {editTeamMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                      onClick={closeEditTeamModal}
                      disabled={editTeamMutation.isPending}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Create Team Modal */}
      <Transition.Root show={isCreateTeamModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeCreateTeamModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <div className="mt-3 text-center sm:mt-2">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Create New Team
                      </Dialog.Title>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="new-team-name" className="block text-sm font-medium text-gray-700 text-left">
                            Team Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="new-team-name"
                              id="new-team-name"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                              placeholder="e.g., Engineering, Marketing"
                              value={newTeamName}
                              onChange={(e) => setNewTeamName(e.target.value)}
                              disabled={createTeamMutation.isPending}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="new-team-department" className="block text-sm font-medium text-gray-700 text-left">
                            Department
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="new-team-department"
                              id="new-team-department"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                              placeholder="e.g., Product Development, Growth"
                              value={newTeamDepartment}
                              onChange={(e) => setNewTeamDepartment(e.target.value)}
                              disabled={createTeamMutation.isPending}
                            />
                          </div>
                        </div>
                        {createTeamError && (
                           <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                                <WarningCircle size={18} className="inline mr-1" /> {createTeamError}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                      onClick={handleCreateTeamSave}
                      disabled={createTeamMutation.isPending}
                    >
                      {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                      onClick={closeCreateTeamModal}
                      disabled={createTeamMutation.isPending}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Delete Team Modal UI (Basic structure, assuming you will build this out) */}
      <Transition.Root show={isDeleteTeamModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeDeleteTeamModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                      <WarningCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Delete Team: {deletingTeam?.name}
                      </Dialog.Title>
                      <div className="mt-2">
                        {deleteTeamEmployeeCountLoading ? (
                          <p className="text-sm text-gray-500">Loading employee count...</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500">
                              This team has {deleteTeamEmployeeCount} employee(s).
                            </p>
                            {deleteTeamEmployeeCount > 0 && (
                              <p className="mt-1 text-sm text-yellow-600">
                                Deleting this team will unassign these employees. This action cannot be undone.
                              </p>
                            )}
                             <p className="mt-1 text-sm text-gray-500">
                              Are you sure you want to permanently delete this team?
                            </p>
                          </>
                        )}
                      </div>
                      {deleteTeamError && (
                        <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-md text-left">
                           <WarningCircle size={18} className="inline mr-2" /> {deleteTeamError}
                        </div>
                      )}
                      {deleteTeamSuccessMessage && (
                        <div className="mt-3 p-3 bg-green-50 text-green-700 text-sm rounded-md text-left">
                          <CheckCircle size={18} className="inline mr-2" /> {deleteTeamSuccessMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                      onClick={handleDeleteTeamConfirm}
                      disabled={deleteTeamMutation.isPending || deleteTeamEmployeeCountLoading || !!deleteTeamSuccessMessage}
                    >
                      {deleteTeamMutation.isPending ? 'Deleting...' : 'Delete Team'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                      onClick={closeDeleteTeamModal}
                      disabled={deleteTeamMutation.isPending}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

    </div>
  );
};

export default Settings;
