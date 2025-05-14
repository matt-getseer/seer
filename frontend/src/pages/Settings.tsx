import React, { useState, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { Link as LinkIcon, CheckCircle, WarningCircle, X, CaretDown, CaretUp, Check } from '@phosphor-icons/react'; // Added CaretDown, CaretUp, Check
import { userService } from '../api/client'; // Keep named import for userService
import apiClient from '../api/client'; // Add default import for apiClient
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // Removed UseMutationOptions
import { useAuth } from '@clerk/clerk-react'; // useOrganization has been removed
import { Dialog, Transition } from '@headlessui/react'; // Added Dialog and Transition
import { useAppContext, AppUser } from '../context/AppContext'; // Keep AppUser for now
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select'; // Added Radix UI Select import
import { DotsThreeVertical, Pencil, UserPlus, Trash } from '@phosphor-icons/react'; // Icons for dropdown
import { useFeatureFlags } from '../context/FeatureFlagContext';

// Define expected user data shape
interface UserData {
  id: number;
  email: string;
  name: string | null;
  hasGoogleAuth: boolean;
  hasZoomAuth: boolean; // Add Zoom auth status
  role: string; // Ensure role is part of UserData
  teamId?: number; // ADDED: Assume manager's teamId might be here
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
  department: DepartmentData;
  userId: number | null; // ID of the user currently managing this team, or null
}

// Define department data shape
interface DepartmentData {
  id: number;
  name: string;
  headId?: number | null; 
  head?: {               
    id: number;
    name: string | null; 
    email: string;
  } | null;
  // teamCount?: number;    // Optional: For future use
}

// Define possible tab values
type SettingsTab = 'Users' | 'Teams' | 'Integrations' | 'Employees' | 'Notifications' | 'Departments';

// Define possible UserRoles for the application
const APP_USER_ROLES = ['ADMIN', 'MANAGER', 'USER'] as const;
type AppUserRole = typeof APP_USER_ROLES[number];

interface InvitationData { // This is for the Admin's invite modal
  email: string;
  appRole: AppUserRole;
  organizationId: string;
}

// NEW: Define InvitationStatus enum to match backend
enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED'
}

// NEW: Define structure for an Invitation object (based on backend service)
interface Invitation {
  id: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string; // Assuming ISO string date
  teamId: number;
  managerId: number;
  organizationId: string;
  clerkInvitationId: string;
  createdAt: string; // Assuming ISO string date
  updatedAt: string; // Assuming ISO string date
  teamName?: string; // Joined from Team table
}

// NEW: Define structure for sending a manager's invitation
interface ManagerInvitationPayload {
  email: string;
  teamId: number;
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
  const [newTeamDepartmentId, setNewTeamDepartmentId] = useState<number | null>(null); // MODIFIED: for ID, can be null
  const [createTeamLoading, setCreateTeamLoading] = useState(false); // This might be replaced by mutation.isPending
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  // State for Create Department Modal
  const [isCreateDepartmentModalOpen, setIsCreateDepartmentModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [createDepartmentLoading, setCreateDepartmentLoading] = useState(false);
  const [createDepartmentError, setCreateDepartmentError] = useState<string | null>(null);

  // State for User Invitation Modal
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedAppRole, setSelectedAppRole] = useState<AppUserRole>('USER');
  const [inviteUserError, setInviteUserError] = useState<string | null>(null);
  const [inviteUserSuccessMessage, setInviteUserSuccessMessage] = useState<string | null>(null);
  const [isInvitingUser, setIsInvitingUser] = useState(false);

  // NEW: State for manager's invitations list
  const [managerInvitations, setManagerInvitations] = useState<Invitation[]>([]);
  const [isLoadingManagerInvitations, setIsLoadingManagerInvitations] = useState(false);
  const [fetchManagerInvitationsError, setFetchManagerInvitationsError] = useState<string | null>(null);

  // State for manager list loading and error (mirroring query states)
  const [isManagerListLoading, setIsManagerListLoading] = useState(false);
  const [managerListError, setManagerListError] = useState<string | null>(null);

