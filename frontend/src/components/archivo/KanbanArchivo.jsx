import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Alert,
  Tooltip,
  Chip,
  Divider,
  Button,
  Toolbar,
  Checkbox
} from '@mui/material';
import {
  Info as InfoIcon,
  GroupWork as GroupIcon,
  LinkOff as UngroupIcon,
  LocalShipping as DeliveryIcon,
  ChangeCircle as StatusIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';
import { getDeliveryFilterNote, DELIVERY_FILTER_PERIODS } from '../../utils/dateUtils';
import GroupingAlert from '../grouping/GroupingAlert';
import ModalEntrega from '../recepcion/ModalEntrega';
import UnifiedDocumentCard from '../shared/UnifiedDocumentCard';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import DocumentDetailModal from '../Documents/DocumentDetailModal';
import EditDocumentModal from '../Documents/EditDocumentModal';
import ConfirmationModal from '../Documents/ConfirmationModal';
import GroupInfoModal from '../shared/GroupInfoModal';
import useDocumentStore from '../../store/document-store';
import documentService from '../../services/document-service';

/**
 * Vista Kanban para documentos de archivo
 * Siguiendo el patrón de KanbanView pero adaptado para archivo
 */
const KanbanArchivo = ({ documentos, estadisticas, onEstadoChange, onRefresh }) => {
  const { requiresConfirmation, createDocumentGroup } = useDocumentStore();
  
  const [dragError, setDragError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedDocument, setDraggedDocument] = useState(null);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [documentoParaEntrega, setDocumentoParaEntrega] = useState(null);
  
  // Estados para modales unificados
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentToEdit, setDocumentToEdit] = useState(null);
  
  // Estados para modal de confirmación
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);

  // 🔗 ESTADOS PARA AGRUPACIÓN INTELIGENTE
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState({ main: null, related: [] });
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupingSuccess, setGroupingSuccess] = useState(null);

  // Estados para modal de información de grupo
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [selectedGroupDocument, setSelectedGroupDocument] = useState(null);

  // Configuración de columnas
  const columnas = archivoService.getColumnasKanban();

  /**
   * Manejar inicio de drag
   */
  const handleDragStart = (event, documento) => {
    console.log('🎯 DRAG START - Archivo:', documento.protocolNumber);
    setIsDragging(true);
    setDraggedDocument(documento);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', documento.id);
    event.dataTransfer.setData('application/json', JSON.stringify(documento));
  };

  /**
   * Manejar fin de drag
   */
  const handleDragEnd = (event) => {
    console.log('🏁 DRAG END - Archivo');
    setIsDragging(false);
    setDraggedDocument(null);
  };

  /**
   * Validar si un movimiento es válido según las reglas del archivo
   * ACTUALIZADO: Permite reversión ENTREGADO→LISTO para corregir errores
   */
  const isValidMove = (fromStatus, toStatus) => {
    const validTransitions = {
      'EN_PROCESO': ['LISTO'],                    // En proceso solo puede ir a listo
      'LISTO': ['ENTREGADO'],                     // Listo solo puede ir a entregado
      'ENTREGADO': ['LISTO']                      // Entregado puede revertir a listo (con confirmación)
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  };

  /**
   * Manejar drag over (permitir drop)
   */
  const handleDragOver = (event) => {
    event.preventDefault();
    
    // Validar si el movimiento es válido
    if (draggedDocument) {
      const targetColumn = event.currentTarget.closest('[data-column-id]')?.getAttribute('data-column-id');
      if (targetColumn) {
        const isValid = isValidMove(draggedDocument.status, targetColumn);
        event.dataTransfer.dropEffect = isValid ? 'move' : 'none';
      }
    } else {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  /**
   * Manejar drop - CON MODAL DE CONFIRMACIÓN
   */
  const handleDrop = async (event, nuevoEstado) => {
    event.preventDefault();
    
    const documentoId = event.dataTransfer.getData('text/plain');
    
    if (!documentoId || !draggedDocument) {
      console.log('❌ No se pudo obtener documento del drop');
      return;
    }

    // No cambió de estado
    if (draggedDocument.status === nuevoEstado) {
      console.log('ℹ️ Mismo estado, no hay cambio');
      return;
    }

    // Validar que el movimiento es válido
    if (!isValidMove(draggedDocument.status, nuevoEstado)) {
      console.log(`❌ Movimiento no válido: ${draggedDocument.status} → ${nuevoEstado}`);
      setDragError(`No se puede mover de ${draggedDocument.status} a ${nuevoEstado}`);
      return;
    }

    console.log(`📋 DROP VÁLIDO: ${draggedDocument.protocolNumber} → ${nuevoEstado}`);
    
    // NUEVA FUNCIONALIDAD: Verificar si requiere confirmación
    const confirmationInfo = requiresConfirmation(draggedDocument.status, nuevoEstado);
    
    if (confirmationInfo.requiresConfirmation) {
      console.log('🎯 Drop requiere confirmación, abriendo modal...');
      setConfirmationData({
        document: draggedDocument,
        currentStatus: draggedDocument.status,
        newStatus: nuevoEstado,
        confirmationInfo: confirmationInfo
      });
      setConfirmationModalOpen(true);
      return;
    }
    
    // Si no requiere confirmación, proceder directamente
    try {
      const response = await onEstadoChange(documentoId, nuevoEstado);
      
      if (!response.success) {
        setDragError(response.message || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error en drop:', error);
      setDragError('Error al cambiar estado del documento');
    }
  };

  /**
   * Abrir modal de detalles del documento
   */
  const handleOpenDetail = (documento) => {
    setSelectedDocument(documento);
    setDetailModalOpen(true);
  };

  /**
   * Cerrar modal de detalles
   */
  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedDocument(null);
  };

  /**
   * Abrir modal de edición
   */
  const handleOpenEdit = (documento) => {
    setDocumentToEdit(documento);
    setEditModalOpen(true);
  };

  /**
   * Cerrar modal de edición
   */
  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setDocumentToEdit(null);
  };

  /**
   * Abrir modal de información de grupo
   */
  const handleOpenGroupInfo = (documento) => {
    setSelectedGroupDocument(documento);
    setGroupInfoModalOpen(true);
  };

  /**
   * Cerrar modal de información de grupo
   */
  const handleCloseGroupInfo = () => {
    setGroupInfoModalOpen(false);
    setSelectedGroupDocument(null);
  };

  /**
   * Manejar avance de estado del documento - CON MODAL DE CONFIRMACIÓN
   */
  const handleAdvanceStatus = async (documento, nuevoEstado) => {
    console.log(`🚀 handleAdvanceStatus: ${documento.protocolNumber} → ${nuevoEstado}`);
    
    try {
      // NUEVA FUNCIONALIDAD: Verificar si requiere confirmación
      const confirmationInfo = requiresConfirmation(documento.status, nuevoEstado);
      
      if (confirmationInfo.requiresConfirmation) {
        console.log('🎯 Cambio de estado requiere confirmación, abriendo modal...');
        setConfirmationData({
          document: documento,
          currentStatus: documento.status,
          newStatus: nuevoEstado,
          confirmationInfo: confirmationInfo
        });
        setConfirmationModalOpen(true);
        return;
      }
      
      // Si no requiere confirmación, proceder directamente
      // Si es para entregar, abrir modal de entrega
      if (nuevoEstado === 'ENTREGADO' && documento.status === 'LISTO') {
        setDocumentoParaEntrega(documento);
        setModalEntregaOpen(true);
        return;
      }

      // Para otros cambios de estado, usar la función proporcionada
      const response = await onEstadoChange(documento.id, nuevoEstado);
      
      if (!response.success) {
        setDragError(response.message || 'Error al cambiar estado');
      }
    } catch (error) {
      console.error('Error al avanzar estado:', error);
      setDragError('Error al cambiar estado del documento');
    }
  };

  /**
   * Manejar entrega exitosa
   */
  const handleEntregaExitosa = () => {
    setModalEntregaOpen(false);
    setDocumentoParaEntrega(null);
    if (onRefresh) {
      onRefresh();
    }
  };

  /**
   * Cerrar modal de entrega
   */
  const handleCloseModalEntrega = () => {
    setModalEntregaOpen(false);
    setDocumentoParaEntrega(null);
  };

  /**
   * Manejar guardado de edición
   */
  const handleEditSave = async (formData) => {
    console.log('💾 Guardando cambios del documento:', documentToEdit?.protocolNumber);
    console.log('📝 Datos a guardar:', formData);
    
    // Llamar al servicio para actualizar el documento
    const response = await documentService.updateDocumentInfo(documentToEdit.id, formData);
    
    if (response.success) {
      console.log('✅ Documento actualizado exitosamente');
      
      // Cerrar el modal
      handleCloseEdit();
      
      // Refrescar los datos para mostrar los cambios
      if (onRefresh) {
        onRefresh();
      }
      
      // El EditDocumentModal espera que no se lance excepción si es exitoso
      return;
    } else {
      console.error('❌ Error al actualizar documento:', response.error);
      setDragError(response.error || 'Error al guardar los cambios');
      
      // Lanzar excepción para que el modal sepa que hubo un error
      throw new Error(response.error || 'Error al guardar los cambios');
    }
  };

  /**
   * Cerrar modal de confirmación
   */
  const handleCloseConfirmation = () => {
    setConfirmationModalOpen(false);
    setConfirmationData(null);
    setIsConfirmationLoading(false);
  };

  /**
   * Confirmar cambio de estado
   */
  const handleConfirmStatusChange = async (data) => {
    console.log('🎯 Confirmando cambio de estado:', data);
    setIsConfirmationLoading(true);
    
    try {
      const response = await onEstadoChange(data.document.id, data.newStatus, {
        reversionReason: data.reversionReason,
        changeType: data.changeType,
        deliveredTo: data.deliveredTo
      });
      
      if (response.success) {
        console.log('✅ Cambio de estado confirmado exitosamente');
        handleCloseConfirmation();
        
        // Refrescar datos si es necesario
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('❌ Error al confirmar cambio:', response.message);
        setDragError(response.message || 'Error al cambiar estado');
        setIsConfirmationLoading(false);
      }
    } catch (error) {
      console.error('❌ Error al confirmar cambio de estado:', error);
      setDragError('Error al cambiar estado del documento');
      setIsConfirmationLoading(false);
    }
  };

  // 🔗 FUNCIONES DE AGRUPACIÓN INTELIGENTE
  
  /**
   * Manejar agrupación inteligente detectada automáticamente
   */
  const handleGroupDocuments = (groupableDocuments, mainDocument) => {
    console.log('🔗 Activando agrupación inteligente:', {
      main: mainDocument.protocolNumber,
      groupable: groupableDocuments.map(d => d.protocolNumber)
    });
    
    setPendingGroupData({
      main: mainDocument,
      related: groupableDocuments
    });
    setShowQuickGroupingModal(true);
  };

  /**
   * Crear grupo inteligente desde el modal
   */
  const handleCreateSmartGroup = async (documentIds) => {
    setGroupingLoading(true);
    try {
      console.log('🔗 Creando grupo inteligente:', documentIds);
      
      const result = await createDocumentGroup(documentIds);
      console.log('🔗 Resultado de agrupación inteligente:', result);
      
      if (result && result.success) {
        setGroupingSuccess({
          message: `Grupo creado exitosamente con ${documentIds.length} documentos`,
          verificationCode: result.verificationCode,
          documentCount: documentIds.length,
          whatsappSent: result.whatsapp?.sent || false,
          whatsappError: result.whatsapp?.error || null,
          clientPhone: result.whatsapp?.phone || null
        });
        
        // Refrescar datos
        if (onRefresh) {
          onRefresh();
        }
        
        // Auto-ocultar mensaje después de 5 segundos
        setTimeout(() => {
          setGroupingSuccess(null);
        }, 5000);
      } else {
        console.error('❌ Error en agrupación inteligente:', result);
        setDragError(`Error al crear el grupo: ${result?.error || result?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error en agrupación inteligente:', error);
      setDragError(`Error al crear el grupo: ${error.message}`);
    } finally {
      setGroupingLoading(false);
    }
  };





  /**
   * Renderizar tarjeta de documento usando el componente unificado con agrupación inteligente
   */
  const renderDocumentCard = (documento, index) => (
    <UnifiedDocumentCard
      key={documento.id}
      document={documento}
      role="archivo"
      onOpenDetail={handleOpenDetail}
      onOpenEdit={handleOpenEdit}
      onAdvanceStatus={handleAdvanceStatus}
      onGroupDocuments={handleGroupDocuments}
      onShowGroupInfo={handleOpenGroupInfo}
      isDragging={isDragging && draggedDocument?.id === documento.id}
      dragHandlers={{
        onDragStart: (event) => handleDragStart(event, documento),
        onDragEnd: handleDragEnd
      }}
      style={{
        transform: isDragging && draggedDocument?.id === documento.id ? 'rotate(5deg)' : 'none',
        boxShadow: isDragging && draggedDocument?.id === documento.id ? 4 : 1,
        mb: 1
      }}
    />
  );

  /**
   * Renderizar columna
   */
  const renderColumn = (columna) => {
    const documentosColumna = documentos[columna.id] || [];
    
    return (
      <Paper 
        key={columna.id}
        data-column-id={columna.id}
        sx={{ 
          p: 2, 
          height: 'calc(100vh - 280px)', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: 'background.default',
          minWidth: { xs: 320, md: 380 },
          flex: 1,
          maxWidth: { xs: 320, md: 'none' },
          // Estilos dinámicos basados en el drag
          ...(isDragging && draggedDocument && {
            opacity: isValidMove(draggedDocument.status, columna.id) ? 1 : 0.6,
            border: isValidMove(draggedDocument.status, columna.id) 
              ? '2px dashed #10b981' 
              : '2px solid #ef4444'
          })
        }}
      >
          {/* Header de columna */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: columna.color }}>
                {columna.titulo}
              </Typography>
              <Chip 
                label={documentosColumna.length} 
                size="small" 
                sx={{ 
                  bgcolor: columna.color, 
                  color: 'white',
                  fontWeight: 600 
                }} 
              />
            </Box>
            <Divider sx={{ mt: 1, borderColor: columna.color, borderWidth: 1 }} />
          </Box>

          {/* ZONA DE DROP COMPLETA - Cubre toda la columna */}
          <Box
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, columna.id)}
            sx={{
              flex: 1,
              position: 'relative',
              minHeight: 400, // Altura mínima mayor
              borderRadius: 1,
              // Indicador visual cuando se está arrastrando
              ...(isDragging && draggedDocument && {
                backgroundColor: isValidMove(draggedDocument.status, columna.id) 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: isValidMove(draggedDocument.status, columna.id)
                  ? '2px dashed #10b981'
                  : '2px dashed #ef4444',
                '&::before': {
                  content: isValidMove(draggedDocument.status, columna.id) 
                    ? '"✓ Suelta aquí"' 
                    : '"✗ No permitido"',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: isValidMove(draggedDocument.status, columna.id) ? '#10b981' : '#ef4444',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  zIndex: 10,
                  backgroundColor: 'background.paper',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }
              })
            }}
          >
            {/* ÁREA SCROLLEABLE DE DOCUMENTOS */}
            <Box sx={{ 
              overflow: 'auto', 
              height: '100%',
              p: 1
            }}>
            {documentosColumna.length === 0 ? (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                No hay documentos
              </Box>
            ) : (
              documentosColumna.map((documento, index) => 
                renderDocumentCard(documento, index)
              )
            )}
            </Box>
          </Box>

          {/* Nota informativa para columna ENTREGADO */}
          {columna.id === 'ENTREGADO' && (
            <Box sx={{ mt: 1, px: 1 }}>
              <Typography variant="caption" sx={{ 
                color: 'text.secondary',
                fontSize: '0.75rem',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}>
                <InfoIcon sx={{ fontSize: '0.875rem' }} />
                {getDeliveryFilterNote(DELIVERY_FILTER_PERIODS.WEEK)}
              </Typography>
            </Box>
          )}
        </Paper>
    );
  };

  return (
    <Box>
      {/* Error de drag */}
      {dragError && (
        <Alert 
          severity="error" 
          onClose={() => setDragError(null)}
          sx={{ mb: 3 }}
        >
          {dragError}
        </Alert>
      )}

      {/* Mensaje de éxito de agrupación */}
      {groupingSuccess && (
        <Alert 
          severity="success" 
          onClose={() => setGroupingSuccess(null)}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {groupingSuccess.message}
          </Typography>
          {groupingSuccess.verificationCode && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Código de verificación: <strong>{groupingSuccess.verificationCode}</strong>
            </Typography>
          )}
          {groupingSuccess.whatsappSent && (
            <Typography variant="body2" color="success.main">
              ✓ Notificación WhatsApp enviada a {groupingSuccess.clientPhone}
            </Typography>
          )}
          {groupingSuccess.whatsappError && (
            <Typography variant="body2" color="warning.main">
              ⚠ WhatsApp: {groupingSuccess.whatsappError}
            </Typography>
          )}
        </Alert>
      )}



      {/* Resumen de columnas */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {columnas.map(columna => {
            const count = documentos[columna.id]?.length || 0;
            return (
              <Grid item xs={12} sm={4} key={columna.id}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: columna.color }}>
                    {count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {columna.titulo}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Kanban Board con columnas más grandes */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        minHeight: 'calc(100vh - 280px)',
        overflowX: 'auto',
        alignItems: 'stretch'  // Asegurar que todas las columnas tengan la misma altura
      }}>
        {columnas.map((columna, index) => (
          <React.Fragment key={columna.id}>
            {renderColumn(columna)}
            {/* Espacio de drop invisible entre columnas para facilitar el arrastre */}
            {index < columnas.length - 1 && (
              <Box
                onDragOver={handleDragOver}
                onDrop={(event) => {
                  // Al hacer drop en el espacio entre columnas, usar la siguiente columna
                  const nextColumn = columnas[index + 1];
                  if (nextColumn) {
                    console.log(`🎯 Drop en espacio entre columnas → ${nextColumn.id}`);
                    handleDrop(event, nextColumn.id);
                  }
                }}
                sx={{
                  width: 20,
                  minHeight: '100%',
                  position: 'relative',
                  '&::after': isDragging ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'primary.main',
                    opacity: 0.1,
                    borderRadius: 1,
                    transition: 'opacity 0.2s ease'
                  } : {}
                }}
              />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Modal de detalles del documento */}
      {detailModalOpen && selectedDocument && (
        <DocumentDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetail}
          document={selectedDocument}
          userRole="archivo"
        />
      )}

      {/* Modal de edición del documento */}
      {editModalOpen && documentToEdit && (
        <EditDocumentModal
          isOpen={editModalOpen}
          onClose={handleCloseEdit}
          documento={documentToEdit}
          onSave={handleEditSave}
          userRole="archivo"
        />
      )}


      {/* Modal de Entrega */}
      {modalEntregaOpen && documentoParaEntrega && (
        <ModalEntrega
          documento={documentoParaEntrega}
          onClose={handleCloseModalEntrega}
          onEntregaExitosa={handleEntregaExitosa}
          serviceType="arquivo"
        />
      )}

      {/* Modal de confirmación de cambio de estado */}
      {confirmationModalOpen && confirmationData && (
        <ConfirmationModal
          open={confirmationModalOpen}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmStatusChange}
          document={confirmationData.document}
          currentStatus={confirmationData.currentStatus}
          newStatus={confirmationData.newStatus}
          confirmationInfo={confirmationData.confirmationInfo}
          isLoading={isConfirmationLoading}
        />
      )}

      {/* Modal de agrupación inteligente */}
      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related}
        loading={groupingLoading}
        onConfirm={async (selectedDocumentIds) => {
          if (pendingGroupData.main && selectedDocumentIds.length > 0) {
            const documentIds = [pendingGroupData.main.id, ...selectedDocumentIds];
            await handleCreateSmartGroup(documentIds);
          }
          setShowQuickGroupingModal(false);
        }}
      />

      {/* Modal de información de grupo */}
      <GroupInfoModal
        open={groupInfoModalOpen}
        onClose={handleCloseGroupInfo}
        document={selectedGroupDocument}
      />
    </Box>
  );
};

export default KanbanArchivo;