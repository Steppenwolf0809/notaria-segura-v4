import { create } from 'zustand';
import documentService from '../services/document-service.js';
import useAuthStore from './auth-store.js';

/**
 * Store de documentos usando Zustand
 * Maneja estado global de documentos y operaciones CRUD
 */
const useDocumentStore = create((set, get) => ({
  // Estado inicial
  documents: [],
  totalDocuments: 0,
  pagination: { currentPage: 1, pageSize: 50, totalPages: 1 },
  matrizadores: [],
  loading: false,
  error: null,
  uploadProgress: null,
  // 📊 Totales globales (para dashboards)
  globalStats: { total: 0, PENDIENTE: 0, EN_PROCESO: 0, LISTO: 0, ENTREGADO: 0 },

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
  fetchAllDocuments: async (page = 1, limit = 50) => {
    set({ loading: true, error: null });
    try {
      const result = await documentService.getAllDocuments({ page, limit });
      if (result.success) {
        const pagination = result.data.pagination || { currentPage: page, pageSize: limit, totalPages: 1 };
        set({
          documents: result.data.documents || [],
          totalDocuments: result.data.total || 0,
          pagination,
          loading: false
        });
        return true;
      } else {
        set({ error: result.error, loading: false });
        return false;
      }
    } catch (error) {
      console.error('Error in fetchAllDocuments:', error);
      set({ error: 'Error inesperado al cargar documentos', loading: false });
      return false;
    }
  },

  /**
   * 📊 Cargar estadísticas globales desde el backend
   */
  fetchGlobalStats: async () => {
    try {
      const result = await documentService.getGlobalStats();
      if (result.success) {
        set({ globalStats: result.data });
        return true;
      } else {
        console.error('Error obteniendo estadísticas globales:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error en fetchGlobalStats:', error);
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
   * @returns {Promise<Object>} Resultado completo de la operación con success, data, message, etc.
   */
  updateDocumentStatus: async (documentId, newStatus) => {
    set({ loading: true, error: null });
    
    try {
      const result = await documentService.updateDocumentStatus(documentId, newStatus);
      
      if (result.success && result.data && result.data.document) {
        const currentDocuments = get().documents;

        // Si la operación fue grupal, actualizar todos los documentos del grupo
        const groupInfo = result.data.groupOperation;
        let updatedDocuments = currentDocuments;

        if (groupInfo?.isGroupOperation && groupInfo?.groupId && Array.isArray(groupInfo?.allDocuments)) {
          const groupId = groupInfo.groupId;
          const docsById = new Map(groupInfo.allDocuments.map(d => [d.id, d]));

          updatedDocuments = currentDocuments.map(doc => {
            if (doc.documentGroupId === groupId) {
              const updated = docsById.get(doc.id);
              return updated ? { ...doc, ...updated } : doc;
            }
            // También actualizar el documento disparador por si no trae documentGroupId
            if (doc.id === documentId) {
              return { ...doc, ...result.data.document };
            }
            return doc;
          });
        } else {
          // Actualización individual (comportamiento existente)
          updatedDocuments = currentDocuments.map(doc => 
            doc.id === documentId ? { ...doc, ...result.data.document } : doc
          );
        }

        set({
          documents: updatedDocuments,
          loading: false
        });
        
        // Devolver el resultado completo para que el modal pueda usarlo
        return result;
      } else {
        set({ 
          error: result.error || result.message || 'Error desconocido', 
          loading: false 
        });
        
        // Devolver el resultado con error para que el modal pueda manejarlo
        return result;
      }
    } catch (error) {
      console.error('Error in updateDocumentStatus:', error);
      set({ 
        error: 'Error inesperado al actualizar estado', 
        loading: false 
      });
      
      // Devolver un objeto de error estructurado
      return {
        success: false,
        error: 'Error inesperado al actualizar estado',
        message: error.message
      };
    }
  },

  /**
   * GENERAL: Actualizar información de documento
   * @param {string} documentId - ID del documento
   * @param {Object} documentData - Datos actualizados del documento
   * @returns {Promise<boolean>} True si se actualizó exitosamente
   */
  updateDocument: async (documentId, documentData) => {
    try {
      const currentDocuments = get().documents;
      const targetDoc = currentDocuments.find(doc => doc.id === documentId);
      
      // 🔗 NUEVA FUNCIONALIDAD: Si el documento está agrupado y se actualizan campos compartidos
      if (targetDoc?.isGrouped && targetDoc?.documentGroupId) {
        const sharedFields = ['clientPhone', 'clientEmail', 'clientName'];
        const hasSharedUpdate = sharedFields.some(field => documentData[field] !== undefined);
        
        if (hasSharedUpdate) {
          console.log('🔗 Detectado cambio en campo compartido de grupo:', {
            documentId,
            groupId: targetDoc.documentGroupId,
            fields: Object.keys(documentData).filter(field => sharedFields.includes(field))
          });
          
          try {
            // Preparar datos compartidos para actualizar
            const sharedData = {};
            sharedFields.forEach(field => {
              if (documentData[field] !== undefined) {
                sharedData[field] = documentData[field];
              }
            });
            
            // Llamar al servicio para actualizar todo el grupo
            const result = await documentService.updateDocumentGroupInfo(
              targetDoc.documentGroupId, 
              sharedData
            );
            
            if (result.success) {
              console.log('✅ Información compartida actualizada en todo el grupo');
              
              // Actualizar todos los documentos del grupo en el store
              const updatedDocuments = currentDocuments.map(doc => {
                if (doc.documentGroupId === targetDoc.documentGroupId && doc.isGrouped) {
                  return { ...doc, ...sharedData, ...documentData };
                }
                return doc.id === documentId ? { ...doc, ...documentData } : doc;
              });
              
              set({ documents: updatedDocuments });
              return true;
            } else {
              console.error('❌ Error actualizando información del grupo:', result.error);
              // Continuar con actualización local como fallback
            }
          } catch (error) {
            console.error('💥 Error en actualización grupal, usando fallback:', error);
            // Continuar con actualización local como fallback
          }
        }
      }
      
      // Actualización local estándar (para documentos individuales o como fallback)
      const updatedDocuments = currentDocuments.map(doc => 
        doc.id === documentId ? { ...doc, ...documentData } : doc
      );
      
      set({ 
        documents: updatedDocuments
      });
      
      console.log('📝 Documento actualizado en store:', documentId, documentData);
      return true;
    } catch (error) {
      console.error('Error updating document in store:', error);
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
   * ============================================================================
   * SISTEMA DE CONFIRMACIONES Y DESHACER
   * Funciones conservadoras que extienden funcionalidad sin romper lo existente
   * ============================================================================
   */

  /**
   * Actualizar estado de documento con confirmación
   * Versión que retorna más información para sistema de confirmaciones
   * @param {string} documentId - ID del documento
   * @param {string} newStatus - Nuevo estado
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado detallado de la operación
   */
  updateDocumentStatusWithConfirmation: async (documentId, newStatus, options = {}) => {
    console.log('🏪 STORE: updateDocumentStatusWithConfirmation iniciado:', {
      documentId,
      newStatus,
      options
    });
    
    set({ loading: true, error: null });
    
    try {
      console.log('🌐 STORE: Llamando documentService.updateDocumentStatus...');
      const result = await documentService.updateDocumentStatus(documentId, newStatus, options);
      console.log('📊 STORE: Respuesta del service:', result);
      
      if (result.success) {
        console.log('✅ STORE: Service respondió exitosamente');
        
        const currentDocuments = get().documents;
        let updatedDocuments = currentDocuments;
        const groupInfo = result.data?.groupOperation;

        if (groupInfo?.isGroupOperation && groupInfo?.groupId && Array.isArray(groupInfo?.allDocuments)) {
          const groupId = groupInfo.groupId;
          const docsById = new Map(groupInfo.allDocuments.map(d => [d.id, d]));
          updatedDocuments = currentDocuments.map(doc => {
            if (doc.documentGroupId === groupId) {
              const updated = docsById.get(doc.id);
              return updated ? { ...doc, ...updated } : doc;
            }
            if (doc.id === documentId) {
              return { ...doc, ...result.data.document };
            }
            return doc;
          });
        } else {
          updatedDocuments = currentDocuments.map(doc => 
            doc.id === documentId ? { ...doc, ...result.data.document } : doc
          );
        }

        console.log('📝 STORE: Actualizando documentos en el estado local');
        console.log('📊 STORE: Documento actualizado:', result.data.document);
        set({ 
          documents: updatedDocuments,
          loading: false 
        });
        
        // Forzar re-render para asegurar actualización visual
        setTimeout(() => {
          set({ documents: [...updatedDocuments] });
        }, 100);

        // Retornar información extendida para el sistema de confirmaciones
        const changeInfo = {
          documentId,
          document: result.data.document,
          newStatus,
          previousStatus: result.data.changes?.previousStatus,
          whatsappSent: result.data.whatsapp?.sent || false,
          verificationCodeGenerated: result.data.changes?.verificationCodeGenerated || false,
          changeId: null, // Se puede agregar si el backend lo retorna
          timestamp: new Date().toISOString()
        };
        
        console.log('📄 STORE: ChangeInfo generado:', changeInfo);
        
        return {
          success: true,
          document: result.data.document,
          changeInfo
        };
      } else {
        console.error('❌ STORE: Service falló:', result.error);
        set({ 
          error: result.error, 
          loading: false 
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('💥 STORE: Error en updateDocumentStatusWithConfirmation:', error);
      set({ 
        error: 'Error inesperado al actualizar estado', 
        loading: false 
      });
      return { success: false, error: 'Error inesperado al actualizar estado' };
    }
  },

  /**
   * Deshacer cambio de estado de documento
   * @param {Object} changeInfo - Información del cambio a deshacer
   * @returns {Promise<Object>} Resultado de la operación de deshacer
   */
  undoDocumentStatusChange: async (changeInfo) => {
    set({ loading: true, error: null });
    
    try {
      const result = await documentService.undoDocumentStatusChange({
        documentId: changeInfo.documentId,
        changeId: changeInfo.changeId
      });
      
      if (result.success) {
        // Actualizar documento en la lista local
        const currentDocuments = get().documents;
        const updatedDocuments = currentDocuments.map(doc => 
          doc.id === changeInfo.documentId ? result.data.document : doc
        );
        
        set({ 
          documents: updatedDocuments,
          loading: false 
        });

        return {
          success: true,
          document: result.data.document,
          undoInfo: result.data.undo
        };
      } else {
        set({ 
          error: result.error, 
          loading: false 
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error in undoDocumentStatusChange:', error);
      set({ 
        error: 'Error inesperado al deshacer cambio', 
        loading: false 
      });
      return { success: false, error: 'Error inesperado al deshacer cambio' };
    }
  },

  /**
   * Obtener cambios deshacibles de un documento
   * @param {string} documentId - ID del documento
   * @returns {Promise<Object>} Lista de cambios deshacibles
   */
  getUndoableChanges: async (documentId) => {
    try {
      const result = await documentService.getUndoableChanges(documentId);
      
      if (result.success) {
        return {
          success: true,
          undoableChanges: result.data.undoableChanges || []
        };
      } else {
        console.error('Error fetching undoable changes:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error in getUndoableChanges:', error);
      return { success: false, error: 'Error inesperado al obtener cambios deshacibles' };
    }
  },

  /**
   * Verificar si un cambio de estado requiere confirmación
   * @param {string} fromStatus - Estado actual
   * @param {string} toStatus - Estado objetivo
   * @returns {Object} Información sobre si requiere confirmación
   */
  requiresConfirmation: (fromStatus, toStatus) => {
    // Obtener usuario actual
    const currentUser = useAuthStore.getState().user;
    const userRole = currentUser?.role;

    // Cambios críticos que disparan WhatsApp
    const criticalChanges = [
      { from: 'EN_PROCESO', to: 'LISTO' },
      { from: 'LISTO', to: 'ENTREGADO' }
    ];

    // Verificar si es cambio crítico
    const isCritical = criticalChanges.some(
      change => change.from === fromStatus && change.to === toStatus
    );

    // Verificar si es reversión (movimiento hacia atrás)
    const statusOrder = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const fromIndex = statusOrder.indexOf(fromStatus);
    const toIndex = statusOrder.indexOf(toStatus);
    const isReversion = fromIndex > toIndex;

    // NUEVA LÓGICA: Para MATRIZADOR y ARCHIVO, entrega directa simplificada
    if ((userRole === 'MATRIZADOR' || userRole === 'ARCHIVO') && 
        fromStatus === 'LISTO' && toStatus === 'ENTREGADO') {
      return {
        requiresConfirmation: true,
        isCritical: false,
        isReversion: false,
        isDirectDelivery: true,
        type: 'direct_delivery',
        reason: 'Confirmar entrega directa por matrizador/archivo',
        userRole: userRole
      };
    }

    return {
      requiresConfirmation: isCritical || isReversion,
      isCritical,
      isReversion,
      isDirectDelivery: false,
      type: isCritical ? 'critical' : isReversion ? 'reversion' : 'normal',
      reason: isCritical ? 
        'Este cambio enviará notificaciones automáticas al cliente' :
        isReversion ? 
        'Esta es una reversión que puede confundir al cliente' :
        'Cambio normal',
      userRole: userRole
    };
  },

  /**
   * ============================================================================
   * SISTEMA DE AGRUPACIÓN DE DOCUMENTOS
   * Funciones para manejar agrupación y entrega grupal
   * ============================================================================
   */

  /**
   * Crear grupo de documentos
   * @param {Array} documentIds - IDs de documentos a agrupar
   * @returns {Promise<Object>} Resultado de la operación
   */
  createDocumentGroup: async (documentIds) => {
    set({ loading: true, error: null });
    
    try {
      console.log('🔗 Creando grupo con documentos:', documentIds);
      
      const result = await documentService.createDocumentGroup({
        documentIds,
        sendNotification: true // Enviar notificación automáticamente
      });
      
      if (result.success) {
        // Recargar documentos para mostrar los cambios
        await get().fetchMyDocuments();
        
        set({ loading: false });
        
        console.log('✅ Grupo creado exitosamente:', result);
        
        return {
          success: true,
          group: result.group,
          verificationCode: result.verificationCode,
          message: result.message,
          whatsapp: result.whatsapp || null
        };
      } else {
        set({ 
          error: result.message, 
          loading: false 
        });
        return { success: false, error: result.message };
      }
    } catch (error) {
      console.error('Error creando grupo:', error);
      const errorMessage = error.message || 'Error inesperado al crear grupo';
      set({ 
        error: errorMessage, 
        loading: false 
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * 🔓 Desagrupar documento
   * @param {string} documentId - ID del documento a desagrupar
   * @returns {Promise<Object>} Resultado de la operación
   */
  ungroupDocument: async (documentId) => {
    set({ loading: true, error: null });
    try {
      // Optimistic update: quitar flags de grupo del documento mientras se llama al backend
      const currentDocs = get().documents;
      const optimisticDocs = currentDocs.map(doc => doc.id === documentId ? { ...doc, isGrouped: false, documentGroupId: null, groupCode: null } : doc);
      set({ documents: optimisticDocs });

      const result = await documentService.ungroupDocument(documentId);
      if (result.success) {
        // Refrescar lista de documentos del usuario si aplica
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.role === 'MATRIZADOR' || currentUser?.role === 'ARCHIVO') {
          await useDocumentStore.getState().fetchMyDocuments();
        } else {
          await useDocumentStore.getState().fetchAllDocuments();
        }
        set({ loading: false });
        return { success: true, message: result.message, data: result.data };
      }
      // Rollback si falla
      set({ documents: currentDocs });
      set({ loading: false, error: result.message || 'Error al desagrupar documento' });
      return { success: false, error: result.message };
    } catch (error) {
      console.error('Error en ungroupDocument:', error);
      // Rollback
      const originalDocs = get().documents;
      set({ documents: originalDocs });
      set({ loading: false, error: 'Error inesperado al desagrupar documento' });
      return { success: false, error: 'Error inesperado al desagrupar documento' };
    }
  },

  /**
   * Detectar documentos agrupables
   * @param {Object} clientData - Datos del cliente
   * @returns {Promise<Object>} Documentos agrupables
   */
  detectGroupableDocuments: async (clientData) => {
    try {
      const result = await documentService.detectGroupableDocuments(clientData);
      return result;
    } catch (error) {
      console.error('Error detectando documentos agrupables:', error);
      return { success: false, error: error.message };
    }
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
