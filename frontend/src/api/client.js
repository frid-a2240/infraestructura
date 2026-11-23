import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('isp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('isp_token');
      localStorage.removeItem('isp_usuario');
      const login = `${import.meta.env.BASE_URL}login`;
      if (!window.location.pathname.startsWith(login)) {
        window.location.href = login;
      }
    }
    return Promise.reject(error);
  }
);
