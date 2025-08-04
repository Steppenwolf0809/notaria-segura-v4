import React, { useState, useMemo } from 'react';
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
  Paper
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import useDocumentStore from '../../store/document-store';
import useDragAndDrop from '../../hooks/useDragAndDrop';
import DocumentDetailModal from './DocumentDetailModal';
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
    handleDragLeave,
    handleDrop,
    getColumnStyle,
    getDraggedItemStyle,
    canDrop,
    isDragging
  } = useDragAndDrop();

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /**
   * Configuración de columnas - EXACTA AL PROTOTIPO
   */
  const kanbanColumns = [
    {
      id: 'EN_PROCESO',
      title: 'En Proceso',
      color: '#f59e0b', // Naranja
      bgColor: '#fef3c7', // Fondo suave naranja
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
      color: '#6366f1', // Azul
      bgColor: '#e0e7ff', // Fondo suave azul
      icon: LocalShippingIcon,
      description: 'Documentos completados'
    }
  ];

  /**
   * Filtrar documentos por búsqueda y filtros
   */
  const filterDocuments = (docs) => {
    return docs.filter(doc => {
      const matchesSearch = !searchTerm || 
        doc.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.protocolNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !typeFilter || doc.documentType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  };

  /**
   * Obtener documentos filtrados por columna
   */
  const getFilteredDocuments = (status) => {
    // Si hay filtro de estado específico, solo mostrar esa columna
    if (statusFilter && statusFilter !== status) {
      return [];
    }
    
    const docs = getDocumentsByStatus(status);
    return filterDocuments(docs);
  };

  /**
   * Componente de tarjeta de documento - REDISEÑO COMPACTO Y ELEGANTE
   */
  const DocumentCard = ({ document, color, status }) => {
    const cardStyle = getDraggedItemStyle(document);
    
    // Función para obtener información contextual según el estado
    const getContextualInfo = () => {
      switch(status) {
        case 'EN_PROCESO':
          return {
            label: 'En proceso desde:',
            value: new Date(document.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }),
            icon: '⏳'
          };
        case 'LISTO':
          return {
            label: 'Listo para entrega:',
            value: document.fechaListo ? new Date(document.fechaListo).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }) : 'Hoy',
            icon: '✅'
          };
        case 'ENTREGADO':
          return {
            label: 'Entregado:',
            value: document.fechaEntrega ? new Date(document.fechaEntrega).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }) : 'Reciente',
            icon: '📦'
          };
        default:
          return {
            label: 'Fecha:',
            value: new Date(document.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }),
            icon: '📄'
          };
      }
    };

    const contextInfo = getContextualInfo();
    
    return (
      <Box
        draggable
        onDragStart={() => handleDragStart(document)}
        onDragEnd={handleDragEnd}
        onClick={() => openDetailModal(document)}
        sx={{
          bgcolor: 'white',
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: `4px solid ${color}`,
          cursor: isDragging ? 'grabbing' : 'pointer',
          userSelect: 'none',
          mb: 2,
          fontSize: { xs: '0.875rem', md: '1rem' },
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)'
          },
          '&:active': {
            transform: 'scale(0.98)'
          },
          transition: 'all 0.2s ease',
          ...(isDragging && cardStyle && {
            opacity: 0.7,
            transform: 'rotate(5deg) scale(1.05)',
            zIndex: 1000,
            boxShadow: '0 8px 25px rgba(0,0,0,0.25)'
          }),
          ...(!isDragging && cardStyle)
        }}
      >
        {/* Header: Cliente + Indicadores de urgencia/grupo */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            fontSize: '0.875rem',
            lineHeight: 1.3,
            flex: 1,
            mr: 1
          }}>
            {document.clientName}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {document.isUrgent && (
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: '#ef4444',
                flexShrink: 0 
              }} />
            )}
            {document.isGrouped && (
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: '#8b5cf6',
                flexShrink: 0 
              }} />
            )}
          </Box>
        </Box>

        {/* Tipo de documento + Grupo si aplica */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            label={document.documentType}
            size="small"
            sx={{ 
              bgcolor: '#e0f2fe',
              color: '#0277bd',
              fontSize: '0.7rem',
              height: 20,
              fontWeight: 500
            }}
          />
          {document.isGrouped && (
            <Chip
              label="Grupo"
              size="small"
              sx={{ 
                bgcolor: '#f3e8ff',
                color: '#7c3aed',
                fontSize: '0.7rem',
                height: 20,
                fontWeight: 500
              }}
            />
          )}
        </Box>

        {/* Valor - Solo si es relevante */}
        {document.actoPrincipalValor && document.actoPrincipalValor > 0 && (
          <Typography variant="subtitle2" sx={{ 
            color: '#059669', 
            fontWeight: 600, 
            fontSize: '0.875rem',
            mb: 2
          }}>
            ${new Intl.NumberFormat('es-EC').format(document.actoPrincipalValor)}
          </Typography>
        )}

        {/* Información contextual según estado */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ 
            color: 'text.secondary',
            fontSize: '0.75rem'
          }}>
            {contextInfo.icon} {contextInfo.value}
          </Typography>
        </Box>
      </Box>
    );
  };

  /**
   * Componente de columna Kanban - EXACTO AL PROTOTIPO
   */
  const KanbanColumn = ({ column }) => {
    const documents = getFilteredDocuments(column.id);
    const columnStyle = getColumnStyle(column.id, true);
    const isValidDropTarget = canDrop(column.id);

    return (
      <Paper
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.id)}
        sx={{
          bgcolor: column.bgColor,
          border: `2px solid ${column.color}20`,
          borderRadius: 2,
          p: { xs: 1.5, md: 2 },
          height: '100%',
          minWidth: { xs: 280, md: 320 },
          maxWidth: { xs: 280, md: 'none' },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          ...(isDragging && canDrop(column.id) && {
            bgcolor: '#f0f9ff',
            borderColor: '#3b82f6',
            borderStyle: 'dashed',
            transform: 'scale(1.02)'
          }),
          ...(isDragging && !canDrop(column.id) && {
            bgcolor: '#fef2f2',
            borderColor: '#ef4444',
            borderStyle: 'dashed',
            opacity: 0.6
          }),
          ...columnStyle
        }}
      >
        {/* Header de la columna - MEJORADO */}
        <Box sx={{ mb: 3, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                bgcolor: column.color 
              }} />
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                fontSize: '1rem'
              }}>
                {column.title}
              </Typography>
              <Typography sx={{ fontSize: '1.2rem' }}>
                {column.id === 'EN_PROCESO' ? '⏳' : column.id === 'LISTO' ? '✅' : '📦'}
              </Typography>
            </Box>
            
            <Chip
              label={documents.length}
              size="small"
              sx={{ 
                bgcolor: 'rgba(148, 163, 184, 0.1)',
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                borderRadius: '12px'
              }}
            />
          </Box>

          {/* Indicador de drop válido */}
          {isDragging && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={isValidDropTarget ? "✨ Suelta aquí" : "❌ Movimiento no válido"}
                size="small"
                color={isValidDropTarget ? "success" : "error"}
                variant="outlined"
                sx={{ 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              />
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Lista de documentos con scroll */}
        <Box sx={{ 
          flexGrow: 1,
          overflowY: 'auto',
          pr: 1,
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: '#e2e8f0',
            borderRadius: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#94a3b8',
            borderRadius: 6,
            '&:hover': {
              background: '#64748b',
            }
          }
        }}>
          {documents.length === 0 ? (
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              textAlign: 'center',
              opacity: isDragging && isValidDropTarget ? 0.9 : 0.6
            }}>
              <Typography sx={{ 
                fontSize: '3rem',
                mb: 2,
                lineHeight: 1
              }}>
                {column.id === 'EN_PROCESO' ? '🎯' : column.id === 'LISTO' ? '✨' : '🎉'}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                mb: 1,
                fontSize: '0.875rem'
              }}>
                {column.id === 'EN_PROCESO' ? 'No hay documentos en proceso' :
                 column.id === 'LISTO' ? 'Ningún documento listo' :
                 'No hay documentos entregados'}
              </Typography>
              
              <Typography variant="caption" sx={{ 
                color: 'text.secondary',
                fontSize: '0.75rem',
                maxWidth: 200,
                lineHeight: 1.3
              }}>
                {column.id === 'EN_PROCESO' ? 'Los nuevos documentos aparecerán aquí cuando se asignen' :
                 column.id === 'LISTO' ? 'Los documentos listos para entregar se mostrarán aquí' :
                 'Los documentos completados aparecerán en esta sección'}
              </Typography>

              {isDragging && isValidDropTarget && (
                <Box sx={{ 
                  mt: 3,
                  p: 2,
                  bgcolor: 'success.main',
                  color: 'white',
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  ✨ Suelta el documento aquí
                </Box>
              )}
            </Box>
          ) : (
            documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                color={column.color}
                status={column.id}
              />
            ))
          )}
        </Box>
      </Paper>
    );
  };

  /**
   * Abrir modal de detalle
   */
  const openDetailModal = (document) => {
    setSelectedDocument(document);
    setDetailModalOpen(true);
  };

  /**
   * Cerrar modal de detalle
   */
  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDocument(null);
  };

  /**
   * Componente de indicador de progreso
   */
  const ProgressIndicator = () => {
    const totalDocuments = documents.length;
    const enProceso = getFilteredDocuments('EN_PROCESO').length;
    const listos = getFilteredDocuments('LISTO').length;
    const entregados = getFilteredDocuments('ENTREGADO').length;
    
    const porcentajeCompletado = totalDocuments > 0 ? ((listos + entregados) / totalDocuments) * 100 : 0;
    
    return (
      <Box sx={{ 
        mb: 3, 
        bgcolor: 'white', 
        p: 3, 
        borderRadius: 2, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            📊 Progreso del Día
          </Typography>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {porcentajeCompletado.toFixed(0)}%
          </Typography>
        </Box>
        
        <Box sx={{ 
          width: '100%', 
          bgcolor: '#e2e8f0', 
          borderRadius: '8px', 
          height: 8,
          mb: 2
        }}>
          <Box sx={{
            bgcolor: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            background: porcentajeCompletado >= 100 ? '#10b981' : '#059669',
            height: 8,
            borderRadius: '8px',
            width: `${porcentajeCompletado}%`,
            transition: 'width 0.3s ease'
          }} />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {enProceso} en proceso • {listos} listos • {entregados} entregados
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Total: {totalDocuments}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Indicador de progreso */}
      <ProgressIndicator />
      
      {/* Kanban Board - LAYOUT HORIZONTAL OPTIMIZADO */}
      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        gap: { xs: 2, md: 3 },
        overflowX: 'auto',
        overflowY: 'hidden',
        pb: 2,
        minHeight: { xs: 500, md: 600 },
        WebkitOverflowScrolling: 'touch', // Scroll suave en iOS
        '&::-webkit-scrollbar': {
          height: 8,
        },
        '&::-webkit-scrollbar-track': {
          background: '#e2e8f0',
          borderRadius: 6,
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#94a3b8',
          borderRadius: 6,
          '&:hover': {
            background: '#64748b',
          }
        }
      }}>
        {kanbanColumns.map((column) => (
          <KanbanColumn 
            key={column.id} 
            column={column} 
          />
        ))}
      </Box>

      {/* Modal de Detalle */}
      <DocumentDetailModal
        open={detailModalOpen}
        onClose={closeDetailModal}
        document={selectedDocument}
      />
    </Box>
  );
};

export default KanbanView;