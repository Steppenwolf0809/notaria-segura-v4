import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Phone as PhoneIcon,
  Description as DescriptionIcon,
  Comment as CommentIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import documentService from '../../services/document-service';

/**
 * Modal de edición de información de documentos
 * CONSERVADOR: Reutiliza componentes existentes de Material-UI
 * EDUCATIVO: Incluye explicaciones y validaciones claras
 */
const DocumentEditModal = ({ 
  open, 
  onClose, 
  document, 
  onDocumentUpdated 
}) => {
  // Estados para el formulario
  const [formData, setFormData] = useState({});
  const [initialData, setInitialData] = useState({});
  const [editableFields, setEditableFields] = useState([]);
  const [readOnlyInfo, setReadOnlyInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar información editable al abrir el modal
  useEffect(() => {
    if (open && document?.id) {
      loadEditableInfo();
    }
  }, [open, document?.id]);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (Object.keys(initialData).length > 0 && Object.keys(formData).length > 0) {
      // Comparar valores iniciales con valores actuales
      const hasRealChanges = editableFields.some(field => {
        const initial = initialData[field] || '';
        const current = formData[field] || '';
        return initial !== current;
      });
      
      setHasChanges(hasRealChanges);
    }
  }, [formData, initialData, editableFields]);

  /**
   * Cargar información editable del documento
   */
  const loadEditableInfo = async () => {
    setLoading(true);
    setErrors([]);
    
    try {
      const response = await documentService.getEditableDocumentInfo(document.id);
      
      if (response.success) {
        const { currentValues, editableFields: fields, readOnlyInfo: readOnly } = response.data;
        setFormData(currentValues);
        setInitialData(currentValues); // Guardar valores iniciales para comparación
        setEditableFields(fields);
        setReadOnlyInfo(readOnly);
      } else {
        setErrors([response.message || 'Error al cargar información editable']);
      }
    } catch (error) {
      setErrors(['Error de conexión al cargar la información']);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar cambios en los campos del formulario
   */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]); // Limpiar errores al editar
  };

  /**
   * Validar formulario antes de enviar
   */
  const validateForm = () => {
    const validationErrors = [];

    // Validar teléfono si está presente
    if (formData.clientPhone && !/^[0-9+\-\s]{7,15}$/.test(formData.clientPhone)) {
      validationErrors.push('Formato de teléfono inválido (7-15 dígitos)');
    }

    // Validar longitudes máximas
    if (formData.detalle_documento && formData.detalle_documento.length > 500) {
      validationErrors.push('Detalle muy largo (máximo 500 caracteres)');
    }

    if (formData.comentarios_recepcion && formData.comentarios_recepcion.length > 300) {
      validationErrors.push('Comentarios muy largos (máximo 300 caracteres)');
    }

    // Validar nombre del cliente
    if (formData.clientName && (!formData.clientName.trim() || formData.clientName.trim().length < 2)) {
      validationErrors.push('Nombre del cliente debe tener al menos 2 caracteres');
    }

    return validationErrors;
  };

  /**
   * Guardar cambios
   */
  const handleSave = async () => {
    // Validar formulario
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      const response = await documentService.updateDocumentInfo(document.id, formData);
      
      if (response.success) {
        // Resetear estado de cambios ya que se guardó exitosamente
        setHasChanges(false);
        
        // Notificar al componente padre
        if (onDocumentUpdated) {
          onDocumentUpdated(response.data);
        }
        
        // Cerrar modal sin confirmación
        resetForm();
        onClose();
        
        // Opcional: mostrar mensaje de éxito
        // Se puede implementar con un snackbar global
      } else {
        setErrors(Array.isArray(response.errors) ? response.errors : [response.message]);
      }
    } catch (error) {
      setErrors(['Error de conexión al guardar los cambios']);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Cerrar modal con confirmación si hay cambios
   */
  const handleClose = () => {
    // Si está guardando, no permitir cerrar
    if (saving) {
      return;
    }
    
    // Si hay cambios no guardados, pedir confirmación
    if (hasChanges) {
      if (window.confirm('¿Descartar los cambios realizados?')) {
        resetForm();
        onClose();
      }
      // Si el usuario cancela, no hacer nada (mantener modal abierto)
    } else {
      // No hay cambios, cerrar directamente
      resetForm();
      onClose();
    }
  };

  /**
   * Resetear formulario
   */
  const resetForm = () => {
    setFormData({});
    setInitialData({});
    setEditableFields([]);
    setReadOnlyInfo({});
    setErrors([]);
    setHasChanges(false);
  };

  /**
   * Obtener el ícono para cada campo
   */
  const getFieldIcon = (field) => {
    const icons = {
      clientPhone: <PhoneIcon />,
      clientName: <PersonIcon />,
      detalle_documento: <DescriptionIcon />,
      comentarios_recepcion: <CommentIcon />
    };
    return icons[field] || <EditIcon />;
  };

  /**
   * Obtener la etiqueta para cada campo
   */
  const getFieldLabel = (field) => {
    const labels = {
      clientPhone: 'Teléfono',
      clientName: 'Nombre del Cliente',
      detalle_documento: 'Detalle Específico',
      comentarios_recepcion: 'Comentarios para Recepción'
    };
    return labels[field] || field;
  };

  /**
   * Obtener el placeholder para cada campo
   */
  const getFieldPlaceholder = (field) => {
    const placeholders = {
      clientPhone: 'Ej: 0999123456',
      clientName: 'Nombre completo del cliente',
      detalle_documento: 'Descripción específica del trámite',
      comentarios_recepcion: 'Notas especiales para recepción'
    };
    return placeholders[field] || '';
  };

  /**
   * Obtener el helper text para cada campo
   */
  const getFieldHelperText = (field) => {
    const helpers = {
      clientPhone: 'Número para notificaciones WhatsApp',
      clientName: 'Nombre que aparecerá en el documento',
      detalle_documento: 'Información adicional sobre el trámite',
      comentarios_recepcion: 'Instrucciones especiales para la entrega'
    };
    return helpers[field] || '';
  };

  if (!document) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="document-edit-title"
    >
      <DialogTitle id="document-edit-title">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6">
              Editar Información del Documento
            </Typography>
          </Box>
          <IconButton 
            onClick={handleClose} 
            size="small"
            disabled={saving}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {/* Información del documento (solo lectura) */}
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'grey.50',
              borderRadius: 1,
              border: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : 'none'
            }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                📄 Información del Documento
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Número:</strong> {document.protocolNumber}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {document.documentType}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Estado:</strong> 
                    <Chip 
                      label={document.status} 
                      size="small" 
                      sx={{ ml: 1 }} 
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Valor:</strong> ${readOnlyInfo.totalFactura || 0} {/* ⭐ CAMBIO: Usar valor total de factura */}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Errores */}
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Campos editables */}
            <Grid container spacing={3}>
              {editableFields.map((field) => (
                <Grid item xs={12} key={field}>
                  <TextField
                    fullWidth
                    label={getFieldLabel(field)}
                    placeholder={getFieldPlaceholder(field)}
                    helperText={getFieldHelperText(field)}
                    value={formData[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    multiline={field.includes('detalle') || field.includes('comentarios')}
                    rows={field.includes('detalle') ? 3 : field.includes('comentarios') ? 2 : 1}
                    maxRows={5}
                    disabled={saving}
                    InputProps={{
                      startAdornment: getFieldIcon(field)
                    }}
                    inputProps={{
                      maxLength: field === 'detalle_documento' ? 500 : 
                                field === 'comentarios_recepcion' ? 300 : 
                                field === 'clientName' ? 100 : 15
                    }}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Mensaje informativo */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                💡 <strong>Información importante:</strong>
                <br />
                • Solo puedes editar los campos permitidos según tu rol
                • Los cambios se registran en el historial del documento
                • El teléfono actualizado se usará para notificaciones WhatsApp
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={saving}
          variant="outlined"
          startIcon={<CancelIcon />}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || saving || !hasChanges || editableFields.length === 0}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentEditModal;