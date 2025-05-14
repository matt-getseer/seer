import axios from 'axios';

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
// export const getClerkToken = async () => { ... function body ... };

// Dynamic token getter for use outside React components
let tokenGetter: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (getter: any) => {
  tokenGetter = getter;
};

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  // For GET requests, check cache first
  if (config.method?.toLowerCase() === 'get' && !config.params?.skipCache) {
    const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
    const cachedData = apiCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`[API Client] Cache hit for ${config.url}`);
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

  console.log(`[API Client] Interceptor for ${config.method?.toUpperCase()} ${config.url}`);
  try {
    if (!tokenGetter) {
        console.error('[API Client] Token getter not initialized before request to:', config.url);
        throw new Error('Token getter not initialized');
    }
    console.log('[API Client] Calling tokenGetter...');
    const token = await tokenGetter();
    
    if (token) {
      console.log('[API Client] Token successfully retrieved. Setting Authorization header for:', config.url);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[API Client] No authentication token available from tokenGetter for request to:', config.url);
      // If no token available, DO NOT redirect here. Request will proceed without Auth header.
      // Backend will handle if auth is required.
      // return Promise.reject(new Error('No authentication token available')); 
    }
  } catch (error) {
    console.error('[API Client] Error getting token for request to:', config.url, error);
    // DO NOT redirect here.
    // return Promise.reject(error); 
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
        console.error('Authentication error (401/403): Letting TanStack Query or component handle it.', data);
        // DO NOT redirect here.
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
    
    // IMPORTANT: Always reject the promise on error so callers (like TanStack Query) know it failed.
    return Promise.reject(error);
  }
);

// Function to invalidate cache for specific endpoints
export const invalidateCache = (endpoint: string) => {
  apiCache.invalidateByPrefix(endpoint);
};

// API Services

// User Service (NEW)
export const userService = {
  getMe: async (skipCache = false) => {
    console.log('Fetching current user info, skipCache:', skipCache);
    // Cache user info for a shorter duration, e.g., 1 minute
    return await apiClient.get('/users/me', { params: { skipCache } }); 
  }
};

// Remove authService
// export const authService = {
//   logout: () => {
//     ...
//   }
// };

// Remove taskService
// export const taskService = {
//   getAllTasks: async () => { ... },
//   getTaskById: async (id: number) => { ... },
//   createTask: async (task: ...) => { ... },
//   updateTask: async (id: number, task: ...) => { ... },
//   deleteTask: async (id: number) => { ... },
// };

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
  },
};

// Updated DTO for scheduling a meeting
interface ScheduleMeetingDTO {
  employeeId: number;
  description?: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  timeZone: string;
  meetingType: 'ONE_ON_ONE' | 'SIX_MONTH_REVIEW' | 'TWELVE_MONTH_REVIEW';
  platform?: 'Google Meet' | 'Zoom'; // Added optional platform
}

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

  // Schedule a meeting via selected platform and invite bot
  scheduleMeeting: async (data: ScheduleMeetingDTO) => {
    console.log(`Sending request to schedule meeting via platform: ${data.platform || 'Google Meet (default)'}`);
    // Invalidate relevant caches
    invalidateCache('/meetings'); // Invalidate general meeting list
    invalidateCache(`/employees/${data.employeeId}/meetings`); // Invalidate employee-specific list
    // Consider invalidating /users/me if meeting counts/etc. are shown there
    // invalidateCache('/users/me'); 
    return await apiClient.post('/meetings/schedule', data);
  },

  // Fetch meetings for a specific employee (for the logged-in manager)
  getMeetingsByEmployeeId: async (employeeId: number, skipCache = false) => {
    console.log(`Fetching meetings for employee ID: ${employeeId}, skipCache: ${skipCache}`);
    // Note: Cache key includes employeeId to avoid conflicts
    const cacheKey = `/employees/${employeeId}/meetings`; // Make cache key more specific
    return await apiClient.get(cacheKey, { params: { skipCache } });
  }
};

export default apiClient;