  // State for Edit Team Modal
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SelectableTeamData | null>(null); 
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDepartment, setEditTeamDepartment] = useState('');
  const [editTeamError, setEditTeamError] = useState<string | null>(null);

  // State for Edit Department Modal
  const [isEditDepartmentModalOpen, setIsEditDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
  const [editDepartmentName, setEditDepartmentName] = useState('');
  const [editDepartmentError, setEditDepartmentError] = useState<string | null>(null);
  const [selectedDepartmentHeadId, setSelectedDepartmentHeadId] = useState<number | null>(null);

  // State for Delete Team Modal
  const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<SelectableTeamData | null>(null);
  const [deleteTeamEmployeeCount, setDeleteTeamEmployeeCount] = useState<number>(0);
  const [deleteTeamEmployeeCountLoading, setDeleteTeamEmployeeCountLoading] = useState(false);
  const [deleteTeamError, setDeleteTeamError] = useState<string | null>(null);
  // Add state for delete success message, similar to other modals
  const [deleteTeamSuccessMessage, setDeleteTeamSuccessMessage] = useState<string | null>(null);

  // State for Delete Department Modal
  const [isDeleteDepartmentModalOpen, setIsDeleteDepartmentModalOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentData | null>(null);
  const [deleteDepartmentError, setDeleteDepartmentError] = useState<string | null>(null);
  const [deleteDepartmentSuccessMessage, setDeleteDepartmentSuccessMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded: isAuthLoaded, orgId } = useAuth(); // orgId is from useAuth
  const { isAdminRoleEnabled } = useFeatureFlags();

  // NEW: Constant for max invitations a manager can have
  const MAX_MANAGER_INVITATIONS = 3;

  // NEW: Query to fetch manager's invitations
  const { 
    data: fetchedManagerInvitationsData, 
    isLoading: queryIsLoadingManagerInvitations, 
    error: queryFetchManagerInvitationsError,
    refetch: refetchManagerInvitations
  } = useQuery<Invitation[], Error, Invitation[], readonly unknown[]>({
    queryKey: ['managerInvitations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser || currentUser.role !== 'MANAGER') {
        return [];
      }
      const response = await apiClient.get<Invitation[]>('/invitations');
      return response.data;
    },
    enabled: !!currentUser && currentUser.role === 'MANAGER',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Effects to update state based on query results
  useEffect(() => {
    setIsLoadingManagerInvitations(queryIsLoadingManagerInvitations);
  }, [queryIsLoadingManagerInvitations]);

  useEffect(() => {
    if (fetchedManagerInvitationsData) {
      setManagerInvitations(fetchedManagerInvitationsData);
      setFetchManagerInvitationsError(null);
    }
  }, [fetchedManagerInvitationsData]);

  useEffect(() => {
    if (queryFetchManagerInvitationsError) {
      setFetchManagerInvitationsError(queryFetchManagerInvitationsError.message || 'Failed to load your invitations.');
      setManagerInvitations([]);
    }
  }, [queryFetchManagerInvitationsError]);

  // NEW: Calculate active pending invitations for the current manager
  const activePendingInvitationsCount = React.useMemo(() => {
    if (currentUser?.role !== 'MANAGER' || !managerInvitations) {
      return 0;
    }
    return managerInvitations.filter(inv => inv.status === InvitationStatus.PENDING).length;
  }, [currentUser, managerInvitations]);

  // Update tabItems to be defined before being used in isValidTab and state init
  const allPossibleTabItems: Array<{ id: SettingsTab; label: string; icon?: React.ElementType }> = [
    { id: 'Users', label: 'Users' },
    { id: 'Teams', label: 'Teams' },
    { id: 'Departments', label: 'Departments' }, // Added Departments tab
    { id: 'Integrations', label: 'Integrations' },
    { id: 'Notifications', label: 'Notifications'},
    { id: 'Employees', label: 'CSV Upload' },
  ];

  const displayedTabItems = React.useMemo(() => {
    if (!currentUser) return []; // Or a default minimal set if preferred during loading
    if (currentUser.role === 'USER') {
      return allPossibleTabItems.filter(tab => tab.id === 'Integrations' || tab.id === 'Notifications');
    } else if (currentUser.role === 'MANAGER') {
      const managerTabsToExclude: SettingsTab[] = ['Teams', 'Departments', 'Employees'];
      return allPossibleTabItems.filter(tab => !managerTabsToExclude.includes(tab.id));
    }
    // For ADMIN or any other roles (if any exist beyond USER, MANAGER, ADMIN), show all tabs by default.
    // If isAdminRoleEnabled is part of future logic for finer control, it can be integrated here.
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

  // Fetch all departments (for the new "Departments" tab list card)
  const {
    data: allDepartments,
    isLoading: isLoadingAllDepartments,
    error: allDepartmentsError,
    refetch: refetchAllDepartments
  } = useQuery<DepartmentData[], Error>({
    queryKey: ['allDepartments'],
    queryFn: async () => {
      try {
        // Assuming apiClient is configured with baseURL (e.g., /api)
        const response = await apiClient.get('/departments'); 
        if (!response || response.status < 200 || response.status >= 300) {
          const errorData = response?.data as any;
          throw new Error(errorData?.message || `Failed to fetch departments. Status: ${response?.status || 'unknown'}`);
        }
        return response.data;
      } catch (err: any) {
        console.error("Error fetching departments:", err);
        throw new Error(err.message || 'An unknown error occurred while fetching departments');
      }
    },
    // Enable if user is Admin or Manager. Adjust if only Admin should see/manage departments.
    enabled: !!currentUser && currentUser.role === 'ADMIN' && isAdminRoleEnabled(), 
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
    if (!inviteEmail.trim()) { // Basic email validation
      setInviteUserError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
        setInviteUserError('Please enter a valid email address.');
        return;
    }

    // Role-specific logic
    if (currentUser?.role === 'MANAGER') {
      // TODO: Ensure currentUser.teamId is reliably populated from AppContext for managers.
      // This might require backend changes to /users/me to include the manager's primary teamId.
      const managerTeamId = (currentUser as UserData)?.teamId; // Cast to UserData to access optional teamId

      if (!managerTeamId) {
        setInviteUserError('Your team information is missing or could not be loaded. Cannot send invitation.');
        return;
      }
      if (activePendingInvitationsCount >= MAX_MANAGER_INVITATIONS) {
        setInviteUserError(`You have reached the maximum limit of ${MAX_MANAGER_INVITATIONS} active invitations.`);
        return;
      }
      managerInviteMutation.mutate({ email: inviteEmail, teamId: managerTeamId });

    } else if (hasAdminAccess()) { // Admin invite
      if (!selectedAppRole) {
        setInviteUserError('Role is required for admin invitations.');
        return;
      }
      if (!orgId) { // Admins might operate across orgs or need specific orgId
          setInviteUserError('Organization ID not found. Ensure you are part of an active organization.');
          return;
      }
      adminInviteUserMutation.mutate({
          email: inviteEmail,
          appRole: selectedAppRole,
          organizationId: orgId
      });
    } else {
      setInviteUserError('You do not have permission to invite users.');
      return;
    }
  };

  // Mutation for inviting user via backend API - For ADMINS (existing, renamed for clarity)
  const adminInviteUserMutation = useMutation<any, Error, InvitationData>({
    mutationFn: async (invitationData: InvitationData) => {
      setIsInvitingUser(true);
      setInviteUserError(null);
      setInviteUserSuccessMessage(null);
      const response = await apiClient.post('/users/clerk-invite', invitationData);
      return response.data;
    },
    onSuccess: (data: any) => {
      setInviteUserSuccessMessage('User invited successfully! (Admin)');
      setInviteUserError(null);
      closeInviteUserModal();
    },
    onError: (error: Error) => {
      setInviteUserError(error.message || 'An unknown error occurred while inviting user (Admin)');
      setInviteUserSuccessMessage(null);
    },
    onSettled: () => {
      setIsInvitingUser(false);
    },
  });

  // NEW: Mutation for manager inviting a team member
  const managerInviteMutation = useMutation<any, Error, ManagerInvitationPayload>({
    mutationFn: async (payload: ManagerInvitationPayload) => {
      setIsInvitingUser(true);
      setInviteUserError(null);
      setInviteUserSuccessMessage(null);
      const response = await apiClient.post('/invitations', payload);
      return response.data;
    },
    onSuccess: (data: any) => {
      setInviteUserSuccessMessage('Team member invited successfully!');
      setInviteUserError(null);
      queryClient.invalidateQueries({ queryKey: ['managerInvitations', currentUser?.id] });
      closeInviteUserModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred while inviting team member.';
      setInviteUserError(errorMessage);
      setInviteUserSuccessMessage(null);
    },
    onSettled: () => {
      setIsInvitingUser(false);
    },
  });

  const closeCreateTeamModal = () => {
    setIsCreateTeamModalOpen(false);
    setNewTeamName(''); 
    setNewTeamDepartmentId(null); // MODIFIED: Reset to null
    setCreateTeamError(null);
  };

  const handleCreateTeamSave = async () => {
    if (!newTeamName.trim()) {
      setCreateTeamError('Team name is required.');
      return;
    }
    setCreateTeamError(null); // Clear previous errors

    const payload: { name: string; departmentId?: number } = {
      name: newTeamName.trim(),
    };

    if (newTeamDepartmentId !== null) {
      payload.departmentId = newTeamDepartmentId;
    }
    // If newTeamDepartmentId is null, departmentId field is omitted from payload,
    // and backend will default to SYSTEM department.

    createTeamMutation.mutate(payload);
  };

  // Mutation for creating a new team
  const createTeamMutation = useMutation<
    any, // Backend response type (expecting the new team object)
    Error, // Error type
    { name: string; departmentId?: number } // MODIFIED: departmentId is optional number
  >({
    mutationFn: async (teamData) => {
      const response = await apiClient.post('/teams', teamData); 
      return response.data; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeamsForList'] });
      closeCreateTeamModal();
    },
    onError: (error: Error) => {
      setCreateTeamError(error.message || 'An unknown error occurred while creating the team.');
    },
  });

  // Mutation for creating a new department
  const createDepartmentMutation = useMutation<
  DepartmentData, // Backend response type (expecting the new department object)
Error,          // Error type
{ name: string } // Variables type (name for the new department)
>({
mutationFn: async (departmentData: { name: string }) => {
  // setCreateDepartmentLoading(true); // This loading state is better handled by createDepartmentMutation.isPending
  setCreateDepartmentError(null); // Clear previous errors, uses your existing state
  try {
    const response = await apiClient.post('/departments', departmentData); // Assumes your API endpoint is /api/departments
    if (!response || response.status < 200 || response.status >= 300) {
      const errorData = response?.data as any;
      throw new Error(errorData?.message || `Failed to create department. Status: ${response?.status}`);
    }
    return response.data;
  } catch (err: any) {
    // Ensure an actual Error object is thrown for react-query's onError
    if (err instanceof Error) throw err;
    throw new Error(String(err || 'An unknown error occurred while creating the department.'));
  }
},
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['allDepartments'] }); // Refreshes the department list
  closeCreateDepartmentModal(); // Calls the handler function you'll add next
  // Optional: setNewDepartmentName(''); // Clear input in modal, can also be done in closeCreateDepartmentModal
  // Optional: setSuccessMessage('Department created successfully!'); // If you have a general success message state
},
onError: (error: Error) => {
  setCreateDepartmentError(error.message || 'An unknown error occurred while creating the department.'); // Uses your existing state
},
// onSettled: () => { // Optional: For cleanup that runs on success or error
//   setCreateDepartmentLoading(false); // This loading state is better handled by createDepartmentMutation.isPending
// },
});

  

  const openEditTeamModal = (team: SelectableTeamData) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDepartment(team.department.name);
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

  const closeDeleteDepartmentModal = () => {
    setIsDeleteDepartmentModalOpen(false);
    setDeletingDepartment(null);
    setDeleteDepartmentError(null);
    setDeleteDepartmentSuccessMessage(null); // Clear success message on close
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

  const handleEditDepartmentSave = async () => {
    if (!editingDepartment) return;

    setEditDepartmentError(null);

    if (!editDepartmentName.trim()) {
      setEditDepartmentError('Department name cannot be empty.');
      return;
    }

    // Check if name or head has changed
    const nameChanged = editDepartmentName !== editingDepartment.name;
    const headChanged = selectedDepartmentHeadId !== (editingDepartment.headId || null);

    if (!nameChanged && !headChanged) {
      setEditDepartmentError('No changes made.'); // Or just close modal silently
      // closeEditDepartmentModal();
      return;
    }

    updateDepartmentMutation.mutate({
      departmentId: editingDepartment.id,
      name: editDepartmentName.trim(),
      headId: selectedDepartmentHeadId,
    });
  };

  // Function to open the Edit Department Modal
  const openEditDepartmentModal = (department: DepartmentData) => {
    setEditingDepartment(department);
    setEditDepartmentName(department.name);
    setSelectedDepartmentHeadId(department.headId || null); // Initialize with current head ID
    setEditDepartmentError(null); // Clear previous errors
    setIsEditDepartmentModalOpen(true);
  };

  // Function to close the Edit Department Modal
  const closeEditDepartmentModal = () => {
    setIsEditDepartmentModalOpen(false);
    setEditingDepartment(null);
    setEditDepartmentName('');
    setSelectedDepartmentHeadId(null);
    setEditDepartmentError(null);
  };

  // Mutation for updating department (including assigning head)
  const updateDepartmentMutation = useMutation<DepartmentData, Error, { departmentId: number; name: string; headId: number | null }>(
    {
      mutationFn: async ({ departmentId, name, headId }: { departmentId: number; name: string; headId: number | null }) => {
        if (editingDepartment && name !== editingDepartment.name) {
          // Placeholder: Name update logic. Requires backend endpoint or separate mutation.
          // For now, focusing on headId assignment.
        }
        const response = await apiClient.put(`/departments/${departmentId}/assign-head`, { userId: headId });
        return response.data as DepartmentData;
      },
      onSuccess: (data: DepartmentData) => {
        queryClient.invalidateQueries({ queryKey: ['allDepartments'] });
        setSuccessMessage(`Department "${data.name}" updated successfully.`);
        closeEditDepartmentModal(); // This will call the remaining, correctly defined function
      },
      onError: (error: Error) => {
        setEditDepartmentError(error.message || 'Failed to update department.');
        setErrorMessage(error.message || 'Failed to update department.');
      },
    }
  );

  // Create Department Modal Handlers
  const openCreateDepartmentModal = () => {
    setNewDepartmentName('');
    setCreateDepartmentError(null);
    setIsCreateDepartmentModalOpen(true);
  };

  const closeCreateDepartmentModal = () => {
    setIsCreateDepartmentModalOpen(false);
    setNewDepartmentName('');
    setCreateDepartmentError(null);
  };

  const handleCreateDepartmentSave = async () => {
    if (!newDepartmentName.trim()) {
      setCreateDepartmentError('Department name is required.');
      return;
    }
    setCreateDepartmentError(null);
    createDepartmentMutation.mutate({ name: newDepartmentName.trim() });
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

  const editDepartmentMutation = useMutation<
    DepartmentData, // Backend response type (expecting the updated department object)
    Error,          // Error type
    { id: number; name: string } // Variables type (id of department to update, new name)
  >({
    mutationFn: async (departmentData) => {
      const { id, ...updatePayload } = departmentData;
      const response = await apiClient.put(`/departments/${id}`, updatePayload);
      if (!response || response.status < 200 || response.status >= 300) {
        const errorData = response?.data as any;
        throw new Error(errorData?.message || `Failed to update department. Status: ${response?.status}`);
      }
      return response.data;
    },
    onSuccess: (updatedDepartment) => {
      queryClient.invalidateQueries({ queryKey: ['allDepartments'] });
      closeEditDepartmentModal();
    },
    onError: (error: Error) => {
      setEditDepartmentError(error.message || 'An unknown error occurred while updating the department.');
    },
  });

  const deleteDepartmentMutation = useMutation<
  any,
  Error,
  number
>({
  mutationFn: async (departmentId: number) => {
    setDeleteDepartmentError(null);
    setDeleteDepartmentSuccessMessage(null);
    const response = await apiClient.delete(`/departments/${departmentId}`);
    if (!response || response.status < 200 || response.status >= 300) {
      const errorData = response?.data as any;
      throw new Error(errorData?.message || `Failed to delete department. Status: ${response?.status}`);
    }
    return response.data;
  },
  onSuccess: async (data: any) => {
    try {
      await refetchAllDepartments();
      setDeleteDepartmentSuccessMessage(data?.message || 'Department deleted successfully!');
    } catch (error) {
      console.error("Failed to refetch departments list after deletion:", error);
      setDeleteDepartmentError('Department deleted, but failed to refresh the list. Please refresh manually.');
    }
    setTimeout(() => {
      closeDeleteDepartmentModal();
    }, 1500);
  },
  onError: (error: Error) => {
    setDeleteDepartmentError(error.message || 'An unknown error occurred while deleting the department.');
    setDeleteDepartmentSuccessMessage(null);
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

  const handleDeleteDepartmentConfirm = async () => {
    if (!deletingDepartment) {
      setDeleteDepartmentError("No department selected for deletion.");
      return;
    }
    // deleteDepartmentMutation.mutate(deletingDepartment.id); // Will be uncommented later
    console.log("Attempting to delete department:", deletingDepartment.id); // Placeholder for now
  };

  const openDeleteDepartmentModal = async (department: DepartmentData) => {
    setDeletingDepartment(department);
    setIsDeleteDepartmentModalOpen(true);
    setDeleteDepartmentError(null);
    setDeleteDepartmentSuccessMessage(null);
    // ... any other logic like fetching counts if needed
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

  // Determine effective role - treat ADMIN as MANAGER when admin role is disabled
  const effectiveRole = () => {
    if (!isAdminRoleEnabled() && currentUser?.role === 'ADMIN') {
      return 'MANAGER';
    }
    return currentUser?.role || null;
  };

  // Check if user has admin access based on role and feature flag
  const hasAdminAccess = () => {
    return currentUser?.role === 'ADMIN' && isAdminRoleEnabled();
  };

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
        {activeTab === 'Users' && (hasAdminAccess() || (currentUser && currentUser.role === 'MANAGER')) && (
          <div>
            {/* User Management and Invite Button - ADMINS ONLY */}
            {hasAdminAccess() && (
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

           {/* Team Member Invitation - MANAGERS ONLY (and not also an Admin who would see the above block) */}
           {currentUser && currentUser.role === 'MANAGER' && !hasAdminAccess() && (
             <div className="bg-white shadow sm:rounded-lg mb-6">
               <div className="px-4 py-5 sm:p-6">
                 <div className="flex justify-between items-center">
                   <h3 className="text-lg leading-6 font-medium text-gray-900">Invite Team Member</h3>
                   <button
                     type="button"
                     onClick={openInviteUserModal} // Reuse existing modal opener
                     className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                     disabled={isLoadingManagerInvitations || (activePendingInvitationsCount >= MAX_MANAGER_INVITATIONS)}
                   >
                     Invite Team Member
                   </button>
                 </div>
                 {/* Manager's Feedback messages for invite user action */}
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
                     {isLoadingManagerInvitations 
                       ? 'Loading invitation status...'
                       : fetchManagerInvitationsError 
                         ? <span className="text-red-600">Error loading invitation status: {fetchManagerInvitationsError}</span>
                         : `You have ${MAX_MANAGER_INVITATIONS - activePendingInvitationsCount} of ${MAX_MANAGER_INVITATIONS} invitations remaining.`
                     }
                     <br />
                     Invited users will automatically be assigned the 'USER' role and added to your team.
                   </p>
                 </div>
               </div>
             </div>
           )}

            {/* Managers List Card - ADMINS ONLY (existing) */}
            {hasAdminAccess() && (
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
            {/* The old !hasAdminAccess() message block has been removed */}
          </div>
        )}

        {activeTab === 'Teams' && (hasAdminAccess() || effectiveRole() === 'MANAGER') && (
          <>
            {/* === "All Teams" List Card - ADMINS ONLY === */}
            {hasAdminAccess() && (
              <div className="">
                {/* Add New Team Button */} 
                <div className="mb-4 flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateTeamModalOpen(true);
                      setNewTeamName(''); // Reset form fields when opening
                      setNewTeamDepartmentId(null); // MODIFIED: Reset to null
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
                                      {team.department?.name}
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

{activeTab === 'Departments' && (hasAdminAccess() || effectiveRole() === 'ADMIN') && ( // Adjust role check as needed
  <>
    {/* === "All Departments" List Card - ADMINS/MANAGERS === */}
    {hasAdminAccess() && ( // Double check role for safety
      <div className=""> {/* Outer container for department section */}
        {/* Add New Department Button */}
        <div className="mb-4 flex justify-start">
          <button
            type="button"
            onClick={openCreateDepartmentModal} // Uses your handler
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add New Department
          </button>
        </div>

        {/* Department List Table */}
        <div className=""> {/* Card styling can be added here if desired, e.g., bg-white shadow sm:rounded-lg */}
          {isLoadingAllDepartments && ( // From your useQuery
            <div className="mt-4 text-sm text-gray-500">Loading departments...</div>
          )}
          {allDepartmentsError && ( // From your useQuery
            <div className="mt-4 text-sm text-red-600">
              <WarningCircle size={20} className="inline mr-2" />
              Error loading departments: {allDepartmentsError.message}
            </div>
          )}
          {!isLoadingAllDepartments && !allDepartmentsError && allDepartments && ( // From your useQuery
            <div className="mt-4 rounded-lg overflow-hidden">
              {allDepartments.length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-500">No departments found. Click "Add New Department" to create one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                          Department Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                          Manager
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allDepartments.map((department) => (
                        <tr key={department.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {department.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {department.head ? (department.head.name || department.head.email) : 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
                                  <DotsThreeVertical size={20} weight="bold" />
                                  <span className="sr-only">Actions for {department.name}</span>
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
                                    onSelect={() => openEditDepartmentModal(department)} // Uses your handler
                                  >
                                    <Pencil size={16} className="mr-2.5" /> Edit Department
                                  </DropdownMenu.Item>
                                  {/* Future: Option to assign Head of Department could go here */}
                                  <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                                  <DropdownMenu.Item
                                    className="flex items-center px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 focus:bg-red-50 focus:text-red-700 focus:outline-none cursor-pointer"
                                    onSelect={() => openDeleteDepartmentModal(department)} // Uses your handler
                                  >
                                    <Trash size={16} className="mr-2.5" /> Delete Department
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}
    {!hasAdminAccess() && ( // If user is not Admin
      <div className="bg-white shadow sm:rounded-lg p-6">
        <p className="text-sm text-gray-600">Department management is available for administrators.</p>
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

        {activeTab === 'Employees' && (hasAdminAccess() || effectiveRole() === 'ADMIN' || effectiveRole() === 'MANAGER') && (
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
                        {/* Conditionally render role selection only if not a manager */}
                        {currentUser && currentUser.role !== 'MANAGER' && (
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
                                // The disabled prop below is now set to false because this block only renders for non-managers.
                                disabled={false} 
                              >
                                {APP_USER_ROLES.map(role => (
                                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
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
                          <label htmlFor="new-team-department-select" className="block text-sm font-medium text-gray-700 text-left mb-1">
                            Department
                          </label>
                          <Select.Root
                            // Provide the placeholder value when state is null, otherwise the ID string
                            value={newTeamDepartmentId === null ? 'SYSTEM_PLACEHOLDER' : newTeamDepartmentId.toString()}
                            onValueChange={(value) => {
                              // Map the placeholder value back to null state, otherwise parse the ID
                              if (value === 'SYSTEM_PLACEHOLDER') {
                                setNewTeamDepartmentId(null);
                              } else {
                                // Ensure value is not empty/null before parsing, though Radix shouldn't allow empty item values
                                setNewTeamDepartmentId(value ? parseInt(value) : null);
                              }
                            }}
                            disabled={createTeamMutation.isPending || isLoadingAllDepartments}
                          >
                            <Select.Trigger
                              id="new-team-department-select"
                              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Department"
                            >
                              {/* Display placeholder if state is null, otherwise display selected department name */}
                              <Select.Value>
                                {newTeamDepartmentId === null
                                  ? <span className="text-gray-500">Select a department (optional)</span> // Placeholder text
                                  : allDepartments?.find(d => d.id === newTeamDepartmentId)?.name || 'Loading...' // Find name from ID
                                }
                              </Select.Value>
                              <Select.Icon className="text-gray-500">
                                <CaretDown size={16} />
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content
                                position="popper"
                                sideOffset={5}
                                className="relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-md animate-in fade-in-80"
                              >
                                <Select.ScrollUpButton className="flex items-center justify-center h-[25px] bg-white text-gray-700 cursor-default">
                                  <CaretUp size={16} />
                                </Select.ScrollUpButton>
                                <Select.Viewport className="p-1">
                                  <Select.Item
                                    value="SYSTEM_PLACEHOLDER" // MODIFIED: Use non-empty placeholder value
                                    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-indigo-100 focus:text-indigo-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                  >
                                    <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                      {/* Conditionally show check if newTeamDepartmentId is null (i.e., this option is selected) */} 
                                      {newTeamDepartmentId === null && <Check size={14} weight="bold" />}
                                    </Select.ItemIndicator>
                                    <Select.ItemText>(Default to System)</Select.ItemText>
                                  </Select.Item>

                                  {isLoadingAllDepartments && (
                                    <Select.Item value="loading-placeholder" disabled className="py-1.5 px-3 text-sm text-gray-400">
                                      Loading departments...
                                    </Select.Item>
                                  )}
                                  {!isLoadingAllDepartments && allDepartments && allDepartments.map((dept) => (
                                    <Select.Item
                                      key={dept.id}
                                      value={dept.id.toString()} // MODIFIED: Value is department ID as string
                                      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-indigo-100 focus:text-indigo-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                    >
                                      <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <Check size={14} weight="bold" />
                                      </Select.ItemIndicator>
                                      <Select.ItemText>{dept.name}</Select.ItemText>
                                    </Select.Item>
                                  ))}
                                  {!isLoadingAllDepartments && (!allDepartments || allDepartments.length === 0) && (
                                     <Select.Item value="no-depts-placeholder" disabled className="py-1.5 px-3 text-sm text-gray-400">
                                      No custom departments available.
                                    </Select.Item>
                                  )}
                                </Select.Viewport>
                                <Select.ScrollDownButton className="flex items-center justify-center h-[25px] bg-white text-gray-700 cursor-default">
                                  <CaretDown size={16} />
                                </Select.ScrollDownButton>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                          <p className="mt-1 text-xs text-gray-500">
                            If no department is selected, the team will be assigned to the "SYSTEM" department.
                          </p>
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

      {/* Create Department Modal */}
<Transition.Root show={isCreateDepartmentModalOpen} as={Fragment}>
  <Dialog as="div" className="relative z-10" onClose={closeCreateDepartmentModal}>
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
                  Create New Department
                </Dialog.Title>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="new-department-name" className="block text-sm font-medium text-gray-700 text-left">
                      Department Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="new-department-name"
                        id="new-department-name"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        placeholder="e.g., Human Resources, Finance"
                        value={newDepartmentName} // Uses your state
                        onChange={(e) => setNewDepartmentName(e.target.value)} // Uses your state
                        disabled={createDepartmentMutation.isPending} // Uses your mutation
                      />
                    </div>
                  </div>
                  {createDepartmentError && ( // Uses your state
                     <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                          <WarningCircle size={18} className="inline mr-1" /> {createDepartmentError}
                     </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                onClick={handleCreateDepartmentSave} // Uses your handler
                disabled={createDepartmentMutation.isPending} // Uses your mutation
              >
                {createDepartmentMutation.isPending ? 'Creating...' : 'Create Department'}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                onClick={closeCreateDepartmentModal} // Uses your handler
                disabled={createDepartmentMutation.isPending} // Uses your mutation
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

      {/* Edit Department Modal */}
      {isEditDepartmentModalOpen && editingDepartment && (
        <Transition.Root show={isEditDepartmentModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={closeEditDepartmentModal}>
            {/* ... Backdrop ... */}
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
                  <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                    <div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          Edit Department
                        </Dialog.Title>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label htmlFor="editDepartmentName" className="block text-sm font-medium text-gray-700">
                              Department Name
                            </label>
                            <input
                              type="text"
                              name="editDepartmentName"
                              id="editDepartmentName"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              value={editDepartmentName}
                              onChange={(e) => setEditDepartmentName(e.target.value)}
                            />
                          </div>

                          <div>
                            <label htmlFor="departmentHead" className="block text-sm font-medium text-gray-700">
                              Department Head (Manager)
                            </label>
                            <Select.Root 
                              value={selectedDepartmentHeadId !== null ? String(selectedDepartmentHeadId) : "__NO_MANAGER__"} 
                              onValueChange={(value) => {
                                if (value === "__NO_MANAGER__") {
                                  setSelectedDepartmentHeadId(null);
                                } else {
                                  setSelectedDepartmentHeadId(value ? parseInt(value) : null);
                                }
                              }}
                            >
                              <Select.Trigger 
                                id="departmentHead"
                                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Department Head"
                              >
                                <Select.Value placeholder="Select a manager..." />
                                <Select.Icon>
                                  <CaretDown size={16} />
                                </Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content className="relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-gray-900 shadow-md animate-in fade-in-80">
                                  <Select.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
                                    <CaretUp size={16} />
                                  </Select.ScrollUpButton>
                                  <Select.Viewport className="p-1">
                                    <Select.Item value="__NO_MANAGER__" className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-indigo-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                                      <Select.ItemText>-- No Manager --</Select.ItemText>
                                    </Select.Item>
                                    {isLoadingManagers && <Select.Item value="loading" disabled className="text-sm text-gray-500 p-2">Loading managers...</Select.Item>}
                                    {managersError && <Select.Item value="error" disabled className="text-sm text-red-500 p-2">Error loading managers</Select.Item>}
                                    {managersData && managersData.map((manager) => (
                                      <Select.Item 
                                        key={manager.id} 
                                        value={String(manager.id)} 
                                        className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-indigo-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                      >
                                        <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                          <Check size={16} />
                                        </Select.ItemIndicator>
                                        <Select.ItemText>{manager.name} ({manager.email})</Select.ItemText>
                                      </Select.Item>
                                    ))}
                                  </Select.Viewport>
                                  <Select.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
                                    <CaretDown size={16} />
                                  </Select.ScrollDownButton>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          </div>

                          {editDepartmentError && (
                            <p className="text-sm text-red-600" id="edit-department-error">
                              {editDepartmentError}
                            </p>
                          )}
                          {updateDepartmentMutation.isError && (
                            <p className="text-sm text-red-600">
                              {(updateDepartmentMutation.error as Error)?.message || 'An unexpected error occurred.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                      <button
                        type="button"
                        className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                        onClick={handleEditDepartmentSave}
                        disabled={updateDepartmentMutation.isPending}
                      >
                        {updateDepartmentMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                        onClick={closeEditDepartmentModal}
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
      )}

      {/* Delete Department Modal */}
<Transition.Root show={isDeleteDepartmentModalOpen} as={Fragment}>
  <Dialog as="div" className="relative z-10" onClose={closeDeleteDepartmentModal}>
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
                  Delete Department: {deletingDepartment?.name}
                </Dialog.Title>
                <div className="mt-2">
                  {/* Optional: Display count of teams/employees if fetched in openDeleteDepartmentModal 
                  {deleteDepartmentTeamCountLoading ? (
                    <p className="text-sm text-gray-500">Loading related item count...</p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      This department has {deleteDepartmentTeamCount} team(s).
                    </p>
                  )}
                  */}
                  <p className="text-sm text-gray-500">
                    Are you sure you want to permanently delete this department? This action cannot be undone.
                  </p>
                </div>
                {deleteDepartmentError && ( // Uses your state
                  <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-md text-left">
                     <WarningCircle size={18} className="inline mr-2" /> {deleteDepartmentError}
                  </div>
                )}
                {deleteDepartmentSuccessMessage && ( // Uses your state
                  <div className="mt-3 p-3 bg-green-50 text-green-700 text-sm rounded-md text-left">
                    <CheckCircle size={18} className="inline mr-2" /> {deleteDepartmentSuccessMessage}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50"
                onClick={handleDeleteDepartmentConfirm} // Uses your handler
                disabled={deleteDepartmentMutation.isPending || !!deleteDepartmentSuccessMessage /* Prevent multiple deletes while success message shows */}
              >
                {deleteDepartmentMutation.isPending ? 'Deleting...' : 'Delete Department'}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                onClick={closeDeleteDepartmentModal} // Uses your handler
                disabled={deleteDepartmentMutation.isPending}
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
