import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  InputLabel
} from '@mui/material';
import {
  Send as SendIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import mensajesInternosService from '../../services/mensajes-internos-service';

/**
 * Modal para enviar mensajes masivos a múltiples documentos/matrizadores
 * Agrupa automáticamente por matrizador asignado
 */
const EnviarMensajeMasivoModal = ({ open, onClose, documentos = [], onSuccess }) => {
  const [tipo, setTipo] = useState('SOLICITUD_ACTUALIZACION');
  const [urgencia, setUrgencia] = useState('NORMAL');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Agrupar documentos por matrizador
  const agrupacion = useMemo(() => {
    const porMatrizador = {};
    const sinAsignar = [];

    documentos.forEach(doc => {
      if (doc.assignedTo?.id) {
        const key = doc.assignedTo.id;
        if (!porMatrizador[key]) {
          porMatrizador[key] = {
            matrizador: doc.assignedTo,
            documentos: []
          };
        }
        porMatrizador[key].documentos.push(doc);
      } else {
        sinAsignar.push(doc);
      }
    });

    return {
      porMatrizador: Object.values(porMatrizador),
      sinAsignar,
      totalConAsignar: documentos.length - sinAsignar.length
    };
  }, [documentos]);

  // Tipos de mensaje
  const tiposMensaje = mensajesInternosService.getTiposMensaje();
  const nivelesUrgencia = mensajesInternosService.getNivelesUrgencia();

  const handleSubmit = async () => {
    if (agrupacion.totalConAsignar === 0) {
      setError('No hay documentos con matrizador asignado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Obtener IDs de documentos con matrizador asignado
      const documentoIds = documentos
        .filter(doc => doc.assignedTo?.id)
        .map(doc => doc.id);

      const data = {
        documentoIds,
        tipo,
        urgencia,
        mensaje: mensaje.trim() || null
      };

      const result = await mensajesInternosService.enviarMensajeMasivo(data);

      if (result.success) {
        toast.success(
          `${result.data.mensajesEnviados} mensaje(s) enviado(s) a ${result.data.matrizadoresNotificados} matrizador(es)`
        );

        if (result.data.documentosSinAsignar?.length > 0) {
          toast.warning(
            `${result.data.documentosSinAsignar.length} documento(s) sin asignar fueron omitidos`
          );
        }

        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Error al enviar los mensajes');
      toast.error(err.message || 'Error al enviar los mensajes');
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
          <GroupIcon color="primary" />
          <Typography variant="h6">Mensaje Masivo</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Resumen de selección */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Documentos seleccionados: {documentos.length}
          </Typography>
        </Box>

        {/* Lista de matrizadores que recibirán el mensaje */}
        <Typography variant="subtitle2" gutterBottom>
          Se notificará a:
        </Typography>

        <List dense sx={{ mb: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          {agrupacion.porMatrizador.map(({ matrizador, documentos: docs }) => (
            <ListItem key={matrizador.id}>
              <ListItemIcon>
                <PersonIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={`${matrizador.firstName} ${matrizador.lastName}`}
                secondary={`${docs.length} documento(s)`}
              />
              <Chip
                label={docs.length}
                size="small"
                color="primary"
              />
            </ListItem>
          ))}
        </List>

        {/* Alerta de documentos sin asignar */}
        {agrupacion.sinAsignar.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            <Typography variant="body2">
              <strong>{agrupacion.sinAsignar.length} documento(s)</strong> sin matrizador asignado serán omitidos:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {agrupacion.sinAsignar.slice(0, 3).map(doc => (
                <Chip
                  key={doc.id}
                  label={doc.protocolNumber}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
              {agrupacion.sinAsignar.length > 3 && (
                <Typography variant="caption" color="text.secondary">
                  y {agrupacion.sinAsignar.length - 3} más...
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        {agrupacion.totalConAsignar === 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No hay documentos con matrizador asignado. No se puede enviar el mensaje.
          </Alert>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Tipo de mensaje */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de mensaje</InputLabel>
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            label="Tipo de mensaje"
          >
            {tiposMensaje.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Urgencia */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Urgencia</InputLabel>
          <Select
            value={urgencia}
            onChange={(e) => setUrgencia(e.target.value)}
            label="Urgencia"
          >
            {nivelesUrgencia.map((n) => (
              <MenuItem key={n.value} value={n.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: n.color
                    }}
                  />
                  {n.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Mensaje opcional */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Nota adicional (opcional)"
          placeholder="Este mensaje se enviará a todos los matrizadores seleccionados..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          variant="outlined"
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
          disabled={loading || agrupacion.totalConAsignar === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {loading
            ? 'Enviando...'
            : `Enviar a ${agrupacion.porMatrizador.length} Matrizador(es)`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnviarMensajeMasivoModal;
