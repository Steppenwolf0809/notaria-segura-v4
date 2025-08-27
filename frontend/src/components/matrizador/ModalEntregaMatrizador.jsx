import React, { useState } from 'react';
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
 * - Pide solo el nombre de quien retira
 * - Llama al cambio de estado ENTREGADO con deliveredTo
 */
const ModalEntregaMatrizador = ({ open, onClose, documento, onConfirm, loading = false }) => {
  const [entregadoA, setEntregadoA] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!entregadoA.trim()) {
      setError('El nombre de quien retira es obligatorio');
      return;
    }
    onConfirm?.({ documentId: documento.id, deliveredTo: entregadoA.trim() });
  };

  const handleClose = () => {
    if (!loading) {
      setEntregadoA('');
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
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            autoFocus
            required
            label="Nombre de quien retira"
            value={entregadoA}
            onChange={(e) => setEntregadoA(e.target.value)}
          />
        </form>
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

