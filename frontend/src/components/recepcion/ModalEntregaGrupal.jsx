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

/**
 * Modal para procesar entrega grupal, reconstruido con Material-UI
 */
function ModalEntregaGrupal({ documentos, onClose, onEntregaExitosa }) {
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
  }, [documentos]);

  const cargarRelacionesOptions = async () => {
    try {
      const result = await receptionService.getRelacionesTitular();
      if (result.success) {
        setRelacionesOptions(result.data.relaciones);
      }
    } catch (error) {
      console.error('Error cargando opciones:', error);
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

      const entregaData = {
        ...formData,
        documentIds: documentos.map(doc => doc.id)
      };

      const result = await receptionService.procesarEntregaGrupal(entregaData);

      if (result.success) {
        onEntregaExitosa();
      } else {
        setError(result.error || 'Error procesando entrega grupal');
      }
    } catch (error) {
      console.error('Error:', error);
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Código de Verificación Grupal"
                    name="codigoVerificacion"
                    value={formData.codigoVerificacion}
                    onChange={handleChange}
                    disabled={formData.verificacionManual}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox name="verificacionManual" checked={formData.verificacionManual} onChange={handleChange} />}
                    label="Verificación Manual"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Nombre de quien retira" name="entregadoA" value={formData.entregadoA} onChange={handleChange} />
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
          </Grid>

          {/* Columna Derecha: Resumen de Documentos */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.background.default, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Documentos para {clienteNombre}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Código Grupal:</strong> 
                <Chip 
                  label={documentos[0]?.codigoRetiro || 'N/A'} 
                  size="small" 
                  color="success"
                  sx={{ ml: 1, fontFamily: 'monospace', fontWeight: 'bold' }}
                />
              </Typography>
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
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Procesando...' : 'Confirmar Entrega Grupal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModalEntregaGrupal;
