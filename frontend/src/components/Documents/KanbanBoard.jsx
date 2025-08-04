import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon,
  DragIndicator as DragIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import useDocumentStore from '../../store/document-store';
import useDragAndDrop from '../../hooks/useDragAndDrop';
import DocumentDetailModal from './DocumentDetailModal';

/**
 * Componente KanbanBoard - Vista de tablero con drag & drop
 * Organiza documentos por estado en columnas visuales
 */
const KanbanBoard = () => {
  const { getDocumentsByStatus } = useDocumentStore();
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
   * Configuración de las columnas del Kanban
   */
  const kanbanColumns = [
    {
      id: 'EN_PROCESO',
      title: 'En Proceso',
      color: '#f59e0b',
      icon: ScheduleIcon,
      description: 'Documentos siendo procesados'
    },
    {
      id: 'LISTO',
      title: 'Listo para Entrega',
      color: '#10b981',
      icon: CheckCircleIcon,
      description: 'Listos para notificar al cliente'
    },
    {
      id: 'ENTREGADO',
      title: 'Entregado',
      color: '#6b7280',
      icon: LocalShippingIcon,
      description: 'Documentos completados'
    }
  ];

  /**
   * Componente de tarjeta de documento para Kanban
   */
  const KanbanDocumentCard = ({ document }) => {
    const cardStyle = getDraggedItemStyle(document);
    
    return (
      <Card
        draggable
        onDragStart={() => handleDragStart(document)}
        onDragEnd={handleDragEnd}
        sx={{
          mb: 2,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          position: 'relative',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)'
          },
          transition: 'all 0.2s ease-in-out',
          ...cardStyle
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header con drag handle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Chip
              label={document.documentType}
              size="small"
              color="primary"
              variant="outlined"
            />
            <DragIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          </Box>

          {/* Información del cliente */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {document.clientName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {document.protocolNumber}
            </Typography>
          </Box>

          {/* Acto principal */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
              {document.actoPrincipalDescripcion}
            </Typography>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '1rem' }}>
              ${new Intl.NumberFormat('es-EC').format(document.actoPrincipalValor || 0)}
            </Typography>
          </Box>

          {/* Footer con información adicional */}
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {new Date(document.createdAt).toLocaleDateString('es-EC')}
            </Typography>
            {document.clientPhone && (
              <Tooltip title={`Tel: ${document.clientPhone}`}>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetailModal(document);
                  }}
                >
                  <InfoIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Componente de columna del Kanban
   */
  const KanbanColumn = ({ column }) => {
    const documents = getDocumentsByStatus(column.id);
    const columnStyle = getColumnStyle(column.id, true);
    const isValidDropTarget = canDrop(column.id);

    return (
      <Paper
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.id)}
        sx={{
          p: 2,
          height: 'fit-content',
          minHeight: '500px',
          ...columnStyle
        }}
      >
        {/* Header de la columna */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ bgcolor: column.color, width: 32, height: 32, mr: 1 }}>
              <column.icon sx={{ fontSize: 18 }} />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              {column.title}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {column.description}
            </Typography>
            <Chip
              label={documents.length}
              size="small"
              sx={{ 
                bgcolor: column.color,
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>

          {/* Indicador de drop válido */}
          {isDragging && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label={isValidDropTarget ? "Suelta aquí" : "Movimiento no válido"}
                size="small"
                color={isValidDropTarget ? "success" : "error"}
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Lista de documentos */}
        <Box sx={{ minHeight: '400px' }}>
          {documents.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4, 
              color: 'text.secondary',
              opacity: isDragging && isValidDropTarget ? 0.8 : 0.5
            }}>
              <column.icon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2">
                No hay documentos en {column.title.toLowerCase()}
              </Typography>
              {isDragging && isValidDropTarget && (
                <Typography variant="caption" sx={{ mt: 1, color: 'success.main' }}>
                  Suelta el documento aquí
                </Typography>
              )}
            </Box>
          ) : (
            <Stack spacing={0}>
              {documents.map((document) => (
                <KanbanDocumentCard
                  key={document.id}
                  document={document}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header de la vista Kanban */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssignmentIcon sx={{ color: 'primary.main', mr: 2, fontSize: 32 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Vista Kanban
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Gestiona el flujo de documentos arrastrando entre estados
            </Typography>
          </Box>
        </Box>

        {/* Instrucciones */}
        <Card sx={{ bgcolor: 'info.main', color: 'white', mb: 3 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="body2">
              💡 <strong>Instrucciones:</strong> Arrastra las tarjetas de documentos entre las columnas para cambiar su estado. 
              Solo se permiten transiciones válidas según el flujo de trabajo.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tablero Kanban */}
      <Grid container spacing={3}>
        {kanbanColumns.map((column) => (
          <Grid item xs={12} md={4} key={column.id}>
            <KanbanColumn column={column} />
          </Grid>
        ))}
      </Grid>

      {/* Información adicional */}
      <Box sx={{ mt: 4 }}>
        <Card sx={{ bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Flujo de Estados Permitidos
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>✅ Transiciones Válidas:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  • En Proceso → Listo para Entrega<br/>
                  • Listo para Entrega → Entregado<br/>
                  • Permite regresiones para correcciones
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>❌ No Permitido:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  • Documentos entregados no se pueden mover<br/>
                  • Saltos de estado no secuenciales<br/>
                  • Movimientos que rompan la lógica de negocio
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
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

export default KanbanBoard;