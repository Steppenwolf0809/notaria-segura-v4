import { useState, useCallback, useEffect } from 'react';
import useDocumentStore from '../store/document-store';

/**
 * Hook personalizado para manejar drag & drop en el tablero Kanban
 * Gestiona el arrastre de documentos entre columnas de estado
 * CONSERVADOR: Mantiene funcionalidad original + sistema de confirmaciones
 */
const useDragAndDrop = (onConfirmationRequired = null) => {
  const { updateDocumentStatus, updateDocumentStatusWithConfirmation, requiresConfirmation } = useDocumentStore();
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [isDropping, setIsDropping] = useState(false);
  
  // Estados para sistema de confirmaciones
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  /**
   * Efecto para cleanup global - detecta cuando el drag se abandona
   */
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      // Este es un fallback. Si el drag termina sin un drop válido,
      // se limpian los estados para prevenir que un item se quede "pegado".
      if (draggedItem) {
        console.log('🌍 Drag global finalizado sin un drop válido, forzando cleanup...');
        setTimeout(() => {
          setDraggedItem(null);
          setDragOverColumn(null);
          setIsDropping(false);
        }, 50);
      }
    };

    // Escuchamos 'dragend' para el caso en que el usuario suelte el drag fuera de una drop-zone.
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [draggedItem]); // Se quita handleDragEnd de las dependencias para evitar el crash.

  /**
   * Iniciar el arrastre de un documento
   */
  const handleDragStart = useCallback((event, document) => {
    console.log('🚀 Drag iniciado:', document.id, document.status);
    
    // CRÍTICO: Verificar que tenemos dataTransfer
    if (!event.dataTransfer) {
      console.error('❌ event.dataTransfer no disponible');
      return;
    }
    
    // CRÍTICO: Configurar dataTransfer para que el browser reconozca el drag
    try {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', document.id.toString());
      event.dataTransfer.setData('application/json', JSON.stringify(document));
      
      // Configurar imagen de arrastre si es posible
      if (event.target) {
        event.dataTransfer.setDragImage(event.target, 0, 0);
      }
    } catch (error) {
      console.error('❌ Error configurando dataTransfer:', error);
    }
    
    setDraggedItem(document);
    console.log('✅ Drag configurado correctamente');
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
    
    // Debug detallado - SOLO durante eventos de drag reales, no durante render
    if (!isValid && draggedItem) {
      console.log('⚠️ Movimiento no válido:', {
        from: fromStatus,
        to: toStatus,
        allowedTransitions: validTransitions[fromStatus] || 'ninguna',
        context: 'durante drag real'
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
    
    // CRÍTICO: No procesar si es la misma columna de origen
    if (draggedItem && draggedItem.status === columnId) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      return; // SALIR inmediatamente para evitar validación innecesaria
    }
    
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
  const handleDragLeave = useCallback((event, columnId) => {
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
   * Ejecutar cambio de estado confirmado
   */
  const executeStatusChange = useCallback(async (document, newStatus, options = {}) => {
    console.log('🚀 executeStatusChange iniciado:', {
      documentId: document.id,
      fromStatus: document.status,
      toStatus: newStatus,
      options
    });
    
    setIsDropping(true);

    try {
      console.log('🔄 Llamando updateDocumentStatusWithConfirmation...');
      
      // Usar función con confirmación para obtener información extendida
      const result = await updateDocumentStatusWithConfirmation(document.id, newStatus, options);
      console.log('📊 Respuesta de updateDocumentStatusWithConfirmation:', result);
      
      if (result.success) {
        console.log(`✅ Documento ${document.id} movido exitosamente: ${document.status} -> ${newStatus}`);
        
        return {
          success: true,
          document: result.document,
          changeInfo: result.changeInfo
        };
      } else {
        console.error('❌ updateDocumentStatusWithConfirmation falló:', result.error);
        throw new Error(result.error || 'Error al actualizar el estado en el servidor');
      }
    } catch (error) {
      console.error('💥 Error ejecutando cambio de estado:', error);
      
      return { success: false, error: error.message };
    } finally {
      setIsDropping(false);
      handleDragEnd();
      console.log('🏁 executeStatusChange finalizado');
    }
  }, [updateDocumentStatusWithConfirmation, handleDragEnd]);

  /**
   * Manejar el drop en una columna
   * CONSERVADOR: Mantiene lógica original + interceptación para confirmaciones
   */
  const handleDrop = useCallback(async (event, newStatus) => {
    // CRÍTICO: Prevenir comportamiento por defecto inmediatamente
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🎯 Drop detectado:', { 
      draggedItem: draggedItem?.id, 
      newStatus,
      dataTransfer: !!event.dataTransfer 
    });
    
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
      console.log('📋 Mensaje de validación:', getValidationMessage(draggedItem.status, newStatus));
      handleDragEnd();
      return { success: false, error: 'Movimiento no válido según reglas de negocio' };
    }

    // NUEVA FUNCIONALIDAD: Verificar si requiere confirmación
    const confirmationInfo = requiresConfirmation(draggedItem.status, newStatus);
    
    if (confirmationInfo.requiresConfirmation && onConfirmationRequired) {
      console.log('⚠️ Cambio requiere confirmación:', confirmationInfo);
      console.log('📞 Llamando onConfirmationRequired callback...');
      
      // Guardar estado pendiente
      setPendingStatusChange({
        document: draggedItem,
        newStatus,
        confirmationInfo
      });
      
      // Llamar callback para mostrar modal de confirmación
      onConfirmationRequired({
        document: draggedItem,
        currentStatus: draggedItem.status,
        newStatus,
        confirmationInfo,
        onConfirm: async (confirmationData) => {
          // Ejecutar cambio después de confirmación
          const result = await executeStatusChange(
            confirmationData.document, 
            confirmationData.newStatus, 
            { 
              reversionReason: confirmationData.reversionReason,
              deliveredTo: confirmationData.deliveredTo
            }
          );
          
          // Limpiar estado pendiente
          setPendingStatusChange(null);
          
          return result;
        },
        onCancel: () => {
          // Cancelar y limpiar estado
          setPendingStatusChange(null);
          handleDragEnd();
        }
      });
      
      // No ejecutar cambio inmediatamente, esperar confirmación
      return { success: false, pending: true, message: 'Esperando confirmación' };
    }

    // CONSERVADOR: Si no requiere confirmación, usar lógica original
    setIsDropping(true);

    try {
      console.log('🔄 Actualizando estado en BD...');
      console.log('📊 Datos del movimiento:', {
        documentId: draggedItem.id,
        fromStatus: draggedItem.status,
        toStatus: newStatus,
        documentType: draggedItem.documentType
      });
      
      // Usar función original para cambios que no requieren confirmación
      const result = await updateDocumentStatus(draggedItem.id, newStatus);
      
      if (result && result.success) {
        console.log(`✅ Documento ${draggedItem.id} movido exitosamente: ${draggedItem.status} -> ${newStatus}`);
        
        return { success: true, document: draggedItem, newStatus, previousStatus: draggedItem.status };
      } else {
        console.error('❌ updateDocumentStatus falló:', result);
        throw new Error(result?.error || result?.message || 'Error al actualizar el estado en el servidor');
      }
    } catch (error) {
      console.error('💥 Error en drag & drop:', error);
      console.error('🔍 Stack trace:', error.stack);
      
      return { success: false, error: error.message };
    } finally {
      setIsDropping(false);
      handleDragEnd();
    }
  }, [draggedItem, updateDocumentStatus, updateDocumentStatusWithConfirmation, requiresConfirmation, handleDragEnd, isValidMove, onConfirmationRequired, executeStatusChange]);

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
      // CRÍTICO: No validar si es la misma columna
      if (draggedItem.status === columnId) {
        return baseStyle; // Sin efectos visuales para misma columna
      }
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
    // CRÍTICO: No permitir drop en la misma columna
    if (draggedItem.status === columnId) return false;
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
    isValidDrop: (columnId) => draggedItem && draggedItem.status !== columnId && isValidMove(draggedItem.status, columnId),

    // NUEVAS FUNCIONALIDADES: Sistema de confirmaciones
    pendingStatusChange,
    executeStatusChange,
    
    // Funciones adicionales para verificar confirmaciones
    requiresConfirmation: (fromStatus, toStatus) => {
      return requiresConfirmation(fromStatus, toStatus);
    }
  };
};

export default useDragAndDrop;