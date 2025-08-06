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
  Alert,
  Button,
  IconButton
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
  Circle as DefaultIcon,
  Refresh as RefreshIcon,
  ExpandMore as LoadMoreIcon,
  Edit as EditIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useDocumentHistory from '../../hooks/useDocumentHistory';

/**
 * Componente DocumentTimeline - Timeline visual del historial del documento
 * Muestra eventos cronológicos con iconos, colores y metadata
 * Ahora integrado con el sistema de historial universal
 */
const DocumentTimeline = ({ 
  history, 
  loading, 
  error, 
  documentId,
  showLoadMore = true,
  showRefresh = true,
  autoRefresh = false,
  options = {} 
}) => {
  // Usar el hook si se pasa documentId, sino usar props legacy
  const hookData = useDocumentHistory(documentId, {
    autoRefresh,
    enabled: !!documentId,
    ...options
  });

  // Determinar qué datos usar
  const timelineData = documentId ? hookData : { 
    history: history || [], 
    loading: loading || false, 
    error: error || null,
    refresh: () => {},
    loadMore: () => {},
    stats: { hasMoreToLoad: false }
  };

  const { 
    history: timelineHistory, 
    loading: timelineLoading, 
    error: timelineError,
    refresh,
    loadMore,
    stats,
    usingRealData
  } = timelineData;

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
      warning: WarningIcon,
      edit: EditIcon,
      group: GroupIcon,
      default: DefaultIcon
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
   * Renderizar información contextual del evento (reemplaza metadata técnica)
   */
  const renderEventContextInfo = (contextInfo) => {
    if (!contextInfo || contextInfo.length === 0) return null;

    return (
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {contextInfo.map((info, index) => (
            <Chip
              key={index}
              label={info}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ 
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(144, 202, 249, 0.08)' 
                  : 'rgba(25, 118, 210, 0.08)',
                '& .MuiChip-label': {
                  fontSize: '0.75rem',
                  fontWeight: 500
                }
              }}
            />
          ))}
        </Stack>
      </Box>
    );
  };

  /**
   * Renderizar información de usuario con mejor formato
   */
  const renderUserInfo = (user, timestamp) => {
    if (!user) return null;

    const roleColors = {
      'ADMIN': '#d32f2f',
      'RECEPCION': '#1976d2', 
      'CAJA': '#388e3c',
      'ARCHIVO': '#f57c00',
      'MATRIZADOR': '#7b1fa2'
    };

    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
            👤 {user}
          </Typography>
          {user.includes('(') && (
            <Chip
              label={user.match(/\(([^)]+)\)/)?.[1] || ''}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.65rem',
                backgroundColor: roleColors[user.match(/\(([^)]+)\)/)?.[1]] || '#757575',
                color: 'white',
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          📅 {formatTimestamp(timestamp)}
        </Typography>
      </Box>
    );
  };

  /**
   * Loading skeleton
   */
  if (timelineLoading) {
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
  if (timelineError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {timelineError}
      </Alert>
    );
  }

  /**
   * Empty state
   */
  if (!timelineHistory || timelineHistory.length === 0) {
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Historial del Documento
          </Typography>
          {showRefresh && (
            <IconButton onClick={refresh} size="small" disabled={timelineLoading}>
              <RefreshIcon />
            </IconButton>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {timelineHistory.length} eventos mostrados
            {stats?.totalEvents && stats.totalEvents !== timelineHistory.length && 
              ` de ${stats.totalEvents} totales`
            }
          </Typography>
          {usingRealData && (
            <Chip 
              label="Datos en vivo" 
              size="small" 
              color="success" 
              variant="outlined" 
            />
          )}
        </Box>
      </Box>

      {/* Timeline */}
      <MuiTimeline sx={{ p: 0 }}>
        {timelineHistory.map((event, index) => (
          <MuiTimelineItem key={event.id}>
            <MuiTimelineSeparator>
              <MuiTimelineDot 
                color={getEventColor(event.color)}
                sx={{ 
                  boxShadow: 2,
                  border: (theme) => theme.palette.mode === 'dark' 
                    ? '2px solid rgba(255, 255, 255, 0.1)' 
                    : '2px solid white',
                  p: 1
                }}
              >
                {getEventIcon(event.icon)}
              </MuiTimelineDot>
              {index < timelineHistory.length - 1 && (
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

                  {/* Usuario y timestamp mejorados */}
                  {renderUserInfo(event.user, event.timestamp)}

                  {/* Información contextual (reemplaza metadata técnica) */}
                  {renderEventContextInfo(event.contextInfo)}
                </CardContent>
              </Card>
            </MuiTimelineContent>
          </MuiTimelineItem>
        ))}
      </MuiTimeline>

      {/* Botón de cargar más */}
      {showLoadMore && stats?.hasMoreToLoad && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LoadMoreIcon />}
            onClick={loadMore}
            disabled={timelineLoading}
          >
            Cargar más eventos
          </Button>
        </Box>
      )}

      {/* Footer con información adicional */}
      <Box sx={{ 
        mt: 3, 
        p: 2, 
        bgcolor: (theme) => theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.03)' 
          : 'grey.50', 
        borderRadius: 1,
        border: (theme) => theme.palette.mode === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : 'none'
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          💡 Los eventos se actualizan automáticamente conforme cambia el estado del documento
          {usingRealData && (
            <>
              <br />
              🔄 Conectado a datos en tiempo real
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
};

export default DocumentTimeline;