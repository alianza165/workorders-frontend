// utils/api.ts
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Add request interceptor to include token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;