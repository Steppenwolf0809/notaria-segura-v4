// Cliente HTTP unificado (Axios) con manejo de auth y 401/403

import axios from 'axios';
import { API_BASE } from '../utils/apiConfig';

// Bandera local para evitar loops de refresh (si se habilita el flujo opcional)
let isRefreshing = false;

/**
 * handleUnauthorized:
 * - Limpia credenciales persistidas
 * - Log de seguridad
 * - Redirige a /login
 */
function handleUnauthorized() {
  try {
    // eslint-disable-next-line no-console
    console.warn('[AUTH]', '401/403 detectado → logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('notaria-auth-storage'); // persist de Zustand
  } catch {}
  try {
    window.location.assign('/login');
  } catch {}
}

// Instancia principal
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request: agrega Authorization si hay token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Fallback para proyectos previos (persist de Zustand)
      const raw = localStorage.getItem('notaria-auth-storage');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const t = parsed?.state?.token;
          if (t) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${t}`;
          }
        } catch {}
      }
    }
    // Log no intrusivo
    // eslint-disable-next-line no-console
    console.debug('[HTTP][REQ]', { url: config.url, hasAuth: !!(config.headers?.Authorization) });
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: maneja 401/403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      // Flujo opcional de refresh (comentado por defecto):
      // const refreshToken = localStorage.getItem('refreshToken');
      // if (refreshToken && !isRefreshing) {
      //   isRefreshing = true;
      //   try {
      //     const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${refreshToken}` }});
      //     const newToken = res?.data?.data?.token;
      //     if (newToken) {
      //       localStorage.setItem('token', newToken);
      //       isRefreshing = false;
      //       // Repetir req original con nuevo token
      //       const cfg = error.config;
      //       cfg.headers = cfg.headers || {};
      //       cfg.headers.Authorization = `Bearer ${newToken}`;
      //       return apiClient(cfg);
      //     }
      //   } catch (e) {
      //     // Falló refresh → logout
      //   } finally {
      //     isRefreshing = false;
      //   }
      // }
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default apiClient;