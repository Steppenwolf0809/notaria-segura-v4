import apiClient from './api-client.js';

/**
 * Servicio de autenticación
 * Con Clerk, la mayoría de operaciones de auth las maneja Clerk directamente.
 * Este servicio solo interactúa con el backend para perfil y datos de negocio.
 */
const authService = {
  /**
   * Obtener perfil del usuario autenticado desde el backend
   * El token de Clerk se agrega automáticamente por el interceptor de apiClient
   */
  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Verificar si el token es válido
   */
  verifyToken: async () => {
    try {
      const response = await apiClient.get('/auth/verify');
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Verificar estado de la API
   */
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Maneja errores de las peticiones HTTP
   */
  handleError: (error) => {
    if (error.response) {
      return {
        message: error.response.data?.message || 'Error del servidor',
        status: error.response.status,
        details: error.response.data
      };
    } else if (error.request) {
      return {
        message: 'Error de conexión - Verifique su internet o el servidor',
        status: 0,
        details: null
      };
    } else {
      return {
        message: error.message || 'Error inesperado',
        status: -1,
        details: null
      };
    }
  }
};

export default authService;
