import { useState, useCallback } from 'react';
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
   * Iniciar el arrastre de un documento
   */
  const handleDragStart = useCallback((document) => {
    setDraggedItem(document);
  }, []);

  /**
   * Finalizar el arrastre
   */
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverColumn(null);
    setIsDropping(false);
  }, []);

  /**
   * Manejar cuando se arrastra sobre una columna
   */
  const handleDragOver = useCallback((event, columnId) => {
    event.preventDefault();
    setDragOverColumn(columnId);
  }, []);

  /**
   * Manejar cuando se sale de una columna
   */
  const handleDragLeave = useCallback((event) => {
    // Solo quitar el highlight si realmente salimos de la columna
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragOverColumn(null);
    }
  }, []);

  /**
   * Manejar el drop en una columna
   */
  const handleDrop = useCallback(async (event, newStatus) => {
    event.preventDefault();
    
    if (!draggedItem || draggedItem.status === newStatus) {
      handleDragEnd();
      return;
    }

    setIsDropping(true);

    try {
      // Actualizar el estado del documento en el backend
      const success = await updateDocumentStatus(draggedItem.id, newStatus);
      
      if (success) {
        console.log(`Documento ${draggedItem.id} movido a ${newStatus}`);
        
        // Opcional: Mostrar notificación de éxito
        // Aquí podrías agregar una notificación toast
        
        return { success: true, document: draggedItem, newStatus };
      } else {
        throw new Error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error en drag & drop:', error);
      
      // Opcional: Mostrar notificación de error
      // Aquí podrías agregar una notificación toast de error
      
      return { success: false, error: error.message };
    } finally {
      handleDragEnd();
    }
  }, [draggedItem, updateDocumentStatus, handleDragEnd]);

  /**
   * Verificar si el movimiento es válido
   */
  const isValidMove = useCallback((fromStatus, toStatus) => {
    // Definir transiciones válidas según la lógica de negocio
    const validTransitions = {
      'PENDIENTE': ['EN_PROCESO'],
      'EN_PROCESO': ['LISTO', 'PENDIENTE'], // Permite regresionar si es necesario
      'LISTO': ['ENTREGADO', 'EN_PROCESO'], // Permite regresionar si es necesario
      'ENTREGADO': [] // Los entregados no se pueden mover
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }, []);

  /**
   * Obtener estilo visual para la columna durante drag over
   */
  const getColumnStyle = useCallback((columnId, isValidTarget = true) => {
    const baseStyle = {
      transition: 'all 0.2s ease-in-out',
      minHeight: '400px',
      borderRadius: '12px',
      border: '2px dashed transparent'
    };

    if (dragOverColumn === columnId && draggedItem) {
      if (isValidTarget && isValidMove(draggedItem.status, columnId)) {
        return {
          ...baseStyle,
          borderColor: '#10b981', // Verde para movimiento válido
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          transform: 'scale(1.02)'
        };
      } else {
        return {
          ...baseStyle,
          borderColor: '#ef4444', // Rojo para movimiento inválido
          backgroundColor: 'rgba(239, 68, 68, 0.05)'
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
        opacity: 0.5,
        transform: 'rotate(5deg) scale(0.95)',
        transition: 'all 0.2s ease-in-out',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 1000
      };
    }
    return {};
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
    handleDragLeave,
    handleDrop,

    // Funciones de utilidad
    isValidMove,
    canDrop,
    getColumnStyle,
    getDraggedItemStyle,

    // Estado de la operación
    isDragging: draggedItem !== null,
    isValidDrop: (columnId) => draggedItem && isValidMove(draggedItem.status, columnId)
  };
};

export default useDragAndDrop;