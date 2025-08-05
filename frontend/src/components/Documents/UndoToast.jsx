import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  Undo as UndoIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon
} from '@mui/icons-material';

/**
 * COMPONENTE TOAST PARA SISTEMA DE DESHACER
 * 
 * Muestra notificación después de cambios exitosos con opción de deshacer
 * Se auto-oculta después de 10 segundos
 */
const UndoToast = ({
  open,
  onClose,
  onUndo,
  changeInfo,
  autoHideDelay = 10000
}) => {
  const [timeLeft, setTimeLeft] = useState(autoHideDelay);
  const [isUndoing, setIsUndoing] = useState(false);

  // Countdown timer para auto-hide
  useEffect(() => {
    if (!open) {
      setTimeLeft(autoHideDelay);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          onClose();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, autoHideDelay, onClose]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setIsUndoing(false);
      setTimeLeft(autoHideDelay);
    }
  }, [open, autoHideDelay]);

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await onUndo(changeInfo);
      onClose();
    } catch (error) {
      console.error('Error deshaciendo cambio:', error);
      setIsUndoing(false);
    }
  };

  const getMessageConfig = () => {
    if (!changeInfo) return { message: '', icon: <InfoIcon />, color: 'info' };

    const { newStatus, whatsappSent, document } = changeInfo;

    switch (newStatus) {
      case 'LISTO':
        return {
          message: `Documento marcado como listo${whatsappSent ? '. WhatsApp enviado' : ''}.`,
          icon: <CheckCircleIcon />,
          color: 'success',
          subtitle: whatsappSent ? `Notificación enviada a ${document?.clientPhone || 'cliente'}` : null
        };
      
      case 'ENTREGADO':
        return {
          message: `Documento marcado como entregado${whatsappSent ? '. Confirmación enviada' : ''}.`,
          icon: <CheckCircleIcon />,
          color: 'success',
          subtitle: whatsappSent ? 'Confirmación WhatsApp enviada al cliente' : null
        };
      
      case 'EN_PROCESO':
        return {
          message: 'Documento movido a "En Proceso".',
          icon: <InfoIcon />,
          color: 'info'
        };
      
      case 'PENDIENTE':
        return {
          message: 'Documento movido a "Pendiente".',
          icon: <InfoIcon />,
          color: 'info'
        };
      
      default:
        return {
          message: `Estado cambiado a ${newStatus}.`,
          icon: <InfoIcon />,
          color: 'info'
        };
    }
  };

  const messageConfig = getMessageConfig();
  const progressPercentage = (timeLeft / autoHideDelay) * 100;

  if (!changeInfo) return null;

  return (
    <Snackbar
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        '& .MuiSnackbar-root': {
          bottom: { xs: 16, sm: 24 }
        }
      }}
    >
      <Alert
        severity={messageConfig.color}
        variant="filled"
        sx={{
          minWidth: 400,
          maxWidth: 600,
          alignItems: 'flex-start',
          '& .MuiAlert-icon': {
            mt: 0.5
          }
        }}
        icon={messageConfig.icon}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={handleUndo}
              disabled={isUndoing}
              startIcon={<UndoIcon />}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.3)'
                },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              {isUndoing ? 'Deshaciendo...' : 'Deshacer'}
            </Button>
            
            <IconButton
              size="small"
              color="inherit"
              onClick={onClose}
              sx={{ 
                color: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  color: 'white'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <Box sx={{ pr: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {messageConfig.message}
          </Typography>
          
          {messageConfig.subtitle && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <WhatsAppIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {messageConfig.subtitle}
              </Typography>
            </Box>
          )}
          
          {changeInfo.document && (
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
              Doc: {changeInfo.document.protocolNumber} • {changeInfo.document.clientName}
            </Typography>
          )}
          
          {/* Barra de progreso para countdown */}
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage}
              sx={{ 
                flex: 1, 
                height: 3, 
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'rgba(255,255,255,0.8)'
                }
              }} 
            />
            <Typography variant="caption" sx={{ minWidth: 20, fontSize: '0.7rem' }}>
              {Math.ceil(timeLeft / 1000)}s
            </Typography>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default UndoToast;