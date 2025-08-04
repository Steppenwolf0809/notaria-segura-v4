import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  Skeleton,
  Alert
} from '@mui/material';
import {
  Timeline as MuiTimeline,
  TimelineItem as MuiTimelineItem,
  TimelineSeparator as MuiTimelineSeparator,
  TimelineConnector as MuiTimelineConnector,
  TimelineContent as MuiTimelineContent,
  TimelineDot as MuiTimelineDot
} from '@mui/lab';
import {
  NoteAdd as CreateIcon,
  Assignment as AssignmentIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Notifications as NotificationIcon,
  LocalShipping as DeliveryIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Circle as DefaultIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente DocumentTimeline - Timeline visual del historial del documento
 * Muestra eventos cronológicos con iconos, colores y metadata
 */
const DocumentTimeline = ({ history, loading, error }) => {

  /**
   * Obtener icono según el tipo de evento
   */
  const getEventIcon = (iconType) => {
    const iconMap = {
      create: CreateIcon,
      assignment: AssignmentIcon,
      play: PlayIcon,
      check_circle: CheckIcon,
      notification: NotificationIcon,
      delivery: DeliveryIcon,
      error: ErrorIcon,
      warning: WarningIcon
    };
    
    const IconComponent = iconMap[iconType] || DefaultIcon;
    return <IconComponent sx={{ fontSize: 20 }} />;
  };

  /**
   * Obtener color según el tipo de evento
   */
  const getEventColor = (color) => {
    const colorMap = {
      info: 'info',
      success: 'success',
      warning: 'warning',
      error: 'error',
      primary: 'primary'
    };
    return colorMap[color] || 'grey';
  };

  /**
   * Formatear timestamp
   */
  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  /**
   * Formatear tiempo relativo
   */
  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'Hace unos momentos';
    }
  };

  /**
   * Renderizar metadata del evento
   */
  const renderEventMetadata = (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) return null;

    return (
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {Object.entries(metadata).map(([key, value]) => {
            if (key === 'previousStatus' || key === 'newStatus') {
              return (
                <Chip
                  key={key}
                  label={`${key === 'previousStatus' ? 'De' : 'A'}: ${value}`}
                  size="small"
                  variant="outlined"
                  color={key === 'newStatus' ? 'success' : 'default'}
                />
              );
            } else if (key === 'status') {
              return (
                <Chip
                  key={key}
                  label={value}
                  size="small"
                  color={value === 'delivered' ? 'success' : value === 'failed' ? 'error' : 'default'}
                />
              );
            } else {
              return (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  size="small"
                  variant="outlined"
                />
              );
            }
          })}
        </Stack>
      </Box>
    );
  };

  /**
   * Loading skeleton
   */
  if (loading) {
    return (
      <Box>
        {[1, 2, 3].map((item) => (
          <Box key={item} sx={{ display: 'flex', mb: 3 }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={20} />
              <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 1 }} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  /**
   * Empty state
   */
  if (!history || history.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <DefaultIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No hay historial disponible
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Los eventos del documento aparecerán aquí conforme se generen
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header del timeline */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
          Historial del Documento
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {history.length} eventos registrados
        </Typography>
      </Box>

      {/* Timeline */}
      <MuiTimeline sx={{ p: 0 }}>
        {history.map((event, index) => (
          <MuiTimelineItem key={event.id}>
            <MuiTimelineSeparator>
              <MuiTimelineDot 
                color={getEventColor(event.color)}
                sx={{ 
                  boxShadow: 2,
                  border: '2px solid white',
                  p: 1
                }}
              >
                {getEventIcon(event.icon)}
              </MuiTimelineDot>
              {index < history.length - 1 && (
                <MuiTimelineConnector sx={{ height: 60 }} />
              )}
            </MuiTimelineSeparator>

            <MuiTimelineContent sx={{ pb: 3 }}>
              <Card sx={{ 
                boxShadow: 1,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  boxShadow: 2
                }
              }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {/* Header del evento */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(event.timestamp)}
                    </Typography>
                  </Box>

                  {/* Descripción */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {event.description}
                  </Typography>

                  {/* Usuario y timestamp */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                      👤 {event.user}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      📅 {formatTimestamp(event.timestamp)}
                    </Typography>
                  </Box>

                  {/* Metadata */}
                  {renderEventMetadata(event.metadata)}
                </CardContent>
              </Card>
            </MuiTimelineContent>
          </MuiTimelineItem>
        ))}
      </MuiTimeline>

      {/* Footer con información adicional */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          💡 Los eventos se actualizan automáticamente conforme cambia el estado del documento
        </Typography>
      </Box>
    </Box>
  );
};

export default DocumentTimeline;