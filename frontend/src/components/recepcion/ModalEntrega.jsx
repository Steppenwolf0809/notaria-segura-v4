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

  // 🆕 Pre-llenar formulario con datos del documento
  useEffect(() => {
    if (documento) {
      setFormData(prev => ({
        ...prev,
        entregadoA: documento.clientName || '', // Nombre del titular por defecto
        relacionTitular: 'titular' // Relación por defecto: titular
      }));
    }
  }, [documento]);

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
      // Fallback con opciones básicas
      setRelacionesOptions([
        { value: 'titular', label: 'Titular del documento' },
        { value: 'apoderado', label: 'Apoderado legal' },
        { value: 'mensajero', label: 'Mensajero' },
        { value: 'empleado', label: 'Empleado' },
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

    // 🆕 Solo validar código de verificación para RECEPCIÓN si se requiere explícitamente (ahora simplificado)
    // El usuario pidió quitar el código para recepción también.
    // if (serviceType !== 'archivo') { ... } -> Lo comentamos    // 🆕 Validación de código relax para recepción también
    /*
    if (serviceType !== 'archivo') {
       if (!formData.verificacionManual && !formData.codigoVerificacion.trim()) {
        setError('Código de verificación es obligatorio');
        return;
      }
    }
    */

    try {
      setLoading(true);
      setError(null);

      // Usar el servicio correcto según el tipo
      const service = serviceType === 'archivo' ? archivoService : receptionService;
      const result = await service.procesarEntrega(documento.id, formData);

      if (result.success) {

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



        {/* 🔐 ZONA DE CÓDIGO DE RETIRO - Prominente */}
        <Box sx={{
          p: 3,
          bgcolor: (theme) => documento.codigoRetiro
            ? (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : '#E8F5E9')
            : (theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : '#FFF3E0'),
          border: (theme) => `2px solid ${documento.codigoRetiro ? theme.palette.success.main : theme.palette.warning.main}`,
          borderRadius: 2,
          textAlign: 'center',
          mb: 3
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            🔢 Código de Retiro
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: (theme) => documento.codigoRetiro ? theme.palette.success.main : theme.palette.warning.main,
              letterSpacing: '0.15em'
            }}
          >
            {documento.codigoRetiro || '----'}
          </Typography>
          {documento.codigoRetiro ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              👆 Solicite este código al cliente antes de entregar
            </Typography>
          ) : (
            <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                ⚠️ No se generó código de retiro
              </Typography>
              <Typography variant="body2">
                Este documento no fue notificado por WhatsApp. Use "Verificación Manual" abajo.
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Información del documento */}
        <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.background.default, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            📄 {documento.clientName}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><strong>Protocolo:</strong> {documento.protocolNumber}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><strong>Tipo:</strong> {documento.documentType}</Typography>
            </Grid>
          </Grid>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* 🆕 Código oculto/simplificado para todos según requerimiento */}
            {/*
            {serviceType !== 'archivo' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField ... />
                </Grid>
                ...
              </>
            )}
            */}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Nombre de quien retira"
                name="entregadoA"
                value={formData.entregadoA}
                onChange={handleChange}
                helperText="Por defecto: titular del documento (editable)"
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

            {/* 🔐 Checkbox de Verificación Manual (Fallback) */}
            <Grid item xs={12}>
              <Box sx={{
                p: 2,
                border: '1px dashed',
                borderColor: formData.verificacionManual ? 'warning.main' : 'grey.400',
                borderRadius: 1,
                bgcolor: formData.verificacionManual ? 'warning.light' : 'transparent'
              }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.verificacionManual}
                      onChange={handleChange}
                      name="verificacionManual"
                      color="warning"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight="bold">
                      Verificación Alternativa (Sin Código)
                    </Typography>
                  }
                />

                {formData.verificacionManual && (
                  <Alert severity="warning" size="small" sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      ⚠️ Está autorizando una entrega manual. Es obligatorio verificar la identidad física y registrar el motivo.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                required={formData.verificacionManual}
                label={formData.verificacionManual ? "Observación obligatoria (Motivo entrega manual)" : "Observaciones (opcional)"}
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                placeholder={formData.verificacionManual ? "Ej: Cliente perdió celular, verifiqué cédula física..." : ""}
                error={formData.verificacionManual && !formData.observaciones}
                helperText={formData.verificacionManual && !formData.observaciones ? "Debe explicar el motivo de la entrega manual" : ""}
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
          disabled={loading || (formData.verificacionManual && !formData.observaciones)}
          color={formData.verificacionManual ? "warning" : "primary"}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Procesando...' : (formData.verificacionManual ? '⚠️ Confirmar Entrega Manual' : 'Confirmar Entrega')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModalEntrega;
