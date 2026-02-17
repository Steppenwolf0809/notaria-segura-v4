import { useState, useEffect, useCallback, useRef } from 'react';
import documentService from '../services/document-service';
import notificationsService from '../services/notifications-service';

/**
 * Hook personalizado para manejar el historial de documentos
 * Gestiona la obtención y visualización del timeline de eventos con API real
 */
const useDocumentHistory = (documentId, options = {}) => {
  // Usar ref para estabilizar opciones y evitar re-fetches innecesarios
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const {
    limit = 50,
    eventType = null,
    autoRefresh = false,
    refreshInterval = 30000, // 30 segundos
    enabled = true,
    fallbackToSimulated = true // Fallback a datos simulados si falla la API
  } = optionsRef.current;

  // Ref para prevenir fetches duplicados
  const fetchInProgressRef = useRef(false);
  const lastFetchedDocIdRef = useRef(null);

  const [state, setState] = useState({
    history: [],
    document: null,
    permissions: null,
    loading: true, // Iniciar en true para mostrar skeleton mientras carga
    error: null,
    pagination: {
      total: 0,
      limit: 50,
      offset: 0,
      hasMore: false
    },
    usingRealData: false,
    initialized: false // Track si ya se intentó cargar al menos una vez
  });

  /**
   * Cargar historial del documento usando la API real
   */
  const fetchHistory = useCallback(async (offset = 0) => {
    // Si no hay documentId o no está habilitado, marcar como inicializado sin datos
    if (!documentId || !enabled) {
      setState(prev => ({
        ...prev,
        loading: false,
        initialized: true,
        history: [],
        error: null
      }));
      return;
    }

    // Prevenir fetches duplicados solo para offset 0 (carga inicial)
    if (fetchInProgressRef.current && offset === 0) {
      console.log('useDocumentHistory: Fetch already in progress, skipping duplicate');
      return;
    }

    fetchInProgressRef.current = true;
    lastFetchedDocIdRef.current = documentId;

    setState(prev => ({ ...prev, loading: true, error: null }));

    console.log('[useDocumentHistory] fetchHistory starting for', documentId, { offset, enabled });

    try {
      // Obtener opciones actuales del ref
      const currentOptions = optionsRef.current;
      const currentLimit = currentOptions.limit || 50;
      const currentEventType = currentOptions.eventType || null;
      const currentFallback = currentOptions.fallbackToSimulated !== false;

      // Intentar obtener historial real de la API
      const params = {
        limit: currentLimit,
        offset,
        ...(currentEventType && { eventType: currentEventType })
      };

      console.log('useDocumentHistory: fetching', documentId, 'with params', params);
      const response = await documentService.getDocumentHistory(documentId, params);
      console.log('useDocumentHistory: response for', documentId, response);

      if (response.success && response.data) {
        const { document, history, permissions } = response.data;

        // Formatear eventos para el componente Timeline
        const formattedEvents = (history.events || []).map(event => ({
          id: event.id,
          type: event.type,
          title: event.title || getEventTitle(event.type),
          description: event.description,
          timestamp: event.timestamp,
          user: event.user ? `${event.user.name} (${event.user.role})` : 'Sistema',
          icon: event.icon || getEventIcon(event.type),
          color: event.color || getEventColor(event.type),
          contextInfo: event.contextInfo || [], // Nueva información contextual
          metadata: event.details || {}, // Mantener para compatibilidad
          // Solo mostrar metadata técnica para administradores
          technicalDetails: event.metadata || null
        }));

        setState(prev => ({
          ...prev,
          history: formattedEvents,
          document,
          permissions,
          pagination: history.pagination || prev.pagination,
          loading: false,
          error: null,
          usingRealData: true,
          initialized: true
        }));

        fetchInProgressRef.current = false;
        return;
      } else {
        console.warn('⚠️ API returned success=false for history:', response);
        fetchInProgressRef.current = false;

        if (currentFallback) {
          console.log('🔄 Falling back to simulated history due to API failure response');
          await loadSimulatedHistory();
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            initialized: true,
            error: response.message || 'Error al cargar el historial'
          }));
        }
        return;
      }
    } catch (err) {
      console.error('useDocumentHistory: Error fetching history:', err);
      fetchInProgressRef.current = false;

      // Obtener fallback del ref actual
      const currentFallback = optionsRef.current.fallbackToSimulated !== false;

      // Si falla la API y está habilitado el fallback, usar datos simulados
      if (currentFallback) {
        console.log('🔄 Falling back to simulated history due to exception');
        await loadSimulatedHistory();
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
          error: err.message || 'Error al cargar el historial del documento'
        }));
      }
    }
  }, [documentId, enabled]); // Reducir dependencias para evitar re-creación innecesaria

  /**
   * Cargar historial simulado (fallback)
   */
  const loadSimulatedHistory = useCallback(async () => {
    console.log('[useDocumentHistory] Loading simulated history for', documentId);

    try {
      // Generar historial simulado base
      const simulatedHistory = generateSimulatedHistory(documentId);

      // Intentar cargar notificaciones reales como complemento
      let combinedHistory = simulatedHistory;

      try {
        const notificationsResponse = await notificationsService.getDocumentNotifications(documentId);

        if (notificationsResponse.success && notificationsResponse.data && notificationsResponse.data.length > 0) {
          // Convertir notificaciones reales a eventos de historial
          const realNotificationEvents = notificationsResponse.data.map((notification, index) => ({
            id: `notification_real_${notification.id || index}`,
            type: 'notification_sent',
            title: notification.status === 'SENT' ? 'Notificación Enviada' : 'Notificación Falló',
            description: notification.status === 'SENT'
              ? 'Se envió notificación WhatsApp al cliente'
              : `Error: ${notification.errorMessage || 'No enviada'}`,
            timestamp: new Date(notification.createdAt),
            user: 'Sistema de Notificaciones',
            icon: 'notification',
            color: notification.status === 'SENT' ? 'info' : 'error',
            metadata: {
              channel: 'WhatsApp',
              recipient: notification.clientPhone,
              status: notification.status.toLowerCase(),
              messageId: notification.messageId,
              clientName: notification.clientName
            }
          }));

          // Combinar historial simulado con notificaciones reales
          combinedHistory = [...simulatedHistory, ...realNotificationEvents]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
      } catch (notificationError) {
        console.warn('[useDocumentHistory] Error loading notifications, using only simulated data');
      }

      console.log('[useDocumentHistory] Simulated history loaded:', combinedHistory.length, 'events');

      setState(prev => ({
        ...prev,
        history: combinedHistory,
        document: { id: documentId }, // Documento simulado básico
        permissions: { canViewAll: true }, // Permisos simulados
        pagination: { total: combinedHistory.length, limit: optionsRef.current.limit || 50, offset: 0, hasMore: false },
        loading: false,
        error: null,
        usingRealData: false,
        initialized: true
      }));

    } catch (err) {
      console.error('[useDocumentHistory] Error in loadSimulatedHistory:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        initialized: true,
        error: 'Error al cargar el historial del documento'
      }));
    }
  }, [documentId]);

  /**
   * Obtener título del evento según su tipo
   */
  const getEventTitle = (eventType) => {
    const titleMap = {
      DOCUMENT_CREATED: 'Documento Creado',
      DOCUMENT_ASSIGNED: 'Documento Asignado',
      STATUS_CHANGED: 'Estado Cambiado',
      STATUS_UNDO: 'Cambio Deshecho',
      INFO_EDITED: 'Información Editada',
      GROUP_CREATED: 'Grupo Creado',
      GROUP_DELIVERED: 'Grupo Entregado',
      VERIFICATION_GENERATED: 'Código Generado',
      PAYMENT_REGISTERED: 'Pago Registrado',
      notification_sent: 'Notificación Enviada'
    };
    return titleMap[eventType] || eventType;
  };

  /**
   * Obtener icono del evento según su tipo
   */
  const getEventIcon = (eventType) => {
    const iconMap = {
      DOCUMENT_CREATED: 'create',
      DOCUMENT_ASSIGNED: 'assignment',
      STATUS_CHANGED: 'play',
      STATUS_UNDO: 'warning',
      INFO_EDITED: 'edit',
      GROUP_CREATED: 'group',
      GROUP_DELIVERED: 'delivery',
      VERIFICATION_GENERATED: 'check_circle',
      PAYMENT_REGISTERED: 'payment',
      notification_sent: 'notification'
    };
    return iconMap[eventType] || 'default';
  };

  /**
   * Obtener color del evento según su tipo
   */
  const getEventColor = (eventType) => {
    const colorMap = {
      DOCUMENT_CREATED: 'info',
      DOCUMENT_ASSIGNED: 'primary',
      STATUS_CHANGED: 'warning',
      STATUS_UNDO: 'warning',
      INFO_EDITED: 'info',
      GROUP_CREATED: 'success',
      GROUP_DELIVERED: 'success',
      VERIFICATION_GENERATED: 'success',
      PAYMENT_REGISTERED: 'success',
      notification_sent: 'info'
    };
    return colorMap[eventType] || 'grey';
  };

  /**
   * Generar historial simulado basado en los datos disponibles
   * En una implementación real, esto vendría del backend
   */
  const generateSimulatedHistory = (docId) => {
    const now = new Date();
    const baseDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 días atrás

    return [
      {
        id: 1,
        type: 'document_created',
        title: 'Documento Creado',
        description: 'El documento fue creado y procesado desde el XML',
        timestamp: baseDate,
        user: 'Sistema',
        icon: 'create',
        color: 'info',
        metadata: {
          source: 'XML Upload',
          fileSize: '2.4 KB'
        }
      },
      {
        id: 2,
        type: 'status_change',
        title: 'Asignado a Matrizador',
        description: 'El documento fue asignado para procesamiento',
        timestamp: new Date(baseDate.getTime() + 30 * 60 * 1000), // 30 min después
        user: 'Caja Principal',
        icon: 'assignment',
        color: 'warning',
        metadata: {
          previousStatus: 'PENDIENTE',
          newStatus: 'EN_PROCESO'
        }
      },
      {
        id: 3,
        type: 'processing_started',
        title: 'Procesamiento Iniciado',
        description: 'El matrizador comenzó a trabajar en el documento',
        timestamp: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000), // 2 horas después
        user: 'Matrizador Principal',
        icon: 'play',
        color: 'primary',
        metadata: {
          estimatedTime: '24 horas'
        }
      },
      {
        id: 4,
        type: 'status_change',
        title: 'Marcado como Listo',
        description: 'El documento ha sido completado y está listo para entrega',
        timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // 1 día después
        user: 'Matrizador Principal',
        icon: 'check_circle',
        color: 'success',
        metadata: {
          previousStatus: 'EN_PROCESO',
          newStatus: 'LISTO',
          processingTime: '22 horas'
        }
      },
      // Notificaciones reales se cargan desde la API
    ];
  };

  /**
   * Cargar más eventos (paginación)
   */
  const loadMore = useCallback(async () => {
    const { pagination, loading } = state;

    if (loading || !pagination.hasMore) return;

    const nextOffset = pagination.offset + pagination.limit;
    await fetchHistory(nextOffset);
  }, [state, fetchHistory]);

  /**
   * Refrescar historial
   */
  const refresh = useCallback(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  /**
   * Filtrar por tipo de evento
   */
  const filterByEventType = useCallback((type) => {
    // Reset y recargar con el nuevo filtro
    setState(prev => ({
      ...prev,
      history: [],
      pagination: { ...prev.pagination, offset: 0 }
    }));

    // Esto triggereará un useEffect que recarga con el nuevo eventType
    fetchHistory(0);
  }, [fetchHistory]);

  /**
   * Obtener eventos por tipo
   */
  const getEventsByType = useCallback((type) => {
    return state.history.filter(event => event.type === type);
  }, [state.history]);

  /**
   * Obtener último evento
   */
  const getLastEvent = useCallback(() => {
    return state.history[state.history.length - 1];
  }, [state.history]);

  /**
   * Obtener duración total del proceso
   */
  const getTotalDuration = useCallback(() => {
    if (state.history.length < 2) return null;

    const firstEvent = state.history[state.history.length - 1];
    const lastEvent = state.history[0];

    const diffMs = new Date(lastEvent.timestamp) - new Date(firstEvent.timestamp);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} días, ${diffHours % 24} horas`;
    } else {
      return `${diffHours} horas`;
    }
  }, [state.history]);

  /**
   * Verificar si hay eventos pendientes
   */
  const hasPendingEvents = useCallback(() => {
    return state.history.some(event =>
      event.metadata?.status === 'pending' ||
      event.metadata?.status === 'processing'
    );
  }, [state.history]);

  /**
   * Configurar auto-refresh
   */
  useEffect(() => {
    if (!autoRefresh || !documentId) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, documentId, refresh]);

  // Cargar historial cuando cambia el documentId
  useEffect(() => {
    if (documentId && enabled) {
      fetchHistory();
    }
  }, [fetchHistory, documentId, enabled]);

  return {
    // Estado del historial
    history: state.history,
    document: state.document,
    permissions: state.permissions,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    usingRealData: state.usingRealData,
    initialized: state.initialized,
    fetchInProgress: fetchInProgressRef.current,

    // Funciones de gestión
    fetchHistory,
    refresh,
    loadMore,
    filterByEventType,

    // Funciones de consulta
    getEventsByType,
    getLastEvent,
    getTotalDuration,
    hasPendingEvents,

    // Datos calculados
    totalEvents: state.history.length,
    hasHistory: state.history.length > 0,
    isEmpty: !state.loading && state.history.length === 0,

    // Estadísticas
    stats: {
      totalEvents: state.pagination.total,
      loadedEvents: state.history.length,
      hasMoreToLoad: state.pagination.hasMore,
      currentPage: Math.floor(state.pagination.offset / state.pagination.limit) + 1
    },

    // Utilidades compatibles con versión anterior
    utils: {
      formatEventTime: (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          return `Hace ${diffDays} días`;
        } else if (diffHours > 0) {
          return `Hace ${diffHours} horas`;
        } else {
          return 'Hace unos minutos';
        }
      },

      getEventIcon: (iconType) => {
        const iconMap = {
          create: 'NoteAdd',
          assignment: 'Assignment',
          play: 'PlayArrow',
          check_circle: 'CheckCircle',
          notification: 'Notifications',
          delivery: 'LocalShipping',
          payment: 'AttachMoney',
          error: 'Error',
          warning: 'Warning',
          edit: 'Edit',
          group: 'Group',
          default: 'Circle'
        };
        return iconMap[iconType] || 'Circle';
      },

      getEventColor: (color, type) => {
        const colorMap = {
          info: '#2196f3',
          success: '#4caf50',
          warning: '#ff9800',
          error: '#f44336',
          primary: '#1976d2',
          grey: '#757575'
        };
        return colorMap[color] || '#757575';
      }
    }
  };
};

export default useDocumentHistory;
