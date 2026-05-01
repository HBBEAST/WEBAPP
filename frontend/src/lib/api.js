import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL
    ? `${API_URL}/api`
    : 'https://webapp-production-7ce4.up.railway.app/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const signup = (data) => api.post('/auth/signup', data).then((r) => r.data);
export const login = (data) => api.post('/auth/login', data).then((r) => r.data);
export const getMe = () => api.get('/auth/me').then((r) => r.data);

// Dashboard
export const getDashboard = () => api.get('/dashboard').then((r) => r.data);

// Projects
export const getProjects = () => api.get('/projects').then((r) => r.data);
export const createProject = (data) => api.post('/projects', data).then((r) => r.data);
export const getProject = (id) => api.get(`/projects/${id}`).then((r) => r.data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then((r) => r.data);
export const addMember = (projectId, data) => api.post(`/projects/${projectId}/members`, data).then((r) => r.data);
export const removeMember = (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`).then((r) => r.data);

// Tasks
export const getTasks = (params) => api.get('/tasks', { params }).then((r) => r.data);
export const createTask = (data) => api.post('/tasks', data).then((r) => r.data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data).then((r) => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);

export default api;
