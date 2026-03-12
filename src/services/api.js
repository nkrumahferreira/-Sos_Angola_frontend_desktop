/**
 * Cliente HTTP para a API SOS Angola (backend).
 * Base URL: VUE_APP_API_BASE_URL + /api/v1
 * Interceptors: envio do token Bearer e tratamento de 401.
 */
import axios from 'axios';

const baseURL = process.env.VUE_APP_API_BASE_URL
  ? `${process.env.VUE_APP_API_BASE_URL.replace(/\/$/, '')}/api/v1`
  : 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request: adicionar token de autoridade às requisições autenticadas
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: em 401, limpar sessão e redirecionar para login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRoute = error.config?.url?.includes('/auth/autoridade/login');
      if (!isLoginRoute) {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        localStorage.removeItem('userid');
        const path = window.location.pathname || '/';
        if (!path.startsWith('/login') && !path.startsWith('/forgot-password')) {
          window.location.href = `/login?redirectFrom=${encodeURIComponent(path)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
