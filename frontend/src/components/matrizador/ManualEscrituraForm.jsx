/**
 * Componente ManualEscrituraForm
 * Formulario para crear escrituras ingresando datos manualmente
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  IconButton,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Save as SaveIcon
} from '@mui/icons-material';

const STEPS = ['Información Básica', 'Información Notarial', 'Otorgantes y Detalles'];

const ManualEscrituraForm = ({ onSubmit, onCancel, loading }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    numeroEscritura: '',
    acto: '',
    fecha_otorgamiento: new Date().toISOString().split('T')[0],
    cuantia: '',
    cuantiaIndeterminada: true,
    notario: 'GLENDA ZAPATA SILVA',
    notaria: 'DÉCIMA OCTAVA DEL CANTÓN QUITO',
    ubicacion: {
      provincia: 'PICHINCHA',
      canton: 'QUITO',
      parroquia: 'IÑAQUITO'
    },
    otorgantes: {
      otorgado_por: [],
      a_favor_de: []
    },
    objeto_observaciones: '',
    extractoTextoCompleto: ''
  });

  // Maneja cambios en campos simples
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Maneja cambios en ubicación
  const handleUbicacionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ubicacion: { ...prev.ubicacion, [field]: value }
    }));
  };

  // Maneja cambios en otorgantes
  const handleOtorganteChange = (tipo, index, field, value) => {
    setFormData(prev => {
      const newOtorgantes = { ...prev.otorgantes };
      newOtorgantes[tipo][index] = { ...newOtorgantes[tipo][index], [field]: value };
      return { ...prev, otorgantes: newOtorgantes };
    });
  };

  // Añade un otorgante/beneficiario
  const addPersona = (tipo) => {
    setFormData(prev => ({
      ...prev,
      otorgantes: {
        ...prev.otorgantes,
        [tipo]: [
          ...prev.otorgantes[tipo],
          { nombre: '', documento: 'CÉDULA', numero: '', nacionalidad: 'ECUATORIANA', calidad: '' }
        ]
      }
    }));
  };

  // Elimina un otorgante/beneficiario
  const removePersona = (tipo, index) => {
    setFormData(prev => ({
      ...prev,
      otorgantes: {
        ...prev.otorgantes,
        [tipo]: prev.otorgantes[tipo].filter((_, i) => i !== index)
      }
    }));
  };

  // Valida el paso actual
  const validateStep = () => {
    setError(null);

    if (activeStep === 0) {
      if (!formData.numeroEscritura.trim()) {
        setError('El número de escritura es requerido');
        return false;
      }
      if (!formData.acto.trim()) {
        setError('El acto/contrato es requerido');
        return false;
      }
      if (!formData.fecha_otorgamiento) {
        setError('La fecha de otorgamiento es requerida');
        return false;
      }
    }

    return true;
  };

  // Avanza al siguiente paso
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  // Retrocede al paso anterior
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  // Envía el formulario
  const handleSubmit = async () => {
    if (!validateStep()) return;

    const datosParaEnviar = {
      ...formData,
      cuantia: formData.cuantiaIndeterminada ? 'INDETERMINADA' : formData.cuantia
    };

    try {
      await onSubmit(datosParaEnviar);
    } catch (err) {
      setError(err.message || 'Error al crear la escritura');
    }
  };

  // Renderiza el contenido del paso actual
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Número de Escritura"
                placeholder="20241701022P04128"
                value={formData.numeroEscritura}
                onChange={(e) => handleFieldChange('numeroEscritura', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Acto/Contrato"
                placeholder="PODER ESPECIAL DE PERSONA NATURAL"
                value={formData.acto}
                onChange={(e) => handleFieldChange('acto', e.target.value)}
                multiline
                rows={2}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Fecha de Otorgamiento"
                value={formData.fecha_otorgamiento}
                onChange={(e) => handleFieldChange('fecha_otorgamiento', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.cuantiaIndeterminada}
                    onChange={(e) => handleFieldChange('cuantiaIndeterminada', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Cuantía Indeterminada"
              />
              {!formData.cuantiaIndeterminada && (
                <TextField
                  fullWidth
                  label="Cuantía (USD)"
                  type="number"
                  value={formData.cuantia}
                  onChange={(e) => handleFieldChange('cuantia', e.target.value)}
                  disabled={loading}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Información Notarial
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notario"
                value={formData.notario}
                onChange={(e) => handleFieldChange('notario', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notaría"
                value={formData.notaria}
                onChange={(e) => handleFieldChange('notaria', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Ubicación
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Provincia"
                value={formData.ubicacion.provincia}
                onChange={(e) => handleUbicacionChange('provincia', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Cantón"
                value={formData.ubicacion.canton}
                onChange={(e) => handleUbicacionChange('canton', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Parroquia"
                value={formData.ubicacion.parroquia}
                onChange={(e) => handleUbicacionChange('parroquia', e.target.value)}
                disabled={loading}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            {/* Otorgantes */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Otorgado por (Opcional)
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addPersona('otorgado_por')}
                  disabled={loading}
                >
                  Añadir
                </Button>
              </Box>

              {formData.otorgantes.otorgado_por.map((persona, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1, p: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nombre completo"
                        value={persona.nombre}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'nombre', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tipo Doc."
                        value={persona.documento}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'documento', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="N° Documento"
                        value={persona.numero}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'numero', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nacionalidad"
                        value={persona.nacionalidad}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'nacionalidad', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Calidad"
                        value={persona.calidad}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'calidad', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => removePersona('otorgado_por', index)}
                        disabled={loading}
                      >
                        Eliminar
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Grid>

            {/* Beneficiarios */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  A favor de (Opcional)
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addPersona('a_favor_de')}
                  disabled={loading}
                >
                  Añadir
                </Button>
              </Box>

              {formData.otorgantes.a_favor_de.map((persona, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1, p: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nombre completo"
                        value={persona.nombre}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'nombre', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tipo Doc."
                        value={persona.documento}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'documento', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="N° Documento"
                        value={persona.numero}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'numero', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nacionalidad"
                        value={persona.nacionalidad}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'nacionalidad', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Calidad"
                        value={persona.calidad}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'calidad', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => removePersona('a_favor_de', index)}
                        disabled={loading}
                      >
                        Eliminar
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Grid>

            {/* Objeto/Observaciones */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Objeto / Observaciones (Opcional)"
                value={formData.objeto_observaciones}
                onChange={(e) => handleFieldChange('objeto_observaciones', e.target.value)}
                multiline
                rows={3}
                disabled={loading}
              />
            </Grid>

            {/* Texto completo del extracto */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto Completo del Extracto (Opcional)"
                placeholder="Pega aquí el texto completo del extracto notarial..."
                value={formData.extractoTextoCompleto}
                onChange={(e) => handleFieldChange('extractoTextoCompleto', e.target.value)}
                multiline
                rows={6}
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Este texto estará disponible en los detalles de la escritura para consulta
              </Typography>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Contenido del paso */}
      <Box sx={{ mb: 3 }}>
        {renderStepContent()}
      </Box>

      {/* Botones de navegación */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep > 0 && (
            <Button
              startIcon={<BackIcon />}
              onClick={handleBack}
              disabled={loading}
            >
              Atrás
            </Button>
          )}

          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ForwardIcon />}
              onClick={handleNext}
              disabled={loading}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Crear Escritura'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ManualEscrituraForm;

