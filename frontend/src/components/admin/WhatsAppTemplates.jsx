import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Switch,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Message as MessageIcon,
  Preview as PreviewIcon,
  Info as InfoIcon,
  SettingsBackupRestore as RestoreIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import adminService from '../../services/admin-service';
import useAuthStore from '../../store/auth-store';
import ConfirmDialog from './ConfirmDialog';

const TEMPLATE_TYPES = [
  { value: 'DOCUMENTO_LISTO', label: 'Documento Listo para Retiro' },
  { value: 'DOCUMENTO_ENTREGADO', label: 'Confirmación de Entrega' }
];

const AVAILABLE_VARIABLES = {
  cliente: 'Nombre del cliente',
  documento: 'Tipo de documento',
  codigo: 'Código de verificación 4 dígitos',
  notaria: 'Nombre de la notaría',
  fecha: 'Fecha actual formateada',
  receptor_nombre: 'Nombre de quien retira',
  receptor_cedula: 'Cédula de quien retira',
  receptor_relacion: 'Relación de quien retira con el titular',
};

const WhatsAppTemplates = () => {
  const { token } = useAuthStore();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  
  const [preview, setPreview] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [initializing, setInitializing] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getWhatsAppTemplates(token);
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar templates');
      toast.error(err.message || 'Error al cargar templates');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleInitializeDefaults = async () => {
    try {
      setInitializing(true);
      const resp = await adminService.initializeWhatsAppTemplates(token);
      if (resp.success) {
        toast.success(resp.message || 'Templates por defecto creados');
      } else {
        toast.info(resp.message || 'Operación completada');
      }
      await loadTemplates();
    } catch (err) {
      toast.error(err.message || 'Error al inicializar templates');
    } finally {
      setInitializing(false);
    }
  };

  const resetForm = () => {
    setCurrentTemplate(null);
    setFormData({
      tipo: 'DOCUMENTO_LISTO',
      titulo: '',
      mensaje: '',
      activo: true
    });
    setFormErrors({});
    setPreview('');
  };

  const handleOpenForm = (template = null) => {
    if (template) {
      setCurrentTemplate(template);
      setFormData({
        id: template.id,
        tipo: template.tipo,
        titulo: template.titulo,
        mensaje: template.mensaje,
        activo: template.activo,
      });
      generatePreview(template.mensaje);
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.titulo?.trim()) errors.titulo = 'El título es obligatorio';
    if (!formData.mensaje?.trim()) errors.mensaje = 'El mensaje es obligatorio';
    
    const malformed = formData.mensaje?.match(/\{[^{}]*$/) || formData.mensaje?.match(/\{[^{}]*[^\w}]/);
    if(malformed){
        errors.mensaje = "Variable mal formada. Use el formato {variable}.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.warning('Por favor, corrija los errores en el formulario');
      return;
    }

    try {
      if (currentTemplate) {
        await adminService.updateWhatsAppTemplate(currentTemplate.id, formData, token);
        toast.success('Template actualizado exitosamente');
      } else {
        await adminService.createWhatsAppTemplate(formData, token);
        toast.success('Template creado exitosamente');
      }
      loadTemplates();
      handleCloseForm();
    } catch (err) {
      toast.error(err.message || 'Error al guardar el template');
    }
  };

  const handleToggleStatus = async (template) => {
    try {
      const newStatus = !template.activo;
      await adminService.toggleWhatsAppTemplate(template.id, newStatus, token);
      toast.success(`Template "${template.titulo}" ${newStatus ? 'activado' : 'desactivado'}.`);
      loadTemplates();
    } catch (err) {
      toast.error(err.message || 'Error al cambiar estado');
    }
  };

  const handleDelete = (template) => {
    setConfirmDialog({
      open: true,
      type: 'error',
      title: 'Eliminar Template',
      message: `¿Está seguro de que quiere eliminar el template "${template.titulo}"?`,
      details: {
        Tipo: template.tipo,
        Estado: template.activo ? 'Activo' : 'Inactivo',
      },
      confirmText: 'Eliminar',
      action: async () => {
        try {
          await adminService.deleteWhatsAppTemplate(template.id, token);
          toast.success('Template eliminado exitosamente');
          loadTemplates();
        } catch (err) {
          toast.error(err.message || 'Error al eliminar el template');
        }
      }
    });
  };

  const generatePreview = useCallback(async (text) => {
    if (!text?.trim()) {
      setPreview('');
      return;
    }
    try {
      setIsPreviewLoading(true);
      const response = await adminService.previewWhatsAppTemplate({ mensaje: text }, token);
      if (response.success) {
        setPreview(response.data.preview);
      }
    } catch (err) {
      // Silently fail preview
      console.error('Error generating preview', err);
    } finally {
        setIsPreviewLoading(false);
    }
  }, [token]);

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (name === 'mensaje') {
      generatePreview(newValue);
    }
  };
  
  const insertVariable = (variable) => {
    const textarea = document.getElementById('mensaje');
    if (!textarea) {
      // Fallback si no se encuentra el textarea
      const newText = `${formData.mensaje || ''}{${variable}}`;
      setFormData(prev => ({...prev, mensaje: newText}));
      generatePreview(newText);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentMessage = formData.mensaje || '';
    
    // Insertar la variable en la posición del cursor
    const newMessage = currentMessage.substring(0, start) + 
                      `{${variable}}` + 
                      currentMessage.substring(end);
    
    setFormData(prev => ({...prev, mensaje: newMessage}));
    generatePreview(newMessage);

    // Restaurar el foco y posicionar el cursor después de la variable insertada
    setTimeout(() => {
      textarea.focus();
      const newCursorPosition = start + `{${variable}}`.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MessageIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Templates WhatsApp
        </Typography>
        <Button
          variant="outlined"
          startIcon={initializing ? <CircularProgress size={16} /> : <RestoreIcon />}
          onClick={handleInitializeDefaults}
          disabled={initializing}
        >
          Restaurar por defecto
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
          Nuevo Template
        </Button>
        <Tooltip title="Actualizar Lista">
          <IconButton onClick={loadTemplates} sx={{ ml: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Mensaje</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }}>Cargando templates...</Typography>
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No hay templates configurados.</Typography>
                    </TableCell>
                </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell sx={{ fontWeight: 'medium' }}>{template.titulo}</TableCell>
                  <TableCell>{TEMPLATE_TYPES.find(t => t.value === template.tipo)?.label || template.tipo}</TableCell>
                  <TableCell>
                    <Tooltip title={template.activo ? 'Desactivar' : 'Activar'}>
                      <Switch
                        checked={template.activo}
                        onChange={() => handleToggleStatus(template)}
                        color="success"
                      />
                    </Tooltip>
                    <Chip
                      label={template.activo ? 'Activo' : 'Inactivo'}
                      color={template.activo ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 400 }}>
                    <Tooltip title={template.mensaje}>
                      <Typography noWrap>
                        {template.mensaje}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton color="primary" onClick={() => handleOpenForm(template)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton color="error" onClick={() => handleDelete(template)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentTemplate ? 'Editar Template' : 'Nuevo Template'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Form Fields */}
            <Grid item xs={12} md={6}>
              <Box component="form" noValidate autoComplete="off">
                 <FormControl fullWidth margin="normal">
                  <InputLabel id="tipo-label">Tipo de Template</InputLabel>
                  <Select
                    labelId="tipo-label"
                    id="tipo"
                    name="tipo"
                    value={formData.tipo || 'DOCUMENTO_LISTO'}
                    onChange={handleFormChange}
                    label="Tipo de Template"
                    disabled={!!currentTemplate}
                  >
                    {TEMPLATE_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  margin="normal"
                  id="titulo"
                  name="titulo"
                  label="Título del Template"
                  value={formData.titulo || ''}
                  onChange={handleFormChange}
                  error={!!formErrors.titulo}
                  helperText={formErrors.titulo}
                  required
                />

                <TextField
                  fullWidth
                  margin="normal"
                  id="mensaje"
                  name="mensaje"
                  label="Mensaje del Template"
                  multiline
                  rows={8}
                  value={formData.mensaje || ''}
                  onChange={handleFormChange}
                  error={!!formErrors.mensaje}
                  helperText={formErrors.mensaje}
                  required
                  sx={{ fontFamily: 'monospace' }}
                />

                <FormControl fullWidth margin="normal">
                    <Typography component="label" sx={{ display: 'flex', alignItems: 'center' }}>
                      <Switch
                        id="activo"
                        name="activo"
                        checked={formData.activo || false}
                        onChange={handleFormChange}
                      />
                      Template activo
                    </Typography>
                </FormControl>

                <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>Variables Disponibles</Typography>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(AVAILABLE_VARIABLES).map(([key, desc]) => (
                            <Tooltip key={key} title={desc}>
                                <Chip
                                    label={`{${key}}`}
                                    onClick={() => insertVariable(key)}
                                    size="small"
                                />
                            </Tooltip>
                        ))}
                     </Box>
                </Box>
              </Box>
            </Grid>

            {/* Preview */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PreviewIcon sx={{ mr: 1 }} />
                Vista Previa del Mensaje
              </Typography>
               <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  backgroundColor: '#e5ddd5', // WhatsApp-like background
                  minHeight: 250,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isPreviewLoading ? (
                    <CircularProgress size={24}/>
                ) : preview ? (
                  <Box
                    sx={{
                      backgroundColor: 'white',
                      p: 1.5,
                      borderRadius: '8px',
                      boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                      alignSelf: 'flex-start',
                      maxWidth: '100%'
                    }}
                  >
                    <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                      {preview}
                    </Typography>
                  </Box>
                ) : (
                   <Box textAlign="center" color="text.secondary">
                        <InfoIcon sx={{fontSize: 40, mb:1}}/>
                        <Typography>Escriba un mensaje para ver la vista previa.</Typography>
                   </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentTemplate ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={() => {
            if(confirmDialog.action) confirmDialog.action();
            setConfirmDialog({ ...confirmDialog, open: false });
        }}
        {...confirmDialog}
      />

    </Box>
  );
};

export default WhatsAppTemplates;
