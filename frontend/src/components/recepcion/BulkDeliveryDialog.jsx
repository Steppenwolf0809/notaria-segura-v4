import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';

function BulkDeliveryDialog({ open, onClose, documentIds, documents, onDeliveryComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    personaRetira: '',
    cedulaRetira: '',
    verificationType: 'CEDULA',
    verificationCode: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.personaRetira || !formData.cedulaRetira) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reception/bulk-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentIds,
          deliveryData: formData
        })
      });

      const data = await response.json();

      if (data.success) {
        onDeliveryComplete();
        onClose();
        // Resetear form
        setFormData({
          personaRetira: '',
          cedulaRetira: '',
          verificationType: 'CEDULA',
          verificationCode: ''
        });
      } else {
        setError(data.message || 'Error al realizar entrega');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Entrega en Bloque ({documentIds.length} documentos)
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se entregarán {documentIds.length} documentos del mismo cliente
        </Typography>

        <TextField
          fullWidth
          label="Nombre de quien retira"
          name="personaRetira"
          value={formData.personaRetira}
          onChange={handleChange}
          required
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Cédula de quien retira"
          name="cedulaRetira"
          value={formData.cedulaRetira}
          onChange={handleChange}
          required
          sx={{ mb: 2 }}
        />

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel>Tipo de Verificación</FormLabel>
          <RadioGroup
            name="verificationType"
            value={formData.verificationType}
            onChange={handleChange}
          >
            <FormControlLabel value="CEDULA" control={<Radio />} label="Cédula" />
            <FormControlLabel value="CODIGO" control={<Radio />} label="Código de verificación" />
            <FormControlLabel value="TELEFONO" control={<Radio />} label="Verificación telefónica" />
          </RadioGroup>
        </FormControl>

        {formData.verificationType === 'CODIGO' && (
          <TextField
            fullWidth
            label="Código de verificación (4 dígitos)"
            name="verificationCode"
            value={formData.verificationCode}
            onChange={handleChange}
            inputProps={{ maxLength: 4 }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : `Entregar ${documentIds.length} Documentos`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BulkDeliveryDialog;
