import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '@clerk/clerk-react';

// Mirroring the structure from backend/src/routes/users.ts -> getCurrentUser responseData
// And frontend/src/pages/UserHomePage.tsx -> EmployeeSelfProfile & Meeting
type EmployeeSelfProfile = {
  id: number;
  name: string;
  title: string;
  email: string;
  startDate: string;
  country?: string;
  phone?: string;
  team?: {
    id: number;
    name: string;
    department: string;
  };
  healthScore?: number;
  // Add other fields from Employee model if they are included and needed
};

export interface Meeting {
  id: number;
  title: string | null;
  scheduledTime: string;
  platform: string | null;
  status: string;
  // Add other fields from Meeting model if they are included and needed
}

export interface AppUser {
  id: number;
  email: string;
  name: string | null;
  clerkId: string | null;
  createdAt: string; // Assuming string from JSON, can be Date if transformed
  updatedAt: string; // Assuming string from JSON, can be Date if transformed
  role: 'ADMIN' | 'MANAGER' | 'USER' | null; // Application-specific role
  hasGoogleAuth: boolean;
  hasZoomAuth: boolean;
  employeeProfile: EmployeeSelfProfile | null;
  meetings: Meeting[];
}

interface AppContextType {
  currentUser: AppUser | null;
  isLoadingUser: boolean;
  errorLoadingUser: string | null;
  refetchUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, getToken, isLoaded: isClerkLoaded } = useAuth();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [errorLoadingUser, setErrorLoadingUser] = useState<string | null>(null);

  const fetchAppData = useCallback(async () => {
    // Only fetch if Clerk is loaded and user is signed in
    if (!isClerkLoaded || !isSignedIn) {
      setCurrentUser(null);
      setIsLoadingUser(false); // Not loading if not signed in or Clerk not ready
      return;
    }

    console.log('[AppContext] Clerk is loaded and user is signed in. Fetching app data...');
    setIsLoadingUser(true);
    setErrorLoadingUser(null);
    try {
      // apiClient should have token getter set by NavigationSetup in App.tsx
      const response = await apiClient.get<AppUser>('/users/me');
      setCurrentUser(response.data);
      console.log('[AppContext] App data fetched successfully:', response.data?.role);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error during fetch';
      console.error("[AppContext] Failed to fetch current user app data. Error:", errorMessage);
      console.error("[AppContext] Full error object:", error);
      setErrorLoadingUser(errorMessage);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, [isSignedIn, getToken, isClerkLoaded]); // Dependencies for useCallback

  useEffect(() => {
    // Initial fetch when component mounts and whenever auth state changes
    fetchAppData();
  }, [fetchAppData]); // fetchAppData is memoized by useCallback

  return (
    <AppContext.Provider value={{ currentUser, isLoadingUser, errorLoadingUser, refetchUser: fetchAppData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 