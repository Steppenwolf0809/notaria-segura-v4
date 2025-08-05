import { useState, useEffect, useCallback, useMemo } from 'react';
import useDocumentStore from '../store/document-store';
import documentService from '../services/document-service';

/**
 * Hook personalizado mejorado para gestión avanzada de documentos
 * Centraliza toda la lógica de documentos con funcionalidades avanzadas
 */
const useDocuments = (options = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 segundos
    enableCache = true,
    enableOptimisticUpdates = true,
    filters = {},
    sorting = { field: 'createdAt', direction: 'desc' }
  } = options;

  // Store básico
  const {
    documents,
    loading,
    error,
    fetchMyDocuments,
    updateDocumentStatus: storeUpdateStatus,
    getDocumentsByStatus,
    searchDocuments,
    clearError
  } = useDocumentStore();

  // Estados locales del hook
  const [localLoading, setLocalLoading] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState(new Map());
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [cache, setCache] = useState(new Map());

  /**
   * Documentos con actualizaciones optimistas aplicadas
   */
  const optimizedDocuments = useMemo(() => {
    if (!enableOptimisticUpdates || optimisticUpdates.size === 0) {
      return documents;
    }

    return documents.map(doc => {
      const optimisticUpdate = optimisticUpdates.get(doc.id);
      return optimisticUpdate ? { ...doc, ...optimisticUpdate } : doc;
    });
  }, [documents, optimisticUpdates, enableOptimisticUpdates]);

  /**
   * Documentos filtrados y ordenados
   */
  const processedDocuments = useMemo(() => {
    let processed = [...optimizedDocuments];

    // Aplicar filtros
    if (filters.status) {
      processed = processed.filter(doc => doc.status === filters.status);
    }
    if (filters.type) {
      processed = processed.filter(doc => doc.documentType === filters.type);
    }
    if (filters.dateRange) {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        processed = processed.filter(doc => new Date(doc.createdAt) >= startDate);
      }
    }
    if (filters.search) {
      processed = searchDocuments(filters.search);
    }

    // Aplicar ordenamiento
    processed.sort((a, b) => {
      let aValue = a[sorting.field];
      let bValue = b[sorting.field];

      if (sorting.field === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sorting.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return processed;
  }, [optimizedDocuments, filters, sorting, searchDocuments]);

  /**
   * Cargar documentos con cache opcional
   */
  const loadDocuments = useCallback(async (force = false) => {
    const cacheKey = 'documents_list';
    
    if (enableCache && !force && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      const isExpired = Date.now() - cachedData.timestamp > 5 * 60 * 1000; // 5 minutos
      
      if (!isExpired) {
        return cachedData.data;
      }
    }

    setLocalLoading(true);
    try {
      const success = await fetchMyDocuments();
      
      if (success && enableCache) {
        setCache(prev => new Map(prev).set(cacheKey, {
          data: documents,
          timestamp: Date.now()
        }));
      }
      
      setLastRefresh(new Date());
      setRefreshCount(prev => prev + 1);
      return success;
    } catch (err) {
      console.error('Error loading documents:', err);
      throw err;
    } finally {
      setLocalLoading(false);
    }
  }, [fetchMyDocuments, documents, enableCache, cache]);

  /**
   * Actualizar estado de documento con actualización optimista
   */
  const updateDocumentStatus = useCallback(async (documentId, newStatus, options = {}) => {
    const { optimistic = enableOptimisticUpdates, onSuccess, onError } = options;

    // Actualización optimista
    if (optimistic) {
      setOptimisticUpdates(prev => new Map(prev).set(documentId, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }));
    }

    try {
      const success = await storeUpdateStatus(documentId, newStatus);
      
      if (success) {
        // Limpiar actualización optimista
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(documentId);
          return newMap;
        });

        // Invalidar cache
        if (enableCache) {
          setCache(prev => {
            const newCache = new Map(prev);
            newCache.delete('documents_list');
            return newCache;
          });
        }

        onSuccess?.(documentId, newStatus);
        return success;
      } else {
        // Revertir actualización optimista en caso de error
        if (optimistic) {
          setOptimisticUpdates(prev => {
            const newMap = new Map(prev);
            newMap.delete(documentId);
            return newMap;
          });
        }
        onError?.(documentId, newStatus);
        return success;
      }
    } catch (error) {
      // Revertir actualización optimista
      if (optimistic) {
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(documentId);
          return newMap;
        });
      }
      onError?.(documentId, newStatus, error);
      throw error;
    }
  }, [storeUpdateStatus, enableOptimisticUpdates, enableCache]);

  /**
   * Operaciones en lote para múltiples documentos
   */
  const batchUpdateStatus = useCallback(async (documentIds, newStatus) => {
    const results = [];
    
    for (const docId of documentIds) {
      try {
        const result = await updateDocumentStatus(docId, newStatus, { optimistic: false });
        results.push({ id: docId, success: result?.success || false, result });
      } catch (error) {
        results.push({ id: docId, success: false, error: error.message });
      }
    }

    // Refrescar después de operaciones en lote
    await loadDocuments(true);
    
    return results;
  }, [updateDocumentStatus, loadDocuments]);

  /**
   * Obtener documento por ID con cache
   */
  const getDocumentById = useCallback(async (documentId, useCache = true) => {
    const cacheKey = `document_${documentId}`;
    
    if (useCache && enableCache && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      const isExpired = Date.now() - cachedData.timestamp > 2 * 60 * 1000; // 2 minutos
      
      if (!isExpired) {
        return cachedData.data;
      }
    }

    try {
      const result = await documentService.getDocumentById(documentId);
      
      if (result.success && enableCache) {
        setCache(prev => new Map(prev).set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }, [enableCache, cache]);

  /**
   * Filtros y búsqueda avanzada
   */
  const filterDocuments = useCallback((filterOptions) => {
    return processedDocuments.filter(doc => {
      // Filtro por estado
      if (filterOptions.status && doc.status !== filterOptions.status) {
        return false;
      }

      // Filtro por tipo
      if (filterOptions.type && doc.documentType !== filterOptions.type) {
        return false;
      }

      // Filtro por valor mínimo
      if (filterOptions.minValue && doc.actoPrincipalValor < filterOptions.minValue) {
        return false;
      }

      // Filtro por valor máximo
      if (filterOptions.maxValue && doc.actoPrincipalValor > filterOptions.maxValue) {
        return false;
      }

      // Filtro por cliente
      if (filterOptions.clientName) {
        const clientMatch = doc.clientName?.toLowerCase().includes(filterOptions.clientName.toLowerCase());
        if (!clientMatch) return false;
      }

      // Filtro por urgencia (días en proceso)
      if (filterOptions.urgency) {
        const daysDiff = Math.floor((new Date() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24));
        
        switch (filterOptions.urgency) {
          case 'low':
            if (daysDiff > 1) return false;
            break;
          case 'medium':
            if (daysDiff <= 1 || daysDiff > 3) return false;
            break;
          case 'high':
            if (daysDiff <= 3) return false;
            break;
        }
      }

      return true;
    });
  }, [processedDocuments]);

  /**
   * Estadísticas avanzadas
   */
  const getAdvancedStats = useCallback(() => {
    const stats = {
      total: processedDocuments.length,
      byStatus: {},
      byType: {},
      avgProcessingTime: 0,
      totalValue: 0,
      urgentCount: 0
    };

    processedDocuments.forEach(doc => {
      // Por estado
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
      
      // Por tipo
      stats.byType[doc.documentType] = (stats.byType[doc.documentType] || 0) + 1;
      
      // Valor total
      stats.totalValue += doc.actoPrincipalValor || 0;
      
      // Documentos urgentes (más de 2 días)
      const daysDiff = Math.floor((new Date() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24));
      if (daysDiff > 2 && doc.status === 'EN_PROCESO') {
        stats.urgentCount++;
      }
    });

    return stats;
  }, [processedDocuments]);

  /**
   * Auto-refresh con intervalo
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadDocuments]);

  /**
   * Cargar documentos inicialmente
   */
  useEffect(() => {
    loadDocuments();
  }, [fetchMyDocuments]); // Dependencia estable

  /**
   * Limpiar cache cuando cambian los filtros
   */
  useEffect(() => {
    if (enableCache) {
      setCache(new Map());
    }
  }, [filters, enableCache]);

  return {
    // Datos
    documents: processedDocuments,
    allDocuments: optimizedDocuments,
    originalDocuments: documents,
    
    // Estados
    loading: loading || localLoading,
    error,
    lastRefresh,
    refreshCount,
    hasOptimisticUpdates: optimisticUpdates.size > 0,

    // Funciones principales
    loadDocuments,
    updateDocumentStatus,
    batchUpdateStatus,
    getDocumentById,

    // Filtros y búsqueda
    filterDocuments,
    getDocumentsByStatus,
    searchDocuments,

    // Estadísticas
    getAdvancedStats,

    // Utilidades
    clearError,
    clearCache: useCallback(() => setCache(new Map()), []),
    clearOptimisticUpdates: useCallback(() => setOptimisticUpdates(new Map()), []),

    // Configuración
    config: {
      autoRefresh,
      refreshInterval,
      enableCache,
      enableOptimisticUpdates,
      filters,
      sorting
    },

    // Métodos avanzados
    utils: {
      // Agrupar documentos por criterio
      groupBy: useCallback((field) => {
        return processedDocuments.reduce((groups, doc) => {
          const key = doc[field] || 'Sin especificar';
          if (!groups[key]) groups[key] = [];
          groups[key].push(doc);
          return groups;
        }, {});
      }, [processedDocuments]),

      // Obtener documentos en rango de fechas
      getDocumentsInDateRange: useCallback((startDate, endDate) => {
        return processedDocuments.filter(doc => {
          const docDate = new Date(doc.createdAt);
          return docDate >= startDate && docDate <= endDate;
        });
      }, [processedDocuments]),

      // Calcular tiempo promedio por estado
      getAverageTimeByStatus: useCallback(() => {
        const timesByStatus = {};
        
        processedDocuments.forEach(doc => {
          if (!timesByStatus[doc.status]) {
            timesByStatus[doc.status] = [];
          }
          
          const daysDiff = Math.floor((new Date() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24));
          timesByStatus[doc.status].push(daysDiff);
        });

        Object.keys(timesByStatus).forEach(status => {
          const times = timesByStatus[status];
          timesByStatus[status] = times.reduce((sum, time) => sum + time, 0) / times.length;
        });

        return timesByStatus;
      }, [processedDocuments]),

      // Validar transición de estado
      isValidStatusTransition: useCallback((fromStatus, toStatus) => {
        const validTransitions = {
          'PENDIENTE': ['EN_PROCESO'],
          'EN_PROCESO': ['LISTO', 'PENDIENTE'],
          'LISTO': ['ENTREGADO', 'EN_PROCESO'],
          'ENTREGADO': []
        };
        
        return validTransitions[fromStatus]?.includes(toStatus) || false;
      }, [])
    }
  };
};

export default useDocuments;