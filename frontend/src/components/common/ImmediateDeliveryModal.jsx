import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Flash as FlashIcon
} from '@mui/icons-material';
import documentService from '../../services/document-service';

/**
 * Modal para entrega inmediata de documentos
 * Permite marcar un documento como entregado directamente sin pasar por "LISTO"
 */
const ImmediateDeliveryModal = ({
  open,
  onClose,
  document,
  onDocumentDelivered
}) => {
  const [formData, setFormData] = useState({
    entregadoA: '',
    observacionesEntrega: ''
  });
  const [delivering, setDelivering] = useState(false);
  const [error, setError] = useState('');

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      setFormData({
        entregadoA: document?.clientName || '',
        observacionesEntrega: 'Entrega inmediata - Sin notificación previa'
      });
      setError('');
    }
  }, [open, document]);

  /**
   * Manejar cambio en los campos del formulario
   */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  /**
   * Ejecutar entrega inmediata
   */
  const handleImmediateDelivery = async () => {
    // Validaciones
    if (!formData.entregadoA.trim()) {
      setError('El nombre de quien retira es obligatorio');
      return;
    }

    setDelivering(true);
    setError('');

    try {
      const result = await documentService.markAsDeliveredImmediate(document.id, {
        entregadoA: formData.entregadoA.trim(),
        observacionesEntrega: formData.observacionesEntrega.trim()
      });

      if (result.success) {
        // Notificar al componente padre
        if (onDocumentDelivered) {
          onDocumentDelivered(result.data);
        }

        // Mostrar mensaje de éxito
        alert(`✅ ${result.message || 'Documento entregado inmediatamente'}`);
        onClose();
      } else {
        setError(result.error || 'Error al entregar documento inmediatamente');
      }
    } catch (error) {
      console.error('❌ Error en entrega inmediata:', error);
      setError('Error de conexión al entregar el documento');
    } finally {
      setDelivering(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={delivering}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlashIcon color="warning" />
            <Typography variant="h6">Entrega Inmediata</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={delivering}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Información del documento */}
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              ⚡ <strong>Entrega Inmediata:</strong> El documento se marcará como entregado 
              directamente sin pasar por el estado "Listo para Entrega" y sin enviar notificación previa.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              📄 Documento a Entregar
            </Typography>
            <Typography variant="body2">
              <strong>Número:</strong> {document.protocolNumber} | 
              <strong> Tipo:</strong> {document.documentType} | 
              <strong> Cliente:</strong> {document.clientName}
            </Typography>
            <Typography variant="body2" color="primary">
              <strong>Estado actual:</strong> {document.status}
            </Typography>
          </Box>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Formulario */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Persona que Retira"
                value={formData.entregadoA}
                onChange={(e) => handleFieldChange('entregadoA', e.target.value)}
                placeholder="Nombre completo"
                disabled={delivering}
                helperText="Por defecto se usa el nombre del cliente titular"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones"
                value={formData.observacionesEntrega}
                onChange={(e) => handleFieldChange('observacionesEntrega', e.target.value)}
                placeholder="Motivo o notas de la entrega inmediata"
                disabled={delivering}
              />
            </Grid>
          </Grid>

          {/* Información adicional */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ℹ️ <strong>Esta acción:</strong>
              <br />• Cambiará el estado directamente a "ENTREGADO"
              <br />• No enviará notificación WhatsApp
              <br />• Registrará la entrega con verificación manual
              <br />• Es irreversible una vez confirmada
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          disabled={delivering} 
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleImmediateDelivery}
          disabled={delivering || !formData.entregadoA.trim()}
          variant="contained"
          color="warning"
          startIcon={delivering ? <CircularProgress size={16} /> : <FlashIcon />}
        >
          {delivering ? 'Entregando...' : 'Entregar Inmediatamente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImmediateDeliveryModal;