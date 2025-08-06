import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * Modal de confirmación para acciones críticas
 * Muestra información detallada y requiere confirmación explícita
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  details,
  type = 'warning', // 'warning', 'error', 'info', 'success'
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <DeleteIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 48, color: 'info.main' }} />;
      case 'success':
        return <ActivateIcon sx={{ fontSize: 48, color: 'success.main' }} />;
      default:
        return <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />;
    }
  };

  const getAlertSeverity = () => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'warning';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'warning';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getIcon()}
          <Typography variant="h6" sx={{ ml: 2 }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity={getAlertSeverity()} sx={{ mb: 2 }}>
          <Typography variant="body1">
            {message}
          </Typography>
        </Alert>

        {details && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Detalles:
            </Typography>
            <Box sx={{ 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              {typeof details === 'string' ? (
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {details}
                </Typography>
              ) : (
                Object.entries(details).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1, minWidth: 80 }}>
                      {key}:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}

        {type === 'error' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>⚠️ Esta acción es irreversible</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Una vez confirmada, no podrás deshacer esta operación.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          color="inherit"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getButtonColor()}
          disabled={isLoading}
          sx={{ ml: 1 }}
        >
          {isLoading ? 'Procesando...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;