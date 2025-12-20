import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  CircularProgress,
  Box
} from '@mui/material';

/**
 * Modal simple de entrega para MATRIZADOR
 * - No solicita código
 * - Pide detalles de quien retira
 */
const ModalEntregaMatrizador = ({ open, onClose, documento, onConfirm, loading = false }) => {
  const [formData, setFormData] = useState({
    entregadoA: '',
    relationType: 'titular', // Default
    receptorId: '',
    observations: ''
  });
  const [error, setError] = useState('');

  // 🆕 Pre-llenar con nombre del titular según el tipo de relación
  useEffect(() => {
    if (open && documento) {
      if (formData.relationType === 'titular') {
        setFormData(prev => ({
          ...prev,
          entregadoA: documento.clientName || '',
          receptorId: documento.clientId || ''
        }));
      } else {
        // Si cambia a otro tipo, limpiar si estaba con datos del titular
        if (formData.entregadoA === documento.clientName) {
          setFormData(prev => ({ ...prev, entregadoA: '', receptorId: '' }));
        }
      }
    }
  }, [open, documento, formData.relationType]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (!formData.entregadoA.trim()) {
      setError('El nombre de quien retira es obligatorio');
      return;
    }

    onConfirm?.({
      documentId: documento.id,
      deliveredTo: formData.entregadoA.trim(),
      relationType: formData.relationType,
      receptorId: formData.receptorId,
      observations: formData.observations
    });
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ entregadoA: '', relationType: 'titular', receptorId: '', observations: '' });
      setError('');
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
          Entregar Documento (Matrizador)
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2"><strong>Cliente:</strong> {documento?.clientName}</Typography>
          <Typography variant="body2"><strong>Protocolo:</strong> {documento?.protocolNumber}</Typography>
          <Typography variant="body2"><strong>Estado actual:</strong> {documento?.status}</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Selector de Relación */}
          <TextField
            select
            label="Relación con el titular"
            value={formData.relationType}
            onChange={(e) => handleChange('relationType', e.target.value)}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value="titular">Titular</option>
            <option value="mensajero">Mensajero</option>
            <option value="abogado">Abogado</option>
            <option value="empleado">Empleado</option>
            <option value="familiar">Familiar</option>
            <option value="otro">Otro</option>
          </TextField>

          <TextField
            fullWidth
            required
            label="Nombre de quien retira"
            value={formData.entregadoA}
            onChange={(e) => handleChange('entregadoA', e.target.value)}
            helperText="Si es titular, se llena automáticamente"
          />

          <TextField
            fullWidth
            label="Cédula / Identificación (Opcional)"
            value={formData.receptorId}
            onChange={(e) => handleChange('receptorId', e.target.value)}
          />

          <TextField
            fullWidth
            label="Observaciones"
            multiline
            rows={2}
            value={formData.observations}
            onChange={(e) => handleChange('observations', e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading} color="secondary">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}
          startIcon={loading ? <CircularProgress size={18} /> : null}
        >
          {loading ? 'Entregando...' : 'Confirmar Entrega'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalEntregaMatrizador;

