import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Description as DocumentIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import documentService from '../../services/document-service';

/**
 * Modal para editar información individual de documentos
 * Permite modificar campos específicos antes de agrupar
 */
const EditDocumentModal = ({ 
  open, 
  onClose, 
  document, 
  onDocumentUpdated 
}) => {
  const [formData, setFormData] = useState({
    detalle_documento: '',
    comentarios_recepcion: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientId: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // Cargar datos del documento cuando se abre el modal
  useEffect(() => {
    if (open && document) {
      console.log('📝 EditDocumentModal: Cargando datos del documento:', document.id);
      loadDocumentData();
    }
  }, [open, document]);

  const loadDocumentData = async () => {
    if (!document?.id) return;

    setLoading(true);
    setErrors([]);

    try {
      // Obtener información completa del documento
      const response = await documentService.getEditableDocumentInfo(document.id);
      
      if (response.success) {
        const docData = response.data.document;
        setFormData({
          detalle_documento: docData.detalle_documento || '',
          comentarios_recepcion: docData.comentarios_recepcion || '',
          clientName: docData.clientName || '',
          clientPhone: docData.clientPhone || '',
          clientEmail: docData.clientEmail || '',
          clientId: docData.clientId || ''
        });
        console.log('✅ Datos del documento cargados:', docData);
      } else {
        // Si no existe el endpoint, usar datos básicos del documento
        setFormData({
          detalle_documento: document.detalle_documento || '',
          comentarios_recepcion: document.comentarios_recepcion || '',
          clientName: document.clientName || '',
          clientPhone: document.clientPhone || '',
          clientEmail: document.clientEmail || '',
          clientId: document.clientId || ''
        });
        console.log('📋 Usando datos básicos del documento');
      }
    } catch (error) {
      console.error('Error cargando datos del documento:', error);
      // Fallback: usar datos del prop document
      setFormData({
        detalle_documento: document.detalle_documento || '',
        comentarios_recepcion: document.comentarios_recepcion || '',
        clientName: document.clientName || '',
        clientPhone: document.clientPhone || '',
        clientEmail: document.clientEmail || '',
        clientId: document.clientId || ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]); // Limpiar errores al editar
  };

  const validateForm = () => {
    const validationErrors = [];

    // Validaciones básicas
    if (!formData.clientName.trim()) {
      validationErrors.push('Nombre del cliente es obligatorio');
    }

    // Validación de teléfono (si se proporciona)
    if (formData.clientPhone && !/^09\d{8}$/.test(formData.clientPhone.replace(/\s/g, ''))) {
      validationErrors.push('Teléfono debe tener formato 099999999');
    }

    // Validación de email (si se proporciona)
    if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      validationErrors.push('Email no tiene formato válido');
    }

    return validationErrors;
  };

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
      console.log('💾 Guardando cambios del documento:', document.id, formData);
      
      // Actualizar información del documento
      const response = await documentService.updateDocumentInfo(document.id, formData);
      
      if (response.success) {
        console.log('✅ Documento actualizado exitosamente');
        
        // Notificar al componente padre
        if (onDocumentUpdated) {
          onDocumentUpdated({
            ...document,
            ...formData,
            ...response.data.document // Usar datos actualizados del servidor
          });
        }
        
        onClose();
      } else {
        setErrors([response.message || 'Error actualizando el documento']);
      }
    } catch (error) {
      console.error('Error guardando documento:', error);
      setErrors(['Error de conexión al guardar el documento']);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setErrors([]);
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          overflow: 'hidden'
        }
      }}
    >
      {/* Header */}
      <DialogTitle 
        sx={{ 
          background: 'linear-gradient(135deg, #162840, #17a2b8)',
          color: 'white',
          borderBottom: '3px solid #D4AF37',
          py: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Editar Información del Documento
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          Protocolo: #{document.protocolNumber} | {document.documentType}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Cargando información del documento...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Errores */}
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Información del Documento */}
            <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DocumentIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Detalles del Documento
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Detalle del Documento"
                      value={formData.detalle_documento}
                      onChange={(e) => handleFieldChange('detalle_documento', e.target.value)}
                      placeholder="Descripción específica del trámite o documento"
                      disabled={saving}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Comentarios para Recepción"
                      value={formData.comentarios_recepcion}
                      onChange={(e) => handleFieldChange('comentarios_recepcion', e.target.value)}
                      placeholder="Notas especiales para el personal de recepción"
                      disabled={saving}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Divider sx={{ my: 2 }} />

            {/* Información del Cliente */}
            <Card sx={{ border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Información del Cliente
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Nombre Completo"
                      value={formData.clientName}
                      onChange={(e) => handleFieldChange('clientName', e.target.value)}
                      placeholder="Nombre completo del cliente"
                      disabled={saving}
                      InputProps={{
                        startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Cédula/RUC/ID"
                      value={formData.clientId}
                      onChange={(e) => handleFieldChange('clientId', e.target.value)}
                      placeholder="Identificación del cliente"
                      disabled={saving}
                      InputProps={{
                        startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Teléfono"
                      value={formData.clientPhone}
                      onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
                      placeholder="099999999"
                      disabled={saving}
                      InputProps={{
                        startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email"
                      value={formData.clientEmail}
                      onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                      placeholder="cliente@email.com"
                      disabled={saving}
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={saving}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDocumentModal;