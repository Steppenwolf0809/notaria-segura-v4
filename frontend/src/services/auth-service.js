import apiClient from './api-client.js';

// Nota: Usamos apiClient en lugar de una instancia privada de axios
// para que todas las peticiones incluyan automáticamente:
// - Token JWT de autorización
// - Token CSRF para métodos POST/PUT/PATCH/DELETE
// - Sanitización XSS de respuestas

/**
 * Servicio de autenticación
 * Maneja todas las peticiones relacionadas con autenticación
 */
const authService = {
  /**
   * Iniciar sesión
   * @param {Object} credentials - Credenciales de usuario
   * @param {string} credentials.email - Email del usuario
   * @param {string} credentials.password - Contraseña del usuario
   * @returns {Promise<Object>} Respuesta del servidor
   */
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Registrar nuevo usuario (solo ADMIN)
   * @param {Object} userData - Datos del nuevo usuario
   * @param {string} userData.email - Email del usuario
   * @param {string} userData.password - Contraseña del usuario
   * @param {string} userData.firstName - Nombre del usuario
   * @param {string} userData.lastName - Apellido del usuario
   * @param {string} userData.role - Rol del usuario
   * @param {string} token - Token JWT del administrador
   * @returns {Promise<Object>} Respuesta del servidor
   */
  register: async (userData, token) => {
    try {
      const response = await apiClient.post('/auth/register', userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Obtener perfil del usuario autenticado
   * @param {string} token - Token JWT
   * @returns {Promise<Object>} Datos del usuario
   */
  getProfile: async (token) => {
    try {
      const response = await apiClient.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Refrescar token JWT
   * @param {string} token - Token JWT actual
   * @returns {Promise<Object>} Nuevo token
   */
  refreshToken: async (token) => {
    try {
      const response = await apiClient.post('/auth/refresh', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Verificar si el token es válido
   * @param {string} token - Token JWT
   * @returns {Promise<Object>} Respuesta de verificación
   */
  verifyToken: async (token) => {
    try {
      const response = await apiClient.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Cambiar contraseña del usuario autenticado
   * @param {Object} passwordData - Datos de cambio de contraseña
   * @param {string} passwordData.currentPassword - Contraseña actual
   * @param {string} passwordData.newPassword - Nueva contraseña
   * @param {string} passwordData.confirmPassword - Confirmación de nueva contraseña
   * @param {string} token - Token JWT
   * @returns {Promise<Object>} Respuesta del servidor
   */
  changePassword: async (passwordData, token) => {
    try {
      const response = await apiClient.put('/auth/change-password', passwordData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  },

  /**
   * Verificar estado de la API
   * @returns {Promise<Object>} Estado de la API
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
   * @param {Object} error - Error de axios
   * @returns {Object} Error procesado
   */
  handleError: (error) => {
    if (error.response) {
      // Error de respuesta del servidor
      return {
        message: error.response.data?.message || 'Error del servidor',
        status: error.response.status,
        details: error.response.data
      };
    } else if (error.request) {
      // Error de red o sin respuesta
      return {
        message: 'Error de conexión - Verifique su internet o el servidor',
        status: 0,
        details: null
      };
    } else {
      // Error de configuración
      return {
        message: error.message || 'Error inesperado',
        status: -1,
        details: null
      };
    }
  }
};

export default authService; 