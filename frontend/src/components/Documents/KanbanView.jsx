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
      
      // Nota: statusFilter no aplica aquí porque ya se filtra por columna en getFilteredDocuments
      
      return matchesSearch && matchesType;
    });
  };

  /**
   * Obtener documentos filtrados por columna
   * MEJORA: Filtro temporal automático para columna ENTREGADO
   */
  const getFilteredDocuments = (status) => {
    // Si hay filtro de estado específico, solo mostrar esa columna
    if (statusFilter && statusFilter !== status) {
      return [];
    }
    
    let docs = getDocumentsByStatus(status);
    
    // FILTRO TEMPORAL AUTOMÁTICO: Solo para columna ENTREGADO
    // Mostrar únicamente documentos entregados en los últimos 7 días
    if (status === 'ENTREGADO') {
      docs = filterRecentlyDelivered(docs, DELIVERY_FILTER_PERIODS.WEEK);
    }
    
    return filterDocuments(docs);
  };

  /**
   * Componente de tarjeta de documento - REDISEÑO CON INFORMACIÓN OPERATIVA CRÍTICA
   * MEJORA: Incluye todos los datos necesarios para gestión eficiente
   * OPTIMIZACIÓN: Memoizado para evitar re-renders innecesarios
   */
  const DocumentCard = memo(({ document, color, status }) => {
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

    // Función para formatear el teléfono de contacto
    const formatPhone = (phone) => {
      if (!phone) return null;
      // Formatear teléfono ecuatoriano: 0998765432 → 099-876-5432
      if (phone.length === 10 && phone.startsWith('09')) {
        return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
      }
      return phone;
    };

    // NOTA: El Matrizador NO maneja información de pagos
    // Esta función se removió porque no corresponde al rol Matrizador
    
    // Funciones para el estado de procesamiento (apropiadas para Matrizador)
    const getStatusText = (status) => {
      const statusTexts = {
        'PENDIENTE': 'Pendiente',
        'EN_PROCESO': 'En Proceso', 
        'LISTO': 'Listo',
        'ENTREGADO': 'Entregado'
      };
      return statusTexts[status] || status;
    };

    const getStatusColor = (status) => {
      const statusColors = {
        'PENDIENTE': 'warning',
        'EN_PROCESO': 'info',
        'LISTO': 'success', 
        'ENTREGADO': 'default'
      };
      return statusColors[status] || 'default';
    };

    const contextInfo = getContextualInfo();
    const formattedPhone = formatPhone(document.clientPhone);
    
    return (
      <Box
        draggable="true"
        onDragStart={(event) => {
          console.log('🎯 DRAG START detectado para:', document.protocolNumber);
          // FORZAR configuración dataTransfer para compatibilidad
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', document.id);
          event.dataTransfer.setData('application/json', JSON.stringify(document));
          handleDragStart(event, document);
        }}
        onDragEnd={(event) => {
          console.log('🏁 DRAG END detectado para:', document.protocolNumber);
          handleDragEnd(event);
        }}
        onClick={(event) => {
          // Solo abrir modal si no se está arrastrando
          if (!isDragging) {
            openDetailModal(document);
          }
        }}
        sx={{
          bgcolor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgb(248, 250, 252)', // Fondo sutil según tema
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          boxShadow: 1,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none', // CRÍTICO: Prevenir interferencia en touch devices
          mb: 2,
          fontSize: { xs: '0.875rem', md: '1rem' },
          '&:hover': {
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'white', // Hover adapta al tema
            boxShadow: 3,
            transform: 'translateY(-2px)'
          },
          '&:active': {
            transform: 'scale(0.98)'
          },
          transition: isDragging ? 'none' : 'all 0.2s ease', // Sin transición durante drag
          // Estilos de drag simplificados
          ...(isDragging && {
            opacity: 0.8,
            zIndex: 1000,
            pointerEvents: 'none' // CRÍTICO: Permitir que eventos pasen a drop zones
          }),
          ...(!isDragging && cardStyle)
        }}
      >
        {/* Header: Cliente + Indicadores de estado/urgencia/grupo */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, mr: 1 }}>
            {/* Círculo indicador de estado */}
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: color,
              flexShrink: 0,
              mt: 0.5
            }} />
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 700, 
              color: 'text.primary',
              fontSize: '0.9rem',
              lineHeight: 1.2,
              flex: 1
            }}>
              {document.clientName}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {document.isUrgent && (
              <Tooltip title="Documento urgente">
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: '#ef4444',
                  flexShrink: 0 
                }} />
              </Tooltip>
            )}
            {document.isGrouped && (
              <Tooltip title="Parte de un grupo">
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: '#8b5cf6',
                  flexShrink: 0 
                }} />
              </Tooltip>
            )}
            <DragIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />
          </Box>
        </Box>

        {/* INFORMACIÓN OPERATIVA CRÍTICA */}
        
        {/* 1. Número de Protocolo/Documento */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'primary.main' }}>
            📄 Doc:
          </Typography>
          <Typography variant="body2" sx={{ 
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'text.primary',
            backgroundColor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.03)',
            px: 1,
            py: 0.2,
            borderRadius: 1
          }}>
            {document.protocolNumber}
          </Typography>
        </Box>

        {/* 2. Descripción del Trámite */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ 
            fontWeight: 500,
            color: 'text.primary',
            fontSize: '0.8rem',
            lineHeight: 1.3
          }}>
            📝 {document.actoPrincipalDescripcion}
          </Typography>
        </Box>

        {/* 3. Teléfono de Contacto */}
        {formattedPhone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'info.main' }}>
              📱
            </Typography>
            <Typography variant="body2" sx={{ 
              fontWeight: 500,
              color: 'info.main',
              fontSize: '0.8rem'
            }}>
              {formattedPhone}
            </Typography>
          </Box>
        )}

        {/* 4. Información Contextual para Matrizador */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1.5,
          bgcolor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.03)' 
            : 'rgba(0, 0, 0, 0.02)',
          p: 1,
          borderRadius: 1,
          gap: 1
        }}>
          {/* Estado de Procesamiento */}
          <Chip
            label={getStatusText(document.status)}
            size="small"
            color={getStatusColor(document.status)}
            sx={{ 
              fontSize: '0.65rem',
              height: 18,
              fontWeight: 600,
              borderRadius: '8px'
            }}
          />
          
          {/* Fecha contextual */}
          <Typography variant="caption" sx={{ 
            color: 'text.secondary',
            fontSize: '0.7rem',
            fontWeight: 500
          }}>
            {contextInfo.icon} {contextInfo.value}
          </Typography>
        </Box>

        {/* 5. Tipo de documento con indicador de grupo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            label={document.documentType}
            size="small"
            sx={{ 
              fontSize: '0.7rem',
              height: 18,
              fontWeight: 500,
              bgcolor: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgb(241, 245, 249)',
              color: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.8)'
                : 'rgb(51, 65, 85)',
              border: 'none',
              borderRadius: '8px'
            }}
          />
          {document.isGrouped && (
            <Chip
              label="Grupo"
              size="small"
              sx={{ 
                fontSize: '0.65rem',
                height: 18,
                fontWeight: 500,
                bgcolor: '#8b5cf620',
                color: '#8b5cf6',
                border: '1px solid #8b5cf640',
                borderRadius: '8px'
              }}
            />
          )}
        </Box>

        {/* 🔗 ALERTA DE AGRUPACIÓN INTELIGENTE PARA KANBAN */}
        {!document.isGrouped && (
          <Box sx={{ mb: 1 }}>
            <GroupingAlert
              document={document}
              variant="compact"
              showAutoButton={true}
              onGroupAction={(groupableDocuments, currentDocument) => {
                console.log('🔗 Abriendo modal de agrupación desde Kanban:', {
                  current: currentDocument.protocolNumber,
                  groupable: groupableDocuments.map(d => d.protocolNumber)
                });
                // Abrir modal de confirmación
                setPendingGroupData({
                  main: currentDocument,
                  related: groupableDocuments
                });
                setShowQuickGroupingModal(true);
              }}
              sx={{ 
                fontSize: '0.75rem',
                py: 0.5,
                '.MuiAlert-message': { 
                  py: 0.25,
                  fontSize: '0.75rem' 
                },
                '.MuiButton-root': {
                  fontSize: '0.7rem',
                  py: 0.25,
                  px: 1
                }
              }}
            />
          </Box>
        )}

        {/* 6. Última Actividad (simulada por ahora) */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="caption" sx={{ 
            color: 'text.secondary',
            fontSize: '0.7rem',
            fontStyle: 'italic'
          }}>
            🕐 Hace {Math.floor(Math.random() * 5) + 1}h - {status === 'EN_PROCESO' ? 'Asignado' : status === 'LISTO' ? 'Completado' : 'Entregado'}
          </Typography>
        </Box>
      </Box>
    );
  });

  /**
   * Componente de columna Kanban - EXACTO AL PROTOTIPO
   * MEJORA: Con paginación "Cargar más"
   * OPTIMIZACIÓN: Memoizado para mejor rendimiento
   */
  const KanbanColumn = memo(({ column }) => {
    const allDocuments = getFilteredDocuments(column.id);
    const {
      visibleItems: documents,
      hasMore,
      remainingCount,
      isLoading,
      loadMore,
      reset
    } = usePagination(allDocuments, 10, 10);
    
    const columnStyle = getColumnStyle(column.id, true);
    const isValidDropTarget = canDrop(column.id);

    // Reiniciar paginación cuando cambien los filtros
    React.useEffect(() => {
      reset();
    }, [searchTerm, statusFilter, typeFilter, reset]);

    return (
      <Paper
        data-drop-zone={column.id}
        data-column-id={column.id}
        className="drop-zone"
        onMouseUp={(e) => {
          // IMPLEMENTACIÓN ALTERNATIVA: Drop basado en mouse up
          if (isDragging) {
            console.log('🎯 MOUSE DROP detectado en:', column.id, column.title);
            handleDrop(e, column.id);
          }
        }}
        onMouseEnter={(e) => {
          if (isDragging) {
            console.log('📥 MOUSE ENTER en:', column.id, column.title);
            handleDragEnter(e, column.id);
          }
        }}
        onMouseMove={(e) => {
          if (isDragging) {
            handleDragOver(e, column.id);
          }
        }}
        sx={{
          bgcolor: 'background.paper', // Respeta el tema actual
          border: 1,
          borderColor: 'divider', // Respeta el tema actual
          borderRadius: 2,
          p: { xs: 1.5, md: 2 },
          height: '100%',
          minWidth: { xs: 300, md: 350 },
          maxWidth: { xs: 300, md: 'none' },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          position: 'relative', // Para z-index
          zIndex: 1, // Asegurar que esté encima
          ...(isDragging && canDrop(column.id) && {
            bgcolor: '#f0f9ff',
            borderColor: '#3b82f6',
            borderStyle: 'dashed',
            transform: 'scale(1.02)',
            zIndex: 10
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
              label={`${documents.length}${allDocuments.length > documents.length ? `/${allDocuments.length}` : ''}`}
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
              {/* Mensaje explicativo para movimientos inválidos */}
              {!isValidDropTarget && draggedItem && (
                <Typography variant="caption" sx={{ 
                  display: 'block',
                  mt: 1,
                  color: 'error.main',
                  fontSize: '0.7rem',
                  lineHeight: 1.2,
                  fontStyle: 'italic'
                }}>
                  {getValidationMessage(draggedItem.status, column.id)}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Lista de documentos con scroll - ZONA DE DROP ACTIVA */}
        <Box 
          sx={{ 
            flexGrow: 1,
            overflowY: 'auto',
            pr: 1,
            scrollBehavior: 'smooth',
            position: 'relative',
            minHeight: 200,

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
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📥 DRAG ENTER simple en:', column.id, column.title);
            handleDragEnter(e, column.id);
          }}
          onDragOver={(e) => {
            e.preventDefault(); // CRÍTICO para permitir drop
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move'; // Mostrar cursor de move
            console.log('🔄 DRAG OVER simple en:', column.id, column.title);
            handleDragOver(e, column.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 DROP simple en:', column.id, column.title);
            handleDrop(e, column.id);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📤 DRAG LEAVE simple de:', column.id, column.title);
            handleDragLeave(e);
          }}
        >
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
                {(searchTerm || typeFilter) ? '🔍' : 
                 (column.id === 'EN_PROCESO' ? '🎯' : column.id === 'LISTO' ? '✨' : '🎉')}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                mb: 1,
                fontSize: '0.875rem'
              }}>
                {(searchTerm || typeFilter) ? 'Sin resultados para los filtros aplicados' :
                 column.id === 'EN_PROCESO' ? 'No hay documentos en proceso' :
                 column.id === 'LISTO' ? 'Ningún documento listo' :
                 column.id === 'ENTREGADO' ? 'No hay documentos entregados recientes' :
                 'No hay documentos'}
              </Typography>
              
              <Typography variant="caption" sx={{ 
                color: 'text.secondary',
                fontSize: '0.75rem',
                maxWidth: 200,
                lineHeight: 1.3
              }}>
                {(searchTerm || typeFilter) ? 'Prueba ajustando los filtros o realizando una búsqueda diferente' :
                 column.id === 'EN_PROCESO' ? 'Los nuevos documentos aparecerán aquí cuando se asignen' :
                 column.id === 'LISTO' ? 'Los documentos listos para entregar se mostrarán aquí' :
                 column.id === 'ENTREGADO' ? 'Los documentos entregados recientemente aparecerán aquí' :
                 'Los documentos aparecerán en esta columna'}
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

        {/* Botón Cargar Más */}
        <LoadMoreButton
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
          remainingCount={remainingCount}
          disabled={isDragging}
        />

        {/* Nota informativa para columna ENTREGADO */}
        {column.id === 'ENTREGADO' && (
          <Box sx={{ 
            flexShrink: 0,
            mt: 2,
            pt: 2,
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            textAlign: 'center'
          }}>
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
  });

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
        mb: 2, // Reducido de 3 a 2
        bgcolor: 'background.paper', 
        px: 3, // Cambiado padding horizontal
        py: 1.5, // Padding vertical reducido
        borderRadius: 1, // Reducido de 2 a 1
        boxShadow: 0, // Eliminada la sombra
        border: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            📊 Progreso del Día
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {porcentajeCompletado.toFixed(0)}%
          </Typography>
        </Box>
        
        <Box sx={{ 
          width: '100%', 
          bgcolor: 'action.disabled', 
          borderRadius: '4px', // Reducido
          height: 6, // Reducido de 8 a 6
          mb: 1 // Reducido
        }}>
          <Box sx={{
            bgcolor: 'success.main',
            height: 6, // Reducido
            borderRadius: '4px', // Reducido
            width: `${porcentajeCompletado}%`,
            transition: 'width 0.3s ease'
          }} />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
            {enProceso} en proceso • {listos} listos • {entregados} entregados
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
            Total: {totalDocuments}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default' // Respeta el tema actual
    }}>
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

      {/* 🔗 MODAL DE CONFIRMACIÓN DE AGRUPACIÓN RÁPIDA */}
      <QuickGroupingModal
        open={showQuickGroupingModal}
        onClose={() => setShowQuickGroupingModal(false)}
        mainDocument={pendingGroupData.main}
        relatedDocuments={pendingGroupData.related}
        onConfirm={async (selectedDocumentIds) => {
          if (pendingGroupData.main && selectedDocumentIds.length > 0) {
            const documentIds = [pendingGroupData.main.id, ...selectedDocumentIds];
            console.log('🔗 Confirmando agrupación desde Kanban:', {
              main: pendingGroupData.main.protocolNumber,
              selectedIds: selectedDocumentIds
            });
            
            // TODO: Aquí se puede implementar la creación de grupo para Kanban
            // Usar documentService.createSmartGroup si es necesario
          }
          setShowQuickGroupingModal(false);
        }}
      />
    </Box>
  );
};

export default KanbanView;