import { create } from 'zustand';
import documentService from '../services/document-service.js';

/**
 * Store de documentos usando Zustand
 * Maneja estado global de documentos y operaciones CRUD
 */
const useDocumentStore = create((set, get) => ({
  // Estado inicial
  documents: [],
  matrizadores: [],
  loading: false,
  error: null,
  uploadProgress: null,

  /**
   * Función para establecer estado de carga
   * @param {boolean} loading - Estado de carga
   */
  setLoading: (loading) => {
    set({ loading });
  },

  /**
   * Función para establecer error
   * @param {string} errorMessage - Mensaje de error
   */
  setError: (errorMessage) => {
    set({ 
      error: errorMessage, 
      loading: false 
    });
  },

  /**
   * Función para limpiar errores
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * CAJA: Subir XML y procesar automáticamente
   * @param {File} xmlFile - Archivo XML a procesar
   * @returns {Promise<Object>} Resultado de la operación
   */
  uploadXmlDocument: async (xmlFile) => {
    set({ loading: true, error: null, uploadProgress: 0 });
    
    try {
      // Simular progreso de upload
      set({ uploadProgress: 25 });
      
      const result = await documentService.uploadXmlDocument(xmlFile);
      
      set({ uploadProgress: 75 });
      
      if (result.success) {
        // Actualizar lista de documentos si tenemos documentos cargados
        const currentDocuments = get().documents;
        if (currentDocuments.length > 0) {
          set({ 
            documents: [result.data.document, ...currentDocuments],
            loading: false,
            uploadProgress: 100
          });
        } else {
          set({ 
            loading: false,
            uploadProgress: 100
          });
        }
        
        // Limpiar progreso después de un tiempo
        setTimeout(() => {
          set({ uploadProgress: null });
        }, 2000);
        
        return result;
      } else {
        set({ 
          error: result.error, 
          loading: false,
          uploadProgress: null
        });
        return result;
      }
    } catch (error) {
      console.error('Error in uploadXmlDocument:', error);
      set({ 
        error: 'Error inesperado al subir XML', 
        loading: false,
        uploadProgress: null
      });
      return { success: false, error: 'Error inesperado al subir XML' };
    }
  },

  /**
   * CAJA: Subir múltiples XML y procesar automáticamente (LOTE)
   * @param {File[]} xmlFiles - Array de archivos XML a procesar
   * @returns {Promise<Object>} Resultado de la operación en lote
   */
  uploadXmlDocumentsBatch: async (xmlFiles) => {
    set({ loading: true, error: null, uploadProgress: 0 });
    
    try {
      const result = await documentService.uploadXmlDocumentsBatch(xmlFiles, (progress) => {
        set({ uploadProgress: progress });
      });
      
      if (result.success) {
        // Recargar documentos después del procesamiento en lote
        const currentDocuments = get().documents;
        if (currentDocuments.length > 0) {
          // Recargar todos los documentos para mostrar los nuevos
          await get().fetchAllDocuments();
        }
        
        set({ 
          loading: false,
          uploadProgress: 100
        });
        
        // Limpiar progreso después de un tiempo
        setTimeout(() => {
          set({ uploadProgress: null });
        }, 3000);
        
        return result;
      } else {
        set({ 
          error: result.error, 
          loading: false,
          uploadProgress: null
        });
        return result;
      }
    } catch (error) {
      console.error('Error in uploadXmlDocumentsBatch:', error);
      set({ 
        error: 'Error inesperado al subir archivos XML en lote', 
        loading: false,
        uploadProgress: null
      });
      return { success: false, error: 'Error inesperado al subir archivos XML en lote' };
    }
  },

  /**
   * CAJA: Cargar todos los documentos para gestión
   * @returns {Promise<boolean>} True si se cargaron exitosamente
   */
  fetchAllDocuments: async () => {
    set({ loading: true, error: null });
    
    try {
      const result = await documentService.getAllDocuments();
      
      if (result.success) {
        set({ 
          documents: result.data.documents || [],
          loading: false 
        });
        return true;
      } else {
        set({ 
          error: result.error, 
          loading: false 
        });
        return false;
      }
    } catch (error) {
      console.error('Error in fetchAllDocuments:', error);
      set({ 
        error: 'Error inesperado al cargar documentos', 
        loading: false 
      });
      return false;
    }
  },

  /**
   * CAJA: Asignar documento a matrizador
   * @param {string} documentId - ID del documento
   * @param {number} matrizadorId - ID del matrizador
   * @returns {Promise<boolean>} True si se asignó exitosamente
   */
  assignDocument: async (documentId, matrizadorId) => {
    set({ loading: true, error: null });
    
    try {
      const result = await documentService.assignDocument(documentId, matrizadorId);
      
      if (result.success) {
        // Actualizar documento en la lista local
        const currentDocuments = get().documents;
        const updatedDocuments = currentDocuments.map(doc => 
          doc.id === documentId ? result.data.document : doc
        );
        
        set({ 
          documents: updatedDocuments,
          loading: false 
        });
        return true;
      } else {
        set({ 
          error: result.error, 
          loading: false 
        });
        return false;
      }
    } catch (error) {
      console.error('Error in assignDocument:', error);
      set({ 
        error: 'Error inesperado al asignar documento', 
        loading: false 
      });
      return false;
    }
  },

  /**
   * MATRIZADOR: Cargar documentos del usuario
   * @returns {Promise<boolean>} True si se cargaron exitosamente
   */
  fetchMyDocuments: async () => {
    set({ loading: true, error: null });
    
    try {
      const result = await documentService.getMyDocuments();
      
      if (result.success) {
        set({ 
          documents: result.data.documents || [],
          loading: false 
        });
        return true;
      } else {
        set({ 
          error: result.error, 
          loading: false 
        });
        return false;
      }
    } catch (error) {
      console.error('Error in fetchMyDocuments:', error);
      set({ 
        error: 'Error inesperado al cargar mis documentos', 
        loading: false 
      });
      return false;
    }
  },

  /**
   * MATRIZADOR: Actualizar estado de documento
   * @param {string} documentId - ID del documento
   * @param {string} newStatus - Nuevo estado
   * @returns {Promise<boolean>} True si se actualizó exitosamente
   */
  updateDocumentStatus: async (documentId, newStatus) => {
    set({ loading: true, error: null });
    
    try {
      const result = await documentService.updateDocumentStatus(documentId, newStatus);
      
      if (result.success) {
        // Actualizar documento en la lista local
        const currentDocuments = get().documents;
        const updatedDocuments = currentDocuments.map(doc => 
          doc.id === documentId ? result.data.document : doc
        );
        
        set({ 
          documents: updatedDocuments,
          loading: false 
        });
        return true;
      } else {
        set({ 
          error: result.error, 
          loading: false 
        });
        return false;
      }
    } catch (error) {
      console.error('Error in updateDocumentStatus:', error);
      set({ 
        error: 'Error inesperado al actualizar estado', 
        loading: false 
      });
      return false;
    }
  },

  /**
   * Cargar lista de matrizadores disponibles para asignación
   * @returns {Promise<boolean>} True si se cargaron exitosamente
   */
  fetchMatrizadores: async () => {
    try {
      const result = await documentService.getAvailableMatrizadores();
      
      if (result.success) {
        set({ matrizadores: result.data.matrizadores || [] });
        return true;
      } else {
        console.error('Error fetching matrizadores:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error in fetchMatrizadores:', error);
      return false;
    }
  },

  /**
   * Obtener documentos filtrados por estado
   * @param {string} status - Estado a filtrar
   * @returns {Array} Documentos filtrados
   */
  getDocumentsByStatus: (status) => {
    const documents = get().documents;
    return documents.filter(doc => doc.status === status);
  },

  /**
   * Obtener estadísticas de documentos
   * @returns {Object} Estadísticas por estado
   */
  getDocumentStats: () => {
    const documents = get().documents;
    return {
      total: documents.length,
      PENDIENTE: documents.filter(d => d.status === 'PENDIENTE').length,
      EN_PROCESO: documents.filter(d => d.status === 'EN_PROCESO').length,
      LISTO: documents.filter(d => d.status === 'LISTO').length,
      ENTREGADO: documents.filter(d => d.status === 'ENTREGADO').length
    };
  },

  /**
   * Buscar documentos por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Array} Documentos que coinciden
   */
  searchDocuments: (searchTerm) => {
    const documents = get().documents;
    if (!searchTerm.trim()) return documents;
    
    const term = searchTerm.toLowerCase();
    return documents.filter(doc => 
      doc.clientName?.toLowerCase().includes(term) ||
      doc.protocolNumber?.toLowerCase().includes(term) ||
      doc.actoPrincipalDescripcion?.toLowerCase().includes(term) ||
      doc.documentType?.toLowerCase().includes(term)
    );
  },

  /**
   * Limpiar todos los datos del store
   */
  clearAll: () => {
    set({
      documents: [],
      matrizadores: [],
      loading: false,
      error: null,
      uploadProgress: null
    });
  }
}));

export default useDocumentStore; 