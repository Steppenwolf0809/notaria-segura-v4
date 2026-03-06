// Cliente HTTP unificado (Axios) con manejo de auth JWT, CSRF y XSS protection

import axios from 'axios';
import { API_BASE } from '../utils/apiConfig';
import { sanitizeObject } from '../utils/sanitize.jsx';

// Instancia principal
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request: agrega Authorization (JWT) y CSRF token
apiClient.interceptors.request.use(
  async (config) => {
    // Obtener token de localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF Protection para requests que modifican datos
    const method = config.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      try {
        const { default: csrfService } = await import('./csrf-service');
        if (csrfService && typeof csrfService.getToken === 'function') {
          const csrfToken = await csrfService.getToken();
          config.headers = config.headers || {};
          config.headers['x-csrf-token'] = csrfToken;
        }
      } catch (error) {
        console.warn('[CSRF] Error al obtener token (continuando sin el):', error);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: sanitiza datos y maneja errores
apiClient.interceptors.response.use(
  (response) => {
    // XSS Protection: Sanitizar datos de respuesta
    const isBinaryData = response.data instanceof Blob ||
      response.data instanceof ArrayBuffer ||
      response.config?.responseType === 'blob' ||
      response.config?.responseType === 'arraybuffer';

    if (response.data && typeof response.data === 'object' && !isBinaryData) {
      try {
        response.data = sanitizeObject(response.data);
      } catch (error) {
        // Continuar sin sanitizacion si falla
      }
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      // Token invalido o expirado — limpiar y redirigir a login
      localStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    if (status === 403) {
      const code = error?.response?.data?.code;
      if (code === 'PENDING_APPROVAL') {
        console.warn('[AUTH] 403 - Usuario pendiente de aprobacion');
      } else {
        console.warn('[AUTH] 403 Forbidden - Permisos insuficientes');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
