import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Undo as UndoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const ReversionModal = ({ 
  open, 
  onClose, 
  documento, 
  onConfirm, 
  loading = false 
}) => {
  const [newStatus, setNewStatus] = useState('');
  const [reversionReason, setReversionReason] = useState('');
  const [errors, setErrors] = useState({});

  // Opciones de estados anteriores basados en el estado actual
  const getAvailableStates = (currentStatus) => {
    const statusOrder = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const statusLabels = {
      'PENDIENTE': '⏳ Pendiente',
      'EN_PROCESO': '⚙️ En Proceso', 
      'LISTO': '✅ Listo',
      'ENTREGADO': '📦 Entregado'
    };

    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex <= 0) return [];

    return statusOrder.slice(0, currentIndex).map(status => ({
      value: status,
      label: statusLabels[status]
    }));
  };

  const handleSubmit = () => {
    const newErrors = {};

    if (!newStatus) {
      newErrors.newStatus = 'Debe seleccionar un estado';
    }

    if (!reversionReason.trim()) {
      newErrors.reversionReason = 'La razón es obligatoria';
    } else if (reversionReason.trim().length < 10) {
      newErrors.reversionReason = 'La razón debe tener al menos 10 caracteres';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onConfirm({
        documentId: documento.id,
        newStatus,
        reversionReason: reversionReason.trim()
      });
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewStatus('');
      setReversionReason('');
      setErrors({});
      onClose();
    }
  };

  const availableStates = documento ? getAvailableStates(documento.status) : [];

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <UndoIcon color="warning" />
        <Typography variant="h6" component="span">
          Revertir Estado del Documento
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {documento && (
          <Box>
            {/* Información del documento */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Documento a revertir:
              </Typography>
              <Typography variant="body2"><strong>Cliente:</strong> {documento.clientName}</Typography>
              <Typography variant="body2"><strong>Protocolo:</strong> {documento.protocolNumber}</Typography>
              <Typography variant="body2"><strong>Tipo:</strong> {documento.documentType}</Typography>
              <Typography variant="body2">
                <strong>Estado actual:</strong> 
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 1,
                    px: 1.5, 
                    py: 0.5, 
                    borderRadius: 1, 
                    bgcolor: 'warning.light',
                    color: 'warning.contrastText',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  {documento.status}
                </Box>
              </Typography>
            </Box>

            {/* Alerta de advertencia */}
            <Alert 
              severity="warning" 
              icon={<WarningIcon />}
              sx={{ mb: 3 }}
            >
              <Typography variant="body2">
                <strong>¡Atención!</strong> Esta acción revertirá el documento a un estado anterior y puede:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Eliminar códigos de verificación generados</li>
                <li>Borrar información de entrega si aplica</li>
                <li>Requerir volver a procesar el documento</li>
              </Box>
            </Alert>

            {/* Selector de nuevo estado */}
            <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.newStatus}>
              <InputLabel id="new-status-label">Nuevo Estado</InputLabel>
              <Select
                labelId="new-status-label"
                value={newStatus}
                label="Nuevo Estado"
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={loading}
              >
                {availableStates.length === 0 ? (
                  <MenuItem disabled>
                    No hay estados anteriores disponibles
                  </MenuItem>
                ) : (
                  availableStates.map((state) => (
                    <MenuItem key={state.value} value={state.value}>
                      {state.label}
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.newStatus && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                  {errors.newStatus}
                </Typography>
              )}
            </FormControl>

            {/* Campo de razón */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Razón de la reversión *"
              placeholder="Explique detalladamente por qué es necesario revertir este documento..."
              value={reversionReason}
              onChange={(e) => setReversionReason(e.target.value)}
              error={!!errors.reversionReason}
              helperText={
                errors.reversionReason || 
                `${reversionReason.length}/500 caracteres - Mínimo 10 caracteres`
              }
              inputProps={{ maxLength: 500 }}
              disabled={loading}
              sx={{ mb: 2 }}
            />

            {/* Mensaje informativo */}
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }}>
              <Typography variant="body2">
                <strong>📝 Nota:</strong> Esta acción quedará registrada en el historial del documento 
                con su usuario y la razón proporcionada.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={loading || availableStates.length === 0}
          variant="contained"
          color="warning"
          startIcon={loading ? <CircularProgress size={20} /> : <UndoIcon />}
        >
          {loading ? 'Revirtiendo...' : 'Confirmar Reversión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReversionModal;