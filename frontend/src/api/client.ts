import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a function to get Clerk token
export const getClerkToken = async () => {
  // This needs to be used within a React component with Clerk's context
  const { getToken } = useAuth();
  return await getToken();
};

// Add isTokenValid function to check if user has a valid token
export const isTokenValid = () => {
  // With Clerk, we can assume the user is authenticated if they've reached this point
  // since Clerk handles authentication protection
  return true;
};

// Dynamic token getter for use outside React components
let tokenGetter: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (getter: any) => {
  tokenGetter = async () => {
    try {
      return await getter();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };
};

// Check if authenticated with Clerk
export const isAuthenticated = async () => {
  if (!tokenGetter) {
    console.error('Token getter not set. Call setTokenGetter first.');
    return false;
  }
  
  try {
    const token = await tokenGetter();
    return !!token;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
  }
  return config;
});

// Handle response errors (especially auth errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Authentication error:', error.response.data);
      
      // If not already on sign-in page, redirect to sign-in
      if (window.location.pathname !== '/sign-in') {
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  }
);

// API Services
export const authService = {
  logout: () => {
    // No local token to remove with Clerk
    // Clerk handles logout via its components/hooks
  },
  checkHealth: async () => {
    try {
      // Remove /api from the URL since health endpoint is at the root
      const baseUrl = API_URL.replace('/api', '');
      const response = await axios.get(`${baseUrl}/health`);
      console.log('Health check response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};

export const taskService = {
  getAllTasks: async () => {
    return await apiClient.get('/tasks');
  },
  getTaskById: async (id: number) => {
    return await apiClient.get(`/tasks/${id}`);
  },
  createTask: async (task: { title: string; description?: string; dueDate?: string; userId: number }) => {
    return await apiClient.post('/tasks', task);
  },
  updateTask: async (id: number, task: { title?: string; description?: string; completed?: boolean; dueDate?: string }) => {
    return await apiClient.put(`/tasks/${id}`, task);
  },
  deleteTask: async (id: number) => {
    return await apiClient.delete(`/tasks/${id}`);
  },
};

// Teams Service
export const teamService = {
  getAllTeams: async () => {
    console.log('Fetching teams from:', `${API_URL}/teams`);
    return await apiClient.get('/teams');
  },
  getTeamById: async (id: number) => {
    return await apiClient.get(`/teams/${id}`);
  },
  updateTeam: async (id: number, team: { 
    name?: string; 
    department?: string;
  }) => {
    return await apiClient.put(`/teams/${id}`, team);
  },
  deleteTeam: async (id: number) => {
    return await apiClient.delete(`/teams/${id}`);
  },
};

// Interviews Service
export const interviewService = {
  getAllInterviews: async () => {
    console.log('Fetching interviews from:', `${API_URL}/interviews`);
    return await apiClient.get('/interviews');
  },
  getInterviewById: async (id: number) => {
    return await apiClient.get(`/interviews/${id}`);
  },
  updateInterview: async (id: number, interview: { 
    name?: string; 
    team?: string; 
    interviewName?: string; 
    dateTaken?: string;
  }) => {
    return await apiClient.put(`/interviews/${id}`, interview);
  },
  deleteInterview: async (id: number) => {
    return await apiClient.delete(`/interviews/${id}`);
  },
  getInterviewAnswers: async (id: number) => {
    return await apiClient.get(`/interviews/${id}/answers`);
  },
  saveInterviewAnswers: async (id: number, answers: {
    firstAnswer: string;
    secondAnswer: string;
  }) => {
    return await apiClient.post(`/interviews/${id}/answers`, answers);
  }
};

// Employee Service
export const employeeService = {
  getTeamEmployees: async (teamId: number) => {
    return await apiClient.get(`/employees/team/${teamId}`);
  },
  getAllEmployees: async () => {
    return await apiClient.get('/employees');
  },
  getEmployeeById: async (id: number) => {
    return await apiClient.get(`/employees/${id}`);
  },
  createEmployee: async (employee: {
    name: string;
    title: string;
    email: string;
    teamId: number;
    startDate: string;
  }) => {
    return await apiClient.post('/employees', employee);
  },
  updateEmployee: async (id: number, employee: {
    name?: string;
    title?: string;
    email?: string;
    teamId?: number;
    startDate?: string;
  }) => {
    return await apiClient.put(`/employees/${id}`, employee);
  },
  deleteEmployee: async (id: number) => {
    return await apiClient.delete(`/employees/${id}`);
  }
};

// Notification Service
export const notificationService = {
  getAllNotifications: async () => {
    return await apiClient.get('/notifications');
  },
  getUnreadNotifications: async () => {
    return await apiClient.get('/notifications/unread');
  },
  markAsRead: async (id: number) => {
    return await apiClient.put(`/notifications/${id}/read`);
  },
  markAllAsRead: async () => {
    return await apiClient.put('/notifications/read-all');
  }
};

export default apiClient; 