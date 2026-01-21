import React from 'react';
import {
  Box,
  Typography,
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

  // Debug por consola
  console.log('DocumentTimeline render:', { documentId, historyLength: hookData?.history?.length, firstEvent: hookData?.history?.[0] });

  // Determinar qué datos usar
  const timelineData = documentId ? hookData : {
    history: history || [],
    loading: loading || false,
    error: error || null,
    refresh: () => { },
    loadMore: () => { },
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
    } catch {
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
  const renderEventContextInfo = (contextInfo, event = {}) => {
    if (!contextInfo || contextInfo.length === 0) return null;

    // Detectar si es un evento de entrega para mostrar detalles de forma destacada
    const isDeliveryEvent = event.icon === 'delivery' ||
      (event.type === 'STATUS_CHANGED' && event.title?.toLowerCase().includes('entrega'));

    // Detectar si es un evento de LISTO 
    const isReadyEvent = event.icon === 'check_circle' ||
      (event.type === 'STATUS_CHANGED' && event.title?.toLowerCase().includes('listo'));

    // Para eventos de entrega, mostrar en sección destacada
    if (isDeliveryEvent) {
      return (
        <Box sx={{
          mt: 2,
          p: 2,
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(46, 125, 50, 0.15)'
            : 'rgba(46, 125, 50, 0.08)',
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(46, 125, 50, 0.3)'
            : 'success.light'
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            📋 Detalles de Entrega
          </Typography>
          {contextInfo.map((info, idx) => (
            <Typography key={idx} variant="body2" sx={{ mb: 0.5, pl: 1 }}>
              • {info}
            </Typography>
          ))}
        </Box>
      );
    }

    // Para eventos de LISTO, mostrar en sección con estilo de éxito
    if (isReadyEvent && contextInfo.length > 0) {
      return (
        <Box sx={{
          mt: 2,
          p: 1.5,
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(25, 118, 210, 0.12)'
            : 'rgba(25, 118, 210, 0.06)',
          borderRadius: 1,
          border: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(25, 118, 210, 0.3)'
            : 'info.light'
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'info.main', fontSize: '0.8rem' }}>
            ℹ️ Información adicional
          </Typography>
          {contextInfo.map((info, idx) => (
            <Typography key={idx} variant="body2" sx={{ mb: 0.3, fontSize: '0.85rem' }}>
              • {info}
            </Typography>
          ))}
        </Box>
      );
    }

    // Para otros eventos, usar chips (comportamiento original)
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
        {timelineHistory.map((event, index) => {
          try {
            return (
              <MuiTimelineItem key={event.id || index}>
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

                <MuiTimelineContent sx={{ pb: 3, width: '100%', flex: 1 }}>
                  <Card sx={{
                    boxShadow: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    width: '100%', // Asegurar ancho completo
                    '&:hover': {
                      boxShadow: 2
                    }
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        {/* IZQUIERDA: Información del Evento */}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5, lineHeight: 1.2 }}>
                            {event.title}
                          </Typography>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.4 }}>
                            {event.description}
                          </Typography>

                          {/* Información contextual */}
                          {renderEventContextInfo(event.contextInfo, event)}
                        </Box>

                        {/* DERECHA: Metadata (Usuario, Fecha) */}
                        <Box sx={{ textAlign: 'right', minWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'block' }}>
                            {formatTimestamp(event.timestamp)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {formatRelativeTime(event.timestamp)}
                          </Typography>

                          {/* Usuario Compacto */}
                          {event.user && (
                            <Box sx={{ mt: 'auto' }}>
                              {(() => {
                                const roleColors = {
                                  'ADMIN': '#d32f2f',
                                  'RECEPCION': '#1976d2',
                                  'CAJA': '#388e3c',
                                  'ARCHIVO': '#f57c00',
                                  'MATRIZADOR': '#7b1fa2'
                                };
                                const role = event.user.match(/\(([^)]+)\)/)?.[1];
                                const name = event.user.replace(/\s*\(.*?\)\s*/, '');

                                return (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'medium', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {name}
                                    </Typography>
                                    {role && (
                                      <Chip
                                        label={role}
                                        size="small"
                                        sx={{
                                          height: 16,
                                          fontSize: '0.65rem',
                                          mt: 0.5,
                                          backgroundColor: roleColors[role] || '#757575',
                                          color: 'white'
                                        }}
                                      />
                                    )}
                                  </Box>
                                );
                              })()}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </MuiTimelineContent>
              </MuiTimelineItem>
            );
          } catch (err) {
            console.error('Error rendering timeline item:', err, event);
            return null;
          }
        })}
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