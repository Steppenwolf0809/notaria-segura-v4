import { useState, useEffect, useCallback } from 'react';
import documentService from '../services/document-service';

/**
 * Hook personalizado para manejar el historial de documentos
 * Gestiona la obtención y visualización del timeline de eventos
 */
const useDocumentHistory = (documentId) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar historial del documento
   */
  const fetchHistory = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      // Por ahora simularemos el historial ya que la API puede no estar implementada
      // En una implementación real, esto sería: const result = await documentService.getDocumentHistory(documentId);
      
      const simulatedHistory = generateSimulatedHistory(documentId);
      setHistory(simulatedHistory);
    } catch (err) {
      console.error('Error fetching document history:', err);
      setError('Error al cargar el historial del documento');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

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
      {
        id: 5,
        type: 'notification_sent',
        title: 'Notificación Enviada',
        description: 'Se envió notificación WhatsApp al cliente',
        timestamp: new Date(baseDate.getTime() + 24.5 * 60 * 60 * 1000),
        user: 'Sistema de Notificaciones',
        icon: 'notification',
        color: 'info',
        metadata: {
          channel: 'WhatsApp',
          recipient: '+593999999999',
          status: 'delivered'
        }
      }
    ];
  };

  /**
   * Agregar nuevo evento al historial
   */
  const addHistoryEvent = useCallback((event) => {
    setHistory(prev => [event, ...prev]);
  }, []);

  /**
   * Obtener eventos por tipo
   */
  const getEventsByType = useCallback((type) => {
    return history.filter(event => event.type === type);
  }, [history]);

  /**
   * Obtener último evento
   */
  const getLastEvent = useCallback(() => {
    return history[history.length - 1];
  }, [history]);

  /**
   * Obtener duración total del proceso
   */
  const getTotalDuration = useCallback(() => {
    if (history.length < 2) return null;

    const firstEvent = history[history.length - 1];
    const lastEvent = history[0];
    
    const diffMs = new Date(lastEvent.timestamp) - new Date(firstEvent.timestamp);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} días, ${diffHours % 24} horas`;
    } else {
      return `${diffHours} horas`;
    }
  }, [history]);

  /**
   * Verificar si hay eventos pendientes
   */
  const hasPendingEvents = useCallback(() => {
    return history.some(event => 
      event.metadata?.status === 'pending' || 
      event.metadata?.status === 'processing'
    );
  }, [history]);

  // Cargar historial cuando cambia el documentId
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    // Estado del historial
    history,
    loading,
    error,

    // Funciones de gestión
    fetchHistory,
    addHistoryEvent,

    // Funciones de consulta
    getEventsByType,
    getLastEvent,
    getTotalDuration,
    hasPendingEvents,

    // Datos calculados
    totalEvents: history.length,
    hasHistory: history.length > 0,

    // Utilidades para el timeline
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
          error: 'Error',
          warning: 'Warning'
        };
        return iconMap[iconType] || 'Circle';
      },

      getEventColor: (color, type) => {
        const colorMap = {
          info: '#2196f3',
          success: '#4caf50',
          warning: '#ff9800',
          error: '#f44336',
          primary: '#1976d2'
        };
        return colorMap[color] || '#757575';
      }
    }
  };
};

export default useDocumentHistory;