import axios from 'axios';

// URL base de la API
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

// Instancia de axios configurada
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 segundos
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('notaria-auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.state && parsed.state.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (error) {
        // Si no hay token, usar el que está en localStorage directamente
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } else {
      // Fallback al token directo
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Servicio de recepción
 * Maneja todas las peticiones relacionadas con entrega de documentos
 */
const receptionService = {
  /**
   * Obtener estadísticas del dashboard
   * @returns {Promise<Object>} Estadísticas de recepción
   */
  async getDashboardStats() {
    try {
      const response = await api.get('/reception/dashboard');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Obtener todos los documentos con filtros y paginación
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise<Object>} Lista de todos los documentos
   */
  async getTodosDocumentos(params = {}) {
    try {
      const response = await api.get('/reception/documentos/todos', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Obtener documentos EN_PROCESO para marcar como listos
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise<Object>} Lista de documentos en proceso
   */
  async getDocumentosEnProceso(params = {}) {
    try {
      const response = await api.get('/reception/documentos/en-proceso', { params });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Marcar documento individual como listo
   * @param {string} documentId - ID del documento
   * @returns {Promise<Object>} Resultado de marcar como listo
   */
  async marcarComoListo(documentId) {
    try {
      console.log('🌐 Enviando request para marcar como listo:', documentId);
      const response = await api.post(`/reception/documentos/${documentId}/marcar-listo`);
      
      console.log('🌐 Respuesta completa del servidor:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'no keys'
      });

      // Verificar estructura de respuesta
      if (!response.data) {
        console.error('❌ Respuesta del servidor sin data');
        return {
          success: false,
          error: 'Respuesta del servidor vacía'
        };
      }

      if (response.data.success === true) {
        console.log('✅ Respuesta exitosa del servidor');
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        console.error('❌ Respuesta del servidor indica error:', response.data);
        return {
          success: false,
          error: response.data.error || response.data.message || 'Error del servidor sin mensaje específico'
        };
      }
    } catch (error) {
      console.error('🌐 Error en request marcar como listo:', {
        name: error.name,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        stack: error.stack
      });
      
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Marcar múltiples documentos del mismo cliente como listos
   * @param {Array} documentIds - IDs de documentos del mismo cliente
   * @returns {Promise<Object>} Resultado de marcar grupo como listo
   */
  async marcarGrupoListo(documentIds) {
    try {
      const response = await api.post('/reception/documentos/marcar-grupo-listo', { documentIds });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Desagrupar documentos que están agrupados
   * @param {Array} documentIds - IDs de documentos agrupados
   * @returns {Promise<Object>} Resultado de desagrupar documentos
   */
  async desagruparDocumentos(documentIds) {
    try {
      const response = await api.post('/reception/documentos/desagrupar', { documentIds });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Procesar entrega individual de documento
   * @param {string} documentId - ID del documento
   * @param {Object} entregaData - Datos de la entrega
   * @returns {Promise<Object>} Resultado de la entrega
   */
  async procesarEntrega(documentId, entregaData) {
    try {
      // 🔄 CONSERVADOR: Usar endpoint principal de documentos que ya existe
      const response = await axios.post(`${API_BASE_URL}/documents/${documentId}/deliver`, entregaData, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Procesar entrega grupal de múltiples documentos
   * @param {Object} entregaData - Datos de la entrega grupal
   * @returns {Promise<Object>} Resultado de la entrega grupal
   */
  async procesarEntregaGrupal(entregaData) {
    try {
      const response = await api.post('/reception/documentos/entrega-grupal', entregaData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Cancelar entrega de documento
   * @param {string} documentId - ID del documento
   * @param {Object} cancelData - Motivo de cancelación
   * @returns {Promise<Object>} Resultado de la cancelación
   */
  async cancelarEntrega(documentId, cancelData = {}) {
    try {
      const response = await api.post(`/reception/documentos/${documentId}/cancelar-entrega`, cancelData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Verificar código de retiro
   * @param {string} codigo - Código de 4 dígitos
   * @returns {Promise<Object>} Documentos asociados al código
   */
  async verificarCodigo(codigo) {
    try {
      const response = await api.get(`/reception/codigos/${codigo}/verificar`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Obtener lista de matrizadores para filtros
   * @returns {Promise<Object>} Lista de matrizadores
   */
  async getMatrizadores() {
    try {
      const response = await api.get('/reception/matrizadores');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Revertir estado de documento con razón obligatoria
   * @param {string} documentId - ID del documento
   * @param {string} newStatus - Nuevo estado (anterior al actual)
   * @param {string} reversionReason - Razón obligatoria para la reversión
   * @returns {Promise<Object>} Resultado de la reversión
   */
  async revertirEstadoDocumento(documentId, newStatus, reversionReason) {
    try {
      console.log('🔄 Enviando request para revertir estado:', { documentId, newStatus, reversionReason });
      const response = await api.post(`/reception/documentos/${documentId}/revertir-estado`, {
        newStatus,
        reversionReason
      });
      
      console.log('🔄 Respuesta de reversión:', response.data);

      if (response.data.success === true) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.error || response.data.message || 'Error en la reversión'
        };
      }
    } catch (error) {
      console.error('❌ Error en reversión de estado:', error);
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Obtener historial de notificaciones WhatsApp
   * @param {Object} params - Parámetros de filtrado y paginación
   * @returns {Promise<Object>} Historial de notificaciones
   */
  async getNotificationHistory(params = {}) {
    try {
      console.log('📱 Obteniendo historial de notificaciones:', params);
      const response = await api.get('/reception/notificaciones', { params });
      
      console.log('📱 Historial de notificaciones obtenido:', response.data);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('❌ Error obteniendo historial de notificaciones:', error);
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Obtener token de autenticación
   * @returns {string|null} Token de autenticación
   */
  getToken() {
    const authData = localStorage.getItem('notaria-auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.state?.token;
      } catch (error) {
        // Si no hay token, usar el que está en localStorage directamente
        return localStorage.getItem('token');
      }
    }
    return localStorage.getItem('token');
  },

  /**
   * Maneja errores de las peticiones HTTP
   * @param {Object} error - Error de axios
   * @returns {string} Mensaje de error procesado
   */
  handleError: (error) => {
    if (error.response) {
      return error.response.data?.message || 'Error del servidor';
    } else if (error.request) {
      return 'Error de conexión - Verifique su internet o el servidor';
    } else {
      return error.message || 'Error inesperado';
    }
  }
};

export default receptionService;
