import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
  Avatar,
  Divider,
  Alert,
  Skeleton,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Assignment as DocumentIcon,
  Pending as PendingIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  LocalShipping as DeliveredIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  Verified as VerifiedIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import useAuthStore from '../../store/auth-store';

/**
 * Componente para mostrar el timeline completo de un documento
 * Incluye eventos, cambios de estado y auditoría
 */
const DocumentStatusTimeline = ({ open, onClose, document }) => {
  const { token } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar eventos del documento
   */
  const loadDocumentEvents = async () => {
    if (!document || !open) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/api/admin/documents/${document.id}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar el timeline');
      }

      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data.events);
      }
    } catch (error) {
      console.error('Error cargando timeline:', error);
      setError(error.message || 'Error al cargar el timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && document) {
      loadDocumentEvents();
    }
  }, [open, document, token]);

  /**
   * Obtener icono según el tipo de evento
   */
  const getEventIcon = (eventType) => {
    const icons = {
      DOCUMENT_CREATED: <DocumentIcon />,
      DOCUMENT_ASSIGNED: <PersonIcon />,
      STATUS_CHANGED: <InProgressIcon />,
      INFO_EDITED: <EditIcon />,
      GROUP_CREATED: <GroupIcon />,
      GROUP_DELIVERED: <DeliveredIcon />,
      VERIFICATION_GENERATED: <VerifiedIcon />
    };
    return icons[eventType] || <TimeIcon />;
  };

  /**
   * Obtener color según el tipo de evento
   */
  const getEventColor = (eventType) => {
    const colors = {
      DOCUMENT_CREATED: 'primary',
      DOCUMENT_ASSIGNED: 'info', 
      STATUS_CHANGED: 'warning',
      INFO_EDITED: 'secondary',
      GROUP_CREATED: 'success',
      GROUP_DELIVERED: 'success',
      VERIFICATION_GENERATED: 'error'
    };
    return colors[eventType] || 'grey';
  };

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    const colors = {
      PENDIENTE: '#f59e0b',
      EN_PROCESO: '#3b82f6',
      LISTO: '#22c55e', 
      ENTREGADO: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  /**
   * Formatear descripción del evento
   */
  const formatEventDescription = (event) => {
    const details = event.details || {};
    
    switch (event.eventType) {
      case 'STATUS_CHANGED':
        return `Estado cambiado de ${details.previousStatus || 'N/A'} a ${details.newStatus || 'N/A'}`;
      case 'DOCUMENT_ASSIGNED':
        return `Asignado a ${details.assignedToName || 'matrizador'}`;
      case 'INFO_EDITED':
        const changes = Object.keys(details.changes || {});
        return `Información editada: ${changes.join(', ')}`;
      case 'GROUP_CREATED':
        return `Agrupado con ${details.groupSize || 'otros'} documentos`;
      default:
        return event.description;
    }
  };

  /**
   * Calcular tiempo transcurrido
   */
  const getTimeAgo = (date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffMs = now - eventDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffMinutes > 0) return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  };

  /**
   * Renderizar información del documento
   */
  const renderDocumentInfo = () => {
    if (!document) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Documento
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {document.protocolNumber}
              </Typography>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                Cliente
              </Typography>
              <Typography variant="body1">
                {document.clientName}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Estado Actual
              </Typography>
              <Chip
                label={document.status}
                size="small"
                sx={{
                  bgcolor: getStatusColor(document.status),
                  color: 'white',
                  mb: 2
                }}
              />
              
              <Typography variant="subtitle2" color="text.secondary">
                Tipo
              </Typography>
              <Typography variant="body1">
                {document.documentType}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  if (!document) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Timeline del Documento
            </Typography>
          </Box>
          <Button
            onClick={onClose}
            color="inherit"
            startIcon={<CloseIcon />}
          >
            Cerrar
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Información del documento */}
        {renderDocumentInfo()}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Timeline de eventos */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <TimeIcon sx={{ mr: 1 }} />
            Historial de Eventos
          </Typography>
          
          <Divider sx={{ mb: 3 }} />

          {loading ? (
            // Skeleton loading
            <Box>
              {Array.from(new Array(5)).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', mb: 3 }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="80%" />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : events.length === 0 ? (
            <Alert severity="info">
              No se encontraron eventos para este documento.
            </Alert>
          ) : (
            <List sx={{ 
              width: '100%', 
              bgcolor: 'background.paper',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '20px',
                top: 0,
                bottom: 0,
                width: '2px',
                bgcolor: 'divider',
                zIndex: 0
              }
            }}>
              {events.map((event, index) => (
                <ListItem 
                  key={event.id} 
                  alignItems="flex-start"
                  sx={{ 
                    position: 'relative',
                    mb: 2,
                    pl: 0
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: '42px',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: index === 0 ? `${getEventColor(event.eventType)}.main` : 'background.paper',
                        border: `2px solid`,
                        borderColor: `${getEventColor(event.eventType)}.main`,
                        color: index === 0 ? 'white' : `${getEventColor(event.eventType)}.main`,
                        boxShadow: (theme) => theme.palette.mode === 'dark' 
                          ? `0 0 0 2px ${theme.palette.background.paper}` 
                          : 'none'
                      }}
                    >
                      {getEventIcon(event.eventType)}
                    </Box>
                  </ListItemIcon>
                  
                  <ListItemText 
                    sx={{ ml: 2 }}
                    primary={
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2,
                          bgcolor: index === 0 
                            ? (theme) => theme.palette.mode === 'dark' 
                              ? theme.palette.primary.dark 
                              : theme.palette.primary.light
                            : 'background.paper',
                          border: index === 0 ? '2px solid' : '1px solid',
                          borderColor: index === 0 ? 'primary.main' : 'divider',
                          borderRadius: 2
                        }}
                      >
                        {/* Fecha y hora */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography 
                            variant="h6" 
                            component="h3"
                            sx={{ 
                              fontSize: '0.9rem',
                              fontWeight: index === 0 ? 'bold' : 'medium',
                              color: index === 0 
                                ? (theme) => theme.palette.mode === 'dark' 
                                  ? theme.palette.primary.light 
                                  : theme.palette.primary.main
                                : 'inherit',
                              flex: 1
                            }}
                          >
                            {formatEventDescription(event)}
                          </Typography>
                          <Box sx={{ textAlign: 'right', ml: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {new Date(event.createdAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {new Date(event.createdAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              {getTimeAgo(event.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Usuario */}
                        {event.user && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', mr: 1 }}>
                              {event.user.firstName.charAt(0)}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {event.user.firstName} {event.user.lastName} ({event.user.role})
                            </Typography>
                          </Box>
                        )}

                        {/* Detalles */}
                        {event.details && Object.keys(event.details).length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" component="div">
                              Detalles:
                            </Typography>
                            <Box sx={{ 
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                              p: 1, 
                              borderRadius: 1, 
                              mt: 0.5,
                              fontSize: '0.75rem',
                              border: 1,
                              borderColor: 'divider'
                            }}>
                              {Object.entries(event.details).map(([key, value]) => (
                                <Typography key={key} variant="caption" display="block">
                                  <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* IP Address */}
                        {event.ipAddress && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            IP: {event.ipAddress}
                          </Typography>
                        )}
                      </Paper>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentStatusTimeline;