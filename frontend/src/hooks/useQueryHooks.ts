import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { employeeService, teamService, meetingService } from '../api/client';
import { AxiosError } from 'axios';
import { useOrganization } from '@clerk/clerk-react';

/**
 * React Query-based hooks for API data fetching with optimized caching and state management
 */

// Define a generic type for the options to make it cleaner
type QueryHookOptions<TData = unknown, TError = unknown> = Omit<
  UseQueryOptions<TData, TError>,
  'queryKey' | 'queryFn' | 'enabled'
>;

// Employee hooks
export function useEmployees<TData = any, TError = unknown>(
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const enabled = isOrgLoaded && !!organization;

  return useQuery<TData, TError>({
    queryKey: ['employees', organization?.id],
    queryFn: async () => {
      console.log('RQ: Fetching employees...');
      const response = await employeeService.getAllEmployees();
      return response.data;
    },
    enabled: enabled,
    ...options,
  });
}

export function useEmployee(id: number | null) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const enabled = isOrgLoaded && !!organization && !!id;

  return useQuery({
    queryKey: ['employee', id, organization?.id],
    queryFn: async () => {
      if (!id) return null;
      console.log(`RQ: Fetching employee ${id}...`);
      const response = await employeeService.getEmployeeById(id);
      return response.data;
    },
    enabled: enabled,
  });
}

export function useTeamEmployees(teamId: number | null) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const enabled = isOrgLoaded && !!organization && !!teamId;

  return useQuery({
    queryKey: ['employees', 'team', teamId, organization?.id],
    queryFn: async () => {
      if (!teamId) return [];
      console.log(`RQ: Fetching employees for team ${teamId}...`);
      const response = await employeeService.getTeamEmployees(teamId);
      return response.data;
    },
    enabled: enabled,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  
  return useMutation({
    mutationFn: async (employee: {
      name: string;
      title: string;
      email: string;
      teamId: number;
      startDate: string;
    }) => {
      const response = await employeeService.createEmployee(employee);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', organization?.id] });
    },
    onError: (error: AxiosError) => {
      console.error('Error creating employee:', error);
    }
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: number;
      data: {
        name?: string;
        title?: string;
        email?: string;
        teamId?: number;
        startDate?: string;
      }
    }) => {
      const response = await employeeService.updateEmployee(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id, organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'team', undefined, organization?.id] });
    }
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await employeeService.deleteEmployee(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'team', undefined, organization?.id] });
    }
  });
}

// Team hooks
export function useTeams<TData = any, TError = unknown>(
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const enabled = isOrgLoaded && !!organization;

  return useQuery<TData, TError>({
    queryKey: ['teams', organization?.id],
    queryFn: async () => {
      console.log('RQ: Fetching teams...');
      const response = await teamService.getAllTeams();
      return response.data;
    },
    enabled: enabled,
    ...options,
  });
}

export function useTeam(id: number | null) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const enabled = isOrgLoaded && !!organization && !!id;

  return useQuery({
    queryKey: ['team', id, organization?.id],
    queryFn: async () => {
      if (!id) return null;
      console.log(`RQ: Fetching team ${id}...`);
      const response = await teamService.getTeamById(id);
      return response.data;
    },
    enabled: enabled,
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: number;
      data: {
        name?: string;
        department?: string;
      }
    }) => {
      const response = await teamService.updateTeam(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['team', variables.id, organization?.id] });
    }
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await teamService.deleteTeam(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['employees', organization?.id] });
    }
  });
}

// Meeting hooks
export function useMeetings<TData = any, TError = unknown>(
  options?: QueryHookOptions<TData, TError>
) {
  const { isLoaded: isOrgLoaded, organization } = useOrganization();
  const enabled = isOrgLoaded && !!organization;

  return useQuery<TData, TError>({
    queryKey: ['meetings', organization?.id],
    queryFn: async () => {
      console.log('RQ: Fetching meetings...');
      const response = await meetingService.getAllMeetings();
      return response.data;
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
  const id = meetingId ? (typeof meetingId === 'string' ? parseInt(meetingId) : meetingId) : null;
  const enabled = isOrgLoaded && !!organization && !!id;

  return useQuery<TData, TError>({
    queryKey: ['meeting', id, organization?.id],
    queryFn: async () => {
      if (!id) return null;
      console.log(`RQ: Fetching meeting ${id}...`);
      const response = await meetingService.getMeetingById(id);
      return response.data;
    },
    enabled: enabled,
    ...options,
  });
}

export function useScheduleMeeting() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  return useMutation({
    mutationFn: meetingService.scheduleMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', organization?.id] });
    },
  });
}

export function useRecordMeeting() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  return useMutation({
    mutationFn: meetingService.recordMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', organization?.id] });
    },
  });
}