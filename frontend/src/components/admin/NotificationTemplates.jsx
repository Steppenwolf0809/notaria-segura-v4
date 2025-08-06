import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Edit as TemplatesIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Code as VariableIcon,
  Visibility as ViewIcon,
  Send as TestIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/auth-store';

/**
 * Editor de plantillas de notificaciones WhatsApp
 * Permite crear, editar y gestionar plantillas con variables dinámicas
 */
const NotificationTemplates = () => {
  const { token } = useAuthStore();

  // Estado de datos
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado de formulario
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    subject: '',
    content: '',
    variables: [],
    isActive: true
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Variables disponibles por tipo
  const availableVariables = {
    DOCUMENT_READY: [
      { key: 'clientName', label: 'Nombre del Cliente', example: 'Juan Pérez' },
      { key: 'protocolNumber', label: 'Número de Protocolo', example: 'P-2024-001' },
      { key: 'documentType', label: 'Tipo de Documento', example: 'Escritura Pública' },
      { key: 'verificationCode', label: 'Código de Verificación', example: '1234' },
      { key: 'matrizadorName', label: 'Matrizador', example: 'Dr. Ana García' }
    ],
    GROUP_READY: [
      { key: 'clientName', label: 'Nombre del Cliente', example: 'Juan Pérez' },
      { key: 'documentsCount', label: 'Cantidad de Documentos', example: '3' },
      { key: 'groupCode', label: 'Código del Grupo', example: 'GRP-001' },
      { key: 'verificationCode', label: 'Código de Verificación', example: '1234' }
    ],
    DOCUMENT_DELIVERED: [
      { key: 'clientName', label: 'Nombre del Cliente', example: 'Juan Pérez' },
      { key: 'protocolNumber', label: 'Número de Protocolo', example: 'P-2024-001' },
      { key: 'deliveredAt', label: 'Fecha de Entrega', example: '15/03/2024' },
      { key: 'deliveredTo', label: 'Entregado a', example: 'Juan Pérez' }
    ],
    REMINDER: [
      { key: 'clientName', label: 'Nombre del Cliente', example: 'Juan Pérez' },
      { key: 'protocolNumber', label: 'Número de Protocolo', example: 'P-2024-001' },
      { key: 'daysPending', label: 'Días Pendientes', example: '5' },
      { key: 'verificationCode', label: 'Código de Verificación', example: '1234' }
    ]
  };

  /**
   * Cargar plantillas de notificaciones
   */
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/admin/notifications/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplates(data.data.templates);
        }
      } else {
        throw new Error('Error al cargar plantillas');
      }
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      setError(error.message || 'Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [token]);

  /**
   * Manejar cambios en el formulario
   */
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Abrir formulario para nueva plantilla
   */
  const openNewTemplateForm = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: '',
      subject: '',
      content: '',
      variables: [],
      isActive: true
    });
    setShowForm(true);
  };

  /**
   * Abrir formulario para editar plantilla
   */
  const openEditTemplateForm = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || '',
      type: template.type || '',
      subject: template.subject || '',
      content: template.content || '',
      variables: template.variables || [],
      isActive: template.isActive !== false
    });
    setShowForm(true);
  };

  /**
   * Guardar plantilla
   */
  const saveTemplate = async () => {
    try {
      if (!formData.name || !formData.type || !formData.content) {
        toast.error('Completa todos los campos obligatorios');
        return;
      }

      const url = editingTemplate 
        ? `http://localhost:3001/api/admin/notifications/templates/${editingTemplate.id}`
        : 'http://localhost:3001/api/admin/notifications/templates';

      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingTemplate ? 'Plantilla actualizada' : 'Plantilla creada');
        loadTemplates();
        setShowForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar plantilla');
      }
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      toast.error(error.message || 'Error al guardar la plantilla');
    }
  };

  /**
   * Eliminar plantilla
   */
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/admin/notifications/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Plantilla eliminada');
        loadTemplates();
      } else {
        throw new Error('Error al eliminar plantilla');
      }
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      toast.error('Error al eliminar la plantilla');
    }
  };

  /**
   * Vista previa de plantilla
   */
  const previewTemplate = (template) => {
    let content = template.content;
    
    // Reemplazar variables con datos de ejemplo
    const variables = availableVariables[template.type] || [];
    variables.forEach(variable => {
      const placeholder = `{${variable.key}}`;
      content = content.replace(new RegExp(placeholder, 'g'), variable.example);
    });

    setPreviewData({
      ...template,
      content,
      originalContent: template.content
    });
    setShowPreview(true);
  };

  /**
   * Enviar plantilla de prueba
   */
  const sendTestNotification = async (template) => {
    const testPhone = prompt('Ingresa el número de teléfono para la prueba (formato: +593999999999):');
    
    if (!testPhone) return;

    try {
      const response = await fetch('http://localhost:3001/api/admin/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: template.id,
          testPhone,
          testData: {
            clientName: 'Cliente Prueba',
            protocolNumber: 'TEST-001',
            documentType: 'Documento de Prueba',
            verificationCode: '0000'
          }
        })
      });

      if (response.ok) {
        toast.success('Notificación de prueba enviada');
      } else {
        throw new Error('Error al enviar notificación de prueba');
      }
    } catch (error) {
      console.error('Error enviando prueba:', error);
      toast.error('Error al enviar la notificación de prueba');
    }
  };

  /**
   * Insertar variable en el contenido
   */
  const insertVariable = (variableKey) => {
    const textarea = document.getElementById('template-content');
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = formData.content.substring(0, cursorPos);
      const textAfter = formData.content.substring(cursorPos);
      const newContent = textBefore + `{${variableKey}}` + textAfter;
      
      handleFormChange('content', newContent);
      
      // Restaurar cursor después de la inserción
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos + variableKey.length + 2, cursorPos + variableKey.length + 2);
      }, 0);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <TemplatesIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1">
            Plantillas de Notificación
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openNewTemplateForm}
        >
          Nueva Plantilla
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de plantillas */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Última Modificación</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Cargando plantillas...
                    </TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No hay plantillas configuradas
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {template.name}
                        </Typography>
                        {template.subject && (
                          <Typography variant="caption" color="text.secondary">
                            {template.subject}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={template.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={template.isActive ? 'Activa' : 'Inactiva'}
                          size="small"
                          color={template.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {template.updatedAt ? 
                            new Date(template.updatedAt).toLocaleDateString('es-ES') :
                            'N/A'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver vista previa">
                            <IconButton
                              size="small"
                              onClick={() => previewTemplate(template)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => openEditTemplateForm(template)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Enviar prueba">
                            <IconButton
                              size="small"
                              onClick={() => sendTestNotification(template)}
                              color="info"
                            >
                              <TestIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => deleteTemplate(template.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modal de formulario */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Información básica */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nombre de la Plantilla"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                margin="dense"
                required
              />
              
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Tipo de Notificación</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleFormChange('type', e.target.value)}
                  label="Tipo de Notificación"
                >
                  <MenuItem value="DOCUMENT_READY">Documento Listo</MenuItem>
                  <MenuItem value="GROUP_READY">Grupo de Documentos Listo</MenuItem>
                  <MenuItem value="DOCUMENT_DELIVERED">Documento Entregado</MenuItem>
                  <MenuItem value="REMINDER">Recordatorio</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Asunto (opcional)"
                value={formData.subject}
                onChange={(e) => handleFormChange('subject', e.target.value)}
                margin="dense"
              />

              <TextField
                id="template-content"
                fullWidth
                label="Contenido del Mensaje"
                value={formData.content}
                onChange={(e) => handleFormChange('content', e.target.value)}
                margin="dense"
                multiline
                rows={8}
                required
                helperText="Usa {nombreVariable} para insertar variables dinámicas"
              />
            </Grid>

            {/* Variables disponibles */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Variables Disponibles
              </Typography>
              
              {formData.type && (
                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <List dense>
                      {availableVariables[formData.type]?.map((variable) => (
                        <ListItem 
                          key={variable.key}
                          button
                          onClick={() => insertVariable(variable.key)}
                          sx={{ px: 1, py: 0.5 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <VariableIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight="medium">
                                {`{${variable.key}}`}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {variable.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Ej: {variable.example}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {!formData.type && (
                <Alert severity="info">
                  Selecciona un tipo de notificación para ver las variables disponibles
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
          <Button
            onClick={saveTemplate}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de vista previa */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Vista Previa - {previewData?.name}
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tipo: {previewData.type}
              </Typography>
              
              {previewData.subject && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Asunto:
                  </Typography>
                  <Typography variant="body1">
                    {previewData.subject}
                  </Typography>
                </Box>
              )}

              <Typography variant="subtitle2" color="text.secondary">
                Mensaje con variables reemplazadas:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                  {previewData.content}
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary">
                Plantilla original:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Typography 
                  variant="body2" 
                  fontFamily="monospace"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {previewData.originalContent}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Cerrar
          </Button>
          {previewData && (
            <Button
              onClick={() => sendTestNotification(previewData)}
              variant="contained"
              startIcon={<TestIcon />}
            >
              Enviar Prueba
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationTemplates;