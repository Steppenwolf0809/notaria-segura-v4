/**
 * Componente ManualEscrituraForm
 * Formulario simplificado para crear escrituras ingresando datos manualmente
 * Solo información esencial para autoridades migratorias
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
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CardMedia
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Save as SaveIcon,
  Image as ImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const STEPS = ['Información Básica', 'Información Notarial', 'Otorgantes y Beneficiarios'];

const ManualEscrituraForm = ({ onSubmit, onCancel, loading }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);
  
  // Estado para la foto
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    numeroEscritura: '',
    acto: '',
    fecha_otorgamiento: '', // Texto libre en lugar de date
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

  // Añade un otorgante/beneficiario (estructura simplificada)
  const addPersona = (tipo) => {
    setFormData(prev => ({
      ...prev,
      otorgantes: {
        ...prev.otorgantes,
        [tipo]: [
          ...prev.otorgantes[tipo],
          { 
            nombre: '', 
            documento: 'Cédula', 
            numero: '',
            representadoPor: '' // Solo se guarda si se marca el checkbox
          }
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

  // Maneja la selección de foto
  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }
    
    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('La imagen es demasiado grande (máximo 5MB)');
      return;
    }
    
    // Guardar archivo y generar preview
    setSelectedPhoto(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Elimina la foto seleccionada
  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  // Envía el formulario (con foto opcional)
  const handleSubmit = async () => {
    if (!validateStep()) return;

    // Limpiar estructura: eliminar campos de representadoPor vacíos
    const limpiarOtorgantes = (personas) => {
      return personas.map(p => {
        const persona = {
          nombre: p.nombre,
          documento: p.documento,
          numero: p.numero
        };
        // Solo incluir representadoPor si tiene valor
        if (p.representadoPor && p.representadoPor.trim()) {
          persona.representadoPor = p.representadoPor.trim();
        }
        return persona;
      });
    };

    const datosParaEnviar = {
      ...formData,
      cuantia: formData.cuantiaIndeterminada ? 'INDETERMINADA' : formData.cuantia,
      otorgantes: {
        otorgado_por: limpiarOtorgantes(formData.otorgantes.otorgado_por),
        a_favor_de: limpiarOtorgantes(formData.otorgantes.a_favor_de)
      }
    };

    try {
      // Pasar datos y foto al componente padre
      await onSubmit(datosParaEnviar, selectedPhoto);
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
                label="Fecha de Otorgamiento"
                placeholder="22 DE SEPTIEMBRE DEL 2025, (16:06)"
                value={formData.fecha_otorgamiento}
                onChange={(e) => handleFieldChange('fecha_otorgamiento', e.target.value)}
                disabled={loading}
                helperText="Copia y pega el texto exacto del extracto"
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
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notaría"
                value={formData.notaria}
                onChange={(e) => handleFieldChange('notaria', e.target.value)}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
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
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Cantón"
                value={formData.ubicacion.canton}
                onChange={(e) => handleUbicacionChange('canton', e.target.value)}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Parroquia"
                value={formData.ubicacion.parroquia}
                onChange={(e) => handleUbicacionChange('parroquia', e.target.value)}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            {/* Sección de Fotografía */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon />
                Fotografía del Menor (Opcional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Si la escritura es una autorización de salida del país, adjunta una fotografía del menor.
              </Typography>
              
              {!photoPreview ? (
                <Box>
                  <input
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    id="foto-input-manual"
                    type="file"
                    onChange={handlePhotoSelect}
                    disabled={loading}
                  />
                  <label htmlFor="foto-input-manual">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<ImageIcon />}
                      disabled={loading}
                    >
                      Seleccionar Fotografía
                    </Button>
                  </label>
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    Formatos: JPG, PNG, WEBP • Tamaño máximo: 5MB
                  </Typography>
                </Box>
              ) : (
                <Card sx={{ maxWidth: 400, position: 'relative' }}>
                  <IconButton
                    onClick={handleRemovePhoto}
                    disabled={loading}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.main', color: 'white' }
                    }}
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                  <CardMedia
                    component="img"
                    image={photoPreview}
                    alt="Vista previa de fotografía"
                    sx={{ maxHeight: 300, objectFit: 'contain', p: 2 }}
                  />
                  <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="body2">
                      {selectedPhoto?.name}
                    </Typography>
                  </Box>
                </Card>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Otorgantes */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary">
                  Otorgantes (Padres/Apoderados)
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addPersona('otorgado_por')}
                  disabled={loading}
                >
                  Agregar Otorgante
                </Button>
              </Box>

              {formData.otorgantes.otorgado_por.map((persona, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nombre Completo"
                        placeholder="Ej: Juan Pérez García"
                        value={persona.nombre}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'nombre', e.target.value)}
                        disabled={loading}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Documento</InputLabel>
                        <Select
                          value={persona.documento}
                          onChange={(e) => handleOtorganteChange('otorgado_por', index, 'documento', e.target.value)}
                          label="Tipo de Documento"
                          disabled={loading}
                        >
                          <MenuItem value="Cédula">Cédula</MenuItem>
                          <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Número de Documento"
                        placeholder="1234567890"
                        value={persona.numero}
                        onChange={(e) => handleOtorganteChange('otorgado_por', index, 'numero', e.target.value)}
                        disabled={loading}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!persona.esRepresentado}
                            onChange={(e) => {
                              handleOtorganteChange('otorgado_por', index, 'esRepresentado', e.target.checked);
                              if (!e.target.checked) {
                                handleOtorganteChange('otorgado_por', index, 'representadoPor', '');
                              }
                            }}
                            disabled={loading}
                          />
                        }
                        label="Es representado por"
                      />
                      
                      {persona.esRepresentado && (
                        <TextField
                          fullWidth
                          label="Nombre del Representante"
                          placeholder="Ej: María González López"
                          value={persona.representadoPor || ''}
                          onChange={(e) => handleOtorganteChange('otorgado_por', index, 'representadoPor', e.target.value)}
                          disabled={loading}
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => removePersona('otorgado_por', index)}
                        disabled={loading}
                      >
                        Eliminar Otorgante
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Grid>

            {/* Beneficiarios */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="secondary">
                  Beneficiarios (Menores Viajando)
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addPersona('a_favor_de')}
                  disabled={loading}
                  color="secondary"
                >
                  Agregar Beneficiario
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Pueden ser varios menores viajando en la misma autorización
              </Typography>

              {formData.otorgantes.a_favor_de.map((persona, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nombre Completo"
                        placeholder="Ej: María Rodríguez López"
                        value={persona.nombre}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'nombre', e.target.value)}
                        disabled={loading}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Documento</InputLabel>
                        <Select
                          value={persona.documento}
                          onChange={(e) => handleOtorganteChange('a_favor_de', index, 'documento', e.target.value)}
                          label="Tipo de Documento"
                          disabled={loading}
                        >
                          <MenuItem value="Cédula">Cédula</MenuItem>
                          <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Número de Documento"
                        placeholder="0987654321"
                        value={persona.numero}
                        onChange={(e) => handleOtorganteChange('a_favor_de', index, 'numero', e.target.value)}
                        disabled={loading}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!persona.esRepresentado}
                            onChange={(e) => {
                              handleOtorganteChange('a_favor_de', index, 'esRepresentado', e.target.checked);
                              if (!e.target.checked) {
                                handleOtorganteChange('a_favor_de', index, 'representadoPor', '');
                              }
                            }}
                            disabled={loading}
                          />
                        }
                        label="Es representado por"
                      />
                      
                      {persona.esRepresentado && (
                        <TextField
                          fullWidth
                          label="Nombre del Representante"
                          placeholder="Ej: Pedro García Morales"
                          value={persona.representadoPor || ''}
                          onChange={(e) => handleOtorganteChange('a_favor_de', index, 'representadoPor', e.target.value)}
                          disabled={loading}
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => removePersona('a_favor_de', index)}
                        disabled={loading}
                      >
                        Eliminar Beneficiario
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

