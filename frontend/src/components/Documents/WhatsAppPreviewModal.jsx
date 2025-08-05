import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Modal para mostrar preview del mensaje WhatsApp enviado
 */
const WhatsAppPreviewModal = ({ open, onClose, notification }) => {
  if (!notification) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SENT':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'FAILED':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'PENDING':
        return <ScheduleIcon sx={{ color: 'warning.main' }} />;
      case 'SIMULATED':
        return <MessageIcon sx={{ color: 'info.main' }} />;
      default:
        return <ScheduleIcon sx={{ color: 'grey.500' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'SIMULATED':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'SENT':
        return 'Enviado';
      case 'FAILED':
        return 'Falló';
      case 'PENDING':
        return 'Pendiente';
      case 'SIMULATED':
        return 'Simulado';
      default:
        return 'Desconocido';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '400px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WhatsAppIcon sx={{ color: '#25D366', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Preview de Notificación WhatsApp
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Información del destinatario */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon /> Información del Destinatario
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Cliente:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {notification.clientName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Teléfono:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {notification.clientPhone}
                    </Typography>
                  </Box>
                </Box>
                {notification.document && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Documento:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {notification.document.protocolNumber || 'Sin número de protocolo'}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Estado del mensaje */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Estado del Envío
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Estado:</Typography>
                  <Chip
                    icon={getStatusIcon(notification.status)}
                    label={getStatusText(notification.status)}
                    color={getStatusColor(notification.status)}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Fecha de envío:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {formatDate(notification.createdAt)}
                  </Typography>
                </Box>
                {notification.messageId && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">ID del mensaje:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {notification.messageId}
                    </Typography>
                  </Box>
                )}
                {notification.errorMessage && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="error">Error:</Typography>
                    <Typography variant="body2" color="error" sx={{ fontWeight: 'medium' }}>
                      {notification.errorMessage}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Contenido del mensaje */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MessageIcon /> Contenido del Mensaje
              </Typography>
              <Box
                sx={{
                  backgroundColor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(37, 211, 102, 0.15)' 
                    : '#E8F5E8',
                  border: '1px solid #25D366',
                  borderRadius: 2,
                  p: 2,
                  position: 'relative'
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    lineHeight: 1.4
                  }}
                >
                  {notification.messageBody}
                </Typography>
                
                {/* Simulación de la interfaz de WhatsApp */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {formatDate(notification.createdAt)} ✓✓
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} variant="contained" sx={{ minWidth: 100 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppPreviewModal;