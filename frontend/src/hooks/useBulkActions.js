import { useState, useCallback, useMemo } from 'react';
import documentService from '../services/document-service';

/**
 * Hook para manejar operaciones masivas en documentos
 * Permite seleccionar múltiples documentos del mismo estado y cambiar estado en lote
 */
const useBulkActions = () => {
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Definir transiciones válidas para operaciones masivas
  const VALID_BULK_TRANSITIONS = {
    'EN_PROCESO': ['AGRUPADO', 'LISTO'],
    'AGRUPADO': ['LISTO', 'EN_PROCESO'],
    'LISTO': [] // No permitimos LISTO → ENTREGADO en masa (requiere info específica)
  };

  const MAX_BULK_SELECTION = 50;

  /**
   * Obtener estado común de documentos seleccionados
   */
  const getCommonStatus = useCallback((documents) => {
    if (!documents || documents.length === 0) return null;
    
    const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));
    if (selectedDocs.length === 0) return null;

    const statuses = selectedDocs.map(doc => doc.status);
    const uniqueStatuses = [...new Set(statuses)];
    
    // Solo retornar si todos tienen el mismo estado
    return uniqueStatuses.length === 1 ? uniqueStatuses[0] : null;
  }, [selectedDocuments]);

  /**
   * Obtener transiciones válidas para el estado común
   */
  const getValidTransitions = useCallback((documents) => {
    const commonStatus = getCommonStatus(documents);
    if (!commonStatus) return [];
    
    return VALID_BULK_TRANSITIONS[commonStatus] || [];
  }, [getCommonStatus]);

  /**
   * Alternar selección de un documento
   */
  const toggleDocumentSelection = useCallback((documentId, documentStatus, allDocuments) => {
    setSelectedDocuments(prev => {
      const newSelection = new Set(prev);
      
      if (newSelection.has(documentId)) {
        // Deseleccionar
        newSelection.delete(documentId);
        
        // Si no hay documentos seleccionados, salir del modo bulk
        if (newSelection.size === 0) {
          setBulkActionMode(false);
        }
      } else {
        // Verificar límite máximo
        if (newSelection.size >= MAX_BULK_SELECTION) {
          return prev;
        }

        // Verificar compatibilidad de estado
        const currentCommonStatus = getCommonStatus(allDocuments);
        
        if (currentCommonStatus && currentCommonStatus !== documentStatus) {
          // Si hay documentos seleccionados de diferente estado, limpiar selección
          newSelection.clear();
        }
        
        // Agregar nuevo documento
        newSelection.add(documentId);
        
        // Activar modo bulk si es el primer documento seleccionado
        if (!bulkActionMode) {
          setBulkActionMode(true);
        }
      }

      return newSelection;
    });
  }, [bulkActionMode, getCommonStatus]);

  /**
   * Seleccionar/deseleccionar todos los documentos visibles del mismo estado
   */
  const toggleSelectAll = useCallback((documents, selectAll) => {
    if (selectAll) {
      // Seleccionar todos los documentos visibles del mismo estado
      if (documents.length === 0) return;
      
      // Tomar el estado del primer documento como referencia
      const referenceStatus = documents[0].status;
      const compatibleDocs = documents
        .filter(doc => doc.status === referenceStatus)
        .slice(0, MAX_BULK_SELECTION); // Respetar límite máximo
      
      const newSelection = new Set(compatibleDocs.map(doc => doc.id));
      setSelectedDocuments(newSelection);
      setBulkActionMode(newSelection.size > 0);
    } else {
      // Deseleccionar todos
      setSelectedDocuments(new Set());
      setBulkActionMode(false);
      
    }
  }, []);

  /**
   * Limpiar selección
   */
  const clearSelection = useCallback(() => {
    setSelectedDocuments(new Set());
    setBulkActionMode(false);
  }, []);

  /**
   * Ejecutar cambio de estado masivo
   */
  const executeBulkStatusChange = useCallback(async (documents, newStatus, options = {}) => {
    const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));
    
    if (selectedDocs.length === 0) {
      throw new Error('No hay documentos seleccionados');
    }

    const commonStatus = getCommonStatus(documents);
    if (!commonStatus) {
      throw new Error('Los documentos seleccionados deben tener el mismo estado');
    }

    const validTransitions = VALID_BULK_TRANSITIONS[commonStatus] || [];
    if (!validTransitions.includes(newStatus)) {
      throw new Error(`Transición no válida: ${commonStatus} → ${newStatus}`);
    }

    setIsExecuting(true);

    try {
      // Llamar al servicio backend para cambio masivo
      const response = await documentService.bulkStatusChange({
        documentIds: Array.from(selectedDocuments),
        fromStatus: commonStatus,
        toStatus: newStatus,
        ...options
      });

      if (response.success) {
        // Limpiar selección después del éxito
        clearSelection();
        
        return response;
      } else {
        throw new Error(response.message || 'Error en cambio masivo');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [selectedDocuments, getCommonStatus, clearSelection]);

  /**
   * Información de selección actual
   */
  const selectionInfo = useMemo(() => ({
    count: selectedDocuments.size,
    isActive: bulkActionMode,
    isExecuting,
    maxReached: selectedDocuments.size >= MAX_BULK_SELECTION,
    canSelectMore: selectedDocuments.size < MAX_BULK_SELECTION
  }), [selectedDocuments.size, bulkActionMode, isExecuting]);

  /**
   * Verificar si un documento puede ser seleccionado
   */
  const canSelectDocument = useCallback((document, allDocuments) => {
    // Si no hay selección, cualquier documento es válido
    if (selectedDocuments.size === 0) return true;
    
    // Si ya está seleccionado, puede ser deseleccionado
    if (selectedDocuments.has(document.id)) return true;
    
    // Verificar límite
    if (selectedDocuments.size >= MAX_BULK_SELECTION) return false;
    
    // Verificar compatibilidad de estado
    const commonStatus = getCommonStatus(allDocuments);
    return !commonStatus || commonStatus === document.status;
  }, [selectedDocuments, getCommonStatus]);

  return {
    // Estado
    selectedDocuments,
    bulkActionMode,
    isExecuting,
    selectionInfo,
    
    // Funciones
    toggleDocumentSelection,
    toggleSelectAll,
    clearSelection,
    executeBulkStatusChange,
    
    // Utilidades
    getCommonStatus,
    getValidTransitions,
    canSelectDocument,
    
    // Constantes
    MAX_BULK_SELECTION,
    VALID_BULK_TRANSITIONS
  };
};

export default useBulkActions;