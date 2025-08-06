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
  Alert
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  Edit as EditIcon
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
// NUEVOS COMPONENTES: Sistema de confirmaciones y deshacer
import ConfirmationModal from './ConfirmationModal';
import UndoToast from './UndoToast';
import { filterRecentlyDelivered, getDeliveryFilterNote, DELIVERY_FILTER_PERIODS } from '../../utils/dateUtils';
import './KanbanView.css';

/**
 * Vista Kanban HORIZONTAL - EXACTA AL PROTOTIPO
 * Columnas lado a lado con scroll horizontal si es necesario
 */
const KanbanView = ({ searchTerm, statusFilter, typeFilter }) => {
  const { getDocumentsByStatus, documents, undoDocumentStatusChange, createDocumentGroup, updateDocument } = useDocumentStore();
  
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

  /**
   * Componente de tarjeta BALANCEADA - COMPACTA PERO LEGIBLE
   */
  const DocumentCard = React.memo(({ document, allDocumentsInStatus, onOpenDetail }) => {
    const cardStyle = getDraggedItemStyle(document);
    const { status } = document;

    const formatPhone = (phone) => {
      if (!phone) return null;
      if (phone.length === 10 && phone.startsWith('09')) {
        return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
      }
      return phone;
    };

    const formatClientName = (name) => {
      if (!name) return 'Sin nombre';
      return name.trim();
    };
    
    const getStatusText = (status) => {
      const statusTexts = {
        'PENDIENTE': 'Pendiente',
        'EN_PROCESO': 'En Proceso', 
        'LISTO': 'Listo',
        'ENTREGADO': 'Entregado'
      };
      return statusTexts[status] || status;
    };

    const getStatusStyles = (status, theme) => {
      const isDark = theme.palette.mode === 'dark';
      switch(status) {
        case 'EN_PROCESO':
          return {
            backgroundColor: isDark ? 'rgba(30, 136, 229, 0.2)' : 'rgba(30, 136, 229, 0.1)',
            color: isDark ? '#64b5f6' : '#1976d2',
            borderLeft: `3px solid ${isDark ? '#64b5f6' : '#1976d2'}`
          };
        case 'LISTO':
          return {
            backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e8',
            color: isDark ? '#81c784' : '#2e7d32',
            borderLeft: '3px solid #2e7d32'
          };
        default:
          return {
            backgroundColor: isDark ? 'rgba(158, 158, 158, 0.1)' : '#f5f5f5',
            color: isDark ? '#bdbdbd' : '#616161',
            borderLeft: '3px solid #616161'
          };
      }
    };
    
    // CORRECCIÓN: Lógica de agrupación real, no simulada
    const getRelatedDescription = (currentDoc, allDocs) => {
      // CORRECCIÓN: No mostrar agrupación para documentos ya entregados
      if (currentDoc.status === 'ENTREGADO' || !currentDoc.clientName || !allDocs) return null;

      const relatedDocs = allDocs.filter(doc => 
        doc.id !== currentDoc.id && 
        doc.clientName === currentDoc.clientName &&
        !doc.isGrouped
      );

      if (relatedDocs.length === 0) return null;

      const types = relatedDocs.map(doc => doc.documentType || 'documento');
      const typeCounts = types.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const mostCommonType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b, 'documentos');
      
      return {
        count: relatedDocs.length,
        type: `${mostCommonType}${relatedDocs.length > 1 ? 's' : ''}`
      };
    };

    const getDateInfo = () => {
      const now = new Date();
      const createdDate = new Date(document.createdAt || now);
      
      if (status === 'EN_PROCESO') {
        const daysSinceCreated = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        return {
          text: `${daysSinceCreated}d`,
          tooltip: `Recibido hace ${daysSinceCreated} día${daysSinceCreated !== 1 ? 's' : ''}`
        };
      }
      
      if (status === 'LISTO') {
        return { text: 'Listo', tooltip: `Completado - listo para entrega` };
      }
      
      if (status === 'PENDIENTE') {
        return {
          text: createdDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
          tooltip: `Recibido el ${createdDate.toLocaleDateString('es-ES')}`
        };
      }
      
      return null;
    };

    const formattedPhone = formatPhone(document.clientPhone);
    const clientName = formatClientName(document.clientName);
    const dateInfo = getDateInfo();
    const related = getRelatedDescription(document, allDocumentsInStatus);
    
    return (
      <Box
        draggable="true"
        onDragStart={(event) => handleDragStart(event, document)}
        onDragEnd={handleDragEnd}
        onClick={() => onOpenDetail(document)}
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: document.isGrouped ? 'primary.main' : 'divider',
          p: 2,
          borderRadius: 2,
          boxShadow: document.isGrouped 
            ? '0 4px 12px rgba(25, 118, 210, 0.15)' 
            : '0 2px 4px rgba(0,0,0,0.05)',
          cursor: isDragging ? 'grabbing' : 'grab',
          mb: 2,
          minHeight: 180,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          position: 'relative',
          // 🔗 NUEVA FUNCIONALIDAD: Estilo especial para documentos agrupados
          ...(document.isGrouped && {
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: 'primary.main',
            bgcolor: 'primary.lighter',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              background: 'linear-gradient(45deg, transparent, rgba(25, 118, 210, 0.1), transparent)',
              borderRadius: 2,
              zIndex: -1
            }
          }),
          '&:hover': {
            boxShadow: document.isGrouped 
              ? '0 6px 20px rgba(25, 118, 210, 0.25)' 
              : '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
            borderColor: document.isGrouped ? 'primary.dark' : 'primary.main'
          },
          ...cardStyle
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.2, minHeight: '48px' }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: 'text.primary',
              fontSize: '0.85rem',
              lineHeight: 1.2,
              wordWrap: 'break-word',
              whiteSpace: 'normal',
              maxHeight: '2.4em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {clientName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexShrink: 0 }}>
            {/* 🔗 NUEVA FUNCIONALIDAD: Indicador de grupo */}
            {document.isGrouped && (
              <Chip
                label={`Grupo`}
                size="small"
                sx={{ 
                  fontSize: '0.6rem',
                  height: 20,
                  fontWeight: 600,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiChip-label': { px: 0.5 },
                  border: 'none',
                  borderRadius: 1,
                  mr: 0.5
                }}
              />
            )}
            <Chip
              label={getStatusText(status)}
              size="small"
              sx={(theme) => ({ 
                fontSize: '0.7rem',
                height: 24,
                fontWeight: 600,
                ...getStatusStyles(status, theme),
                '& .MuiChip-label': { px: 1, py: 0.25 },
                border: 'none',
                borderRadius: 1.5,
              })}
            />
            <DragIcon sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5 }} />
          </Box>
        </Box>

        <Box sx={{ mb: 1.5, p: 1, borderRadius: 1, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'primary.main', fontFamily: 'monospace', fontWeight: 600, mb: 0.5 }}>
            📄 Doc: {document.protocolNumber}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.4, fontWeight: 500, wordWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={document.actoPrincipalDescripcion}>
            📄 {document.actoPrincipalDescripcion}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p: 1, borderRadius: 1 }}>
          {formattedPhone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 14, color: 'info.main' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'info.main', fontWeight: 500 }}>
                {formattedPhone}
              </Typography>
            </Box>
          )}
          
          {dateInfo && (
            <Tooltip title={dateInfo.tooltip} placement="top" arrow>
              <Chip
                label={dateInfo.text}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  height: 20,
                  fontWeight: 600,
                  bgcolor: (theme) => {
                    if (status === 'LISTO') return theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)';
                    if (status === 'EN_PROCESO') return theme.palette.mode === 'dark' ? 'rgba(30, 136, 229, 0.2)' : 'rgba(30, 136, 229, 0.1)';
                    return theme.palette.mode === 'dark' ? 'rgba(158, 158, 158, 0.2)' : 'rgba(158, 158, 158, 0.1)';
                  },
                  color: (theme) => {
                    if (status === 'LISTO') return theme.palette.mode === 'dark' ? '#81c784' : '#388e3c';
                    if (status === 'EN_PROCESO') return theme.palette.mode === 'dark' ? '#64b5f6' : '#1976d2';
                    return theme.palette.mode === 'dark' ? '#bdbdbd' : '#616161';
                  },
                  '& .MuiChip-label': { px: 1 },
                  cursor: 'help'
                }}
              />
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Chip
            label={document.documentType}
            size="small"
            sx={{ fontSize: '0.75rem', height: 22, fontWeight: 500, bgcolor: 'action.hover', flex: 1 }}
          />
          
          {/* Botón de edición rápida */}
          <Tooltip title="Editar información del documento" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(document);
              }}
              sx={{
                width: 28,
                height: 28,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s'
              }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 🔗 NUEVA FUNCIONALIDAD: Mensaje para documentos agrupados */}
        {document.isGrouped && (
          <Box sx={{ 
            bgcolor: 'rgba(25, 118, 210, 0.08)',
            border: '1px solid rgba(25, 118, 210, 0.3)',
            borderRadius: 2, 
            p: 1, 
            mt: 1,
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5
          }}>
            <LinkIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography variant="body2" sx={{ 
              fontSize: '0.75rem', 
              color: 'primary.main', 
              fontWeight: 600,
              lineHeight: 1.2
            }}>
              Al mover: todos los documentos del grupo se actualizarán juntos
            </Typography>
          </Box>
        )}

        {related && (
          <Box sx={{ 
            bgcolor: 'rgba(23, 162, 184, 0.08)',
            border: '1px solid rgba(23, 162, 184, 0.3)',
            borderRadius: 2, p: 1, display: 'flex', flexDirection: 'column', gap: 0.75, mt: 'auto'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
              <LinkIcon sx={{ fontSize: 14, color: '#17a2b8' }} />
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#17a2b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {related.count} {related.type} del mismo cliente
              </Typography>
            </Box>
            <Button
              variant="contained" size="small" fullWidth
              sx={{ fontSize: '0.7rem', minHeight: 28, bgcolor: '#17a2b8', '&:hover': { bgcolor: '#138496' } }}
              onClick={async (e) => {
                e.stopPropagation();
                
                try {
                  console.log('🔍 Detectando documentos reales para agrupar con:', document.clientName);
                  
                  // Buscar documentos reales del mismo cliente en todos los estados
                  const relatedDocs = documents.filter(doc => 
                    doc.id !== document.id && 
                    doc.clientName === document.clientName &&
                    !doc.isGrouped && // Solo documentos no agrupados
                    doc.status !== 'ENTREGADO' // No incluir documentos ya entregados
                  );
                  
                  console.log('📄 Documentos relacionados encontrados:', relatedDocs.length);
                  
                  if (relatedDocs.length > 0) {
                    setPendingGroupData({ main: document, related: relatedDocs });
                    setShowQuickGroupingModal(true);
                  } else {
                    console.warn('⚠️ No se encontraron documentos relacionados para agrupar');
                    // Podrías mostrar un mensaje al usuario aquí
                  }
                } catch (error) {
                  console.error('❌ Error detectando documentos relacionados:', error);
                }
              }}
            >
              Agrupar
            </Button>
          </Box>
        )}
      </Box>
    );
  });

  const KanbanColumn = ({ column }) => {
    const filteredDocs = getFilteredDocuments(column.id);
    const { visibleItems: documents, hasMore, loadMore, remainingCount } = usePagination(filteredDocs, 10);

    return (
      <Paper
        sx={{
          bgcolor: 'background.default',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          height: '100%',
          minWidth: { xs: 300, md: 350 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          ...(isDragging && canDrop(column.id) && { bgcolor: 'action.hover', borderStyle: 'dashed' }),
          ...(isDragging && !canDrop(column.id) && { bgcolor: 'error.light', opacity: 0.6 }),
          ...getColumnStyle(column.id)
        }}
      >
        {/* Zona de drop que ocupa toda la columna */}
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
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1.5, md: 2 }
          }}
        >
          {/* Header de la columna */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: column.color }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>{column.title}</Typography>
            </Box>
            <Chip label={filteredDocs.length} size="small" sx={{ fontWeight: 600 }} />
          </Box>
          
          {/* Contenido scrolleable de documentos */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
            {documents.length > 0 ? (
              documents.map((doc, index) => (
                <DocumentCard 
                  key={`${doc.id}-${index}`}
                  document={doc} 
                  allDocumentsInStatus={filteredDocs}
                  onOpenDetail={openDetailModal} 
                />
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
                <Typography>No hay documentos</Typography>
              </Box>
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        gap: 2, 
        overflowX: 'auto', 
        p: 2,
        // Asegurar altura mínima para las columnas
        minHeight: 'calc(100vh - 200px)',
        alignItems: 'stretch'
      }}>
        {kanbanColumns.map((column, index) => (
          <React.Fragment key={column.id}>
            <KanbanColumn column={column} />
            {/* Espacio de drop invisible entre columnas para facilitar el arrastre */}
            {index < kanbanColumns.length - 1 && (
              <Box
                onDragEnter={(e) => {
                  // Al entrar en el espacio entre columnas, activar la siguiente columna
                  const nextColumn = kanbanColumns[index + 1];
                  if (nextColumn && isDragging) {
                    handleDragEnter(e, nextColumn.id);
                  }
                }}
                onDragOver={(e) => {
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
                  width: 16,
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

export default KanbanView;
