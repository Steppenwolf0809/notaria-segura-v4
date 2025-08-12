/**
 * Configuración automática de API URL para desarrollo y producción
 */

export const getApiBaseUrl = () => {
  // Si estamos en producción (no localhost), usar rutas relativas
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  
  // En desarrollo, usar la variable de entorno o fallback a localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug: Log de la URL que se está usando
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', API_BASE_URL);
}