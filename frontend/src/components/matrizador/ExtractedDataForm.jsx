/**
 * Componente ExtractedDataForm
 * Permite editar y validar datos extraídos del PDF
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { updateEscritura, getEstadoInfo } from '../../services/escrituras-qr-service';

const ExtractedDataForm = ({ escritura, onUpdate, onStateChange }) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});

  /**
   * Inicializa los datos del formulario
   * Maneja datosCompletos tanto como string JSON o como objeto ya parseado
   */
  useEffect(() => {
    console.log('[ExtractedDataForm] Cargando datos de escritura:', escritura?.id);
    
    if (escritura?.datosCompletos) {
      try {
        let parsed;
        
        // Si datosCompletos ya es un objeto, usarlo directamente
        if (typeof escritura.datosCompletos === 'object') {
          parsed = escritura.datosCompletos;
          console.log('[ExtractedDataForm] datosCompletos ya parseado como objeto');
        } 
        // Si es un string, parsearlo como JSON
        else if (typeof escritura.datosCompletos === 'string') {
          parsed = JSON.parse(escritura.datosCompletos);
          console.log('[ExtractedDataForm] datosCompletos parseado desde string');
        }
        else {
          throw new Error('datosCompletos tiene un formato inesperado');
        }
        
        setFormData(parsed);
        setOriginalData(parsed);
        console.log('[ExtractedDataForm] Datos cargados exitosamente:', {
          acto: parsed.acto?.substring(0, 30) + '...',
          numeroEscritura: parsed.escritura,
          cuantia: parsed.cuantia
        });
      } catch (e) {
        console.error('[ExtractedDataForm] Error parsing datos completos:', e);
        setError('Error al cargar los datos extraídos');
      }
    } else {
      console.warn('[ExtractedDataForm] No hay datosCompletos en la escritura');
    }
  }, [escritura]);

  /**
   * Maneja cambios en los campos del formulario
   */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Maneja cambios en campos anidados (ej: ubicacion.provincia)
   */
  const handleNestedFieldChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }));
  };

  /**
   * Maneja cambios en arrays de otorgantes
   */
  const handleOtorganteChange = (type, index, field, value) => {
    setFormData(prev => {
      const safe = { ...(prev || {}) };
      const otorg = { ...(safe.otorgantes || {}) };
      const arr = Array.isArray(otorg[type]) ? [...otorg[type]] : [];
      arr[index] = { ...(arr[index] || {}), [field]: value };
      otorg[type] = arr;
      safe.otorgantes = otorg;
      return safe;
    });
  };

  const addPersona = (type) => {
    setFormData(prev => {
      const safe = { ...(prev || {}) };
      const otorg = { ...(safe.otorgantes || {}) };
      const arr = Array.isArray(otorg[type]) ? [...otorg[type]] : [];
      arr.push({ nombre: '', documento: '', numero: '', nacionalidad: '', calidad: '' });
      otorg[type] = arr;
      safe.otorgantes = otorg;
      return safe;
    });
  };

  const removePersona = (type, index) => {
    setFormData(prev => {
      const safe = { ...(prev || {}) };
      const otorg = { ...(safe.otorgantes || {}) };
      const arr = Array.isArray(otorg[type]) ? [...otorg[type]] : [];
      arr.splice(index, 1);
      otorg[type] = arr;
      safe.otorgantes = otorg;
      return safe;
    });
  };

  /**
   * Guarda los cambios
   */
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const updatedData = {
        datosCompletos: JSON.stringify(formData, null, 2)
      };

      const response = await updateEscritura(escritura.id, updatedData);
      
      if (response.success) {
        setOriginalData(formData);
        setEditMode(false);
        if (onUpdate) {
          onUpdate(response.data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela la edición
   */
  const handleCancel = () => {
    setFormData(originalData);
    setEditMode(false);
    setError(null);
  };

  /**
   * Cambia el estado de la escritura
   */
  const handleStateChange = async (newState) => {
    setLoading(true);
    setError(null);

    try {
      const response = await updateEscritura(escritura.id, { estado: newState });
      
      if (response.success && onStateChange) {
        onStateChange(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copia datos al portapapeles
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Mostrar notificación de éxito
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const estadoInfo = getEstadoInfo(escritura?.estado);

  return (
    <Box>
      {/* Header con estado y acciones */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              Datos Extraídos
            </Typography>
            <Chip
              label={estadoInfo.label}
              color={estadoInfo.color}
              size="small"
              icon={
                escritura?.estado === 'activo' ? <CheckIcon /> :
                escritura?.estado === 'revision_requerida' ? <WarningIcon /> :
                <ErrorIcon />
              }
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {!editMode ? (
              <>
                <Tooltip title="Editar datos">
                  <IconButton onClick={() => setEditMode(true)} disabled={loading}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={showRawData ? 'Ocultar JSON' : 'Ver JSON'}>
                  <IconButton onClick={() => setShowRawData(!showRawData)}>
                    {showRawData ? <VisibilityOffIcon /> : <ViewIcon />}
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={loading}
                  size="small"
                >
                  Guardar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                  size="small"
                >
                  Cancelar
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Acciones de estado */}
        {escritura?.estado !== 'activo' && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => handleStateChange('activo')}
              disabled={loading}
            >
              Aprobar
            </Button>
            {escritura?.estado !== 'revision_requerida' && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={() => handleStateChange('revision_requerida')}
                disabled={loading}
              >
                Marcar para Revisión
              </Button>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Datos extraídos en formato de formulario */}
      <Grid container spacing={2}>
        {/* Información básica */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Información Básica" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Número de Escritura"
                    value={formData.escritura || ''}
                    onChange={(e) => handleFieldChange('escritura', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Acto/Contrato"
                    value={formData.acto || ''}
                    onChange={(e) => handleFieldChange('acto', e.target.value)}
                    disabled={!editMode}
                    multiline
                    rows={2}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Fecha de Otorgamiento"
                    value={formData.fecha_otorgamiento || ''}
                    onChange={(e) => handleFieldChange('fecha_otorgamiento', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cuantía"
                    value={formData.cuantia || ''}
                    onChange={(e) => handleFieldChange('cuantia', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Información del notario */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Información Notarial" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notario"
                    value={formData.notario || ''}
                    onChange={(e) => handleFieldChange('notario', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notaría"
                    value={formData.notaria || ''}
                    onChange={(e) => handleFieldChange('notaria', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Ubicación */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Ubicación" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Provincia"
                    value={formData.ubicacion?.provincia || ''}
                    onChange={(e) => handleNestedFieldChange('ubicacion', 'provincia', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Cantón"
                    value={formData.ubicacion?.canton || ''}
                    onChange={(e) => handleNestedFieldChange('ubicacion', 'canton', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Parroquia"
                    value={formData.ubicacion?.parroquia || ''}
                    onChange={(e) => handleNestedFieldChange('ubicacion', 'parroquia', e.target.value)}
                    disabled={!editMode}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Otorgantes */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Otorgantes y Beneficiarios</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Otorgado por */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Otorgado Por:
                  </Typography>
                  {editMode && (
                    <Box sx={{ mb: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => addPersona('otorgado_por')}>
                        Añadir Otorgante
                      </Button>
                    </Box>
                  )}
                  {formData.otorgantes?.otorgado_por?.map((persona, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Nombre"
                              value={persona.nombre || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'nombre', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Documento"
                              value={persona.documento || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'documento', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Número"
                              value={persona.numero || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'numero', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Nacionalidad"
                              value={persona.nacionalidad || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'nacionalidad', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Calidad"
                              value={persona.calidad || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'calidad', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          {editMode && (
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button color="error" size="small" onClick={() => removePersona('otorgado_por', index)}>
                                  Eliminar
                                </Button>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Grid>

                {/* A favor de */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    A Favor De:
                  </Typography>
                  {editMode && (
                    <Box sx={{ mb: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => addPersona('a_favor_de')}>
                        Añadir Beneficiario
                      </Button>
                    </Box>
                  )}
                  {formData.otorgantes?.a_favor_de?.map((persona, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Nombre"
                              value={persona.nombre || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'nombre', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Documento"
                              value={persona.documento || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'documento', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Número"
                              value={persona.numero || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'numero', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Nacionalidad"
                              value={persona.nacionalidad || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'nacionalidad', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Calidad"
                              value={persona.calidad || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'calidad', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          {editMode && (
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button color="error" size="small" onClick={() => removePersona('a_favor_de', index)}>
                                  Eliminar
                                </Button>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Vista JSON cruda */}
        {showRawData && (
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Datos JSON Completos"
                action={
                  <Tooltip title="Copiar JSON">
                    <IconButton onClick={() => copyToClipboard(JSON.stringify(formData, null, 2))}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  value={JSON.stringify(formData, null, 2)}
                  onChange={(e) => {
                    if (editMode) {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData(parsed);
                      } catch (err) {
                        // Mantener el texto para que el usuario pueda corregir
                      }
                    }
                  }}
                  disabled={!editMode}
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Objeto / Observaciones */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Objeto / Observaciones" />
          <CardContent>
            <TextField
              fullWidth
              multiline
              minRows={4}
              maxRows={12}
              label="Descripción"
              value={formData.objeto_observaciones || ''}
              onChange={(e) => handleFieldChange('objeto_observaciones', e.target.value)}
              disabled={!editMode}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Texto Completo del Extracto (si existe) */}
      {escritura?.extractoTextoCompleto && (
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Texto Completo del Extracto</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                multiline
                rows={15}
                value={escritura.extractoTextoCompleto}
                InputProps={{
                  readOnly: true,
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    bgcolor: 'grey.50'
                  }
                }}
                variant="outlined"
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
      )}

      {/* Badge de origen */}
      {escritura?.origenDatos === 'MANUAL' && (
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Ingreso Manual:</strong> Esta escritura fue ingresada manualmente por{' '}
              {escritura.creador ? `${escritura.creador.firstName} ${escritura.creador.lastName}` : 'un usuario'}.
            </Typography>
          </Alert>
        </Grid>
      )}

      {/* Información adicional */}
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Instrucciones:</strong> Revisa y corrige los datos extraídos automáticamente. 
            Los campos críticos son: número de escritura, acto y fecha de otorgamiento.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default ExtractedDataForm;
