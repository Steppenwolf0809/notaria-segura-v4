import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Grid,
  Chip
} from '@mui/material';
import receptionService from '../../services/reception-service';
import archivoService from '../../services/archivo-service';
import { toast } from 'react-toastify';

/**
 * Modal para procesar entrega individual de documento, reconstruido con Material-UI
 * Ahora soporta tanto RECEPCIÓN como ARCHIVO usando el servicio correcto
 */
function ModalEntrega({ documento, onClose, onEntregaExitosa, serviceType = 'reception' }) {
  const [formData, setFormData] = useState({
    codigoVerificacion: '',
    entregadoA: '',
    cedulaReceptor: '',
    relacionTitular: '',
    verificacionManual: false,
    facturaPresenta: false,
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [relacionesOptions, setRelacionesOptions] = useState([]);

  useEffect(() => {
    cargarRelacionesOptions();
  }, []);

  const cargarRelacionesOptions = async () => {
    try {
      // Opciones por defecto ya que no existe la función en el servicio
      const relacionesDefault = [
        { value: 'titular', label: 'Titular del documento' },
        { value: 'conyuge', label: 'Cónyuge' },
        { value: 'hijo', label: 'Hijo/Hija' },
        { value: 'padre', label: 'Padre/Madre' },
        { value: 'hermano', label: 'Hermano/Hermana' },
        { value: 'apoderado', label: 'Apoderado legal' },
        { value: 'representante', label: 'Representante autorizado' },
        { value: 'otro', label: 'Otro' }
      ];
      setRelacionesOptions(relacionesDefault);
    } catch (error) {
      console.error('Error cargando opciones:', error);
      // Fallback con opciones básicas
      setRelacionesOptions([
        { value: 'titular', label: 'Titular del documento' },
        { value: 'apoderado', label: 'Apoderado legal' },
        { value: 'otro', label: 'Otro' }
      ]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.entregadoA.trim()) {
      setError('Nombre de quien retira es obligatorio');
      return;
    }

    if (!formData.relacionTitular) {
      setError('Relación con titular es obligatoria');
      return;
    }

    if (!formData.verificacionManual && !formData.codigoVerificacion.trim()) {
      setError('Código de verificación es obligatorio (o marcar verificación manual)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Usar el servicio correcto según el tipo
      const service = serviceType === 'archivo' ? archivoService : receptionService;
      const result = await service.procesarEntrega(documento.id, formData);

      if (result.success) {
        // 🔗 NUEVA FUNCIONALIDAD: Mostrar información de entrega grupal si aplica
        const groupInfo = result.data?.groupDelivery;
        if (groupInfo?.wasGroupDelivery) {
          console.log(`✅ Entrega grupal exitosa: ${groupInfo.totalDocuments} documentos entregados`);
        }
        // Notificación global según WhatsApp
        const w = result.data?.whatsapp || {};
        if (w.sent) {
          toast.success('Documento entregado. Confirmación WhatsApp enviada.');
        } else if (w.error) {
          toast.error(`Documento entregado, pero WhatsApp falló: ${w.error}`);
        } else {
          toast.success(result.message || 'Documento entregado exitosamente');
        }
        onEntregaExitosa();
      } else {
        const err = result.error || 'Error procesando entrega';
        setError(err);
        toast.error(err);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
          🚚 Procesar Entrega Individual
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* 🔗 NUEVA FUNCIONALIDAD: Alerta de entrega grupal */}
        {documento.isGrouped && (
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            icon={<Box component="span">📦</Box>}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              ⚡ Entrega Grupal Automática
            </Typography>
            <Typography variant="body2">
              Este documento es parte de un grupo. Al procesarlo, se entregarán automáticamente 
              TODOS los documentos del grupo que estén listos.
            </Typography>
          </Alert>
        )}
        
        <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.background.default, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            📄 {documento.clientName}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2"><strong>Protocolo:</strong> {documento.protocolNumber}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2"><strong>Tipo:</strong> {documento.documentType}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2">
                <strong>Código:</strong> 
                <Chip 
                  label={documento.codigoRetiro || documento.verificationCode || 'N/A'} 
                  size="small" 
                  color="success"
                  sx={{ ml: 1, fontFamily: 'monospace', fontWeight: 'bold' }}
                />
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código de Verificación"
                name="codigoVerificacion"
                value={formData.codigoVerificacion}
                onChange={handleChange}
                disabled={formData.verificacionManual}
                helperText="Código de 4 dígitos enviado al cliente"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="verificacionManual"
                    checked={formData.verificacionManual}
                    onChange={handleChange}
                  />
                }
                label="Verificación Manual (cliente no tiene código)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Nombre de quien retira"
                name="entregadoA"
                value={formData.entregadoA}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cédula/ID de quien retira (opcional)"
                name="cedulaReceptor"
                value={formData.cedulaReceptor}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required sx={{ minWidth: 220 }}>
                <InputLabel>Relación con el Titular</InputLabel>
                <Select
                  name="relacionTitular"
                  value={formData.relacionTitular}
                  onChange={handleChange}
                  label="Relación con el Titular"
                >
                  {relacionesOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="facturaPresenta"
                    checked={formData.facturaPresenta}
                    onChange={handleChange}
                  />
                }
                label="¿Presentó factura?"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones (opcional)"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="secondary">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Procesando...' : 'Confirmar Entrega'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModalEntrega;
