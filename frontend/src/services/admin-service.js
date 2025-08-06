import axios from 'axios';

// URL base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Instancia de axios configurada
const api = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 segundos
});

/**
 * Servicio de administración de usuarios
 * Maneja todas las peticiones relacionadas con la gestión de usuarios (solo ADMIN)
 */
const adminService = {
  /**
   * Obtener todos los usuarios con paginación y filtros
   * @param {Object} params - Parámetros de consulta
   * @param {number} params.page - Número de página
   * @param {number} params.limit - Límite por página
   * @param {string} params.search - Búsqueda por nombre, apellido o email
   * @param {string} params.role - Filtrar por rol
   * @param {boolean} params.status - Filtrar por estado
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Lista de usuarios con paginación
   */
  getUsers: async (params = {}, token) => {
    try {
      const response = await api.get('/users', {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Obtener estadísticas de usuarios
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Estadísticas de usuarios
   */
  getUserStats: async (token) => {
    try {
      const response = await api.get('/users/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Obtener un usuario específico por ID
   * @param {number} userId - ID del usuario
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Datos del usuario
   */
  getUserById: async (userId, token) => {
    try {
      const response = await api.get(`/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Crear un nuevo usuario
   * @param {Object} userData - Datos del nuevo usuario
   * @param {string} userData.email - Email del usuario
   * @param {string} userData.password - Contraseña del usuario
   * @param {string} userData.firstName - Nombre del usuario
   * @param {string} userData.lastName - Apellido del usuario
   * @param {string} userData.role - Rol del usuario
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Usuario creado
   */
  createUser: async (userData, token) => {
    try {
      const response = await api.post('/users', userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Actualizar un usuario existente
   * @param {number} userId - ID del usuario a actualizar
   * @param {Object} userData - Datos a actualizar
   * @param {string} userData.email - Email del usuario
   * @param {string} userData.firstName - Nombre del usuario
   * @param {string} userData.lastName - Apellido del usuario
   * @param {string} userData.role - Rol del usuario
   * @param {string} userData.password - Nueva contraseña (opcional)
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Usuario actualizado
   */
  updateUser: async (userId, userData, token) => {
    try {
      const response = await api.put(`/users/${userId}`, userData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Activar o desactivar un usuario
   * @param {number} userId - ID del usuario
   * @param {boolean} isActive - Estado del usuario (true = activo, false = inactivo)
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Usuario con estado actualizado
   */
  toggleUserStatus: async (userId, isActive, token) => {
    try {
      const response = await api.patch(`/users/${userId}/status`, 
        { isActive }, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Eliminar un usuario (hard delete)
   * @param {number} userId - ID del usuario a eliminar
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  deleteUser: async (userId, token) => {
    try {
      const response = await api.delete(`/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Validar datos de usuario antes de enviar
   * @param {Object} userData - Datos del usuario a validar
   * @returns {Object} Resultado de validación
   */
  validateUserData: (userData) => {
    const errors = {};

    // Validar email
    if (!userData.email) {
      errors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.email = 'El email no es válido';
    }

    // Validar nombre
    if (!userData.firstName || userData.firstName.trim().length < 2) {
      errors.firstName = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar apellido
    if (!userData.lastName || userData.lastName.trim().length < 2) {
      errors.lastName = 'El apellido debe tener al menos 2 caracteres';
    }

    // Validar rol
    const validRoles = ['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];
    if (!userData.role || !validRoles.includes(userData.role)) {
      errors.role = 'Debe seleccionar un rol válido';
    }

    // Validar contraseña (solo si se proporciona)
    if (userData.password !== undefined) {
      if (!userData.password || userData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else {
        // Validaciones adicionales de contraseña
        if (!/[A-Z]/.test(userData.password)) {
          errors.password = 'La contraseña debe contener al menos una mayúscula';
        } else if (!/[a-z]/.test(userData.password)) {
          errors.password = 'La contraseña debe contener al menos una minúscula';
        } else if (!/\d/.test(userData.password)) {
          errors.password = 'La contraseña debe contener al menos un número';
        }
      }

      // Validar confirmación de contraseña
      if (userData.confirmPassword !== undefined && userData.password !== userData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Formatear datos de usuario para mostrar
   * @param {Object} user - Datos del usuario
   * @returns {Object} Usuario formateado
   */
  formatUser: (user) => {
    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      statusText: user.isActive ? 'Activo' : 'Inactivo',
      createdAtFormatted: new Date(user.createdAt).toLocaleDateString('es-ES'),
      lastLoginFormatted: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('es-ES') : 'Nunca'
    };
  },

  /**
   * Obtener opciones de roles disponibles
   * @returns {Array} Lista de roles con labels
   */
  getRoleOptions: () => [
    { value: 'ADMIN', label: 'Administrador', color: '#ef4444' },
    { value: 'CAJA', label: 'Caja', color: '#22c55e' },
    { value: 'MATRIZADOR', label: 'Matrizador', color: '#3b82f6' },
    { value: 'RECEPCION', label: 'Recepción', color: '#06b6d4' },
    { value: 'ARCHIVO', label: 'Archivo', color: '#f59e0b' }
  ],

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

export default adminService;