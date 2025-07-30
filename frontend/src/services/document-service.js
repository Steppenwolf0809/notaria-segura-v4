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
  async updateDocumentStatus(documentId, newStatus) {
    try {
      const response = await api.put(`/documents/${documentId}/status`, {
        status: newStatus
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating document status:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al actualizar estado del documento';
      
      return {
        success: false,
        error: errorMessage
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
  }
};

export default documentService; 