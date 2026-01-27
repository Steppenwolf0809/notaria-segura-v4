import React, { useEffect, useState, useCallback } from 'react';
import {
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Message as MessageIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material';
import useAuth from '../../hooks/use-auth';
import mensajesInternosService from '../../services/mensajes-internos-service';
import browserNotificationService from '../../services/browser-notification-service';

/**
 * Dropdown de notificaciones para mensajes internos
 * Muestra badge con contador y últimos mensajes
 */
function NotificacionesDropdown({ onNavigate }) {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(null);
  const [loading, setLoading] = useState(false);

  const open = Boolean(anchorEl);

  // Mapeo de tipos a iconos
  const getTipoIcon = (tipo) => {
    const iconos = {
      'SOLICITUD_ACTUALIZACION': <ScheduleIcon fontSize="small" color="primary" />,
      'PRIORIZAR': <PriorityIcon fontSize="small" color="error" />,
      'CLIENTE_ESPERANDO': <PersonIcon fontSize="small" color="warning" />,
      'COBRO': <MoneyIcon fontSize="small" color="success" />,
      'OTRO': <MessageIcon fontSize="small" />
    };
    return iconos[tipo] || <NotificationsIcon fontSize="small" />;
  };

  // Obtener color de urgencia
  const getUrgenciaColor = (urgencia) => {
    const colores = {
      'NORMAL': 'default',
      'URGENTE': 'warning',
      'CRITICO': 'error'
    };
    return colores[urgencia] || 'default';
  };

  // Formatear tiempo relativo
  const formatTiempoRelativo = (fecha) => {
    const ahora = new Date();
    const fechaMensaje = new Date(fecha);
    const diff = Math.floor((ahora - fechaMensaje) / 1000);

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} hora(s)`;
    return `hace ${Math.floor(diff / 86400)} día(s)`;
  };

  const fetchMensajes = useCallback(async () => {
    try {
      setLoading(true);
      const result = await mensajesInternosService.listarMensajes({ page: 1, limit: 5, leido: false });
      if (result.success) {
        setMensajes(result.data.mensajes || []);
      }
    } catch (e) {
      console.error('Error fetching mensajes', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await mensajesInternosService.contarNoLeidos();
      if (result.success) {
        const newCount = result.data.count || 0;

        // Si el contador aumentó, mostrar notificación
        if (prevUnreadCount !== null && newCount > prevUnreadCount) {
          // Intentar obtener el mensaje más reciente para la notificación
          try {
            const lastMsgResult = await mensajesInternosService.listarMensajes({ page: 1, limit: 1, leido: false });
            if (lastMsgResult.success && lastMsgResult.data.mensajes && lastMsgResult.data.mensajes.length > 0) {
              if (browserNotificationService && typeof browserNotificationService.notifyNewMessage === 'function') {
                browserNotificationService.notifyNewMessage(lastMsgResult.data.mensajes[0]);
              }
            }
          } catch (e) {
            console.warn('Error sending browser notification:', e);
          }
        }

        setUnreadCount(newCount);
        setPrevUnreadCount(newCount);
      }
    } catch (e) {
      console.error('Error fetching unread count', e);
    }
  }, [prevUnreadCount]);

  // Solicitar permiso solo si el servicio existe y estamos en navegador
  useEffect(() => {
    try {
      if (browserNotificationService && typeof browserNotificationService.requestPermission === 'function') {
        browserNotificationService.requestPermission();
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
    }
  }, []);

  // Polling cada 30 segundos para actualizar contador
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchMensajes();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMensajeClick = async (mensaje) => {
    handleClose();
    // Marcar como leído
    try {
      await mensajesInternosService.marcarLeido(mensaje.id);
      fetchUnreadCount();
    } catch (e) {
      console.error('Error marking as read', e);
    }
    // Navegar al documento si existe
    if (onNavigate) {
      if (mensaje.documento?.id) {
        onNavigate('documents', {
          id: mensaje.documento.id,
          protocolNumber: mensaje.documento.protocolNumber,
          autoSearch: true
        });
      } else {
        onNavigate('notificaciones');
      }
    } else {
      // Fallback: navegar a la vista de mensajes si no hay onNavigate
      console.warn('NotificacionesDropdown: onNavigate no proporcionado, no se puede navegar');
    }
  };

  const handleVerTodos = () => {
    handleClose();
    if (onNavigate) {
      onNavigate('notificaciones');
    } else {
      console.warn('NotificacionesDropdown: onNavigate no proporcionado, no se puede navegar a todos los mensajes');
    }
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        size="large"
        aria-label="notificaciones"
        sx={{
          mr: 1,
          color: 'text.primary'
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#d32f2f',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              minWidth: '18px',
              height: '18px'
            }
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Mensajes Internos
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} nuevo(s)`}
              size="small"
              color="error"
            />
          )}
        </Box>
        <Divider />

        {/* Loading */}
        {loading && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Lista de mensajes */}
        {!loading && mensajes.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No hay mensajes nuevos
            </Typography>
          </Box>
        )}

        {!loading && mensajes.map((msg) => (
          <MenuItem
            key={msg.id}
            onClick={() => handleMensajeClick(msg)}
            sx={{
              py: 1.5,
              borderLeft: msg.urgencia === 'CRITICO' ? '3px solid #d32f2f' :
                msg.urgencia === 'URGENTE' ? '3px solid #ed6c02' : 'none',
              bgcolor: !msg.leido ? 'action.hover' : 'inherit'
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {getTipoIcon(msg.tipo)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" component="span" fontWeight={!msg.leido ? 'bold' : 'normal'}>
                    {msg.remitente?.firstName} {msg.remitente?.lastName}
                  </Typography>
                  <Typography variant="caption" component="span" color="text.secondary">
                    - {formatTiempoRelativo(msg.createdAt)}
                  </Typography>
                </Box>
              }
              secondary={
                <Box component="div">
                  {msg.documento && (
                    <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                      {msg.documento.protocolNumber}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 250,
                      display: 'block'
                    }}
                  >
                    {(msg.mensaje) || (mensajesInternosService.formatTipo ? mensajesInternosService.formatTipo(msg.tipo).label : msg.tipo)}
                  </Typography>
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
            {msg.urgencia !== 'NORMAL' && (
              <Chip
                label={msg.urgencia}
                size="small"
                color={getUrgenciaColor(msg.urgencia)}
                sx={{ ml: 1, fontSize: '0.65rem', height: 20 }}
              />
            )}
          </MenuItem>
        ))}

        <Divider />

        {/* Footer */}
        <MenuItem onClick={handleVerTodos} sx={{ justifyContent: 'center' }}>
          <Typography variant="body2" color="primary">
            Ver todos los mensajes
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}

export default NotificacionesDropdown;
