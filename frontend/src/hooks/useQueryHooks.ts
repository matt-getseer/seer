import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, teamService, interviewService } from '../api/client';
import { AxiosError } from 'axios';

/**
 * React Query-based hooks for API data fetching with optimized caching and state management
 */

// Employee hooks
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeeService.getAllEmployees();
      return response.data;
    }
  });
}

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await employeeService.getEmployeeById(id);
      return response.data;
    },
    enabled: !!id, // Only run query if id is provided
  });
}

export function useTeamEmployees(teamId: number | null) {
  return useQuery({
    queryKey: ['employees', 'team', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const response = await employeeService.getTeamEmployees(teamId);
      return response.data;
    },
    enabled: !!teamId, // Only run query if teamId is provided
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  
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
      // Invalidate relevant queries to trigger refetching
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: AxiosError) => {
      console.error('Error creating employee:', error);
    }
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  
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
      // Invalidate relevant queries to trigger refetching
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'team'] });
    }
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await employeeService.deleteEmployee(id);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to trigger refetching
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'team'] });
    }
  });
}

// Team hooks
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamService.getAllTeams();
      return response.data;
    }
  });
}

export function useTeam(id: number | null) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await teamService.getTeamById(id);
      return response.data;
    },
    enabled: !!id, // Only run query if id is provided
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
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
      // Invalidate relevant queries to trigger refetching
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', variables.id] });
    }
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await teamService.deleteTeam(id);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to trigger refetching
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });
}

// Interview hooks
export function useInterviews() {
  return useQuery({
    queryKey: ['interviews'],
    queryFn: async () => {
      const response = await interviewService.getAllInterviews();
      return response.data;
    }
  });
}

export function useInterview(id: number | null) {
  return useQuery({
    queryKey: ['interview', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await interviewService.getInterviewById(id);
      return response.data;
    },
    enabled: !!id, // Only run query if id is provided
  });
}

export function useInterviewAnswers(id: number | null) {
  return useQuery({
    queryKey: ['interview', id, 'answers'],
    queryFn: async () => {
      if (!id) return null;
      const response = await interviewService.getInterviewAnswers(id);
      return response.data;
    },
    enabled: !!id, // Only run query if id is provided
  });
}

export function useSaveInterviewAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, answers }: {
      id: number;
      answers: {
        firstAnswer: string;
        secondAnswer: string;
      }
    }) => {
      const response = await interviewService.saveInterviewAnswers(id, answers);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger refetching
      queryClient.invalidateQueries({ queryKey: ['interview', variables.id, 'answers'] });
    }
  });
} 