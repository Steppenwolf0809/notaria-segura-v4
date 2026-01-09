import apiClient from './api-client';

/** Cliente HTTP unificado */
const api = apiClient;

/**
 * Servicio de recepción
 * Maneja todas las peticiones relacionadas con entrega de documentos
 */
const receptionService = {
  /**
   * Unificado: listado con pestañas/búsqueda/paginación (para ReceptionCenter v2)
   */
  async getUnifiedReceptions(params = {}) {
    try {
      console.debug('[HTTP][CALL]', 'getUnifiedReceptions', params);
      const res = await api.get('/reception', { params });
      return { success: true, data: res.data?.data };
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message || 'Error al cargar recepciones';
      if (status === 401 || status === 403) {
        return { success: false, error: 'Sesión expirada. Inicia sesión nuevamente.' };
      }
      return { success: false, error: message };
    }
  },

  /**
   * Unificado: conteos por pestaña (para badges)
   */
  async getUnifiedCounts(params = {}) {
    try {
      console.debug('[HTTP][CALL]', 'getUnifiedCounts', params);
      const res = await api.get('/reception/counts', { params });
      return { success: true, data: res.data?.data };
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message || 'Error al cargar conteos';
      if (status === 401 || status === 403) {
        return { success: false, error: 'Sesión expirada. Inicia sesión nuevamente.' };
      }
      return { success: false, error: message };
    }
  },

  // 🎯 ALIASES para compatibilidad con unified-documents-store.js
  // Estos alias permiten que el store siga llamando getUnifiedDocuments/getUnifiedCounts
  // pero internamente usen los métodos correctos de recepción
  async getUnifiedDocuments(params = {}) {
    const { tab, query } = params;
    console.info('[UI-GATE][RECEPTION_FETCH]', { tab, query });
    return await this.getUnifiedReceptions(params);
  },

  /**
   * Typeahead: sugerencias para clientes y códigos
   * @param {string} term
   */
  async getSuggestions(term) {
    try {
      if (!term || !term.trim()) return { success: true, data: { clients: [], codes: [] } };
      const res = await api.get('/reception/suggest', { params: { term } });
      return { success: true, data: res.data?.data || { clients: [], codes: [] } };
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message || 'Error al obtener sugerencias';
      if (status === 401 || status === 403) {
        return { success: false, error: 'Sesión expirada. Inicia sesión nuevamente.' };
      }
      return { success: false, error: message };
    }
  },
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
   * Obtener documentos LISTO para entregar
   * @param {Object} params - Parámetros de filtrado
   * @returns {Promise<Object>} Lista de documentos listos
   */
  async getDocumentosListos(params = {}) {
    try {
      // Forzar filtro por estado LISTO
      const filteredParams = {
        ...params,
        estado: 'LISTO'
      };
      const response = await api.get('/reception/documentos/todos', { params: filteredParams });
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
      const response = await api.post(`/reception/documentos/${documentId}/marcar-listo`);

      // Verificar estructura de respuesta
      if (!response.data) {
        return {
          success: false,
          error: 'Respuesta del servidor vacía'
        };
      }

      if (response.data.success === true) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.error || response.data.message || 'Error del servidor sin mensaje específico'
        };
      }
    } catch (error) {
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
      console.debug('[HTTP][CALL]', 'procesarEntrega', { documentId });
      const response = await api.post(`/documents/${documentId}/deliver`, entregaData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      const status = error?.response?.status;
      const message = receptionService.handleError(error);
      return { success: false, error: message };
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
      const response = await api.post(`/reception/documentos/${documentId}/revertir-estado`, {
        newStatus,
        reversionReason
      });


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
      return {
        success: false,
        error: receptionService.handleError(error)
      };
    }
  },

  /**
   * Cambio masivo a LISTO agrupando por cliente (usa endpoint /reception/documentos/marcar-listos)
   */
  async bulkMarkReady(documentIds, sendNotifications = true) {
    try {
      const response = await api.post('/reception/documentos/marcar-listos', {
        documentIds,
        sendNotifications
      });
      if (response?.data?.success) {
        return { success: true, data: response.data.data, message: response.data.message };
      }
      return { success: false, error: response?.data?.error || 'Error marcando documentos masivamente' };
    } catch (error) {
      return { success: false, error: receptionService.handleError(error) };
    }
  },

  /**
   * Obtener historial de notificaciones WhatsApp
   * @param {Object} params - Parámetros de filtrado y paginación
   * @returns {Promise<Object>} Historial de notificaciones
   */
  async getNotificationHistory(params = {}) {
    try {
      const response = await api.get('/reception/notificaciones', { params });


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
   * Notificación masiva WhatsApp
   * @param {Array} documentIds - IDs de documentos a notificar
   * @param {boolean} sendWhatsApp - Si se debe generar URL de WhatsApp
   * @returns {Promise<Object>} Resultado de la notificación
   */
  async bulkNotify(documentIds, sendWhatsApp = true) {
    try {
      const response = await api.put('/documents/bulk-notify', {
        documentIds,
        sendWhatsApp
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
   * Obtener token de autenticación
   * @returns {string|null} Token de autenticación
   */
  // getToken ya no es necesario con apiClient; se mantiene por compatibilidad, pero no se usa
  getToken() {
    const token = localStorage.getItem('token');
    if (token) return token;
    try {
      const parsed = JSON.parse(localStorage.getItem('notaria-auth-storage') || '{}');
      return parsed?.state?.token || null;
    } catch {
      return null;
    }
  },

  /**
   * Maneja errores de las peticiones HTTP
   * @param {Object} error - Error de axios
   * @returns {string} Mensaje de error procesado
   */
  handleError: (error) => {
    if (error.response) {
      // Preferir mensaje estructurado del backend
      return error.response.data?.error || error.response.data?.message || 'Error del servidor';
    } else if (error.request) {
      return 'Error de conexión - Verifique su internet o el servidor';
    } else {
      return error.message || 'Error inesperado';
    }
  }
};

export default receptionService;
