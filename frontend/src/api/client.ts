import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export default apiClient; 