import { create } from 'zustand';
import receptionService from '../services/reception-service';

/**
 * 🎯 Store de recepciones unificado para UI Activos/Entregados
 * Maneja estado global para la nueva interfaz de recepción con pestañas y búsqueda global
 */
const useReceptionsStore = create((set, get) => ({
  // 🔍 DEBUG: Log de inicialización del store
  _initialized: (() => {
    console.log('📦 RECEPTIONS-STORE initialized');
    return true;
  })(),
  // Estado inicial
  tab: 'ACTIVOS', // 'ACTIVOS' | 'ENTREGADOS'
  query: '',
  clientId: null,
  page: 1,
  pageSize: parseInt(localStorage.getItem('receptionsPageSize')) || 25,

  // Datos
  documents: [],
  total: 0,
  pages: 1,
  counts: { ACTIVOS: 0, ENTREGADOS: 0 },

  // Estados de UI
  loading: false,
  loadingCounts: false,
  error: null,
  searchDebounceTimer: null,

  /**
   * Establecer pestaña activa
   * @param {string} tab - Nueva pestaña ('ACTIVOS' | 'ENTREGADOS')
   */
  setTab: (tab) => {
    if (!['ACTIVOS', 'ENTREGADOS'].includes(tab)) return;

    set({
      tab,
      page: 1, // Resetear página al cambiar de pestaña
      query: '', // Limpiar búsqueda al cambiar de pestaña
      clientId: null // Limpiar filtro de cliente
    });

    // Recargar datos con nueva pestaña
    get().fetchDocuments();
    get().fetchCounts();
  },

  /**
   * Establecer término de búsqueda
   * @param {string} query - Nuevo término de búsqueda
   */
  setQuery: (query) => {
    set({ query, page: 1 }); // Resetear página al buscar

    // Debounce para optimizar rendimiento
    const timer = get().searchDebounceTimer;
    if (timer) clearTimeout(timer);

    const newTimer = setTimeout(() => {
      get().fetchDocuments();
      get().fetchCounts();
    }, 300); // 300ms debounce

    set({ searchDebounceTimer: newTimer });
  },

  /**
   * Establecer filtro de cliente
   * @param {string} clientId - ID del cliente para filtrar
   */
  setClientId: (clientId) => {
    set({ clientId, page: 1 }); // Resetear página al filtrar

    // Recargar datos inmediatamente
    get().fetchDocuments();
    get().fetchCounts();
  },

  /**
   * Limpiar filtro de cliente
   */
  clearClientId: () => {
    set({ clientId: null, page: 1 });

    // Recargar datos
    get().fetchDocuments();
    get().fetchCounts();
  },

  /**
   * Establecer página actual
   * @param {number} page - Nueva página
   */
  setPage: (page) => {
    set({ page });
    get().fetchDocuments();
  },

  /**
   * Establecer tamaño de página
   * @param {number} pageSize - Nuevo tamaño de página
   */
  setPageSize: (pageSize) => {
    if (![25, 50, 100].includes(pageSize)) return;

    set({ pageSize, page: 1 }); // Resetear página al cambiar tamaño

    // Persistir en localStorage
    localStorage.setItem('receptionsPageSize', pageSize.toString());

    // Recargar datos
    get().fetchDocuments();
  },

  /**
   * Cargar recepciones desde API (cliente HTTP unificado)
   */
  fetchDocuments: async () => {
    const { tab, query, clientId, page, pageSize } = get();
    set({ loading: true, error: null });
    try {
      const params = {
        tab,
        page,
        pageSize,
        ...(query?.trim() ? { query: query.trim() } : {}),
        ...(clientId ? { clientId } : {}),
      };
      const result = await receptionService.getUnifiedReceptions(params);
      if (result.success) {
        const data = result.data || {};
        set({
          documents: data.items || [],
          total: data.total || 0,
          pages: data.pages || 1,
          loading: false
        });
      } else {
        set({
          error: result.error || 'Error al cargar recepciones',
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching receptions:', error);
      set({
        error: error.message || 'Error al cargar recepciones',
        loading: false
      });
    }
  },

  /**
   * Cargar conteos para badges (cliente HTTP unificado)
   */
  fetchCounts: async () => {
    const { query, clientId } = get();
    set({ loadingCounts: true });
    try {
      const params = {
        ...(query?.trim() ? { query: query.trim() } : {}),
        ...(clientId ? { clientId } : {}),
      };
      const result = await receptionService.getUnifiedCounts(params);
      if (result.success) {
        set({
          counts: result.data || { ACTIVOS: 0, ENTREGADOS: 0 },
          loadingCounts: false
        });
      } else {
        set({ loadingCounts: false });
      }
    } catch (error) {
      console.error('Error fetching reception counts:', error);
      set({ loadingCounts: false });
    }
  },

  /**
   * Recargar datos (útil después de cambios)
   */
  refresh: () => {
    get().fetchDocuments();
    get().fetchCounts();
  },

  /**
   * Limpiar todos los filtros
   */
  clearFilters: () => {
    set({
      query: '',
      clientId: null,
      page: 1
    });

    get().fetchDocuments();
    get().fetchCounts();
  },

  /**
   * Limpiar error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Obtener estadísticas calculadas
   */
  getStats: () => {
    const { documents, tab } = get();

    return {
      currentTab: tab,
      totalInView: documents.length,
      hasFilters: !!(get().query || get().clientId),
      isLoading: get().loading,
      hasError: !!get().error
    };
  },

  /**
   * Verificar si hay resultados
   */
  hasResults: () => {
    return get().documents.length > 0;
  },

  /**
   * Verificar si está vacío (sin resultados)
   */
  isEmpty: () => {
    return !get().loading && get().documents.length === 0 && !get().error;
  },

  /**
   * Limpiar estado completo
   */
  clearAll: () => {
    const timer = get().searchDebounceTimer;
    if (timer) clearTimeout(timer);

    set({
      tab: 'ACTIVOS',
      query: '',
      clientId: null,
      page: 1,
      documents: [],
      total: 0,
      pages: 1,
      counts: { ACTIVOS: 0, ENTREGADOS: 0 },
      loading: false,
      loadingCounts: false,
      error: null,
      searchDebounceTimer: null
    });
  }
}));

export default useReceptionsStore;