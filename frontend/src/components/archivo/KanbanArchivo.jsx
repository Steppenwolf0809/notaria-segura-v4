import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Assignment as DocumentIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as DateIcon,
  Info as InfoIcon,
  LocalShipping as EntregarIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import archivoService from '../../services/archivo-service';
import { getDeliveryFilterNote, DELIVERY_FILTER_PERIODS } from '../../utils/dateUtils';
import GroupingAlert from '../grouping/GroupingAlert';
import ModalEntrega from '../recepcion/ModalEntrega';

/**
 * Vista Kanban para documentos de archivo
 * Siguiendo el patrón de KanbanView pero adaptado para archivo
 */
const KanbanArchivo = ({ documentos, estadisticas, onEstadoChange, onRefresh }) => {
  const [dragError, setDragError] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedDocument, setDraggedDocument] = useState(null);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [documentoParaEntrega, setDocumentoParaEntrega] = useState(null);

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
   */
  const isValidMove = (fromStatus, toStatus) => {
    const validTransitions = {
      'EN_PROCESO': ['LISTO'],        // En proceso solo puede ir a listo
      'LISTO': ['ENTREGADO'],         // Listo solo puede ir a entregado
      'ENTREGADO': []                 // Entregado no se puede mover
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
   * Manejar drop
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
   * Abrir menú de acciones
   */
  const handleMenuOpen = (event, documento) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(documento);
  };

  /**
   * Cerrar menú
   */
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  /**
   * Abrir modal de entrega
   */
  const handleEntregarClick = () => {
    if (selectedDocument && selectedDocument.status === 'LISTO') {
      setDocumentoParaEntrega(selectedDocument);
      setModalEntregaOpen(true);
      handleMenuClose();
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
   * Manejar avance rápido de estado
   */
  const handleAvanceRapido = async (documento, event) => {
    event.stopPropagation(); // Evitar abrir el menú
    
    const siguienteEstado = {
      'EN_PROCESO': 'LISTO',
      'LISTO': 'ENTREGADO'
    };
    
    const nuevoEstado = siguienteEstado[documento.status];
    
    if (nuevoEstado) {
      console.log(`🚀 Avance rápido: ${documento.protocolNumber} → ${nuevoEstado}`);
      
      try {
        const response = await onEstadoChange(documento.id, nuevoEstado);
        
        if (!response.success) {
          setDragError(response.message || 'Error al cambiar estado');
        }
      } catch (error) {
        console.error('Error en avance rápido:', error);
        setDragError('Error al cambiar estado del documento');
      }
    }
  };

  /**
   * Formatear fecha
   */
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  /**
   * Obtener color del estado
   */
  const getEstadoColor = (estado) => {
    const colores = {
      'PENDIENTE': 'warning',
      'EN_PROCESO': 'info', 
      'LISTO': 'success'
    };
    return colores[estado] || 'default';
  };

  /**
   * Renderizar tarjeta de documento
   */
  const renderDocumentCard = (documento, index) => (
    <Card
      key={documento.id}
      draggable="true"
      onDragStart={(event) => handleDragStart(event, documento)}
      onDragEnd={handleDragEnd}
      onClick={(event) => {
        // Solo abrir acciones si no se está arrastrando
        if (!isDragging) {
          handleMenuOpen(event, documento);
        }
      }}
      sx={{
        mb: 2,
        cursor: isDragging && draggedDocument?.id === documento.id ? 'grabbing' : 'grab',
        transform: isDragging && draggedDocument?.id === documento.id ? 'rotate(5deg)' : 'none',
        boxShadow: isDragging && draggedDocument?.id === documento.id ? 4 : 1,
        '&:hover': {
          boxShadow: 3
        },
        '&:active': {
          cursor: 'grabbing'
        }
      }}
    >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header con acciones */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                #{documento.protocolNumber}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(e, documento);
                }}
                sx={{ ml: 1 }}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Cliente */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {documento.clientName}
              </Typography>
            </Box>

            {/* Teléfono */}
            {documento.clientPhone && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {documento.clientPhone}
                </Typography>
              </Box>
            )}

            {/* Tipo de documento */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <DocumentIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {documento.documentType}
              </Typography>
            </Box>

            {/* Valor */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <MoneyIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                ${documento.totalFactura?.toFixed(2) || '0.00'}
              </Typography>
            </Box>

            {/* Fecha */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DateIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {formatearFecha(documento.createdAt)}
              </Typography>
            </Box>

            {/* Estado */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Chip 
                label={archivoService.formatearEstado(documento.status).texto}
                color={getEstadoColor(documento.status)}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* 🔗 ALERTA DE AGRUPACIÓN COMPACTA */}
            {!documento.isGrouped && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <GroupingAlert
                  document={documento}
                  variant="chip"
                />
              </Box>
            )}

            {/* BOTÓN DE AVANCE RÁPIDO */}
            {(documento.status === 'EN_PROCESO' || documento.status === 'LISTO') && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Tooltip title={`Marcar como ${documento.status === 'EN_PROCESO' ? 'LISTO' : 'ENTREGADO'}`}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleAvanceRapido(documento, e)}
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {documento.status === 'EN_PROCESO' ? (
                      <CheckIcon fontSize="small" />
                    ) : (
                      <EntregarIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </CardContent>
        </Card>
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

      {/* Menú de acciones */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {/* Opción de entrega solo para documentos LISTO */}
        {selectedDocument?.status === 'LISTO' && (
          <>
            <MenuItem onClick={handleEntregarClick}>
              <EntregarIcon sx={{ mr: 1 }} />
              Entregar Documento
            </MenuItem>
            <Divider />
          </>
        )}
        <MenuItem onClick={handleMenuClose}>
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          Editar
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          Historial
        </MenuItem>
      </Menu>

      {/* Modal de Entrega */}
      {modalEntregaOpen && documentoParaEntrega && (
        <ModalEntrega
          documento={documentoParaEntrega}
          onClose={handleCloseModalEntrega}
          onEntregaExitosa={handleEntregaExitosa}
          serviceType="arquivo"
        />
      )}
    </Box>
  );
};

export default KanbanArchivo;