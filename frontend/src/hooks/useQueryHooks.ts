import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { employeeService, teamService, meetingService } from '../api/client';
import { useOrganization, useAuth } from '@clerk/clerk-react';

/**
 * React Query-based hooks for API data fetching with optimized caching and state management
 */

// Helper function for robust queryFn error handling
async function handleQueryFnError(err: any, resourceName: string): Promise<never> {
  console.error(`Caught error within queryFn for ${resourceName}:`, err);
  if (err.isAxiosError) {
    const axiosError = err as import('axios').AxiosError;
    const status = axiosError.response?.status || 'Axios Error';
    let detail = axiosError.message;
    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const errorData = axiosError.response.data as any;
        detail = errorData.message || errorData.detail || JSON.stringify(errorData);
    } else if (axiosError.response?.data) {
        detail = String(axiosError.response.data);
    }
    throw new Error(`Failed to fetch ${resourceName}. Status: ${status}. Detail: ${detail}`);
  }
  else if (err instanceof Error) { throw err; }
  else { throw new Error(String(err || `An unknown error occurred fetching ${resourceName}`)); }
}

// Helper function to process API response
async function processApiResponse<TData>(response: any, resourceName: string): Promise<TData> {
  if (!response || response.status < 200 || response.status >= 300) {
    console.error(`Error fetching ${resourceName}, status:`, response?.status, response);
    let detail = 'No error body';
    if (response?.data && typeof response.data === 'object') {
       detail = (response.data as any).message || (response.data as any).detail || JSON.stringify(response.data);
    }
    throw new Error(`Failed to fetch ${resourceName}. Status: ${response?.status || 'unknown'}. Detail: ${detail}`);
  }
  if (typeof response.data === 'undefined') {
    console.error(`Error fetching ${resourceName}: No data property in response`, response);
    throw new Error(`No data received in ${resourceName} response.`);
  }
  return response.data as TData;
}

// Define a generic type for the options to make it cleaner
type QueryHookOptions<TData = unknown, TError = unknown> = Omit<
  UseQueryOptions<TData, TError>,
  'queryKey' | 'queryFn'
>;

// Employee hooks
export function useEmployees<TData = any, TError = unknown>(
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const enabled = isOrgLoaded && isAuthLoaded && !!organization && isSignedIn;

  return useQuery<TData, TError>({
    queryKey: ['employees', organization?.id],
    queryFn: async () => {
      console.log('RQ: Fetching employees...');
      try {
        const response = await employeeService.getAllEmployees();
        return await processApiResponse<TData>(response, 'employees');
      } catch (err) {
        return handleQueryFnError(err, 'employees');
      }
    },
    enabled: enabled,
    ...options,
  });
}

export function useEmployee<TData = any, TError = unknown>(id: number | null) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const enabled = isOrgLoaded && isAuthLoaded && !!organization && !!id && isSignedIn;
  const queryKey = ['employee', id, organization?.id];

  return useQuery<TData, TError>({
    queryKey: queryKey,
    queryFn: async () => {
      console.log(`RQ: Fetching employee ${id}...`);
      try {
        const response = await employeeService.getEmployeeById(id!);
        return await processApiResponse<TData>(response, `employee ${id}`);
      } catch (err) {
        return handleQueryFnError(err, `employee ${id}`);
      }
    },
    enabled: enabled,
  });
}

// Team hooks
export function useTeams<TData = any, TError = unknown>(
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const enabled = isOrgLoaded && isAuthLoaded && !!organization && isSignedIn;

  return useQuery<TData, TError>({
    queryKey: ['teams', organization?.id],
    queryFn: async () => {
      console.log('RQ: Fetching teams...');
      try {
        const response = await teamService.getAllTeams();
        return await processApiResponse<TData>(response, 'teams');
      } catch (err) {
        return handleQueryFnError(err, 'teams');
      }
    },
    enabled: enabled,
    ...options,
  });
}

// Meeting hooks
export function useMeetings<TData = any, TError = unknown>(
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const enabled = isOrgLoaded && isAuthLoaded && !!organization && isSignedIn;

  return useQuery<TData, TError>({
    queryKey: ['meetings', organization?.id],
    queryFn: async () => {
      console.log('RQ: Fetching meetings...');
      try {
        const response = await meetingService.getAllMeetings();
        return await processApiResponse<TData>(response, 'meetings');
      } catch (err) {
        return handleQueryFnError(err, 'meetings');
      }
    },
    enabled: enabled,
    ...options,
  });
}

export function useMeeting<TData = any, TError = unknown>(
  meetingId: number | string | null | undefined,
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const id = meetingId ? (typeof meetingId === 'string' ? parseInt(meetingId, 10) : meetingId) : null;
  const enabled = isOrgLoaded && isAuthLoaded && !!organization && !!id && isSignedIn;
  const queryKey = ['meeting', id, organization?.id];

  return useQuery<TData, TError>({
    queryKey: queryKey,
    queryFn: async () => {
      console.log(`RQ: Fetching meeting ${id}...`);
      try {
        const response = await meetingService.getMeetingById(id!);
        return await processApiResponse<TData>(response, `meeting ${id}`);
      } catch (err) {
        return handleQueryFnError(err, `meeting ${id}`);
      }
    },
    enabled: enabled,
    ...options,
  });
}

// Fetch meetings associated with a specific employee ID
export function useEmployeeMeetings<TData = any, TError = unknown>(
  employeeId: number | null | undefined,
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const id = employeeId ? (typeof employeeId === 'string' ? parseInt(employeeId, 10) : employeeId) : null;
  const enabled = isOrgLoaded && isAuthLoaded && !!organization && !!id && isSignedIn;
  // Use a distinct query key including the employee ID
  const queryKey = ['meetings', 'employee', id, organization?.id];

  return useQuery<TData, TError>({
    queryKey: queryKey,
    queryFn: async () => {
      console.log(`RQ: Fetching meetings for employee ${id}...`);
      try {
        const response = await meetingService.getMeetingsByEmployeeId(id!);
        return await processApiResponse<TData>(response, `meetings for employee ${id}`);
      } catch (err) {
        return handleQueryFnError(err, `meetings for employee ${id}`);
      }
    },
    enabled: enabled,
    ...options,
  });
}