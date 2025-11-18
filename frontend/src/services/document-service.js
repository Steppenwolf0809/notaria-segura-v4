import apiClient from './api-client';
import { API_BASE } from '../utils/apiConfig';

/** Cliente HTTP unificado */
const api = apiClient;

/**
* Interceptores centralizados en api-client.
* Este servicio usa `api` (apiClient) para todas sus llamadas.
*/

/**
 * Servicio para gestión de documentos
 * Comunicación con backend para documentos
 */
const documentService = {
  /**
   * CAJA: Subir XML y crear documento automáticamente
   * @param {File} xmlFile - Archivo XML a procesar
   * @returns {Promise<Object>} Respuesta del servidor con documento creado
   */
  async uploadXmlDocument(xmlFile) {
    try {
      // Crear FormData para upload de archivo
      const formData = new FormData();
      formData.append('xmlFile', xmlFile);
      
      const response = await api.post('/documents/upload-xml', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      // Error uploading XML document
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Error al subir archivo XML';

      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * CAJA: Subir múltiples XML y crear documentos automáticamente (LOTE)
   * @param {File[]} xmlFiles - Array de archivos XML a procesar
   * @param {Function} onProgress - Callback para progreso (opcional)
   * @returns {Promise<Object>} Respuesta del servidor con resumen de procesamiento
   */
  async uploadXmlDocumentsBatch(xmlFiles, onProgress = null) {
    try {
      // Validar que se enviaron archivos
      if (!xmlFiles || xmlFiles.length === 0) {
        return {
          success: false,
          error: 'No se han seleccionado archivos para procesar'
        };
      }

      // Validar límite de archivos
      if (xmlFiles.length > 20) {
        return {
          success: false,
          error: 'Máximo 20 archivos por lote. Seleccionó ' + xmlFiles.length
        };
      }

      // Crear FormData para upload de múltiples archivos
      const formData = new FormData();
      xmlFiles.forEach((file, index) => {
        // Validar que cada archivo sea XML
        if (!file.name.toLowerCase().endsWith('.xml')) {
          throw new Error(`El archivo "${file.name}" no es un XML válido`);
        }
        formData.append('xmlFiles', file);
      });

      // Llamar al callback de progreso si existe
      if (onProgress) onProgress(25);

      const response = await api.post('/documents/upload-xml-batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 segundos timeout para procesamiento en lote
      });

      if (onProgress) onProgress(100);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al subir archivos XML en lote';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Unificado: listado de documentos (Activos/Entregados) con búsqueda/paginación
   */
  async getUnifiedDocuments(params = {}) {
    try {
      console.debug('[HTTP][CALL]', 'getUnifiedDocuments', params);
      const res = await api.get('/documents', { params });
      return { success: true, data: res.data?.data };
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message || 'Error al cargar documentos';
      if (status === 401 || status === 403) {
        return { success: false, error: 'Sesión expirada. Inicia sesión nuevamente.' };
      }
      return { success: false, error: message };
    }
  },

  /**
   * Unificado: conteos de documentos por pestaña (para badges)
   */
  async getUnifiedCounts(params = {}) {
    try {
      console.debug('[HTTP][CALL]', 'getUnifiedCounts', params);
      const res = await api.get('/documents/counts', { params });
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

  /**
   * CAJA: Ver todos los documentos para gestión
   * @returns {Promise<Object>} Lista de todos los documentos
   */
  async getAllDocuments({ page = 1, limit = 50 } = {}) {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const response = await api.get(`/documents/all?${params.toString()}`);
      
      return {
        success: true,
        data: {
          documents: response.data.data.documents,
          total: response.data.data.total ?? (response.data.data.pagination?.totalCount || 0),
          pagination: response.data.data.pagination || {
            currentPage: page,
            totalPages: Math.ceil((response.data.data.total || 0) / limit),
            pageSize: limit
          }
        }
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener documentos';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * CAJA: Asignar documento a matrizador
   * @param {string} documentId - ID del documento
   * @param {number} matrizadorId - ID del matrizador
   * @returns {Promise<Object>} Documento actualizado
   */
  async assignDocument(documentId, matrizadorId) {
    try {
      const response = await api.put(`/documents/${documentId}/assign`, {
        matrizadorId
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al asignar documento';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * MATRIZADOR: GET my-documents con token
   * @returns {Promise<Object>} Documentos del matrizador
   */
  async getMyDocuments() {
    try {
      const response = await api.get('/documents/my-documents');
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener mis documentos';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * MATRIZADOR: PUT status
   * @param {string} documentId - ID del documento
   * @param {string} newStatus - Nuevo estado del documento
   * @returns {Promise<Object>} Documento actualizado
   */
  async updateDocumentStatus(documentId, newStatus, options = {}) {
    try {
      // Preparar el cuerpo de la petición
      const requestBody = { 
        status: newStatus,
        ...options
      };

      // Si no se proporciona una razón de reversión, detectar automáticamente si es necesaria
      if (!requestBody.reversionReason) {
        try {
          // Obtener el documento actual para verificar si es una reversión
          const currentDoc = await this.getDocumentById(documentId);
          if (currentDoc.success && currentDoc.data?.document) {
            const currentStatus = currentDoc.data.document.status;
            const statusOrder = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
            const currentIndex = statusOrder.indexOf(currentStatus);
            const newIndex = statusOrder.indexOf(newStatus);
            
            // Si es una reversión, agregar una razón por defecto
            if (newIndex < currentIndex && newIndex >= 0) {
              requestBody.reversionReason = 'Cambio de estado desde interfaz de usuario (drag & drop)';
            }
          }
        } catch (reversionCheckError) {
        }
      }

      
      const response = await api.put(`/documents/${documentId}/status`, requestBody);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar estado del documento';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Extracción avanzada (flag) de actos y comparecientes para un documento
   * @param {string|number} documentId
   * @param {string} [text] - Texto opcional para forzar análisis
   */
  async extractActs(documentId, text, options = {}) {
    try {
      const response = await api.post(`/documents/${documentId}/extract-acts`, { text, saveSnapshot: !!options.saveSnapshot });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al extraer actos';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Aplicar sugerencias del último snapshot al documento
   */
  async applyExtraction(documentId) {
    try {
      const response = await api.post(`/documents/${documentId}/apply-extraction`, {});
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error aplicando sugerencias';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * GET detalle de documento específico
   * @param {string} documentId - ID del documento
   * @returns {Promise<Object>} Detalle del documento
   */
  async getDocumentById(documentId) {
    try {
      const response = await api.get(`/documents/${documentId}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener detalle del documento';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * CAJA: Obtener lista de matrizadores disponibles
   * @returns {Promise<Object>} Lista de matrizadores
   */
  async getAvailableMatrizadores() {
    try {
      const response = await api.get('/documents/matrizadores');
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener matrizadores';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // --- MÉTODOS DE AGRUPACIÓN ---

  async detectGroupableDocuments(clientData) {
    try {
      const response = await api.post('/documents/detect-groupable', clientData);
      // El backend ya devuelve un objeto con { success, groupableDocuments, canGroup }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error detectando documentos agrupables';
      throw new Error(message);
    }
  },

  async createDocumentGroup(groupData) {
    try {
      const response = await api.post('/documents/create-group', groupData);
      // El backend devuelve { success, message, group, verificationCode }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error creando el grupo de documentos';
      throw new Error(message);
    }
  },

  /**
   * NUEVA FUNCIONALIDAD: Marcar grupo como listo para entrega
   * @param {string} documentGroupId - ID del grupo de documentos
   * @returns {Promise<Object>} Resultado de la operación
   */
  async markDocumentGroupAsReady(documentGroupId) {
    try {
      const response = await api.post('/documents/group/mark-ready', { documentGroupId });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error marcando grupo como listo';
      return { success: false, error: message };
    }
  },

  /**
   * NUEVA FUNCIONALIDAD: Obtener información editable de un documento
   * @param {string} documentId - ID del documento
   * @returns {Promise<Object>} Información del documento
   */
  async getEditableDocumentInfo(documentId) {
    try {
      const response = await api.get(`/documents/${documentId}/editable-info`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error obteniendo información del documento';
      return { success: false, error: message };
    }
  },

  /**
   * NUEVA FUNCIONALIDAD: Actualizar información de un documento
   * @param {string} documentId - ID del documento
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateDocumentInfo(documentId, updateData) {
    try {
      const response = await api.put(`/documents/${documentId}/update-info`, updateData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error actualizando información del documento';
      return { success: false, error: message };
    }
  },

  async deliverDocumentGroup(deliveryData) {
    try {
      const response = await api.post('/documents/deliver-group', deliveryData);
      // El backend devuelve { success, message, group }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error entregando el grupo de documentos';
      throw new Error(message);
    }
  },

  // --- MÉTODO DE ENTREGA COMPLETA ---
  
  /**
   * Entregar documento con información completa
   * @param {string} documentId - ID del documento
   * @param {Object} deliveryData - Datos de entrega
   * @returns {Promise<Object>} Documento entregado
   */
  async deliverDocument(documentId, deliveryData) {
    try {
      const response = await api.post(`/documents/${documentId}/deliver`, deliveryData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al entregar documento';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  // --- MÉTODOS DE EDICIÓN ---
  // CONSERVADOR: Nuevas funciones siguiendo el patrón existente


  /**
   * 🔗 CREAR GRUPO INTELIGENTE DE DOCUMENTOS
   * Función optimizada para crear grupos basados en detección automática
   */
  createSmartGroup: async (groupData) => {
    try {
      const response = await api.post('/documents/create-smart-group', groupData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error creando grupo inteligente';
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error
      };
    }
  },

  // --- MÉTODOS DEL SISTEMA DE CONFIRMACIONES Y DESHACER ---
  // CONSERVADOR: Nuevas funciones que extienden sin romper funcionalidad existente

  /**
   * Deshacer cambio de estado de un documento
   * @param {Object} undoData - Datos para deshacer (documentId, changeId)
   * @returns {Promise<Object>} Resultado de la operación de deshacer
   */
  async undoDocumentStatusChange(undoData) {
    try {
      const response = await api.post('/documents/undo-status-change', undoData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al deshacer cambio de estado';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Obtener cambios deshacibles de un documento
   * @param {string} documentId - ID del documento
   * @returns {Promise<Object>} Lista de cambios deshacibles
   */
  async getUndoableChanges(documentId) {
    try {
      const response = await api.get(`/documents/${documentId}/undoable-changes`);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener cambios deshacibles';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * 🔗 Actualizar estado de grupo de documentos
   * @param {string} documentGroupId - ID del grupo de documentos
   * @param {string} newStatus - Nuevo estado
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateDocumentGroupStatus(documentGroupId, newStatus, options = {}) {
    try {
      // 🔧 CORRECCIÓN: Estructurar correctamente el body según lo que espera el backend
      const requestBody = { 
        documentGroupId,
        newStatus,  // El backend espera exactamente este campo
        deliveredTo: options.deliveredTo,
        reversionReason: options.reversionReason
      };
      
      // Limpiar campos undefined
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key] === undefined) {
          delete requestBody[key];
        }
      });
      
      
      const response = await api.put('/documents/group/status', requestBody);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar estado del grupo';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * 🔓 Desagrupar un documento
   * @param {string} documentId - ID del documento a desagrupar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async ungroupDocument(documentId) {
    try {
      const response = await api.put(`/documents/${documentId}/ungroup`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al desagrupar documento';
      return { success: false, message: errorMessage, error: error.response?.data || error };
    }
  },

  /**
   * 🔗 Actualizar información compartida de grupo de documentos
   * @param {string} documentGroupId - ID del grupo de documentos
   * @param {Object} sharedData - Datos compartidos a actualizar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateDocumentGroupInfo(documentGroupId, sharedData) {
    try {
      const requestBody = { 
        documentGroupId,
        sharedData
      };
      
      
      const response = await api.put('/documents/group/info', requestBody);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar información del grupo';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * 📈 Obtener historial completo de un documento
   * @param {string} documentId - ID del documento
   * @param {Object} params - Parámetros de consulta (limit, offset, eventType)
   * @returns {Promise<Object>} Historial del documento
   */
  async getDocumentHistory(documentId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      if (params.eventType) queryParams.append('eventType', params.eventType);
      
      const url = `/documents/${documentId}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      
      const response = await api.get(url);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Error al obtener historial del documento';

      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * 🔄 NUEVA FUNCIONALIDAD: Cambio de estado masivo
   * @param {Object} bulkData - Datos para cambio masivo
   * @returns {Promise<Object>} Resultado de la operación masiva
   */
  async bulkStatusChange(bulkData) {
    try {
      const response = await api.post('/documents/bulk-status-change', bulkData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Error al realizar cambio masivo de estado';

      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Obtener todos los documentos de un grupo
   * @param {string} groupId - ID del grupo
   * @returns {Promise<Object>} Lista de documentos del grupo
   */
  async getGroupDocuments(groupId) {
    try {
      const response = await api.get(`/documents/group/${groupId}`);
      
        groupId,
        documentCount: response.data.data?.length || 0
      });
      
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message || 'Documentos del grupo obtenidos exitosamente'
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener documentos del grupo';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        data: []
      };
    }
  },

  /**
   * Revertir estado de documento (disponible para todos los roles)
   * @param {string} documentId - ID del documento
   * @param {string} newStatus - Nuevo estado (anterior al actual)
   * @param {string} reversionReason - Razón obligatoria para la reversión
   * @returns {Promise<Object>} Resultado de la reversión
   */
  async revertDocumentStatus(documentId, newStatus, reversionReason) {
    try {
      
      const response = await api.post(`/documents/${documentId}/revert`, {
        newStatus,
        reversionReason
      });
      
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Documento revertido exitosamente'
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al revertir el estado del documento';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Actualizar política de notificación de un documento individual
   * @param {string} documentId - ID del documento
   * @param {string} policy - Política de notificación ('automatica', 'no_notificar', 'entrega_inmediata')
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateNotificationPolicy(documentId, policy) {
    try {
      
      const response = await api.put(`/documents/${documentId}/notification-policy`, {
        notificationPolicy: policy
      });
      
      
      // Manejar respuesta de migración pendiente
      if (response.status === 202 && response.data.data?.migrationPending) {
      }
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Política de notificación actualizada exitosamente'
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar la política de notificación';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Actualizar política de notificación de un grupo de documentos
   * @param {string} groupId - ID del grupo
   * @param {string} policy - Política de notificación ('automatica', 'no_notificar', 'entrega_inmediata')
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateGroupNotificationPolicy(groupId, policy) {
    try {
      
      const response = await api.put(`/documents/group/${groupId}/notification-policy`, {
        notificationPolicy: policy
      });
      
      
      // Manejar respuesta de migración pendiente
      if (response.status === 202 && response.data.data?.migrationPending) {
      }
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Política de notificación del grupo actualizada exitosamente'
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar la política de notificación del grupo';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * 💳 NUEVA FUNCIONALIDAD: Marcar documento como Nota de Crédito
   * @param {string} documentId - ID del documento
   * @param {string} motivo - Motivo de la anulación (mínimo 10 caracteres)
   * @returns {Promise<Object>} Resultado de la operación
   */
  async markAsNotaCredito(documentId, motivo) {
    try {
      const response = await api.put(`/documents/${documentId}/nota-credito`, {
        motivo
      });
      
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Documento marcado como Nota de Crédito exitosamente'
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al marcar documento como Nota de Crédito';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Marcar documento como entregado inmediatamente (para política de entrega inmediata)
   * @param {string} documentId - ID del documento
   * @param {Object} deliveryData - Datos mínimos de entrega
   * @returns {Promise<Object>} Resultado de la entrega inmediata
   */
  async markAsDeliveredImmediate(documentId, deliveryData = {}) {
    try {
      
      const immediateDeliveryData = {
        entregadoA: deliveryData.entregadoA || 'Cliente',
        relacionTitular: 'titular',
        verificacionManual: true,
        codigoVerificacion: '',
        facturaPresenta: false,
        observacionesEntrega: deliveryData.observacionesEntrega || 'Entrega inmediata automática',
        immediateDelivery: true
      };

      const response = await api.post(`/documents/${documentId}/deliver`, immediateDeliveryData);
      
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Documento entregado inmediatamente'
      };
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al marcar documento como entregado';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * 📊 Obtener estadísticas completas para dashboard de CAJA
   * @returns {Promise<Object>} Estadísticas de negocio (montos, trámites, tendencias)
   */
  async getCajaStats() {
    try {
      const response = await api.get('/documents/caja-stats');

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {

      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Error al cargar estadísticas';

      return {
        success: false,
        error: errorMessage
      };
    }
  }
};

export default documentService; 
