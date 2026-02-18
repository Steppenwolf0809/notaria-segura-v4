import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import mensajesInternosService from '../../services/mensajes-internos-service';
import billingService from '../../services/billing-service';

const normalizeText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getMatrizadorFullName = (mat) => `${mat.firstName || ''} ${mat.lastName || ''}`.trim();

const findSuggestedMatrizadorId = (matrizadores, preferredName) => {
  if (!preferredName) return '';
  const preferred = normalizeText(preferredName);
  if (!preferred) return '';

  const exact = matrizadores.find((mat) => normalizeText(getMatrizadorFullName(mat)) === preferred);
  if (exact) return String(exact.id);

  const partial = matrizadores.find((mat) => {
    const full = normalizeText(getMatrizadorFullName(mat));
    return full.includes(preferred) || preferred.includes(full);
  });

  return partial ? String(partial.id) : '';
};

const MensajeCobroModal = ({ open, onClose, clientData, onSuccess }) => {
  const [destinatarioId, setDestinatarioId] = useState('');
  const [urgencia, setUrgencia] = useState('NORMAL');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMatrizadores, setLoadingMatrizadores] = useState(false);
  const [matrizadores, setMatrizadores] = useState([]);
  const [error, setError] = useState(null);

  const nivelesUrgencia = [
    { value: 'NORMAL', label: 'Normal', color: 'default' },
    { value: 'URGENTE', label: 'Urgente', color: 'warning' },
    { value: 'CRITICO', label: 'Critico', color: 'error' }
  ];

  useEffect(() => {
    if (open) {
      setDestinatarioId('');
      loadMatrizadores(clientData?.matrizador || null);
      if (clientData) {
        const saldo = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(clientData.balance || 0);
        if (clientData.invoiceNumber) {
          setMensaje(
            `Recordatorio de cobro - Factura: ${clientData.invoiceNumber}, ` +
            `Cliente: ${clientData.clientName}, Cedula/RUC: ${clientData.clientTaxId}, ` +
            `Saldo pendiente: ${saldo}`
          );
        } else {
          setMensaje(
            `Recordatorio de cobro - Cliente: ${clientData.clientName}, ` +
            `Cedula/RUC: ${clientData.clientTaxId}, ` +
            `Saldo pendiente: ${saldo} (${clientData.invoiceCount} factura${clientData.invoiceCount !== 1 ? 's' : ''})`
          );
        }
      }
    }
  }, [open, clientData]);

  const loadMatrizadores = async (preferredName = null) => {
    setLoadingMatrizadores(true);
    try {
      const result = await billingService.getMatrizadoresForAssignment();
      if (result.success && result.data) {
        const matrizadoresData = result.data;
        setMatrizadores(matrizadoresData);

        const suggestedId = findSuggestedMatrizadorId(matrizadoresData, preferredName);
        if (suggestedId) {
          setDestinatarioId(suggestedId);
        }
      }
    } catch (err) {
      console.error('Error cargando matrizadores:', err);
    } finally {
      setLoadingMatrizadores(false);
    }
  };

  const handleSubmit = async () => {
    if (!destinatarioId) {
      setError('Seleccione un matrizador destinatario');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        destinatarioId: Number(destinatarioId),
        tipo: 'COBRO',
        urgencia,
        mensaje: mensaje.trim() || null,
        documentoId: clientData?.documentoId || null
      };

      const result = await mensajesInternosService.enviarMensaje(data);

      if (result.success) {
        toast.success(`Mensaje de cobro enviado exitosamente`);
        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Error al enviar el mensaje');
      toast.error(err.message || 'Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDestinatarioId('');
    setUrgencia('NORMAL');
    setMensaje('');
    setError(null);
    onClose();
  };

  if (!clientData) return null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="success" />
          <Typography variant="h6">Mensaje de Cobro</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Info del cliente */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {clientData.clientName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Cedula/RUC:</strong> {clientData.clientTaxId}
          </Typography>
          {clientData.invoiceNumber ? (
            <Typography variant="body2" color="text.secondary">
              <strong>Factura:</strong> {clientData.invoiceNumber}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              <strong>Facturas pendientes:</strong> {clientData.invoiceCount}
            </Typography>
          )}
          {clientData.matrizador && (
            <Typography variant="body2" color="text.secondary">
              <strong>Matrizador sugerido:</strong> {clientData.matrizador}
            </Typography>
          )}
          <Typography variant="body2" color="error.main" fontWeight="bold">
            Saldo: {formatCurrency(clientData.balance)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Seleccionar matrizador */}
        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
          <InputLabel>Matrizador destinatario</InputLabel>
          <Select
            value={destinatarioId}
            label="Matrizador destinatario"
            onChange={(e) => setDestinatarioId(e.target.value)}
            disabled={loadingMatrizadores}
            startAdornment={loadingMatrizadores ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          >
            {matrizadores.map((mat) => (
              <MenuItem key={mat.id} value={mat.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  {mat.firstName} {mat.lastName}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Urgencia */}
        <Typography variant="subtitle2" gutterBottom>
          Urgencia:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          {nivelesUrgencia.map((nivel) => (
            <Chip
              key={nivel.value}
              label={nivel.label}
              color={nivel.color}
              variant={urgencia === nivel.value ? 'filled' : 'outlined'}
              onClick={() => setUrgencia(nivel.value)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>

        {/* Mensaje */}
        <Typography variant="subtitle2" gutterBottom>
          Mensaje:
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          variant="outlined"
          size="small"
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={loading || !destinatarioId}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {loading ? 'Enviando...' : 'Enviar Mensaje'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MensajeCobroModal;
