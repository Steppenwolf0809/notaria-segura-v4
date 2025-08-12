import { useState, useCallback, useEffect, useRef } from 'react';
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
  
  // Referencias para cleanup robusto
  const dragTimeoutRef = useRef(null);
  const dragStartTimeRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);
  const isDragActiveRef = useRef(false);

  /**
   * Cleanup robusto y forzado de estados de drag
   * NUEVO: Más agresivo y con logging detallado
   */
  const forceCleanupDragState = useCallback((reason = 'unknown') => {
    const dragDuration = dragStartTimeRef.current ? Date.now() - dragStartTimeRef.current : 0;
    
    console.log(`🧹 FORCE CLEANUP: ${reason}`, {
      hadDraggedItem: !!draggedItem,
      hadDragOverColumn: !!dragOverColumn,
      wasDropping: isDropping,
      dragDuration: dragDuration + 'ms',
      isDragActiveRef: isDragActiveRef.current
    });

    // Limpiar todos los timeouts previos
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Reset inmediato de estados
    setDraggedItem(null);
    setDragOverColumn(null);
    setIsDropping(false);
    
    // Reset referencias
    isDragActiveRef.current = false;
    dragStartTimeRef.current = null;
    
    // Cleanup adicional con doble verificación después de un tiempo más largo
    cleanupTimeoutRef.current = setTimeout(() => {
      setDraggedItem(null);
      setDragOverColumn(null);
      setIsDropping(false);
      isDragActiveRef.current = false;
      
      // Log final de verificación
      console.log('✅ Cleanup verificado completado');
    }, 50); // 50ms para dar más tiempo a operaciones normales
  }, [draggedItem, dragOverColumn, isDropping]);

  /**
   * Efecto para cleanup global - detecta cuando el drag se abandona
   * MEJORADO: Múltiples listeners y timeout de seguridad
   */
  useEffect(() => {
    const handleGlobalDragEnd = (event) => {
      if (isDragActiveRef.current) {
        console.log('🌍 Global dragend detectado', {
          eventType: event.type,
          target: event.target?.tagName,
          dataTransfer: !!event.dataTransfer,
          isGroupedDocument: draggedItem?.isGrouped || false
        });
        
        // Para documentos agrupados, dar más tiempo para procesar
        const isGroupedDocument = draggedItem?.isGrouped || false;
        const delayTime = isGroupedDocument ? 500 : 100; // Más tiempo para agrupados
        
        // Dar tiempo para que el drop normal se procese antes de cleanup
        setTimeout(() => {
          if (isDragActiveRef.current) {
            console.log('🌍 Cleanup después de dragend - no se procesó drop');
            forceCleanupDragState('global-dragend-delayed');
          }
        }, delayTime);
      }
    };

    const handleGlobalMouseUp = () => {
      // No hacer cleanup si estamos en medio de un drop
      const { isDropping } = useDocumentStore.getState();
      if (isDropping) {
        console.log('🖱️ Global mouseup ignorado - drop en progreso');
        return;
      }

      // Solo cleanup si ha pasado suficiente tiempo sin que se complete el drag
      if (isDragActiveRef.current && dragStartTimeRef.current) {
        const dragDuration = Date.now() - dragStartTimeRef.current;
        
        // Para documentos agrupados, usar un timeout mucho más largo
        const isGroupedDocument = draggedItem?.isGrouped || false;
        const cleanupThreshold = isGroupedDocument ? 5000 : 2000; // 5s para agrupados, 2s para individuales
        
        if (dragDuration > cleanupThreshold) {
          console.log('🖱️ Global mouseup detectado con drag activo prolongado', {
            dragDuration,
            cleanupThreshold,
            isGroupedDocument
          });
          setTimeout(() => {
            if (isDragActiveRef.current && !useDocumentStore.getState().isDropping) {
              forceCleanupDragState('global-mouseup-prolonged');
            }
          }, 200);
        }
      }
    };

    const handleVisibilityChange = () => {
      // Si el usuario cambia de tab durante drag
      if (document.hidden && isDragActiveRef.current) {
        console.log('👁️ Tab cambio detectado con drag activo');
        forceCleanupDragState('visibility-change');
      }
    };

    // Múltiples listeners para casos edge
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup final al desmontar
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
  }, [forceCleanupDragState]);

  /**
   * Timeout de seguridad para drag abandonado
   * NUEVO: Limpia automáticamente después de tiempo límite
   */
  const startDragSafetyTimeout = useCallback(() => {
    // Limpiar timeout previo si existe
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Configurar nuevo timeout de seguridad más largo (10 segundos)
    dragTimeoutRef.current = setTimeout(() => {
      if (isDragActiveRef.current) {
        console.log('⏰ TIMEOUT DE SEGURIDAD: Drag abandonado por más de 10 segundos');
        forceCleanupDragState('safety-timeout');
      }
    }, 10000);
  }, [forceCleanupDragState]);

  /**
   * Iniciar el arrastre de un documento
   * MEJORADO: Con timeout de seguridad y logging detallado
   */
  const handleDragStart = useCallback((event, document) => {
    // Solo limpiar si ha pasado tiempo razonable desde el último drag
    if (isDragActiveRef.current && dragStartTimeRef.current) {
      const timeSinceLastDrag = Date.now() - dragStartTimeRef.current;
      if (timeSinceLastDrag > 500) { // Solo si han pasado más de 500ms
        console.log('⚠️ Drag previo detectado (500ms+), limpiando...');
        forceCleanupDragState('overlapping-drag-start');
      } else {
        console.log('⚠️ Drag rápido detectado, permitiendo...');
      }
    }
    
    console.log('🚀 Drag iniciado:', {
      documentId: document.id,
      tramiteNumber: document.tramiteNumber,
      status: document.status,
      isGrouped: document.isGrouped,
      groupId: document.documentGroupId,
      timestamp: new Date().toISOString()
    });
    
    // Debug específico para documento problemático
    if (document.tramiteNumber?.includes('20251701018C01696')) {
      console.log('🔍 DEBUG documento específico 20251701018C01696:', {
        document,
        canDrag: true,
        event: event.type,
        dataTransfer: !!event.dataTransfer
      });
    }
    
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
      forceCleanupDragState('datatransfer-error');
      return;
    }
    
    // Configurar estado activo
    setDraggedItem(document);
    isDragActiveRef.current = true;
    dragStartTimeRef.current = Date.now();
    
    // Iniciar timeout de seguridad
    startDragSafetyTimeout();
    
    console.log('✅ Drag configurado correctamente con timeout de seguridad');
  }, [forceCleanupDragState, startDragSafetyTimeout]);

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
   * MEJORADO: Con logging detallado y limpieza de timeout
   */
  const handleDragEnd = useCallback((event) => {
    const dragDuration = dragStartTimeRef.current ? Date.now() - dragStartTimeRef.current : 0;
    
    console.log('🏁 Drag finalizado:', {
      eventType: event?.type || 'manual',
      dragDuration: dragDuration + 'ms',
      hadDraggedItem: !!draggedItem,
      hadDataTransfer: !!event?.dataTransfer,
      dropEffect: event?.dataTransfer?.dropEffect
    });
    
    // Limpiar timeout de seguridad
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // Usar la función de cleanup robusta
    forceCleanupDragState('drag-end');
    
    console.log('🧹 Estados limpiados via handleDragEnd');
  }, [draggedItem, forceCleanupDragState]);

  /**
   * Manejar cuando se arrastra sobre una columna
   * MEJORADO: Con logging detallado y verificaciones de estado
   */
  const handleDragOver = useCallback((event, columnId) => {
    // CRÍTICO: preventDefault es obligatorio para permitir drop
    event.preventDefault();
    event.stopPropagation();
    
    // Verificar consistencia de estado solo en casos extremos
    if (!isDragActiveRef.current && draggedItem && dragStartTimeRef.current) {
      const timeSinceDragStart = Date.now() - dragStartTimeRef.current;
      if (timeSinceDragStart > 2000) { // Solo si han pasado más de 2 segundos
        console.log('⚠️ Inconsistencia detectada prolongada: draggedItem sin isDragActiveRef');
        forceCleanupDragState('inconsistent-state-dragover');
        return;
      }
    }
    
    // CRÍTICO: No procesar si es la misma columna de origen
    if (draggedItem && draggedItem.status === columnId) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      return; // SALIR inmediatamente para evitar validación innecesaria
    }
    
    // Solo actualizar si realmente cambiamos de columna
    if (dragOverColumn !== columnId) {
      console.log('🎯 DragOver cambio de columna:', {
        from: dragOverColumn,
        to: columnId,
        documentId: draggedItem?.id,
        documentStatus: draggedItem?.status
      });
      setDragOverColumn(columnId);
    }
    
    // Configurar visual del cursor según validez
    if (draggedItem && event.dataTransfer) {
      const isValid = isValidMove(draggedItem.status, columnId);
      event.dataTransfer.dropEffect = isValid ? 'move' : 'none';
      
      // Log detallado solo si hay cambio de validez
      if (dragOverColumn !== columnId) {
        console.log(`🔍 Validación de movimiento ${draggedItem.status} -> ${columnId}: ${isValid ? '✅ válido' : '❌ inválido'}`);
      }
    }
  }, [dragOverColumn, draggedItem, isValidMove, forceCleanupDragState]);

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
   * Obtener todos los documentos del mismo grupo
   */
  const getGroupDocuments = useCallback((document) => {
    const { documents } = useDocumentStore.getState();
    
    if (!document.isGrouped || !document.documentGroupId) {
      return [document]; // Solo el documento individual
    }
    
    // Buscar todos los documentos del mismo grupo
    const groupDocuments = documents.filter(doc => 
      doc.documentGroupId === document.documentGroupId && doc.isGrouped
    );
    
    console.log('🔗 Documentos del grupo encontrados:', {
      groupId: document.documentGroupId,
      totalDocuments: groupDocuments.length,
      documentIds: groupDocuments.map(d => d.id)
    });
    
    return groupDocuments.length > 0 ? groupDocuments : [document];
  }, []);

  /**
   * Actualizar estado de grupo completo usando endpoint optimizado
   * CORREGIDO: Usar siempre documentService para consistencia con botones individuales
   */
  const updateGroupStatus = useCallback(async (groupDocuments, newStatus, options = {}) => {
    console.log('🔗 Actualizando estado de grupo via drag & drop:', {
      documentsCount: groupDocuments.length,
      newStatus,
      documentIds: groupDocuments.map(d => d.id),
      groupId: groupDocuments[0]?.documentGroupId
    });

    try {
      // Obtener el ID del grupo
      const documentGroupId = groupDocuments[0]?.documentGroupId;
      
      if (!documentGroupId) {
        console.error('❌ No se encontró ID del grupo');
        return { success: false, error: 'No se encontró ID del grupo' };
      }

      // 🔧 CORRECCIÓN: Usar documentService directamente (igual que botón individual)
      const documentService = await import('../services/document-service.js');
      const result = await documentService.default.updateDocumentGroupStatus(
        documentGroupId, 
        newStatus, 
        options
      );
      
      console.log('📊 Resultado de documentService.updateDocumentGroupStatus (drag):', result);
      
      if (result.success) {
        console.log('✅ Grupo actualizado exitosamente desde drag & drop');
        
        // 🔧 CORRECCIÓN: Actualizar documentos en el store local usando la estructura correcta
        const { updateDocument } = useDocumentStore.getState();
        
        // El resultado viene en result.data.documents
        if (result.data && result.data.documents) {
          result.data.documents.forEach(updatedDoc => {
            updateDocument(updatedDoc.id, updatedDoc);
          });
          
          console.log('🔄 Documentos actualizados en store local desde drag');
        } else {
          console.warn('⚠️ No se encontraron documentos actualizados en la respuesta');
        }
        
        return { 
          success: true, 
          document: groupDocuments[0], // Retornar documento principal
          groupUpdated: true,
          groupSize: result.data?.documentsUpdated || groupDocuments.length,
          whatsapp: result.data?.whatsapp,
          changeInfo: result.changeInfo // Para sistema de deshacer
        };
      } else {
        console.error('❌ Error en documentService desde drag:', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      console.error('💥 Error actualizando grupo desde drag & drop:', error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Manejar el drop en una columna
   * CONSERVADOR: Mantiene lógica original + interceptación para confirmaciones
   * NUEVA FUNCIONALIDAD: Soporte para grupos de documentos
   */
  const handleDrop = useCallback(async (event, newStatus) => {
    // CRÍTICO: Prevenir comportamiento por defecto inmediatamente
    event.preventDefault();
    event.stopPropagation();
    
    const dragDuration = dragStartTimeRef.current ? Date.now() - dragStartTimeRef.current : 0;
    
    console.log('🎯 Drop detectado:', { 
      draggedItem: draggedItem?.id, 
      newStatus,
      isGrouped: draggedItem?.isGrouped,
      groupId: draggedItem?.documentGroupId,
      dataTransfer: !!event.dataTransfer,
      dragDuration: dragDuration + 'ms',
      isDragActiveRef: isDragActiveRef.current,
      eventType: event.type
    });
    
    // Verificar consistencia de estado crítico solo si es realmente un problema
    if (!isDragActiveRef.current && !draggedItem) {
      console.error('❌ DROP INCONSISTENTE: No hay drag activo y no hay draggedItem');
      forceCleanupDragState('inconsistent-drop');
      return { success: false, error: 'Estado de drag inconsistente' };
    }
    
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

    // 🔗 NUEVA FUNCIONALIDAD: Detectar si es documento agrupado
    const groupDocuments = getGroupDocuments(draggedItem);
    const isGroupMove = groupDocuments.length > 1;
    
    if (isGroupMove) {
      console.log('🔗 Movimiento de grupo detectado:', {
        groupSize: groupDocuments.length,
        groupId: draggedItem.documentGroupId
      });
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
        confirmationInfo,
        groupDocuments: isGroupMove ? groupDocuments : null // 🔗 Agregar info de grupo
      });
      
      // Llamar callback para mostrar modal de confirmación
      onConfirmationRequired({
        document: draggedItem,
        currentStatus: draggedItem.status,
        newStatus,
        confirmationInfo,
        isGroupMove, // 🔗 Indicar si es movimiento de grupo
        groupSize: groupDocuments.length, // 🔗 Tamaño del grupo
        onConfirm: async (confirmationData) => {
          // 🔗 NUEVA FUNCIONALIDAD: Ejecutar cambio de grupo o individual
          let result;
          if (isGroupMove) {
            result = await updateGroupStatus(
              groupDocuments,
              confirmationData.newStatus,
              { 
                reversionReason: confirmationData.reversionReason,
                deliveredTo: confirmationData.deliveredTo
              }
            );
          } else {
            result = await executeStatusChange(
              confirmationData.document, 
              confirmationData.newStatus, 
              { 
                reversionReason: confirmationData.reversionReason,
                deliveredTo: confirmationData.deliveredTo
              }
            );
          }
          
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

    // 🔗 NUEVA FUNCIONALIDAD: Manejar grupos sin confirmación
    if (isGroupMove) {
      console.log('🔗 Procesando movimiento de grupo sin confirmación');
      setIsDropping(true);

      try {
        const result = await updateGroupStatus(groupDocuments, newStatus);
        
        if (result.success) {
          console.log(`✅ Grupo de ${result.groupSize} documentos movido exitosamente: ${draggedItem.status} -> ${newStatus}`);
          return { 
            success: true, 
            document: draggedItem, 
            newStatus, 
            previousStatus: draggedItem.status,
            groupUpdated: true,
            groupSize: result.groupSize
          };
        } else {
          console.error('❌ updateGroupStatus falló:', result.error);
          throw new Error(result.error || 'Error al actualizar el estado del grupo');
        }
      } catch (error) {
        console.error('💥 Error en drag & drop de grupo:', error);
        return { success: false, error: error.message };
      } finally {
        setIsDropping(false);
        handleDragEnd();
      }
    }

    // CONSERVADOR: Si no requiere confirmación y no es grupo, usar lógica original
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
  }, [draggedItem, updateDocumentStatus, updateDocumentStatusWithConfirmation, requiresConfirmation, handleDragEnd, isValidMove, onConfirmationRequired, executeStatusChange, getGroupDocuments, updateGroupStatus]);

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
   * MEJORADO: Con indicadores de estado más claros
   */
  const getDraggedItemStyle = useCallback((document) => {
    if (draggedItem && draggedItem.id === document.id) {
      // Diferentes estilos según el estado del drag
      const baseStyle = {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000,
        cursor: 'grabbing',
        borderRadius: '12px',
        position: 'relative'
      };

      // Si está processing (dropping)
      if (isDropping) {
        return {
          ...baseStyle,
          opacity: 0.6,
          transform: 'scale(0.95)',
          boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
          border: '2px solid #10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 30%, rgba(16, 185, 129, 0.2) 50%, transparent 70%)',
            borderRadius: '12px',
            animation: 'shimmer 1s infinite'
          }
        };
      }

      // Estado normal de drag
      return {
        ...baseStyle,
        opacity: 0.8,
        transform: 'rotate(3deg) scale(1.05)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.25), 0 5px 15px rgba(0,0,0,0.1)',
        border: '2px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        '&::before': {
          content: '"🎯"',
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          fontSize: '16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }
      };
    }
    
    return {
      transition: 'all 0.2s ease-in-out',
      cursor: 'grab',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }
    };
  }, [draggedItem, isDropping]);

  /**
   * Verificar si una columna puede recibir drops
   */
  const canDrop = useCallback((columnId) => {
    if (!draggedItem) return false;
    // CRÍTICO: No permitir drop en la misma columna
    if (draggedItem.status === columnId) return false;
    return isValidMove(draggedItem.status, columnId);
  }, [draggedItem, isValidMove]);

  /**
   * Hook de debugging - expone funciones de diagnóstico
   * NUEVO: Para debugging y testing del drag and drop
   */
  const debugDragState = useCallback(() => {
    const currentState = {
      draggedItem: !!draggedItem,
      draggedItemId: draggedItem?.id,
      draggedItemStatus: draggedItem?.status,
      dragOverColumn,
      isDropping,
      isDragActiveRef: isDragActiveRef.current,
      dragStartTime: dragStartTimeRef.current,
      timeoutActive: !!dragTimeoutRef.current
    };
    
    console.table(currentState);
    return currentState;
  }, [draggedItem, dragOverColumn, isDropping]);

  /**
   * Función de emergencia para resetear completamente el drag
   * NUEVO: Para casos extremos donde hay problemas persistentes
   */
  const emergencyReset = useCallback(() => {
    console.log('🚨 EMERGENCY RESET del sistema drag and drop');
    forceCleanupDragState('emergency-reset');
    
    // Reset adicional de cualquier estado persistente
    setPendingStatusChange(null);
    
    // Mensaje para el usuario
    return {
      success: true,
      message: 'Sistema drag and drop reiniciado'
    };
  }, [forceCleanupDragState]);

  /**
   * Diagnóstico completo del estado actual
   * NUEVO: Para debuggear problemas específicos
   */
  const runFullDiagnosis = useCallback((documentInfo = null) => {
    console.log('🔬 === DIAGNÓSTICO COMPLETO DRAG & DROP ===');
    
    const diagnosis = {
      currentState: {
        draggedItem: draggedItem ? {
          id: draggedItem.id,
          tramiteNumber: draggedItem.tramiteNumber,
          status: draggedItem.status,
          isGrouped: draggedItem.isGrouped
        } : null,
        dragOverColumn,
        isDropping,
        isDragActiveRef: isDragActiveRef.current,
        dragStartTime: dragStartTimeRef.current,
        hasActiveTimeout: !!dragTimeoutRef.current
      },
      documentSpecific: documentInfo ? {
        documentId: documentInfo.id,
        tramiteNumber: documentInfo.tramiteNumber,
        status: documentInfo.status,
        canMoveToEnProceso: isValidMove(documentInfo.status, 'EN_PROCESO'),
        validTransitions: isValidMove.toString().match(/validTransitions.*=.*{[\s\S]*?};/)?.[0] || 'No encontrado'
      } : null,
      systemHealth: {
        hasCleanupTimeout: !!cleanupTimeoutRef.current,
        dragDurationMs: dragStartTimeRef.current ? Date.now() - dragStartTimeRef.current : 0
      }
    };
    
    console.table(diagnosis.currentState);
    if (diagnosis.documentSpecific) {
      console.table(diagnosis.documentSpecific);
    }
    console.table(diagnosis.systemHealth);
    
    console.log('🔬 === FIN DIAGNÓSTICO ===');
    return diagnosis;
  }, [draggedItem, dragOverColumn, isDropping, isValidMove]);

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
    },

    // NUEVAS FUNCIONES DE DEBUGGING Y RECOVERY
    debugDragState,
    emergencyReset,
    runFullDiagnosis,
    
    // Estado adicional para debugging
    isDragActive: isDragActiveRef.current,
    dragStartTime: dragStartTimeRef.current,
    hasSafetyTimeout: !!dragTimeoutRef.current
  };
};

export default useDragAndDrop;