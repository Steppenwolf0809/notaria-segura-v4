// Cliente HTTP unificado (Axios) con manejo de auth, CSRF y XSS protection

import axios from 'axios';
import { API_BASE } from '../utils/apiConfig';
import { sanitizeObject } from '../utils/sanitize.jsx';

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
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('notaria-auth-storage'); // persist de Zustand
  } catch { }
  try {
    window.location.assign('/login');
  } catch { }
}

// Instancia principal
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true, // CRÍTICO: Necesario para enviar cookies CSRF al servidor
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de request: agrega Authorization y CSRF token si es necesario
apiClient.interceptors.request.use(
  async (config) => {
    // PRIORIDAD 1: Token en Zustand (siempre más actual después del login)
    let tokenToUse = null;
    const raw = localStorage.getItem('notaria-auth-storage');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        tokenToUse = parsed?.state?.token;
      } catch { }
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
      } catch { }
    }

    // Agregar token a headers si existe
    if (tokenToUse) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${tokenToUse}`;
    }

    // CSRF Protection: Agregar CSRF token para requests que modifican datos
    const method = config.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      try {
        // Dynamic import to avoid circular dependency
        const { default: csrfService } = await import('./csrf-service');
        if (csrfService && typeof csrfService.getToken === 'function') {
          const csrfToken = await csrfService.getToken();
          config.headers = config.headers || {};
          config.headers['x-csrf-token'] = csrfToken;
          // eslint-disable-next-line no-console
          console.debug('[CSRF] Token agregado a request', { url: config.url, method });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[CSRF] Error al obtener token (continuando sin él):', error);
      }
    }

    // Log no intrusivo
    // eslint-disable-next-line no-console
    console.debug('[HTTP][REQ]', { url: config.url, hasAuth: !!tokenToUse, method });
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: sanitiza datos y maneja errores de autenticación
apiClient.interceptors.response.use(
  (response) => {
    // XSS Protection: Sanitizar datos de respuesta antes de llegar a componentes
    // IMPORTANTE: NO sanitizar blobs (PDFs, ZIPs, etc.) ni ArrayBuffers
    const isBinaryData = response.data instanceof Blob ||
      response.data instanceof ArrayBuffer ||
      response.config?.responseType === 'blob' ||
      response.config?.responseType === 'arraybuffer';

    if (response.data && typeof response.data === 'object' && !isBinaryData) {
      try {
        // Sanitizar todo el objeto de respuesta
        response.data = sanitizeObject(response.data);
        // eslint-disable-next-line no-console
        console.debug('[XSS] Respuesta sanitizada', { url: response.config.url });
      } catch (error) {
        // eslint-disable-next-line no-console
        // Continuar sin sanitización si falla (mejor que bloquear la app)
      }
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config;

    // ✅ MANEJO DE 401 (Token Expirado o Inválido)
    if (status === 401) {
      // eslint-disable-next-line no-console
      console.warn('[AUTH] 401 Unauthorized detectado', {
        url: originalRequest?.url,
        method: originalRequest?.method
      });

      // ✅ Intentar refresh automático (si no estamos ya refrescando)
      if (!isRefreshing && !originalRequest._retry) {
        isRefreshing = true;
        originalRequest._retry = true; // Marcar para evitar loops

        try {
          // Obtener el token actual de Zustand o localStorage
          let currentToken = null;
          const raw = localStorage.getItem('notaria-auth-storage');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              currentToken = parsed?.state?.token;
            } catch { }
          }

          if (!currentToken) {
            currentToken = localStorage.getItem('token');
          }

          if (!currentToken) {
            // eslint-disable-next-line no-console
            console.error('[AUTH] No hay token para refrescar, forzando logout');
            handleUnauthorized();
            return Promise.reject(error);
          }

          // eslint-disable-next-line no-console
          console.log('[AUTH] Intentando refrescar token...');

          // Intentar refresh (usando axios directo para evitar el interceptor)
          const response = await axios.post(`${API_BASE}/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${currentToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          const newToken = response?.data?.data?.token || response?.data?.token;

          if (newToken) {
            // esl�-disable-next-line no-console
            console.log('[AUTH] ✅ Token refrescado exitosamente');

            // ✅ Actualizar token en TODOS los storages
            localStorage.setItem('token', newToken);

            // Actualizar en Zustand si existe
            try {
              const zustandRaw = localStorage.getItem('notaria-auth-storage');
              if (zustandRaw) {
                const zustandData = JSON.parse(zustandRaw);
                if (zustandData && zustandData.state) {
                  zustandData.state.token = newToken;
                  localStorage.setItem('notaria-auth-storage', JSON.stringify(zustandData));
                }
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn('[AUTH] No se pudo actualizar Zustand store', e);
            }

            // ✅ Reintentar request original con el nuevo token
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            isRefreshing = false;
            return apiClient(originalRequest);
          } else {
            throw new Error('No se recibió nuevo token en la respuesta');
          }
        } catch (refreshError) {
          // ❌ Falló el refresh → Logout forzado
          isRefreshing = false;
          // eslint-disable-next-line no-console
          console.error('[AUTH] ❌ Refresh falló, forzando logout:', refreshError.message);
          handleUnauthorized();
          return Promise.reject(refreshError);
        }
      } else if (isRefreshing) {
        // Si ya estamos refrescando, esperar un momento y rechazar
        // eslint-disable-next-line no-console
        console.warn('[AUTH] Ya hay un refresh en progreso, rechazando request');
      }

      // Si llegamos aquí y no pudimos refrescar, logout
      handleUnauthorized();
    }

    // ✅ MANEJO DE 403 (Forbidden - Permisos insuficientes)
    // No forzar logout, dejar que la UI maneje permisos
    if (status === 403) {
      // eslint-disable-next-line no-console
      console.warn('[AUTH] 403 Forbidden - Usuario sin permisos suficientes', {
        url: originalRequest?.url
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;