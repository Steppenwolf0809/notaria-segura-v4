import { useState, useCallback, useEffect } from 'react';
import useDocumentStore from '../store/document-store';

/**
 * Hook personalizado para manejar drag & drop en el tablero Kanban
 * Gestiona el arrastre de documentos entre columnas de estado
 */
const useDragAndDrop = () => {
  const { updateDocumentStatus } = useDocumentStore();
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [isDropping, setIsDropping] = useState(false);

  /**
   * Efecto para cleanup global - detecta cuando el drag se abandona
   */
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      if (draggedItem) {
        console.log('🌍 Drag global finalizado, forzando cleanup...');
        setTimeout(() => {
          setDraggedItem(null);
          setDragOverColumn(null);
          setIsDropping(false);
        }, 100);
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggedItem) {
        console.log('🖱️ Mouse liberado globalmente, verificando cleanup...');
        setTimeout(() => {
          setDraggedItem(null);
          setDragOverColumn(null);
          setIsDropping(false);
        }, 150);
      }
    };

    // Añadir listeners globales
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Cleanup al desmontar
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedItem]);

  /**
   * Iniciar el arrastre de un documento
   */
  const handleDragStart = useCallback((event, document) => {
    // CRÍTICO: Configurar dataTransfer para que el browser reconozca el drag
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', document.id.toString());
      event.dataTransfer.setData('application/json', JSON.stringify(document));
    }
    
    setDraggedItem(document);
    console.log('🚀 Drag iniciado:', document.id, document.status);
  }, []);

  /**
   * Verificar si el movimiento es válido
   */
  const isValidMove = useCallback((fromStatus, toStatus) => {
    if (!fromStatus || !toStatus) return false;
    
    // Definir transiciones válidas según la lógica de negocio
    const validTransitions = {
      'PENDIENTE': ['EN_PROCESO'],
      'EN_PROCESO': ['LISTO', 'PENDIENTE'], // Permite regresionar si es necesario
      'LISTO': ['ENTREGADO', 'EN_PROCESO'], // Permite regresionar si es necesario
      'ENTREGADO': [] // Los entregados no se pueden mover
    };

    const isValid = validTransitions[fromStatus]?.includes(toStatus) || false;
    
    // Debug detallado
    if (!isValid) {
      console.log('⚠️ Movimiento no válido:', {
        from: fromStatus,
        to: toStatus,
        allowedTransitions: validTransitions[fromStatus] || 'ninguna'
      });
    }
    
    return isValid;
  }, []);

  /**
   * Finalizar el arrastre - CLEANUP GARANTIZADO
   */
  const handleDragEnd = useCallback((event) => {
    console.log('🏁 Drag finalizado, limpiando estados...');
    
    // CRÍTICO: Cleanup inmediato y forzado
    setDraggedItem(null);
    setDragOverColumn(null);
    setIsDropping(false);
    
    // Cleanup adicional con pequeño delay para asegurar que el DOM se actualice
    setTimeout(() => {
      setDraggedItem(null);
      setDragOverColumn(null);
      setIsDropping(false);
    }, 50);
    
    console.log('🧹 Estados limpiados');
  }, []);

  /**
   * Manejar cuando se arrastra sobre una columna
   */
  const handleDragOver = useCallback((event, columnId) => {
    // CRÍTICO: preventDefault es obligatorio para permitir drop
    event.preventDefault();
    event.stopPropagation();
    
    // Solo actualizar si realmente cambiamos de columna
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
    
    // Configurar visual del cursor según validez
    if (draggedItem && event.dataTransfer) {
      const isValid = isValidMove(draggedItem.status, columnId);
      event.dataTransfer.dropEffect = isValid ? 'move' : 'none';
    }
  }, [dragOverColumn, draggedItem, isValidMove]);

  /**
   * Manejar cuando entra a una columna
   */
  const handleDragEnter = useCallback((event, columnId) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverColumn(columnId);
  }, []);

  /**
   * Manejar cuando se sale de una columna
   */
  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Solo quitar el highlight si realmente salimos de la columna
    // Usar un pequeño delay para evitar flickering
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget;
    
    if (!currentTarget.contains(relatedTarget)) {
      // Pequeño delay para evitar flickering entre elementos hijos
      setTimeout(() => {
        setDragOverColumn(null);
      }, 10);
    }
  }, []);

  /**
   * Manejar drag cancelado - cuando se suelta fuera de zonas válidas
   */
  const handleDragCancel = useCallback(() => {
    console.log('🚫 Drag cancelado, forzando cleanup...');
    handleDragEnd();
  }, [handleDragEnd]);

  /**
   * Manejar el drop en una columna
   */
  const handleDrop = useCallback(async (event, newStatus) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 Drop detectado:', { draggedItem: draggedItem?.id, newStatus });
    
    // Validaciones antes del drop
    if (!draggedItem) {
      console.log('❌ No hay elemento siendo arrastrado');
      handleDragEnd();
      return { success: false, error: 'No hay documento en drag' };
    }

    if (draggedItem.status === newStatus) {
      console.log('⚠️ Movimiento al mismo estado, cancelando');
      handleDragEnd();
      return { success: false, error: 'Mismo estado' };
    }

    // Validar si el movimiento es permitido
    if (!isValidMove(draggedItem.status, newStatus)) {
      console.log('❌ Movimiento no válido:', draggedItem.status, '->', newStatus);
      handleDragEnd();
      return { success: false, error: 'Movimiento no válido según reglas de negocio' };
    }

    setIsDropping(true);

    try {
      console.log('🔄 Actualizando estado en BD...');
      // Actualizar el estado del documento en el backend
      const success = await updateDocumentStatus(draggedItem.id, newStatus);
      
      if (success) {
        console.log(`✅ Documento ${draggedItem.id} movido exitosamente: ${draggedItem.status} -> ${newStatus}`);
        
        return { success: true, document: draggedItem, newStatus, previousStatus: draggedItem.status };
      } else {
        throw new Error('Error al actualizar el estado en el servidor');
      }
    } catch (error) {
      console.error('💥 Error en drag & drop:', error);
      
      return { success: false, error: error.message };
    } finally {
      setIsDropping(false);
      handleDragEnd();
    }
  }, [draggedItem, updateDocumentStatus, handleDragEnd, isValidMove]);

  /**
   * Obtener mensaje explicativo para movimientos inválidos
   */
  const getValidationMessage = useCallback((fromStatus, toStatus) => {
    if (!fromStatus || !toStatus) return 'Estados no válidos';
    
    if (fromStatus === toStatus) return 'El documento ya está en este estado';
    
    const messages = {
      'PENDIENTE': {
        'LISTO': 'Los documentos pendientes deben pasar primero por "En Proceso"',
        'ENTREGADO': 'Los documentos pendientes deben procesarse antes de entregarse'
      },
      'EN_PROCESO': {
        // EN_PROCESO puede ir a LISTO y PENDIENTE (válidos)
      },
      'LISTO': {
        'PENDIENTE': 'Los documentos listos no pueden volver a pendiente directamente'
        // LISTO puede ir a ENTREGADO y EN_PROCESO (válidos)
      },
      'ENTREGADO': {
        'PENDIENTE': 'Los documentos entregados no se pueden modificar',
        'EN_PROCESO': 'Los documentos entregados no se pueden modificar',
        'LISTO': 'Los documentos entregados no se pueden modificar'
      }
    };
    
    return messages[fromStatus]?.[toStatus] || 'Movimiento no permitido según las reglas de negocio';
  }, []);

  /**
   * Obtener estilo visual para la columna durante drag over
   */
  const getColumnStyle = useCallback((columnId, isValidTarget = true) => {
    const baseStyle = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Transición más suave
      minHeight: '400px',
      borderRadius: '12px',
      border: '2px solid transparent',
      position: 'relative'
    };

    if (dragOverColumn === columnId && draggedItem) {
      const isValid = isValidTarget && isValidMove(draggedItem.status, columnId);
      
      if (isValid) {
        return {
          ...baseStyle,
          borderColor: '#10b981', // Verde para movimiento válido
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderStyle: 'dashed',
          transform: 'scale(1.02)',
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            background: 'linear-gradient(45deg, #10b981, #34d399)',
            borderRadius: '14px',
            zIndex: -1,
            opacity: 0.1
          }
        };
      } else {
        return {
          ...baseStyle,
          borderColor: '#ef4444', // Rojo para movimiento inválido
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderStyle: 'dashed',
          transform: 'scale(0.98)',
          opacity: 0.7,
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
        };
      }
    }

    return baseStyle;
  }, [dragOverColumn, draggedItem, isValidMove]);

  /**
   * Obtener estilo visual para el documento que se está arrastrando
   */
  const getDraggedItemStyle = useCallback((document) => {
    if (draggedItem && draggedItem.id === document.id) {
      return {
        opacity: 0.8,
        transform: 'rotate(3deg) scale(1.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.25), 0 5px 15px rgba(0,0,0,0.1)',
        zIndex: 1000,
        cursor: 'grabbing',
        border: '2px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderRadius: '12px'
      };
    }
    return {
      transition: 'all 0.2s ease-in-out'
    };
  }, [draggedItem]);

  /**
   * Verificar si una columna puede recibir drops
   */
  const canDrop = useCallback((columnId) => {
    if (!draggedItem) return false;
    return isValidMove(draggedItem.status, columnId);
  }, [draggedItem, isValidMove]);

  return {
    // Estado del drag & drop
    draggedItem,
    dragOverColumn,
    isDropping,

    // Handlers de eventos
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragCancel,

    // Funciones de utilidad
    isValidMove,
    getValidationMessage,
    canDrop,
    getColumnStyle,
    getDraggedItemStyle,

    // Estado de la operación
    isDragging: draggedItem !== null,
    isValidDrop: (columnId) => draggedItem && isValidMove(draggedItem.status, columnId)
  };
};

export default useDragAndDrop;