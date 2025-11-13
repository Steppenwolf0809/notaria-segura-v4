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
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  LocalShipping as DeliveryIcon
} from '@mui/icons-material';

/**
 * Modal para capturar datos de entrega masiva
 * Permite ingresar quien retira y observaciones antes de marcar documentos como ENTREGADO
 */
const BulkDeliveryModal = ({
  open,
  onClose,
  documents = [],
  onConfirm,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    entregadoA: '',
    observacionesEntrega: ''
  });
  const [error, setError] = useState('');

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      // Si todos los documentos son del mismo cliente, pre-llenar con su nombre
      const firstClientName = documents[0]?.clientName || documents[0]?.documents?.[0]?.clientName;
      const allSameClient = documents.every(doc => {
        const name = doc?.clientName || doc?.documents?.[0]?.clientName;
        return name === firstClientName;
      });

      setFormData({
        entregadoA: allSameClient ? firstClientName : '',
        observacionesEntrega: ''
      });
      setError('');
    }
  }, [open, documents]);

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
   * Validar y confirmar entrega
   */
  const handleConfirm = () => {
    // Validaciones
    if (!formData.entregadoA.trim()) {
      setError('El nombre de quien retira es obligatorio');
      return;
    }

    // Llamar al callback con los datos
    onConfirm({
      entregadoA: formData.entregadoA.trim(),
      observacionesEntrega: formData.observacionesEntrega.trim()
    });
  };

  // Calcular cuántos documentos se van a entregar
  const totalDocuments = documents.reduce((acc, item) => {
    if (Array.isArray(item.documents)) {
      return acc + item.documents.filter(d => d.status === 'LISTO').length;
    }
    return acc + 1;
  }, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeliveryIcon color="primary" />
            <Typography variant="h6">Marcar como Entregado</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Información de la operación */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              📦 Se marcarán <strong>{totalDocuments} documento(s)</strong> como ENTREGADO
            </Typography>
          </Alert>

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
                placeholder="Nombre completo de quien retira"
                disabled={loading}
                helperText="Nombre de la persona que recibe los documentos"
                autoFocus
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones (opcional)"
                value={formData.observacionesEntrega}
                onChange={(e) => handleFieldChange('observacionesEntrega', e.target.value)}
                placeholder="Notas adicionales sobre la entrega..."
                disabled={loading}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Resumen de documentos */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              📋 Documentos a entregar:
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              {documents.map((item, idx) => {
                const docs = item.documents || [item];
                const readyDocs = docs.filter(d => d.status === 'LISTO');

                return readyDocs.length > 0 ? (
                  <Box key={idx} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      • <strong>{item.clientName || docs[0]?.clientName}</strong>
                      {readyDocs.length > 1 && ` (${readyDocs.length} documentos)`}
                    </Typography>
                    {readyDocs.map(doc => (
                      <Typography key={doc.id} variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block' }}>
                        - {doc.protocolNumber} • {doc.documentType}
                      </Typography>
                    ))}
                  </Box>
                ) : null;
              })}
            </Box>
          </Box>

          {/* Advertencia */}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ⚠️ <strong>Esta acción:</strong>
              <br />• Cambiará el estado de los documentos a "ENTREGADO"
              <br />• Registrará la fecha y hora de entrega
              <br />• No es reversible automáticamente
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || !formData.entregadoA.trim()}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={16} /> : <DeliveryIcon />}
        >
          {loading ? 'Entregando...' : 'Confirmar Entrega'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkDeliveryModal;
