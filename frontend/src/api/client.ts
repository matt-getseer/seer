import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create a simple cache for API responses
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class ApiCache {
  private cache: Record<string, CacheEntry> = {};
  private defaultExpiration = 5 * 60 * 1000; // 5 minutes in milliseconds

  get(key: string): any | null {
    const entry = this.cache[key];
    
    // If no entry or expired, return null
    if (!entry || Date.now() - entry.timestamp > entry.expiresIn) {
      if (entry) {
        // Clean up expired entry
        delete this.cache[key];
      }
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any, expiresIn: number = this.defaultExpiration): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
  }

  invalidate(key: string): void {
    delete this.cache[key];
  }

  invalidateByPrefix(prefix: string): void {
    Object.keys(this.cache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete this.cache[key];
      }
    });
  }
  
  clear(): void {
    this.cache = {};
  }
}

const apiCache = new ApiCache();

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

// Dynamic token getter for use outside React components
let tokenGetter: (() => Promise<string | null>) | null = null;
let tokenPromise: Promise<string | null> | null = null;
let tokenRefreshTimeout: NodeJS.Timeout | null = null;

export const setTokenGetter = (getter: any) => {
  tokenGetter = getter;
  
  // Clear existing timeout if any
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
    tokenRefreshTimeout = null;
  }
  
  // Reset the token promise
  tokenPromise = null;
};

// Get token with caching to prevent multiple simultaneous requests
const getToken = async (): Promise<string | null> => {
  if (!tokenGetter) {
    console.error('Token getter not initialized');
    return null;
  }

  // If a token request is already in progress, return the existing promise
  if (tokenPromise) {
    return tokenPromise;
  }

  // Create a new promise to get the token
  tokenPromise = (async () => {
    try {
      const token = await tokenGetter();
      
      // Set a timeout to refresh the token promise after 50 minutes
      // This ensures we don't keep using the same promise indefinitely
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
      
      tokenRefreshTimeout = setTimeout(() => {
        tokenPromise = null;
      }, 50 * 60 * 1000); // 50 minutes in milliseconds
      
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  })();

  return tokenPromise;
};

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  // For GET requests, check cache first
  if (config.method?.toLowerCase() === 'get' && !config.params?.skipCache) {
    const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
    const cachedData = apiCache.get(cacheKey);
    
    if (cachedData) {
      // Return early with cached data
      return {
        ...config,
        adapter: () => {
          return Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            cached: true
          });
        }
      };
    }
  }

  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // If no token available, redirect to sign-in
      window.location.href = '/sign-in';
      return Promise.reject('No authentication token available');
    }
  } catch (error) {
    console.error('Error getting token for request:', error);
    window.location.href = '/sign-in';
    return Promise.reject(error);
  }
  
  return config;
});

// Enhanced response handling interceptor with caching
apiClient.interceptors.response.use(
  (response) => {
    // Only cache GET requests
    if (response.config.method?.toLowerCase() === 'get' && !response.config.params?.skipCache) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      
      // Determine cache TTL based on the resource type
      let cacheTTL = 5 * 60 * 1000; // Default 5 minutes
      
      const url = response.config.url || '';
      
      // Cache different resources for different durations
      if (url.includes('/employees')) {
        cacheTTL = 10 * 60 * 1000; // 10 minutes for employees
      } else if (url.includes('/teams')) {
        cacheTTL = 15 * 60 * 1000; // 15 minutes for teams
      } else if (url.includes('/notifications')) {
        cacheTTL = 2 * 60 * 1000; // 2 minutes for notifications (more real-time)
      }
      
      // Store response in cache
      apiCache.set(cacheKey, response.data, cacheTTL);
    }
    
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle authentication errors
      if (status === 401 || status === 403) {
        console.error('Authentication error:', data);
        
        // Save the current path for redirect after login
        if (window.location.pathname !== '/sign-in') {
          localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
          window.location.href = '/sign-in';
        }
      }
      
      // Handle server errors
      if (status >= 500) {
        console.error('Server error:', data);
      }
      
      // Handle network errors
      if (!status) {
        console.error('Network error:', error.message);
      }
    }
    
    return Promise.reject(error);
  }
);

// Function to invalidate cache for specific endpoints
export const invalidateCache = (endpoint: string) => {
  apiCache.invalidateByPrefix(endpoint);
};

// API Services
export const authService = {
  logout: () => {
    // No local token to remove with Clerk
    // Clerk handles logout via its components/hooks
    
    // But we can clear the cache
    apiCache.clear();
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
    const response = await apiClient.post('/tasks', task);
    invalidateCache('/tasks');
    return response;
  },
  updateTask: async (id: number, task: { title?: string; description?: string; completed?: boolean; dueDate?: string }) => {
    const response = await apiClient.put(`/tasks/${id}`, task);
    invalidateCache('/tasks');
    return response;
  },
  deleteTask: async (id: number) => {
    const response = await apiClient.delete(`/tasks/${id}`);
    invalidateCache('/tasks');
    return response;
  },
};

// Teams Service
export const teamService = {
  getAllTeams: async (skipCache = false) => {
    console.log('Fetching teams, skipCache:', skipCache);
    return await apiClient.get('/teams', { params: { skipCache } });
  },
  getTeamById: async (id: number) => {
    return await apiClient.get(`/teams/${id}`);
  },
  updateTeam: async (id: number, team: { 
    name?: string; 
    department?: string;
  }) => {
    const response = await apiClient.put(`/teams/${id}`, team);
    invalidateCache('/teams');
    return response;
  },
  deleteTeam: async (id: number) => {
    const response = await apiClient.delete(`/teams/${id}`);
    invalidateCache('/teams');
    invalidateCache('/employees'); // Employees may reference teams
    return response;
  },
};

// Employee Service
export const employeeService = {
  getTeamEmployees: async (teamId: number) => {
    return await apiClient.get(`/employees/team/${teamId}`);
  },
  getAllEmployees: async (skipCache = false) => {
    console.log('Fetching employees, skipCache:', skipCache);
    return await apiClient.get('/employees', { params: { skipCache } });
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
    const response = await apiClient.post('/employees', employee);
    invalidateCache('/employees');
    return response;
  },
  updateEmployee: async (id: number, employee: {
    name?: string;
    title?: string;
    email?: string;
    teamId?: number;
    startDate?: string;
  }) => {
    const response = await apiClient.put(`/employees/${id}`, employee);
    invalidateCache('/employees');
    invalidateCache(`/employees/${id}`);
    return response;
  },
  deleteEmployee: async (id: number) => {
    const response = await apiClient.delete(`/employees/${id}`);
    invalidateCache('/employees');
    invalidateCache(`/employees/${id}`);
    return response;
  }
};

// Meeting Service
export const meetingService = {
  // Fetch all meetings for the logged-in user
  getAllMeetings: async (skipCache = false) => {
    console.log('Fetching meetings, skipCache:', skipCache);
    return await apiClient.get('/meetings', { params: { skipCache } });
  },

  // Fetch details for a specific meeting by ID
  getMeetingById: async (meetingId: number | string, skipCache = false) => {
    console.log(`Fetching meeting details for ID: ${meetingId}, skipCache: ${skipCache}`);
    return await apiClient.get(`/meetings/${meetingId}`, { params: { skipCache } });
  },

  // Invite bot to record a meeting
  recordMeeting: async (data: { meetingUrl: string; employeeId: number; title?: string }) => {
    console.log('Sending request to record meeting:', data.meetingUrl);
    // Invalidate meeting list cache after requesting a new recording
    invalidateCache('/meetings'); 
    return await apiClient.post('/meetings/record', data);
  },
};

export default apiClient;