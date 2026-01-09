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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import receptionService from '../../services/reception-service';
import archivoService from '../../services/archivo-service';

/**
 * Modal para procesar entrega grupal, reconstruido con Material-UI
 */
function ModalEntregaGrupal({ documentos, onClose, onEntregaExitosa, serviceType = 'reception' }) {
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
    // Pre-llenar código si todos los documentos lo comparten
    const codigosUnicos = [...new Set(documentos.map(doc => doc.codigoRetiro).filter(Boolean))];
    if (codigosUnicos.length === 1) {
      setFormData(prev => ({ ...prev, codigoVerificacion: codigosUnicos[0] }));
    }

    // 🆕 Pre-llenar nombre del titular y relación por defecto
    if (documentos.length > 0 && documentos[0].clientName) {
      setFormData(prev => ({
        ...prev,
        entregadoA: documentos[0].clientName,
        relacionTitular: 'titular'
      }));
    }
  }, [documentos]);

  const cargarRelacionesOptions = async () => {
    try {
      // Usar servicio de recepción para opciones (compartido) o fallback
      const result = await receptionService.getRelacionesTitular();
      if (result.success) {
        setRelacionesOptions(result.data.relaciones);
      }
    } catch (error) {
      // Fallback si falla o si es archivo y no tiene acceso
      setRelacionesOptions([
        { value: 'titular', label: 'Titular del documento' },
        { value: 'conyuge', label: 'Cónyuge' },
        { value: 'hijo', label: 'Hijo/Hija' },
        { value: 'padre', label: 'Padre/Madre' },
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

    // 🆕 Validación de código relax para recepción también
    /*
    if (serviceType !== 'archivo') {
       if (!formData.verificacionManual && !formData.codigoVerificacion.trim()) { ... }
    }
    */

    try {
      setLoading(true);
      setError(null);

      const entregaData = {
        ...formData,
        documentIds: documentos.map(doc => doc.id)
      };

      // Usar el servicio correcto
      const service = serviceType === 'archivo' ? archivoService : receptionService;
      const result = await service.procesarEntregaGrupal(entregaData);

      if (result.success) {
        onEntregaExitosa();
      } else {
        setError(result.error || 'Error procesando entrega grupal');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const clienteNombre = documentos.length > 0 ? documentos[0].clientName : 'Cliente';

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
          🚚 Procesar Entrega Grupal ({documentos.length} Documentos)
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={3}>
          {/* Columna Izquierda: Detalles de Entrega */}
          <Grid item xs={12} md={6}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* 🆕 Ocultar código para TODOS por simplificación */}
                {/* 
                {serviceType !== 'archivo' && ( ... )}
                */}

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Nombre de quien retira" name="entregadoA" value={formData.entregadoA} onChange={handleChange} helperText="Por defecto: titular del documento (editable)" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Cédula/ID (opcional)" name="cedulaReceptor" value={formData.cedulaReceptor} onChange={handleChange} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={{ minWidth: 220 }}>
                    <InputLabel>Relación con Titular</InputLabel>
                    <Select name="relacionTitular" value={formData.relacionTitular} onChange={handleChange} label="Relación con Titular">
                      {relacionesOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox name="facturaPresenta" checked={formData.facturaPresenta} onChange={handleChange} />}
                    label="¿Presentó factura?"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{
                    p: 2,
                    border: '1px dashed',
                    borderColor: formData.verificacionManual ? 'warning.main' : 'grey.400',
                    borderRadius: 1,
                    bgcolor: formData.verificacionManual ? 'warning.light' : 'transparent',
                    mb: 2
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
          </Grid>

          {/* Columna Derecha: Resumen de Documentos */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.background.default, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Documentos para {clienteNombre}
              </Typography>

              {/* 🔐 ZONA DE CÓDIGO - Prominente Simplificada */}
              <Box sx={{
                p: 2,
                bgcolor: (theme) => documentos[0]?.codigoRetiro
                  ? (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : '#E8F5E9')
                  : (theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : '#FFF3E0'),
                border: (theme) => `2px solid ${documentos[0]?.codigoRetiro ? theme.palette.success.main : theme.palette.warning.main}`,
                borderRadius: 2,
                textAlign: 'center',
                mb: 3
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  CÓDIGO DE RETIRO GRUPAL
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: (theme) => documentos[0]?.codigoRetiro ? theme.palette.success.main : theme.palette.warning.main
                  }}
                >
                  {documentos[0]?.codigoRetiro || '----'}
                </Typography>
                {!documentos[0]?.codigoRetiro && (
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                    (No generado)
                  </Typography>
                )}
              </Box>
              <List dense>
                {documentos.map(doc => (
                  <ListItem key={doc.id}>
                    <ListItemIcon>
                      <AssignmentIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.protocolNumber}
                      secondary={doc.documentType}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>
        </Grid>
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
          {loading ? 'Procesando...' : (formData.verificacionManual ? '⚠️ Confirmar Entrega Manual' : 'Confirmar Entrega Grupal')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModalEntregaGrupal;
