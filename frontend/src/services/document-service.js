import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = 'http://localhost:3001/api';

// Crear instancia de axios con configuración predeterminada
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
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
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      console.error('Error uploading XML document:', error);
      
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
      console.error('Error uploading XML documents batch:', error);
      
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
   * CAJA: Ver todos los documentos para gestión
   * @returns {Promise<Object>} Lista de todos los documentos
   */
  async getAllDocuments() {
    try {
      const response = await api.get('/documents/all');
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error fetching all documents:', error);
      
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
      console.error('Error assigning document:', error);
      
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
      console.error('Error fetching my documents:', error);
      
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
    console.log('🌐 SERVICE: updateDocumentStatus iniciado:', {
      documentId,
      newStatus,
      options,
      url: `/documents/${documentId}/status`
    });
    
    try {
      const requestBody = { 
        status: newStatus,
        ...options
      };
      console.log('📤 SERVICE: Enviando request al backend:', requestBody);
      
      const response = await api.put(`/documents/${documentId}/status`, requestBody);
      console.log('📥 SERVICE: Respuesta del backend:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('💥 SERVICE: Error updating document status:', error);
      console.error('📊 SERVICE: Error details:', {
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
      console.error('Error fetching document by ID:', error);
      
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
      console.error('Error fetching matrizadores:', error);
      
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
      console.error(message, error);
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
      console.error(message, error);
      throw new Error(message);
    }
  },

  async deliverDocumentGroup(deliveryData) {
    try {
      const response = await api.post('/documents/deliver-group', deliveryData);
      // El backend devuelve { success, message, group }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Error entregando el grupo de documentos';
      console.error(message, error);
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
      console.error('Error delivering document:', error);
      
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
   * Obtener información editable de un documento
   * @param {string} documentId - ID del documento
   * @returns {Promise<Object>} Información editable según permisos del usuario
   */
  async getEditableDocumentInfo(documentId) {
    try {
      const response = await api.get(`/documents/${documentId}/editable-info`);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching editable document info:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al obtener información editable';
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  },

  /**
   * Actualizar información de documento
   * @param {string} documentId - ID del documento
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Documento actualizado
   */
  async updateDocumentInfo(documentId, updateData) {
    try {
      const response = await api.put(`/documents/${documentId}/update-info`, updateData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating document info:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar información del documento';
      
      // Extraer errores específicos si existen
      const errors = error.response?.data?.errors || [errorMessage];
      
      return {
        success: false,
        error: errorMessage,
        errors: errors,
        message: errorMessage
      };
    }
  },

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
      console.error('Error creating smart group:', error);
      
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
      console.error('Error undoing document status change:', error);
      
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
      console.error('Error fetching undoable changes:', error);
      
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
    console.log('🌐 SERVICE: updateDocumentGroupStatus iniciado:', {
      documentGroupId,
      newStatus,
      options,
      url: '/documents/group/status'
    });
    
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
      
      console.log('📤 SERVICE: Enviando request de grupo al backend (corregido):', requestBody);
      
      const response = await api.put('/documents/group/status', requestBody);
      console.log('📥 SERVICE: Respuesta del backend para grupo:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('💥 SERVICE: Error updating group status:', error);
      console.error('📊 SERVICE: Error details:', {
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
   * 🔗 Actualizar información compartida de grupo de documentos
   * @param {string} documentGroupId - ID del grupo de documentos
   * @param {Object} sharedData - Datos compartidos a actualizar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async updateDocumentGroupInfo(documentGroupId, sharedData) {
    console.log('🌐 SERVICE: updateDocumentGroupInfo iniciado:', {
      documentGroupId,
      sharedData,
      url: '/documents/group/info'
    });
    
    try {
      const requestBody = { 
        documentGroupId,
        sharedData
      };
      
      console.log('📤 SERVICE: Enviando update de info grupal al backend:', requestBody);
      
      const response = await api.put('/documents/group/info', requestBody);
      console.log('📥 SERVICE: Respuesta del backend para info grupal:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('💥 SERVICE: Error updating group info:', error);
      console.error('📊 SERVICE: Error details:', {
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
  }
};

export default documentService; 