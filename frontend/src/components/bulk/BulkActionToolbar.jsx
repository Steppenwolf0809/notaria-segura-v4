import React from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  Zoom
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  PlayArrow as PlayArrowIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

/**
 * Toolbar flotante para acciones masivas
 * Aparece cuando hay documentos seleccionados y permite operaciones en lote
 */
const BulkActionToolbar = ({
  selectionCount = 0,
  commonStatus = null,
  validTransitions = [],
  maxSelection = 50,
  isExecuting = false,
  onClearSelection,
  onBulkAction,
  sx = {}
}) => {
  
  // Configuración de botones según el estado común
  const getActionButtons = () => {
    if (!commonStatus || validTransitions.length === 0) return [];

    const buttons = [];

    // EN_PROCESO → LISTO
    if (commonStatus === 'EN_PROCESO' && validTransitions.includes('LISTO')) {
      buttons.push({
        key: 'listo',
        label: 'Marcar Como Listo',
        icon: <CheckCircleIcon />,
        color: 'success',
        variant: 'contained',
        targetStatus: 'LISTO',
        description: 'Marcar documentos como listos y enviar notificaciones WhatsApp'
      });
    }

    // AGRUPADO → LISTO
    if (commonStatus === 'AGRUPADO' && validTransitions.includes('LISTO')) {
      buttons.push({
        key: 'listo',
        label: 'Marcar Como Listo',
        icon: <SendIcon />,
        color: 'success',
        variant: 'contained',
        targetStatus: 'LISTO',
        description: 'Marcar grupo como listo y enviar notificaciones WhatsApp'
      });
    }

    // AGRUPADO → EN_PROCESO (reversión)
    if (commonStatus === 'AGRUPADO' && validTransitions.includes('EN_PROCESO')) {
      buttons.push({
        key: 'en_proceso',
        label: 'Regresar a En Proceso',
        icon: <PlayArrowIcon />,
        color: 'warning',
        variant: 'outlined',
        targetStatus: 'EN_PROCESO',
        description: 'Regresar documentos agrupados a estado En Proceso'
      });
    }

    return buttons;
  };

  const actionButtons = getActionButtons();

  // No mostrar si no hay selección
  if (selectionCount === 0) {
    return null;
  }

  return (
    <Zoom in={selectionCount > 0}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1300,
          borderRadius: '24px',
          border: (theme) => `2px solid ${theme.palette.primary.main}`,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          minWidth: '400px',
          maxWidth: '90vw',
          ...sx
        }}
      >
        <Toolbar
          sx={{
            px: 3,
            py: 1,
            minHeight: '64px !important',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          {/* Información de selección */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${selectionCount} seleccionado${selectionCount > 1 ? 's' : ''}`}
              color="primary"
              size="medium"
              sx={{
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            />
            
            {commonStatus && (
              <Chip
                label={commonStatus}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: 'text.secondary',
                  color: 'text.secondary'
                }}
              />
            )}

            {selectionCount >= maxSelection && (
              <Tooltip title={`Máximo ${maxSelection} documentos por selección`}>
                <Chip
                  icon={<WarningIcon sx={{ fontSize: '16px' }} />}
                  label="Límite"
                  color="warning"
                  size="small"
                />
              </Tooltip>
            )}
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Botones de acción */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {actionButtons.length > 0 ? (
              actionButtons.map((button) => (
                <Tooltip key={button.key} title={button.description}>
                  <Button
                    variant={button.variant}
                    color={button.color}
                    startIcon={button.icon}
                    disabled={isExecuting}
                    onClick={() => onBulkAction(button.targetStatus, {
                      sendNotifications: button.targetStatus === 'LISTO'
                    })}
                    sx={{
                      minWidth: 'auto',
                      px: 2,
                      fontWeight: 600,
                      textTransform: 'none'
                    }}
                  >
                    {button.label}
                  </Button>
                </Tooltip>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin acciones disponibles para {commonStatus || 'estados mixtos'}
              </Typography>
            )}
          </Box>

          {/* Botón cerrar */}
          <Tooltip title="Cancelar selección">
            <IconButton
              size="small"
              onClick={onClearSelection}
              disabled={isExecuting}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'error.main',
                  color: 'white'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Paper>
    </Zoom>
  );
};

export default BulkActionToolbar;
