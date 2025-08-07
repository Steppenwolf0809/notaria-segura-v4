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
   * Obtener todos los documentos con filtros avanzados (admin oversight)
   * @param {Object} filters - Filtros de búsqueda
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Lista de documentos con estadísticas
   */
  getDocumentsOversight: async (filters = {}, token) => {
    try {
      const response = await api.get('/documents/oversight', {
        params: filters,
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
   * Obtener timeline/eventos de un documento específico
   * @param {string} documentId - ID del documento
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Timeline de eventos del documento
   */
  getDocumentTimeline: async (documentId, token) => {
    try {
      const response = await api.get(`/documents/${documentId}/events`, {
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
   * Obtener información de múltiples documentos para operaciones en lote
   * @param {Array} documentIds - Array de IDs de documentos
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Información de los documentos
   */
  getBulkDocumentsInfo: async (documentIds, token) => {
    try {
      const response = await api.post('/documents/bulk-info', 
        { documentIds }, 
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
   * Ejecutar operación en lote sobre múltiples documentos
   * @param {Object} operationData - Datos de la operación
   * @param {Array} operationData.documentIds - IDs de documentos
   * @param {string} operationData.operation - Tipo de operación (reassign, changeStatus)
   * @param {string} operationData.newMatrizadorId - ID del nuevo matrizador (si aplica)
   * @param {string} operationData.newStatus - Nuevo estado (si aplica)
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Resultado de la operación
   */
  executeBulkOperation: async (operationData, token) => {
    try {
      const response = await api.post('/documents/bulk-operation', 
        operationData, 
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
   * Exportar documentos en formato Excel o CSV
   * @param {Object} filters - Filtros aplicados
   * @param {string} format - Formato de exportación (excel, csv)
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Blob>} Archivo para descarga
   */
  exportDocuments: async (filters = {}, format = 'excel', token) => {
    try {
      const params = new URLSearchParams({
        ...filters,
        format
      });

      const response = await api.get(`/documents/export?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Reasignar documento a nuevo matrizador
   * @param {string} documentId - ID del documento
   * @param {string} newMatrizadorId - ID del nuevo matrizador
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Documento actualizado
   */
  reassignDocument: async (documentId, newMatrizadorId, token) => {
    try {
      const response = await api.patch(`/documents/${documentId}/reassign`, 
        { newMatrizadorId }, 
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
   * Cambiar estado de documento (admin override)
   * @param {string} documentId - ID del documento
   * @param {string} newStatus - Nuevo estado
   * @param {string} reason - Razón del cambio
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Documento actualizado
   */
  changeDocumentStatus: async (documentId, newStatus, reason, token) => {
    try {
      const response = await api.patch(`/documents/${documentId}/status`, 
        { newStatus, reason }, 
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
   * Obtener estadísticas detalladas de documentos
   * @param {Object} filters - Filtros para estadísticas
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Estadísticas detalladas
   */
  getDocumentStatistics: async (filters = {}, token) => {
    try {
      const response = await api.get('/documents/statistics', {
        params: filters,
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
   * Validar filtros de oversight antes de enviar
   * @param {Object} filters - Filtros a validar
   * @returns {Object} Filtros validados
   */
  validateOversightFilters: (filters) => {
    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const validTypes = ['PROTOCOLO', 'DILIGENCIA', 'CERTIFICACION', 'ARRENDAMIENTO', 'OTROS'];
    const validSortBy = ['createdAt', 'updatedAt', 'status', 'protocolNumber', 'clientName'];
    const validSortOrder = ['asc', 'desc'];

    return {
      ...filters,
      status: validStatuses.includes(filters.status) ? filters.status : undefined,
      type: validTypes.includes(filters.type) ? filters.type : undefined,
      sortBy: validSortBy.includes(filters.sortBy) ? filters.sortBy : 'createdAt',
      sortOrder: validSortOrder.includes(filters.sortOrder) ? filters.sortOrder : 'desc',
      page: Math.max(1, parseInt(filters.page) || 1),
      limit: Math.min(100, Math.max(5, parseInt(filters.limit) || 10))
    };
  },

  // ============================================================================
  // WHATSAPP TEMPLATES - Gestión de plantillas de mensajes
  // ============================================================================

  /**
   * Obtener todos los templates WhatsApp
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Lista de templates
   */
  getWhatsAppTemplates: async (token) => {
    try {
      const response = await api.get('/whatsapp-templates', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Obtener template específico por ID
   * @param {string} templateId - ID del template
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Template específico
   */
  getWhatsAppTemplate: async (templateId, token) => {
    try {
      const response = await api.get(`/whatsapp-templates/${templateId}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Crear nuevo template WhatsApp
   * @param {Object} templateData - Datos del template
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Template creado
   */
  createWhatsAppTemplate: async (templateData, token) => {
    try {
      const response = await api.post('/whatsapp-templates', templateData, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Actualizar template WhatsApp existente
   * @param {string} templateId - ID del template
   * @param {Object} templateData - Datos actualizados
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Template actualizado
   */
  updateWhatsAppTemplate: async (templateId, templateData, token) => {
    try {
      const response = await api.put(`/whatsapp-templates/${templateId}`, templateData, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Eliminar template WhatsApp
   * @param {string} templateId - ID del template
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  deleteWhatsAppTemplate: async (templateId, token) => {
    try {
      const response = await api.delete(`/whatsapp-templates/${templateId}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Activar/desactivar template WhatsApp
   * @param {string} templateId - ID del template
   * @param {boolean} activo - Estado del template
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Template actualizado
   */
  toggleWhatsAppTemplate: async (templateId, activo, token) => {
    try {
      const response = await api.patch(`/whatsapp-templates/${templateId}/toggle`, 
        { activo }, 
        {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Generar preview de template con datos ejemplo
   * @param {Object} templateData - Datos del template para preview
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Preview del mensaje
   */
  previewWhatsAppTemplate: async (templateData, token) => {
    try {
      const response = await api.post('/whatsapp-templates/preview', templateData, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
    }
  },

  /**
   * Inicializar templates por defecto
   * @param {string} token - Token JWT del admin
   * @returns {Promise<Object>} Templates creados
   */
  initializeWhatsAppTemplates: async (token) => {
    try {
      const response = await api.post('/whatsapp-templates/initialize', {}, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw adminService.handleError(error);
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

export default adminService;