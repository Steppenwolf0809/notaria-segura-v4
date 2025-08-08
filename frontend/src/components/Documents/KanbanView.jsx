import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Divider,
  Tooltip,
  Paper,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import useDocumentStore from '../../store/document-store';
import useDragAndDrop from '../../hooks/useDragAndDrop';
import usePagination from '../../hooks/usePagination';
import DocumentDetailModal from './DocumentDetailModal';
import EditDocumentModal from './EditDocumentModal';
import LoadMoreButton from '../UI/LoadMoreButton';
import documentService from '../../services/document-service';
import GroupingAlert from '../grouping/GroupingAlert';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import UnifiedDocumentCard from '../shared/UnifiedDocumentCard';
// NUEVOS COMPONENTES: Sistema de confirmaciones y deshacer
import ConfirmationModal from './ConfirmationModal';
import UndoToast from './UndoToast';
import GroupInfoModal from '../shared/GroupInfoModal';
import { filterRecentlyDelivered, getDeliveryFilterNote, DELIVERY_FILTER_PERIODS } from '../../utils/dateUtils';
import './KanbanView.css';

/**
 * Vista Kanban HORIZONTAL - EXACTA AL PROTOTIPO
 * Columnas lado a lado con scroll horizontal si es necesario
 */
const KanbanView = ({ searchTerm, statusFilter, typeFilter }) => {
  const { getDocumentsByStatus, documents, undoDocumentStatusChange, createDocumentGroup, updateDocument, updateDocumentStatusWithConfirmation, requiresConfirmation } = useDocumentStore();
  
  // Estados para modales y componentes
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState(null);
  // 🔗 Estados para modal de agrupación rápida
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState({ main: null, related: [] });
  
  // NUEVOS ESTADOS: Sistema de confirmaciones y deshacer
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [undoToastOpen, setUndoToastOpen] = useState(false);
  const [lastChangeInfo, setLastChangeInfo] = useState(null);
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false);
  
  // Estados para agrupación
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [groupingSuccess, setGroupingSuccess] = useState(null);
  
  // Estados para modal de entrega de matrizador
  const [showMatrizadorDeliveryModal, setShowMatrizadorDeliveryModal] = useState(false);
  const [documentForDelivery, setDocumentForDelivery] = useState(null);
  
  // Estados para modal de información de grupo
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [selectedGroupDocument, setSelectedGroupDocument] = useState(null);

  // Callback para manejar requerimientos de confirmación
  const handleConfirmationRequired = useCallback((data) => {
    console.log('🎯 handleConfirmationRequired llamado con:', data);
    setConfirmationData(data);
    setConfirmationModalOpen(true);
    console.log('✅ Modal de confirmación abierto');
  }, []);

  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    getColumnStyle,
    getDraggedItemStyle,
    getValidationMessage,
    canDrop,
    isDragging,
    draggedItem
  } = useDragAndDrop(handleConfirmationRequired);



  /**
   * Configuración de columnas - EXACTA AL PROTOTIPO
   */
  const kanbanColumns = [
    {
      id: 'EN_PROCESO',
      title: 'En Proceso',
      color: '#1e88e5', // MÁS ELEGANTE: Azul
      bgColor: '#e3f2fd', // Fondo suave azul
      icon: ScheduleIcon,
      description: 'Documentos siendo procesados'
    },
    {
      id: 'LISTO',
      title: 'Listo para Entrega', 
      color: '#10b981', // Verde
      bgColor: '#d1fae5', // Fondo suave verde
      icon: CheckCircleIcon,
      description: 'Listos para notificar al cliente'
    },
    {
      id: 'ENTREGADO',
      title: 'Entregado',
      color: '#6366f1', // Azul-violeta
      bgColor: '#e0e7ff', // Fondo suave azul
      icon: LocalShippingIcon,
      description: 'Documentos completados'
    }
  ];

  /**
   * Filtrar documentos por búsqueda y filtros
   * MEJORA: Filtros completos igual que en ListView
   */
  const filterDocuments = (docs) => {
    return docs.filter(doc => {
      // CORRECCIÓN: Solo buscar si el término tiene al menos 2 caracteres
      const matchesSearch = !searchTerm || searchTerm.length < 2 || 
        doc.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.protocolNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.actoPrincipalDescripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.clientPhone?.includes(searchTerm) ||
        doc.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !typeFilter || doc.documentType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  };

  /**
   * Obtener documentos filtrados por columna
   * MEJORA: Filtro temporal automático para columna ENTREGADO
   */
  const getFilteredDocuments = (status) => {
    if (statusFilter && statusFilter !== status) {
      return [];
    }
    
    let docs = getDocumentsByStatus(status);
    
    if (status === 'ENTREGADO') {
      docs = filterRecentlyDelivered(docs, DELIVERY_FILTER_PERIODS.WEEK);
    }
    
    return filterDocuments(docs);
  };

  // Componente DocumentCard eliminado - ahora usando UnifiedDocumentCard

  const KanbanColumn = ({ column }) => {
    const filteredDocs = getFilteredDocuments(column.id);
    const { visibleItems: documents, hasMore, loadMore, remainingCount } = usePagination(filteredDocs, 10);

    return (
      <Paper
        data-column-id={column.id}
        sx={{ 
          p: 2, 
          height: 'calc(100vh - 280px)', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: 'background.default',
          minWidth: { xs: 320, md: 380 },
          flex: 1,
          maxWidth: { xs: 320, md: 'none' },
          // Estilos dinámicos basados en el drag - CONSERVANDO LÓGICA ORIGINAL
          ...(isDragging && draggedItem && {
            opacity: canDrop(column.id) ? 1 : 0.6,
            border: canDrop(column.id) 
              ? '2px dashed #10b981' 
              : '2px solid #ef4444'
          })
        }}
      >
        {/* Header de columna */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: column.color }}>
              {column.title}
            </Typography>
            <Chip 
              label={filteredDocs.length} 
              size="small" 
              sx={{ 
                bgcolor: column.color, 
                color: 'white',
                fontWeight: 600 
              }} 
            />
          </Box>
          <Box sx={{ mt: 1, height: 2, bgcolor: column.color, borderRadius: 1 }} />
        </Box>

        {/* ZONA DE DROP COMPLETA - Estilo Archivo */}
        <Box
          data-column-id={column.id}
          onDragEnter={(e) => handleDragEnter(e, column.id)}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDrop={(e) => {
            console.log(`🎯 Drop en columna ${column.id}`);
            handleDrop(e, column.id);
          }}
          onDragLeave={(e) => handleDragLeave(e, column.id)}
          sx={{
            flex: 1,
            position: 'relative',
            minHeight: 400,
            borderRadius: 1,
            // Indicador visual cuando se está arrastrando - ESTILO ARCHIVO
            ...(isDragging && draggedItem && {
              backgroundColor: canDrop(column.id) 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: canDrop(column.id)
                ? '2px dashed #10b981'
                : '2px dashed #ef4444',
              '&::before': {
                content: canDrop(column.id) 
                  ? '"✓ Suelta aquí"' 
                  : '"✗ No permitido"',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: canDrop(column.id) ? '#10b981' : '#ef4444',
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
          {/* ÁREA SCROLLEABLE DE DOCUMENTOS - Estilo Archivo */}
          <Box sx={{ 
            overflow: 'auto', 
            height: '100%',
            p: 1
          }}>
            {documents.length === 0 ? (
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
              documents.map((document, index) => (
                <UnifiedDocumentCard
                  key={`${document.id}-${index}`}
                  document={document}
                  role="matrizador"
                  onOpenDetail={openDetailModal}
                  onOpenEdit={openEditModal}
                  onAdvanceStatus={handleAdvanceStatus}
                  onGroupDocuments={handleGroupDocuments}
                  onShowGroupInfo={openGroupInfoModal}
                  isDragging={isDragging && draggedItem?.id === document.id}
                  dragHandlers={{
                    onDragStart: (event) => handleDragStart(event, document),
                    onDragEnd: handleDragEnd
                  }}
                  style={getDraggedItemStyle(document)}
                />
              ))
            )}
          </Box>
          
          {/* Botón de cargar más */}
          <LoadMoreButton onLoadMore={loadMore} hasMore={hasMore} remainingCount={remainingCount} />
        </Box>
      </Paper>
    );
  };

  const openDetailModal = (document) => {
    setSelectedDocument(document);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDocument(null);
  };

  const openEditModal = (document) => {
    setDocumentToEdit(document);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setDocumentToEdit(null);
  };

  // Handlers para modal de información de grupo
  const openGroupInfoModal = (document) => {
    setSelectedGroupDocument(document);
    setGroupInfoModalOpen(true);
  };

  const closeGroupInfoModal = () => {
    setGroupInfoModalOpen(false);
    setSelectedGroupDocument(null);
  };

  /**
   * Manejar avance de estado para el rol Matrizador
   * UNIFICADO: Usa el mismo sistema de confirmaciones que drag and drop
   */
  const handleAdvanceStatus = async (document, newStatus) => {
    try {
      console.log('🚀 handleAdvanceStatus iniciado:', { documentId: document.id, currentStatus: document.status, newStatus });
      
      // Si es para entregar documento (LISTO -> ENTREGADO), abrir modal de entrega
      if (newStatus === 'ENTREGADO' && document.status === 'LISTO') {
        console.log('🎯 Abriendo modal de entrega directa');
        setDocumentForDelivery(document);
        setShowMatrizadorDeliveryModal(true);
        return;
      }

      // UNIFICADO: Usar el mismo sistema de confirmaciones que drag and drop
      console.log('🔄 Verificando si requiere confirmación...');
      const confirmationInfo = requiresConfirmation(document.status, newStatus);
      
      // 🔗 DETECCIÓN DE GRUPO: El botón debe detectar si el documento está agrupado
      const isDocumentGrouped = document.isGrouped && document.documentGroupId;
      const groupSize = isDocumentGrouped ? 
        documents.filter(doc => doc.documentGroupId === document.documentGroupId && doc.isGrouped).length : 
        1;
      
      console.log('🔗 Información de agrupación desde botón:', {
        isGrouped: isDocumentGrouped,
        groupId: document.documentGroupId,
        groupSize,
        documentId: document.id
      });
      
      if (confirmationInfo.requiresConfirmation) {
        console.log('⚠️ Cambio requiere confirmación, usando handleConfirmationRequired');
        
        // Usar el callback del hook useDragAndDrop que SÍ incluye onConfirm
        handleConfirmationRequired({
          document,
          currentStatus: document.status,
          newStatus,
          confirmationInfo,
          isGroupMove: isDocumentGrouped, // 🔗 CORREGIDO: Detectar si es grupo
          groupSize: groupSize, // 🔗 CORREGIDO: Tamaño real del grupo
          onConfirm: async (confirmationData) => {
            console.log('🎯 onConfirm ejecutándose desde botón:', confirmationData);
            console.log('🔗 Es movimiento de grupo:', isDocumentGrouped);
            
            // 🔗 LÓGICA UNIFICADA: Si es grupo, usar lógica de grupo
            if (isDocumentGrouped) {
              console.log('🔗 Usando lógica de grupo desde botón');
              // Obtener todos los documentos del grupo
              const groupDocuments = documents.filter(doc => 
                doc.documentGroupId === document.documentGroupId && doc.isGrouped
              );
              
              // Usar el servicio de grupo (necesito importar updateDocumentGroupStatus)
              const documentService = await import('../../services/document-service.js');
              const result = await documentService.default.updateDocumentGroupStatus(
                document.documentGroupId,
                confirmationData.newStatus,
                { 
                  reversionReason: confirmationData.reversionReason,
                  deliveredTo: confirmationData.deliveredTo
                }
              );
              
              if (result.success) {
                // Actualizar todos los documentos del grupo en el store local
                result.data.documents?.forEach(updatedDoc => {
                  updateDocument(updatedDoc.id, updatedDoc);
                });
              }
              
              return result;
            } else {
              // Lógica individual
              const result = await updateDocumentStatusWithConfirmation(
                confirmationData.document.id,
                confirmationData.newStatus,
                { 
                  reversionReason: confirmationData.reversionReason,
                  deliveredTo: confirmationData.deliveredTo
                }
              );
              
              console.log('📊 Resultado de updateDocumentStatusWithConfirmation:', result);
              return result;
            }
          },
          onCancel: () => {
            console.log('🚫 Cambio cancelado desde botón');
          }
        });
      } else {
        console.log('✅ Cambio no requiere confirmación, ejecutando directamente');
        
        // 🔗 LÓGICA UNIFICADA: También aplicar detección de grupo sin confirmación
        if (isDocumentGrouped) {
          console.log('🔗 Ejecutando cambio de grupo sin confirmación');
          
          // Usar el servicio de grupo
          const documentService = await import('../../services/document-service.js');
          const result = await documentService.default.updateDocumentGroupStatus(
            document.documentGroupId,
            newStatus
          );
          
          if (result.success) {
            console.log('✅ Cambio de grupo exitoso sin confirmación');
            // Actualizar todos los documentos del grupo en el store local
            result.data.documents?.forEach(updatedDoc => {
              updateDocument(updatedDoc.id, updatedDoc);
            });
          } else {
            console.error('❌ Error en cambio de grupo sin confirmación:', result.error);
          }
        } else {
          // Ejecutar cambio individual sin confirmación
          const result = await updateDocumentStatusWithConfirmation(document.id, newStatus);
          
          if (result.success) {
            console.log('✅ Cambio individual exitoso sin confirmación');
          } else {
            console.error('❌ Error en cambio individual sin confirmación:', result.error);
          }
        }
      }
      
    } catch (error) {
      console.error('💥 Error al avanzar estado:', error);
    }
  };

  const handleEditSave = async (formData) => {
    try {
      const response = await documentService.updateDocumentInfo(documentToEdit.id, formData);
      
      if (response.success) {
        // Actualizar documento en el store
        updateDocument(documentToEdit.id, response.data.document);
        
        // Cerrar modal
        closeEditModal();
        
        // Mostrar mensaje de éxito
        console.log('Documento actualizado exitosamente');
      } else {
        console.error('Error actualizando documento:', response.message);
      }
    } catch (error) {
      console.error('Error actualizando documento:', error);
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  /**
   * Manejar actualización de documento desde modal de detalle
   */
  const handleDocumentUpdated = useCallback((updatedData) => {
    console.log('📝 Documento actualizado desde modal:', updatedData);
    
    // Si tenemos la estructura { document: documentData }
    if (updatedData && updatedData.document) {
      const updatedDocument = updatedData.document;
      
      // Actualizar el documento seleccionado para el modal
      setSelectedDocument(prev => prev ? {
        ...prev,
        ...updatedDocument
      } : null);
      
      // Actualizar documento en el store para que se refleje en la vista
      updateDocument(updatedDocument.id, updatedDocument);
      
      console.log('🔄 Documento actualizado en vista Kanban:', updatedDocument);
    }
  }, [updateDocument]);

  // NUEVAS FUNCIONES: Sistema de confirmaciones y deshacer

  /**
   * Manejar confirmación de cambio de estado
   */
  const handleConfirmStatusChange = useCallback(async (modalData) => {
    console.log('🎯 handleConfirmStatusChange iniciado con:', modalData);
    console.log('🔍 confirmationData actual:', confirmationData);
    setIsConfirmationLoading(true);
    
    try {
      // La función onConfirm viene del confirmationData, no del modalData
      if (confirmationData && confirmationData.onConfirm) {
        console.log('🔄 Ejecutando confirmationData.onConfirm...');
        // Ejecutar el cambio confirmado usando la función del hook
        const result = await confirmationData.onConfirm(modalData);
        console.log('📊 Resultado del onConfirm:', result);
        
        if (result.success) {
          console.log('✅ Cambio confirmado exitoso');
          // Cerrar modal de confirmación
          setConfirmationModalOpen(false);
          setConfirmationData(null);
          
          // Mostrar toast con opción de deshacer
          if (result.changeInfo) {
            setLastChangeInfo(result.changeInfo);
            setUndoToastOpen(true);
            console.log('📄 Toast de deshacer mostrado');
          }
        } else {
          console.error('❌ Error ejecutando cambio confirmado:', result.error);
        }
      } else {
        console.error('❌ No hay función onConfirm disponible');
      }
    } catch (error) {
      console.error('💥 Error en confirmación:', error);
    } finally {
      setIsConfirmationLoading(false);
      console.log('🏁 handleConfirmStatusChange finalizado');
    }
  }, [confirmationData]);

  /**
   * Cancelar confirmación de cambio de estado
   */
  const handleCancelConfirmation = useCallback(() => {
    if (confirmationData?.onCancel) {
      confirmationData.onCancel();
    }
    setConfirmationModalOpen(false);
    setConfirmationData(null);
    setIsConfirmationLoading(false);
  }, [confirmationData]);

  /**
   * Manejar deshacer cambio
   */
  const handleUndo = useCallback(async (changeInfo) => {
    try {
      const result = await undoDocumentStatusChange(changeInfo);
      
      if (result.success) {
        console.log('✅ Cambio deshecho exitosamente');
        return result;
      } else {
        console.error('❌ Error deshaciendo cambio:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error en deshacer:', error);
      throw error;
    }
  }, [undoDocumentStatusChange]);

  /**
   * Cerrar toast de deshacer
   */
  const handleCloseUndoToast = useCallback(() => {
    setUndoToastOpen(false);
    setLastChangeInfo(null);
  }, []);

  /**
   * Manejar entrega exitosa desde modal de matrizador
   */
  const handleMatrizadorDelivered = useCallback((deliveryData) => {
    console.log('📝 Documento entregado por matrizador:', deliveryData);
    
    // Actualizar documento en el store si se proporciona
    if (deliveryData && deliveryData.document) {
      updateDocument(deliveryData.document.id, deliveryData.document);
    }
    
    // Cerrar modal
    setShowMatrizadorDeliveryModal(false);
    setDocumentForDelivery(null);
  }, [updateDocument]);

  /**
   * Cerrar modal de entrega de matrizador
   */
  const handleCloseMatrizadorDeliveryModal = useCallback(() => {
    setShowMatrizadorDeliveryModal(false);
    setDocumentForDelivery(null);
  }, []);

  /**
   * Manejar agrupación inteligente para matrizador
   */
  const handleGroupDocuments = useCallback((groupableDocuments, mainDocument) => {
    console.log('🔗 Matrizador: Activando agrupación inteligente:', {
      main: mainDocument.protocolNumber,
      groupable: groupableDocuments.map(d => d.protocolNumber)
    });
    
    setPendingGroupData({
      main: mainDocument,
      related: groupableDocuments
    });
    setShowQuickGroupingModal(true);
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Kanban Board con estilo de Archivo */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        minHeight: 'calc(100vh - 280px)',
        overflowX: 'auto',
        alignItems: 'stretch',  // Asegurar que todas las columnas tengan la misma altura
        p: 2
      }}>
        {kanbanColumns.map((column, index) => (
          <React.Fragment key={column.id}>
            <KanbanColumn column={column} />
            {/* Espacio de drop invisible entre columnas para facilitar el arrastre */}
            {index < kanbanColumns.length - 1 && (
              <Box

                onDragOver={(e) => {
                  e.preventDefault();
                  const nextColumn = kanbanColumns[index + 1];
                  if (nextColumn) {
                    handleDragOver(e, nextColumn.id);
                  }
                }}
                onDrop={(e) => {
                  const nextColumn = kanbanColumns[index + 1];
                  if (nextColumn) {
                    console.log(`🎯 Drop en espacio entre columnas → ${nextColumn.id}`);
                    handleDrop(e, nextColumn.id);
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

      <DocumentDetailModal open={detailModalOpen} onClose={closeDetailModal} document={selectedDocument} onDocumentUpdated={handleDocumentUpdated} />

      {/* Modal de Edición Profesional */}
      <EditDocumentModal
        documento={documentToEdit}
        isOpen={editModalOpen}
        onClose={closeEditModal}
        onSave={handleEditSave}
        userRole="matrizador"
      />

      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related}
        loading={groupingLoading}
        onConfirm={async (selectedDocumentIds) => {
          if (pendingGroupData.main && selectedDocumentIds.length > 0) {
            setGroupingLoading(true);
            
            try {
              const documentIds = [pendingGroupData.main.id, ...selectedDocumentIds];
              console.log('🔗 Confirmando agrupación desde Kanban:', documentIds);
              
              const result = await createDocumentGroup(documentIds);
              
              if (result.success) {
                // Mostrar mensaje de éxito
                setGroupingSuccess({
                  message: result.message || `Grupo creado exitosamente con ${documentIds.length} documentos`,
                  verificationCode: result.verificationCode,
                  documentCount: documentIds.length,
                  whatsappSent: result.whatsapp?.sent || false,
                  whatsappError: result.whatsapp?.error || null,
                  clientPhone: result.whatsapp?.phone || null
                });
                
                console.log('✅ Agrupación exitosa:', result);
                
                // Auto-ocultar después de 5 segundos
                setTimeout(() => {
                  setGroupingSuccess(null);
                }, 5000);
              } else {
                console.error('❌ Error en agrupación:', result.error);
                // El error se maneja en el store
              }
            } catch (error) {
              console.error('❌ Error inesperado en agrupación:', error);
            } finally {
              setGroupingLoading(false);
              setShowQuickGroupingModal(false);
            }
          } else {
            setShowQuickGroupingModal(false);
          }
        }}
      />

      {/* NUEVOS COMPONENTES: Sistema de confirmaciones y deshacer */}
      
      {/* Modal de confirmación para cambios críticos */}
      <ConfirmationModal
        open={confirmationModalOpen}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmStatusChange}
        document={confirmationData?.document}
        currentStatus={confirmationData?.currentStatus}
        newStatus={confirmationData?.newStatus}
        confirmationInfo={confirmationData?.confirmationInfo}
        isLoading={isConfirmationLoading}
        isGroupMove={confirmationData?.isGroupMove || false}
        groupSize={confirmationData?.groupSize || 1}
      />

      {/* Toast con opción de deshacer */}
      <UndoToast
        open={undoToastOpen}
        onClose={handleCloseUndoToast}
        onUndo={handleUndo}
        changeInfo={lastChangeInfo}
        autoHideDelay={10000}
      />

      {/* Modal de información de grupo */}
      <GroupInfoModal
        open={groupInfoModalOpen}
        onClose={closeGroupInfoModal}
        document={selectedGroupDocument}
      />

      {/* Modal de Entrega Simplificado para Matrizadores */}
      <MatrizadorDeliveryModal
        open={showMatrizadorDeliveryModal}
        onClose={handleCloseMatrizadorDeliveryModal}
        document={documentForDelivery}
        onDocumentDelivered={handleMatrizadorDelivered}
      />

      {/* Snackbar para éxito de agrupación */}
      <Snackbar
        open={!!groupingSuccess}
        autoHideDuration={5000}
        onClose={() => setGroupingSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setGroupingSuccess(null)} 
          severity="success" 
          variant="filled"
          sx={{ 
            minWidth: 400,
            '& .MuiAlert-message': {
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5
            }
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            🔗 {groupingSuccess?.message}
          </Typography>
          {groupingSuccess?.verificationCode && (
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              📋 Código de verificación: <strong>{groupingSuccess.verificationCode}</strong>
            </Typography>
          )}
          {groupingSuccess?.whatsappSent && (
            <Typography variant="body2" sx={{ opacity: 0.9, color: 'success.main' }}>
              📱 WhatsApp enviado a {groupingSuccess.clientPhone}
            </Typography>
          )}
          {groupingSuccess?.whatsappError && (
            <Typography variant="body2" sx={{ opacity: 0.9, color: 'warning.main' }}>
              ⚠️ Error enviando WhatsApp: {groupingSuccess.whatsappError}
            </Typography>
          )}
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Los documentos ahora aparecen como agrupados y LISTOS en el sistema
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

/**
 * Modal Simplificado de Entrega para Matrizadores en Kanban
 * Solo requiere información básica, sin códigos de verificación
 */
const MatrizadorDeliveryModal = ({ open, onClose, document, onDocumentDelivered }) => {
  const [formData, setFormData] = React.useState({
    entregadoA: '',
    observacionesEntrega: ''
  });
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState([]);

  // Resetear formulario cuando se abre el modal
  React.useEffect(() => {
    if (open) {
      setFormData({
        entregadoA: '',
        observacionesEntrega: ''
      });
      setErrors([]);
    }
  }, [open]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]);
  };

  const handleDeliver = async () => {
    // Validaciones simplificadas
    const validationErrors = [];
    
    if (!formData.entregadoA.trim()) {
      validationErrors.push('Nombre de quien retira es obligatorio');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      // Preparar datos simplificados para matrizador
      const deliveryData = {
        entregadoA: formData.entregadoA.trim(),
        relacionTitular: 'titular', // Por defecto para matrizadores
        verificacionManual: true, // Siempre manual para matrizadores
        codigoVerificacion: '', // Sin código para matrizadores
        facturaPresenta: false, // Sin validación de factura
        observacionesEntrega: formData.observacionesEntrega.trim()
      };

      const result = await documentService.deliverDocument(document.id, deliveryData);
      
      if (result.success) {
        // Notificar al componente padre
        if (onDocumentDelivered) {
          onDocumentDelivered(result.data);
        }
        
        // Mostrar mensaje de éxito
        const message = result.message || 'Documento entregado exitosamente';
        alert(message);
        onClose();
      } else {
        setErrors([result.message || 'Error al entregar documento']);
      }
    } catch (error) {
      console.error('Error entregando documento:', error);
      setErrors(['Error de conexión al entregar el documento']);
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h6">Entregar Documento</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={saving}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Información del documento */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              📄 Documento a Entregar
            </Typography>
            <Typography variant="body2">
              <strong>Número:</strong> {document.protocolNumber} | 
              <strong> Tipo:</strong> {document.documentType} | 
              <strong> Cliente:</strong> {document.clientName}
            </Typography>
          </Box>

          {/* Errores */}
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Formulario simplificado */}
          <Grid container spacing={2}>
            {/* Quien retira */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Persona que Retira"
                value={formData.entregadoA}
                onChange={(e) => handleFieldChange('entregadoA', e.target.value)}
                placeholder="Nombre completo"
                disabled={saving}
              />
            </Grid>

            {/* Observaciones */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones de Entrega"
                value={formData.observacionesEntrega}
                onChange={(e) => handleFieldChange('observacionesEntrega', e.target.value)}
                placeholder="Notas adicionales sobre la entrega (opcional)"
                disabled={saving}
              />
            </Grid>
          </Grid>

          {/* Nota informativa */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ℹ️ Entrega simplificada para matrizadores: No requiere código de verificación ni validación de factura.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={handleDeliver}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <LocalShippingIcon />}
        >
          {saving ? 'Entregando...' : 'Entregar Documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KanbanView;
