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
  Button
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import useDocumentStore from '../../store/document-store';
import useDragAndDrop from '../../hooks/useDragAndDrop';
import usePagination from '../../hooks/usePagination';
import DocumentDetailModal from './DocumentDetailModal';
import LoadMoreButton from '../UI/LoadMoreButton';
import GroupingAlert from '../grouping/GroupingAlert';
import QuickGroupingModal from '../grouping/QuickGroupingModal';
import { filterRecentlyDelivered, getDeliveryFilterNote, DELIVERY_FILTER_PERIODS } from '../../utils/dateUtils';
import { debugDragAndDrop } from '../../utils/debugDragAndDrop';
import './KanbanView.css';

/**
 * Vista Kanban HORIZONTAL - EXACTA AL PROTOTIPO
 * Columnas lado a lado con scroll horizontal si es necesario
 */
const KanbanView = ({ searchTerm, statusFilter, typeFilter }) => {
  const { getDocumentsByStatus, documents } = useDocumentStore();
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
  } = useDragAndDrop();

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  // 🔗 Estados para modal de agrupación rápida
  const [showQuickGroupingModal, setShowQuickGroupingModal] = useState(false);
  const [pendingGroupData, setPendingGroupData] = useState({ main: null, related: [] });

  // Debug para drag & drop
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('🐛 Ejecutando diagnóstico Drag & Drop en KanbanView...');
        debugDragAndDrop.runFullDiagnostic();
      }, 3000);
    }
  }, []);

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
          borderColor: 'divider',
          p: 2,
          borderRadius: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          cursor: isDragging ? 'grabbing' : 'grab',
          mb: 2,
          minHeight: 180,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
            borderColor: 'primary.main'
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

        <Chip
            label={document.documentType}
            size="small"
            sx={{ fontSize: '0.75rem', height: 22, fontWeight: 500, bgcolor: 'action.hover' }}
        />

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
              onClick={(e) => {
                e.stopPropagation();
                const simulatedRelated = Array.from({ length: related.count }, (_, i) => ({ id: `related-${document.id}-${i}`, protocolNumber: `${document.protocolNumber.slice(0, -2)}${String(i + 1).padStart(2, '0')}`, clientName: document.clientName, documentType: related.type, status: 'EN_PROCESO' }));
                setPendingGroupData({ main: document, related: simulatedRelated });
                setShowQuickGroupingModal(true);
              }}
            >
              Agrupar
            </Button>
          </Box>
        )}
      </Box>
    );
  });

  const KanbanColumn = React.memo(({ column }) => {
    const filteredDocs = getFilteredDocuments(column.id);
    const { visibleItems: documents, hasMore, loadMore, remainingCount } = usePagination(filteredDocs, 10);

    return (
      <Paper
        data-column-id={column.id}
        onDragEnter={(e) => handleDragEnter(e, column.id)}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDrop={(e) => handleDrop(e, column.id)}
        onDragLeave={handleDragLeave}
        sx={{
          bgcolor: 'background.default',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 1.5, md: 2 },
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: column.color }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>{column.title}</Typography>
          </Box>
          <Chip label={filteredDocs.length} size="small" sx={{ fontWeight: 600 }} />
        </Box>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <DocumentCard 
                key={doc.id} 
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
        <LoadMoreButton onLoadMore={loadMore} hasMore={hasMore} remainingCount={remainingCount} />
      </Paper>
    );
  });

  const openDetailModal = (document) => {
    setSelectedDocument(document);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDocument(null);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, overflowX: 'auto', p: 2 }}>
        {kanbanColumns.map((column) => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </Box>

      <DocumentDetailModal open={detailModalOpen} onClose={closeDetailModal} document={selectedDocument} />

      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related}
        onConfirm={async (selectedDocumentIds) => {
          if (pendingGroupData.main && selectedDocumentIds.length > 0) {
            const documentIds = [pendingGroupData.main.id, ...selectedDocumentIds];
            // Aquí iría la lógica para crear el grupo
            console.log('Confirmando agrupación desde Kanban:', documentIds);
          }
          setShowQuickGroupingModal(false);
        }}
      />
    </Box>
  );
};

export default KanbanView;
