import React from 'react';
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Typography,
  IconButton,
  Box,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  OpenInNew as OpenInNewIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

/**
 * Componente para mostrar una alerta individual
 * @param {Object} alerta - Objeto de alerta con información del documento
 * @param {Function} onDocumentClick - Callback cuando se hace click en el documento
 * @param {boolean} showDetails - Si mostrar detalles adicionales (default: true)
 */
function AlertaItem({ alerta, onDocumentClick, showDetails = true }) {
  
  // Configuración de colores y iconos según nivel de alerta
  const getAlertConfig = (nivel) => {
    const configs = {
      CRITICA: {
        color: 'error',
        bgColor: '#ffebee',
        icon: <ErrorIcon />,
        avatarColor: '#f44336'
      },
      URGENTE: {
        color: 'warning',
        bgColor: '#fff3e0',
        icon: <WarningIcon />,
        avatarColor: '#ff9800'
      },
      ATENCION: {
        color: 'info',
        bgColor: '#e3f2fd',
        icon: <InfoIcon />,
        avatarColor: '#2196f3'
      }
    };
    return configs[nivel] || configs.ATENCION;
  };

  const config = getAlertConfig(alerta.nivel);

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearTipoDocumento = (tipo) => {
    const tipos = {
      PROTOCOLO: 'Protocolo',
      DILIGENCIA: 'Diligencia',
      CERTIFICACION: 'Certificación',
      ARRENDAMIENTO: 'Arrendamiento',
      OTROS: 'Otros'
    };
    return tipos[tipo] || tipo;
  };

  const handleDocumentClick = () => {
    if (onDocumentClick) {
      onDocumentClick(alerta);
    }
  };

  return (
    <ListItem
      sx={{
        backgroundColor: config.bgColor,
        borderLeft: `4px solid ${config.avatarColor}`,
        marginBottom: 1,
        borderRadius: 1,
        '&:hover': {
          backgroundColor: config.bgColor,
          opacity: 0.8
        }
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ backgroundColor: config.avatarColor, color: 'white' }}>
          {config.icon}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight="bold">
              {alerta.protocolNumber}
            </Typography>
            <Chip
              label={alerta.nivel}
              color={config.color}
              size="small"
              variant="outlined"
            />
            {alerta.isGrouped && (
              <Chip
                label="GRUPO"
                color="secondary"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
              {alerta.clientName}
            </Typography>
            
            {showDetails && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {formatearTipoDocumento(alerta.documentType)}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {alerta.diasPendientes} día{alerta.diasPendientes !== 1 ? 's' : ''} pendiente{alerta.diasPendientes !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  
                  {alerta.clientPhone && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {alerta.clientPhone}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}
                >
                  Listo desde: {formatearFecha(alerta.updatedAt)}
                </Typography>
              </>
            )}
          </Box>
        }
      />

      <ListItemSecondaryAction>
        <Tooltip title="Ver documento">
          <IconButton 
            edge="end" 
            onClick={handleDocumentClick}
            size="small"
          >
            <OpenInNewIcon />
          </IconButton>
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default AlertaItem;