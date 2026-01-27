import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Message as MessageIcon,
  Description as DocumentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import mensajesInternosService from '../../services/mensajes-internos-service';

/**
 * Modal para enviar mensaje interno individual
 * Usado desde el panel de supervisión de documentos
 */
const EnviarMensajeModal = ({ open, onClose, documento, onSuccess }) => {
  const [tipo, setTipo] = useState('SOLICITUD_ACTUALIZACION');
  const [urgencia, setUrgencia] = useState('NORMAL');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tipos de mensaje con iconos
  const tiposMensaje = [
    { value: 'SOLICITUD_ACTUALIZACION', label: 'Solicitar actualización de estado', icon: <ScheduleIcon /> },
    { value: 'PRIORIZAR', label: 'Priorizar este trámite', icon: <PriorityIcon color="error" /> },
    { value: 'CLIENTE_ESPERANDO', label: 'Cliente preguntando', icon: <PersonIcon color="warning" /> },
    { value: 'COBRO', label: 'Recordatorio de cobro', icon: <MoneyIcon color="success" /> },
    { value: 'OTRO', label: 'Otro', icon: <MessageIcon /> }
  ];

  // Niveles de urgencia
  const nivelesUrgencia = [
    { value: 'NORMAL', label: 'Normal', color: 'default' },
    { value: 'URGENTE', label: 'Urgente', color: 'warning' },
    { value: 'CRITICO', label: 'Crítico', color: 'error' }
  ];

  // Calcular antigüedad del documento
  const calcularAntiguedad = () => {
    if (!documento?.createdAt) return null;
    const dias = Math.floor((new Date() - new Date(documento.createdAt)) / (1000 * 60 * 60 * 24));
    if (dias === 0) return { dias: 0, texto: 'Hoy', severidad: 'info' };
    if (dias <= 7) return { dias, texto: `${dias} días`, severidad: 'info' };
    if (dias <= 30) return { dias, texto: `${dias} días`, severidad: 'warning' };
    return { dias, texto: `${dias} días`, severidad: 'error' };
  };

  const antiguedad = calcularAntiguedad();

  const handleSubmit = async () => {
    if (!documento?.assignedTo?.id) {
      setError('Este documento no tiene un matrizador asignado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        destinatarioId: documento.assignedTo.id,
        documentoId: documento.id,
        tipo,
        urgencia,
        mensaje: mensaje.trim() || null
      };

      const result = await mensajesInternosService.enviarMensaje(data);

      if (result.success) {
        toast.success('Mensaje enviado exitosamente');
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
    setTipo('SOLICITUD_ACTUALIZACION');
    setUrgencia('NORMAL');
    setMensaje('');
    setError(null);
    onClose();
  };

  if (!documento) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SendIcon color="primary" />
          <Typography variant="h6">Enviar Mensaje Interno</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Información del documento */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <DocumentIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" color="primary">
              {documento.protocolNumber}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Cliente:</strong> {documento.clientName}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Destinatario:</strong>
            </Typography>
            {documento.assignedTo ? (
              <Chip
                icon={<PersonIcon />}
                label={`${documento.assignedTo.firstName} ${documento.assignedTo.lastName}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            ) : (
              <Chip
                label="Sin asignar"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>

          {antiguedad && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Antigüedad:</strong>
              </Typography>
              <Chip
                icon={antiguedad.severidad === 'error' ? <WarningIcon /> : undefined}
                label={antiguedad.texto}
                size="small"
                color={antiguedad.severidad}
              />
              {antiguedad.dias > 30 && (
                <Typography variant="caption" color="error">
                  CRÍTICO
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Alerta si no hay matrizador asignado */}
        {!documento.assignedTo && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Este documento no tiene un matrizador asignado. No se puede enviar el mensaje.
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Tipo de mensaje */}
        <Typography variant="subtitle2" gutterBottom>
          Tipo de mensaje:
        </Typography>
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <RadioGroup
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {tiposMensaje.map((t) => (
              <FormControlLabel
                key={t.value}
                value={t.value}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {t.icon}
                    <Typography variant="body2">{t.label}</Typography>
                  </Box>
                }
                sx={{
                  mb: 0.5,
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(tipo === t.value && { bgcolor: 'action.selected' })
                }}
              />
            ))}
          </RadioGroup>
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

        {/* Nota adicional */}
        <Typography variant="subtitle2" gutterBottom>
          Nota adicional (opcional):
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Escribe un mensaje personalizado..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          variant="outlined"
          size="small"
        />

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !documento.assignedTo}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnviarMensajeModal;
