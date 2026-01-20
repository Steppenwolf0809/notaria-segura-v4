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
  MenuItem,
  Checkbox,
  FormControlLabel,
  CardMedia
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
  Error as ErrorIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  ContentPaste as PasteIcon
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio
} from '@mui/material';
import { updateEscritura, getEstadoInfo } from '../../services/escrituras-qr-service';

const ExtractedDataForm = ({ escritura, onUpdate, onStateChange }) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Estado para importación de texto
  const [openTextImport, setOpenTextImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState('otorgante'); // 'otorgante' | 'beneficiario'

  /**
   * Limpia una lista de personas removiendo entradas con basura
   * (Misma lógica que el backend para consistencia)
   */
  const sanitizePersonas = (personas) => {
    if (!Array.isArray(personas)) return [];

    const palabrasBasura = [
      'DOCUMENTO', 'IDENTIDAD', 'COMPARECIENTE', 'INTERVINIENTE',
      'NOMBRES', 'RAZON SOCIAL', 'DESCONOCIDO', 'CÉDULA', 'CEDULA',
      'TIPO INTERVINIENTE', 'PERSONA QUE', 'NACIONALIDAD', 'CALIDAD',
      'PASAPORTE', 'UBICACIÓN', 'UBICACION', 'PROVINCIA', 'CANTON',
      'PARROQUIA', 'DESCRIPCIÓN', 'DESCRIPCION', 'OBJETO', 'OBSERVACIONES',
      'CUANTÍA', 'CUANTIA', 'CONTRATO', 'OTORGADO POR', 'A FAVOR DE'
    ];

    return personas.filter(persona => {
      if (!persona || !persona.nombre) return false;

      const nombreUpper = String(persona.nombre).toUpperCase().trim();

      // Filtrar si muy corto
      if (nombreUpper.length < 5) return false;

      // Filtrar si contiene palabras basura
      const contieneBasura = palabrasBasura.some(basura =>
        nombreUpper.includes(basura)
      );
      if (contieneBasura) return false;

      // Filtrar si es solo números
      if (/^[\d\s\-\_\.]+$/.test(nombreUpper)) return false;

      // Debe tener al menos 2 palabras
      const palabras = nombreUpper.split(/\s+/).filter(p => p.length > 0);
      if (palabras.length < 2) return false;

      return true;
    });
  };

  /**
   * Inicializa los datos del formulario
   * Maneja datosCompletos tanto como string JSON o como objeto ya parseado
   */
  useEffect(() => {

    if (escritura?.datosCompletos) {
      try {
        let parsed;

        // Si datosCompletos ya es un objeto, usarlo directamente
        if (typeof escritura.datosCompletos === 'object') {
          parsed = escritura.datosCompletos;
        }
        // Si es un string, parsearlo como JSON
        else if (typeof escritura.datosCompletos === 'string') {
          parsed = JSON.parse(escritura.datosCompletos);
        }
        else {
          throw new Error('datosCompletos tiene un formato inesperado');
        }

        // Limpiar otorgantes si existen (aplicar misma lógica que backend)
        if (parsed.otorgantes) {
          const otorgantesLimpios = {
            otorgado_por: sanitizePersonas(parsed.otorgantes.otorgado_por || []),
            a_favor_de: sanitizePersonas(parsed.otorgantes.a_favor_de || [])
          };
          parsed.otorgantes = otorgantesLimpios;
        }

        setFormData(parsed);
        setOriginalData(parsed);
      } catch (e) {
        setError('Error al cargar los datos extraídos');
      }
    } else {
    }
  }, [escritura?.id, escritura?.datosCompletos]);

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
      arr.push({ nombre: '', documento: 'Cédula', numero: '', representadoPor: '' });
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
   * Maneja selección de foto
   */
  const handlePhotoSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('La foto es demasiado grande (máximo 5MB)');
        return;
      }

      setSelectedPhoto(file);

      // Generar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Elimina la foto seleccionada
   */
  const handlePhotoRemove = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  /**
   * Parsea texto pegado (separado por tabs o espacios dobles)
   */
  /**
   * Parsea texto pegado e inteligentemente detecta Otorgantes vs Beneficiarios
   */
  const handleParseImportedText = () => {
    if (!importText.trim()) return;

    const lines = importText.split(/\r?\n/).filter(line => line.trim().length > 0);

    // Arrays temporales para acumular
    const newOtorgantes = [];
    const newBeneficiarios = [];

    lines.forEach(line => {
      // 1. Detectar Rol (Otorgante vs Beneficiario)
      let targetList = null;
      const upperLine = line.toUpperCase();

      // Palabras clave para asignar
      if (upperLine.includes('BENEFICIARI') || upperLine.includes('A FAVOR')) {
        targetList = newBeneficiarios;
      } else if (upperLine.includes('COMPARECIENTE') || upperLine.includes('OTORGANTE') || upperLine.includes('OTORGADO POR')) {
        targetList = newOtorgantes;
      } else {
        // Fallback: usar el tipo seleccionado al abrir el dialog
        targetList = (importType === 'beneficiario') ? newBeneficiarios : newOtorgantes;
      }

      // 2. Parsear la línea (Nombre, ID, Calidad)
      // Regex flexible: Busca ID (10-13 digitos) opcionalmente precedido por tipo doc
      // Todo lo anterior es Nombre, todo los posterior es Calidad
      const idMatch = line.match(/(?:CC|CEDULA|RUC|PASAPORTE)?\s*(\d{10,13}|\d{9}-\d)/i);

      const person = {
        nombre: '',
        documento: 'CÉDULA',
        numero: '',
        nacionalidad: 'ECUATORIANA',
        calidad: 'COMPARECIENTE',
        representadoPor: null
      };

      if (idMatch) {
        // Si encontramos ID, usamos esa posición para dividir
        const idFull = idMatch[0];
        const numberOnly = idMatch[1];
        const index = idMatch.index;

        person.numero = numberOnly;
        person.nombre = line.substring(0, index).trim();

        // Detectar tipo documento mejorado
        if (/RUC/i.test(idFull) || numberOnly.length === 13) {
          person.documento = 'RUC';
        } else if (/PASAPORTE/i.test(idFull) || numberOnly.length < 10 || /[A-Z]/i.test(numberOnly)) {
          // Si es explícitamente pasaporte, o tiene menos de 10 dígitos, o tiene letras
          person.documento = 'Pasaporte';
        } else if (numberOnly.length === 10) {
          person.documento = 'Cédula';
        }

        // El resto es calidad
        const resto = line.substring(index + idFull.length).trim();
        if (resto.length > 2) person.calidad = resto;

      } else {
        // Si no hay ID claro, intentamos separar por tabs/espacios dobles
        const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          person.nombre = parts[0];
          if (parts.length > 1) person.calidad = parts[parts.length - 1];
        }
      }

      // Limpieza final de nombre
      if (person.nombre) {
        // Eliminar posibles basuras al final del nombre si se pegó mal
        person.nombre = person.nombre.replace(/\s+(CC|CEDULA|RUC)$/i, '');
      }

      // Asignar Calidad por defecto según la lista destino si no se detectó
      if (targetList === newBeneficiarios && !person.calidad) person.calidad = 'BENEFICIARIO';

      if (person.nombre && person.nombre.length > 2) {
        targetList.push(person);
      }
    });

    // Actualizar el estado (Fix crash: asegurar que los arrays destino existan)
    setFormData(prev => {
      // Asegurar estructura
      const otorgantesCurrent = prev.otorgantes || { otorgado_por: [], a_favor_de: [] };

      // Safety checks para arrays internos
      const currentOtorgados = Array.isArray(otorgantesCurrent.otorgado_por) ? otorgantesCurrent.otorgado_por : [];
      const currentFavor = Array.isArray(otorgantesCurrent.a_favor_de) ? otorgantesCurrent.a_favor_de : [];

      return {
        ...prev,
        otorgantes: {
          ...otorgantesCurrent,
          otorgado_por: [...currentOtorgados, ...newOtorgantes],
          a_favor_de: [...currentFavor, ...newBeneficiarios]
        }
      };
    });

    setOpenTextImport(false);
    setImportText('');
  };

  /**
   * Guarda los cambios
   */
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const updatedData = {
        datosCompletos: JSON.stringify(formData, null, 2),
        // Actualizar también numeroEscritura si cambió
        numeroEscritura: formData.escritura || formData.numeroEscritura || escritura.numeroEscritura
      };

      // Pasar la foto si se seleccionó una
      const response = await updateEscritura(escritura.id, updatedData, selectedPhoto);

      if (response.success) {
        setOriginalData(formData);
        setEditMode(false);
        setSelectedPhoto(null);
        setPhotoPreview(null);
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
    setSelectedPhoto(null);
    setPhotoPreview(null);
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

        {/* Fotografía del Menor */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Fotografía del Menor (Opcional)"
              subheader="Fotografía para verificación de identidad"
            />
            <CardContent>
              <Grid container spacing={2}>
                {/* Foto actual */}
                {(escritura?.fotoURL || photoPreview) && (
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        {photoPreview ? 'Nueva Foto (Sin Guardar)' : 'Foto Actual'}
                      </Typography>
                      <Card variant="outlined">
                        <CardMedia
                          component="img"
                          image={photoPreview || escritura.fotoURL}
                          alt="Fotografía del menor"
                          sx={{
                            maxHeight: 300,
                            objectFit: 'contain',
                            bgcolor: 'grey.100'
                          }}
                        />
                      </Card>
                      {photoPreview && editMode && (
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={handlePhotoRemove}
                          sx={{ mt: 1 }}
                          size="small"
                        >
                          Cancelar Cambio de Foto
                        </Button>
                      )}
                    </Box>
                  </Grid>
                )}

                {/* Input para nueva foto */}
                {editMode && (
                  <Grid item xs={12} md={escritura?.fotoURL || photoPreview ? 6 : 12}>
                    <Box sx={{
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'grey.50'
                    }}>
                      <PhotoCameraIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        {escritura?.fotoURL ? 'Cambiar Fotografía' : 'Agregar Fotografía'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        JPG, PNG o WEBP (máximo 5MB)
                      </Typography>
                      <input
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        style={{ display: 'none' }}
                        id="photo-upload-button"
                        type="file"
                        onChange={handlePhotoSelect}
                      />
                      <label htmlFor="photo-upload-button">
                        <Button
                          variant="contained"
                          component="span"
                          startIcon={<PhotoCameraIcon />}
                        >
                          Seleccionar Foto
                        </Button>
                      </label>
                    </Box>
                  </Grid>
                )}

                {/* Mensaje si no hay foto */}
                {!editMode && !escritura?.fotoURL && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      No se ha agregado una fotografía para esta escritura.
                      Puedes agregar una usando el botón "Editar datos" arriba.
                    </Alert>
                  </Grid>
                )}
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
          <Card>
            <CardHeader title="Otorgantes y Beneficiarios" />
            <CardContent>
              <Grid container spacing={2}>
                {/* Otorgado por */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Otorgado Por:
                  </Typography>
                  {editMode && (
                    <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => addPersona('otorgado_por')}>
                        Añadir Otorgante
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<PasteIcon />}
                        onClick={() => {
                          setImportType('otorgante');
                          setOpenTextImport(true);
                        }}
                      >
                        Pegar Texto
                      </Button>
                    </Box>
                  )}
                  {formData.otorgantes?.otorgado_por?.map((persona, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1, bgcolor: 'action.hover' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Nombre Completo"
                              value={persona.nombre || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'nombre', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Tipo de Documento</InputLabel>
                              <Select
                                value={persona.documento || 'Cédula'}
                                onChange={(e) => handleOtorganteChange('otorgado_por', index, 'documento', e.target.value)}
                                label="Tipo de Documento"
                                disabled={!editMode}
                              >
                                <MenuItem value="Cédula">Cédula</MenuItem>
                                <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                                <MenuItem value="RUC">RUC</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Número de Documento"
                              value={persona.numero || ''}
                              onChange={(e) => handleOtorganteChange('otorgado_por', index, 'numero', e.target.value)}
                              disabled={!editMode}
                              size="small"
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
                                  disabled={!editMode}
                                  size="small"
                                />
                              }
                              label="Es representado por"
                            />
                            {persona.esRepresentado && (
                              <TextField
                                fullWidth
                                label="Nombre del Representante"
                                value={persona.representadoPor || ''}
                                onChange={(e) => handleOtorganteChange('otorgado_por', index, 'representadoPor', e.target.value)}
                                disabled={!editMode}
                                size="small"
                                sx={{ mt: 1 }}
                              />
                            )}
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
                    <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => addPersona('a_favor_de')}>
                        Añadir Beneficiario
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<PasteIcon />}
                        onClick={() => {
                          setImportType('beneficiario');
                          setOpenTextImport(true);
                        }}
                      >
                        Pegar Texto
                      </Button>
                    </Box>
                  )}
                  {formData.otorgantes?.a_favor_de?.map((persona, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1, bgcolor: 'action.hover' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Nombre Completo"
                              value={persona.nombre || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'nombre', e.target.value)}
                              disabled={!editMode}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Tipo de Documento</InputLabel>
                              <Select
                                value={persona.documento || 'Cédula'}
                                onChange={(e) => handleOtorganteChange('a_favor_de', index, 'documento', e.target.value)}
                                label="Tipo de Documento"
                                disabled={!editMode}
                              >
                                <MenuItem value="Cédula">Cédula</MenuItem>
                                <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                                <MenuItem value="RUC">RUC</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Número de Documento"
                              value={persona.numero || ''}
                              onChange={(e) => handleOtorganteChange('a_favor_de', index, 'numero', e.target.value)}
                              disabled={!editMode}
                              size="small"
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
                                  disabled={!editMode}
                                  size="small"
                                />
                              }
                              label="Es representado por"
                            />
                            {persona.esRepresentado && (
                              <TextField
                                fullWidth
                                label="Nombre del Representante"
                                value={persona.representadoPor || ''}
                                onChange={(e) => handleOtorganteChange('a_favor_de', index, 'representadoPor', e.target.value)}
                                disabled={!editMode}
                                size="small"
                                sx={{ mt: 1 }}
                              />
                            )}
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
            </CardContent>
          </Card>
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
      {/* Modal para importar texto */}
      <Dialog open={openTextImport} onClose={() => setOpenTextImport(false)} maxWidth="md" fullWidth>
        <DialogTitle>Importar Personas desde Texto</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Pegue el texto copiado (ej. desde Word/Excel). El sistema intentará separar columnas por espacios dobles o tabulaciones.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Formato ideal: <b>NOMBRE</b> [espacio] <b>CC/RUC</b> [espacio] <b>NÚMERO</b> [espacio] <b>CALIDAD</b>
            </Alert>
            {/* RadioButtons ocultos - El sistema detecta automáticamente o usa el contexto del botón presionado */}
            {/* 
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
              >
                <FormControlLabel value="otorgante" control={<Radio />} label="Otorgantes" />
                <FormControlLabel value="beneficiario" control={<Radio />} label="Beneficiarios" />
              </RadioGroup>
            </FormControl> 
            */}
          </Box>
          <TextField
            autoFocus
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            placeholder={`Ejemplo:\nJUAN PEREZ    CC 1712345678    COMPARECIENTE\nMARIA LOPEZ   CC 1787654321    COMPARECIENTE`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTextImport(false)}>Cancelar</Button>
          <Button onClick={handleParseImportedText} variant="contained" disabled={!importText.trim()}>
            Procesar e Importar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExtractedDataForm;
