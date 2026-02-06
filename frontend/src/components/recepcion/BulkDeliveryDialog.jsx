import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Chip
} from '@mui/material';
import receptionService from '../../services/reception-service';

// ✅ Opciones de relación simplificadas
const RELACION_OPTIONS = [
  { value: 'titular', label: '👤 Titular' },
  { value: 'familiar', label: '👨‍👩‍👧 Familiar' },
  { value: 'mensajero', label: '🏍️ Mensajero' },
  { value: 'apoderado', label: '📋 Apoderado' },
  { value: 'otro', label: '❓ Otro' }
];

function BulkDeliveryDialog({ open, onClose, documentIds, documents, onDeliveryComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    personaRetira: '',
    cedulaRetira: '',
    relacionTitular: 'titular',
    observaciones: ''
  });

  // Pre-llenar formulario solo al abrir el modal (no en cada re-render)
  const prevOpenRef = React.useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      console.log('[BulkDeliveryDialog] documentIds recibidos:', documentIds?.length, documentIds);
      const firstClient = String(documents?.[0]?.clientName || '');
      setFormData(prev => ({
        ...prev,
        personaRetira: firstClient,
        observaciones: ''
      }));
      setError(null);
    }
    prevOpenRef.current = open;
  }, [open, documentIds, documents]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!String(formData.personaRetira || '').trim()) {
      setError('El nombre de quien retira es obligatorio');
      return;
    }

    // Verificar que tenemos documentIds válidos
    if (!documentIds || documentIds.length === 0) {
      setError('No hay documentos seleccionados');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Usar el servicio en lugar de fetch directo para incluir CSRF token
      const result = await receptionService.procesarEntregaGrupal({
        documentIds: documentIds,
        deliveredTo: formData.personaRetira,
        receptorId: formData.cedulaRetira || null,
        relationType: formData.relacionTitular,
        observations: formData.observaciones || null
      });

      if (result.success) {
        onDeliveryComplete();
        onClose();
        // Resetear form
        setFormData({
          personaRetira: '',
          cedulaRetira: '',
          relacionTitular: 'titular',
          observaciones: ''
        });
      } else {
        setError(result.error || 'Error al realizar entrega');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calcular si hay múltiples clientes
  const uniqueClients = documents ? [...new Set(documents.map(d => d.clientName))] : [];
  const isMultiClient = uniqueClients.length > 1;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        🚚 Entrega en Bloque
        <Chip
          label={`${documentIds?.length || 0} doc${documentIds?.length !== 1 ? 's' : ''}`}
          color="primary"
          size="small"
          sx={{ ml: 1 }}
        />
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isMultiClient ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            📦 Entrega de {documentIds?.length} documentos de {uniqueClients.length} clientes diferentes
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Se entregarán {documentIds?.length} documento(s) de <strong>{uniqueClients[0]}</strong>
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Nombre de quien retira"
            name="personaRetira"
            value={formData.personaRetira}
            onChange={handleChange}
            required
            helperText={!isMultiClient ? "Por defecto: titular del documento" : ""}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="Cédula (opcional)"
              name="cedulaRetira"
              value={formData.cedulaRetira}
              onChange={handleChange}
            />

            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Relación</InputLabel>
              <Select
                name="relacionTitular"
                value={formData.relacionTitular}
                onChange={handleChange}
                label="Relación"
              >
                {RELACION_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Observaciones (opcional)"
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            placeholder="Ej: Mensajero de empresa X, verificado por teléfono..."
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : `Entregar ${documentIds?.length || 0} Docs`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BulkDeliveryDialog;

