import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Check if token is valid
export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('token'); // Remove expired token
      return false;
    }
    return true;
  } catch (error) {
    console.error('Invalid token:', error);
    localStorage.removeItem('token'); // Remove invalid token
    return false;
  }
};

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
      
      // Dispatch auth state change event
      window.dispatchEvent(new Event('auth-state-change'));
      
      // If not already on login page, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Services
export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/users/login', { email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },
  register: async (email: string, name: string, password: string) => {
    return await apiClient.post('/users/register', { email, name, password });
  },
  logout: () => {
    localStorage.removeItem('token');
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

export default apiClient; 