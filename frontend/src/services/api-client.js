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
    // PRIORIDAD 1: Token en Zustand (siempre más actual después del login)
    let tokenToUse = null;
    const raw = localStorage.getItem('notaria-auth-storage');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        tokenToUse = parsed?.state?.token;
      } catch {}
    }
    
    // PRIORIDAD 2: Fallback a localStorage directo (por compatibilidad)
    if (!tokenToUse) {
      tokenToUse = localStorage.getItem('token');
    }
    
    // SINCRONIZACIÓN: Si encontramos token en Zustand, sincronizar en localStorage
    if (tokenToUse && raw) {
      try {
        const parsed = JSON.parse(raw);
        const zustandToken = parsed?.state?.token;
        const localToken = localStorage.getItem('token');
        
        // Si los tokens no coinciden, actualizar localStorage con el de Zustand
        if (zustandToken && zustandToken !== localToken) {
          localStorage.setItem('token', zustandToken);
        }
      } catch {}
    }
    
    // Agregar token a headers si existe
    if (tokenToUse) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${tokenToUse}`;
    }
    
    // Log no intrusivo
    // eslint-disable-next-line no-console
    console.debug('[HTTP][REQ]', { url: config.url, hasAuth: !!tokenToUse });
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