import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * Hook personalizado para paginación "Cargar más"
 * Maneja la lógica de carga incremental de documentos
 */
const usePagination = (items = [], initialPageSize = 10, incrementSize = 10) => {
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Documentos visibles según el tamaño de página actual
   */
  const visibleItems = useMemo(() => {
    return items.slice(0, currentPageSize);
  }, [items, currentPageSize]);

  /**
   * Verificar si hay más elementos para cargar
   */
  const hasMore = useMemo(() => {
    return items.length > currentPageSize;
  }, [items.length, currentPageSize]);

  /**
   * Número de elementos restantes
   */
  const remainingCount = useMemo(() => {
    return Math.max(0, items.length - currentPageSize);
  }, [items.length, currentPageSize]);

  /**
   * Cargar más elementos
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // Simular una pequeña pausa para UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentPageSize(prev => prev + incrementSize);
    setIsLoading(false);
  }, [isLoading, hasMore, incrementSize]);

  /**
   * Reiniciar paginación (útil cuando cambian los filtros)
   */
  const reset = useCallback(() => {
    setCurrentPageSize(initialPageSize);
    setIsLoading(false);
  }, [initialPageSize]);

  /**
   * Ajustar tamaño de página si los elementos cambian
   */
  const adjustPageSize = useCallback((newItems) => {
    // Si hay menos elementos que el tamaño actual, ajustar
    if (newItems.length < currentPageSize && newItems.length > 0) {
      setCurrentPageSize(Math.max(initialPageSize, newItems.length));
    }
  }, [currentPageSize, initialPageSize]);

  /**
   * Optimización automática: Reiniciar paginación cuando items cambian drásticamente
   */
  useEffect(() => {
    if (items.length === 0) {
      setCurrentPageSize(initialPageSize);
    }
  }, [items.length, initialPageSize]);

  return {
    visibleItems,
    hasMore,
    remainingCount,
    isLoading,
    loadMore,
    reset,
    adjustPageSize,
    currentPageSize
  };
};

export default usePagination;