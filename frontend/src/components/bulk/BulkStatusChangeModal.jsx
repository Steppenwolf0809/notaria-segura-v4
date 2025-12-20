import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  IconButton,
  TextField,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Send as SendIcon,
  Description as DocumentIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * Modal de confirmación para cambios de estado masivos
 * Muestra lista de documentos afectados y opciones específicas por transición
 */
const BulkStatusChangeModal = ({
  open,
  onClose,
  documents = [],
  fromStatus,
  toStatus,
  onConfirm,
  loading = false
}) => {
  const [sendNotifications, setSendNotifications] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Estado para formulario de entrega
  const [deliveryData, setDeliveryData] = useState({
    entregadoA: '',
    cedulaReceptor: '',
    relacionTitular: 'titular',
    observaciones: ''
  });
  const [errors, setErrors] = useState({});

  // Resetear form al abrir
  React.useEffect(() => {
    if (open && documents.length > 0) {
      // Intentar pre-llenar con el nombre del cliente del primer documento
      const firstClient = documents[0]?.clientName || '';
      setDeliveryData(prev => ({
        ...prev,
        entregadoA: firstClient,
        cedulaReceptor: '',
        relacionTitular: 'titular',
        observaciones: ''
      }));
      setErrors({});
    }
  }, [open, documents]);

  const handleDeliveryChange = (field) => (event) => {
    setDeliveryData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Limpiar error al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Configuración específica por tipo de transición
  const transitionConfig = useMemo(() => {
    const configs = {
      'EN_PROCESO->LISTO': {
        title: 'Marcar Como Listo',
        description: 'Los documentos serán marcados como listos para entrega',
        icon: <CheckIcon sx={{ color: 'success.main' }} />,
        color: 'success',
        actionLabel: 'Marcar Como Listo',
        showNotificationOption: true,
        successMessage: 'Se generarán códigos de verificación y se enviarán notificaciones WhatsApp automáticamente.'
      },
      'AGRUPADO->LISTO': {
        title: 'Marcar Grupo Como Listo',
        description: 'El grupo de documentos será marcado como listo para entrega',
        icon: <SendIcon sx={{ color: 'success.main' }} />,
        color: 'success',
        actionLabel: 'Marcar Como Listo',
        showNotificationOption: true,
        successMessage: 'Se mantendrá la agrupación y se enviarán notificaciones WhatsApp con el código compartido.'
      },
      'AGRUPADO->EN_PROCESO': {
        title: 'Regresar a En Proceso',
        description: 'Los documentos regresarán al estado En Proceso',
        icon: <WarningIcon sx={{ color: 'warning.main' }} />,
        color: 'warning',
        actionLabel: 'Regresar a En Proceso',
        showNotificationOption: false,
        warningMessage: 'Esta acción deshará la agrupación y los documentos volverán a estar en proceso individual.'
      },
      'LISTO->ENTREGADO': {
        title: 'Entregar Documentos',
        description: 'Registrar entrega de documentos al cliente',
        icon: <SendIcon sx={{ color: 'primary.main' }} />,
        color: 'primary',
        actionLabel: 'Confirmar Entrega',
        showNotificationOption: true,
        showDeliveryForm: true,
        successMessage: 'Se registrará la entrega y la hora exacta en el sistema.'
      },
      'AGRUPADO->ENTREGADO': {
        title: 'Entregar Grupo',
        description: 'Registrar entrega del grupo de documentos',
        icon: <SendIcon sx={{ color: 'primary.main' }} />,
        color: 'primary',
        actionLabel: 'Confirmar Entrega',
        showNotificationOption: true,
        showDeliveryForm: true,
        successMessage: 'Se registrará la entrega de todo el grupo.'
      }
    };

    const key = `${fromStatus}->${toStatus}`;
    return configs[key] || {
      title: `Cambiar a ${toStatus}`,
      description: `Cambiar documentos de ${fromStatus} a ${toStatus}`,
      icon: <InfoIcon />,
      color: 'primary',
      actionLabel: 'Confirmar',
      showNotificationOption: false
    };
  }, [fromStatus, toStatus]);

  const handleConfirm = async () => {
    setExecuting(true);
    try {
      const payload = {
        sendNotifications: transitionConfig.showNotificationOption ? sendNotifications : false,
        fromStatus,
        toStatus
      };

      // Si es entrega, validar y agregar datos
      if (transitionConfig.showDeliveryForm) {
        if (!deliveryData.entregadoA.trim()) {
          setErrors({ entregadoA: 'El nombre es obligatorio' });
          setExecuting(false);
          return;
        }

        // Agregar datos de entrega al payload
        Object.assign(payload, {
          deliveredTo: deliveryData.entregadoA, // Nombre estandarizado para backend
          receptorName: deliveryData.entregadoA,
          receptorId: deliveryData.cedulaReceptor,
          relationType: deliveryData.relacionTitular,
          observations: deliveryData.observaciones
        });
      }

      await onConfirm(payload);
      onClose();
    } catch (error) {
    } finally {
      setExecuting(false);
    }
  };

  const documentsWithPhone = documents.filter(doc => doc.clientPhone);
  const documentsWithoutPhone = documents.filter(doc => !doc.clientPhone);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #162840, #17a2b8)'
            : 'linear-gradient(135deg, #1976d2, #42a5f5)',
          color: 'white',
          borderBottom: '3px solid #D4AF37',
          py: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {transitionConfig.icon}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {transitionConfig.title}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {transitionConfig.description}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Información de la operación */}
        <Card sx={{ mb: 3, border: `1px solid ${transitionConfig.color}.main` }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Operación: {fromStatus} → {toStatus}
              </Typography>
              <Chip
                label={`${documents.length} documento${documents.length > 1 ? 's' : ''}`}
                color={transitionConfig.color}
                size="small"
              />
            </Box>

            {transitionConfig.successMessage && (
              <Alert severity="success" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {transitionConfig.successMessage}
                </Typography>
              </Alert>
            )}

            {transitionConfig.warningMessage && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {transitionConfig.warningMessage}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Formulario de Entrega (Condicional) */}
        {transitionConfig.showDeliveryForm && (
          <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Datos de Entrega
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Nombre de quien retira"
                    value={deliveryData.entregadoA}
                    onChange={handleDeliveryChange('entregadoA')}
                    error={!!errors.entregadoA}
                    helperText={errors.entregadoA || "Quien recibe físicamente"}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Cédula / Identificación"
                    value={deliveryData.cedulaReceptor}
                    onChange={handleDeliveryChange('cedulaReceptor')}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Relación con Titular</InputLabel>
                    <Select
                      value={deliveryData.relacionTitular}
                      label="Relación con Titular"
                      onChange={handleDeliveryChange('relacionTitular')}
                    >
                      <MenuItem value="titular">Titular</MenuItem>
                      <MenuItem value="familiar">Familiar</MenuItem>
                      <MenuItem value="mensajero">Mensajero</MenuItem>
                      <MenuItem value="abogado">Abogado</MenuItem>
                      <MenuItem value="gestor">Gestor</MenuItem>
                      <MenuItem value="otro">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Observaciones de entrega"
                    value={deliveryData.observaciones}
                    onChange={handleDeliveryChange('observaciones')}
                    size="small"
                    placeholder="Detalles adicionales sobre la entrega..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Lista de documentos */}
        <Card sx={{ border: '1px solid #e0e0e0' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Documentos Seleccionados ({documents.length})
            </Typography>

            <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
              {documents.map((doc, index) => (
                <React.Fragment key={doc.id}>
                  <ListItem sx={{ py: 1, px: 0 }}>
                    <ListItemIcon>
                      <DocumentIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {doc.actoPrincipalDescripcion || doc.documentType}
                          </Typography>
                          {doc.clientPhone && (
                            <PhoneIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Cliente: {doc.clientName} | Protocolo: {doc.protocolNumber}
                          </Typography>
                          {doc.clientPhone && (
                            <Typography variant="caption" color="success.main">
                              Tel: {doc.clientPhone}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={doc.status}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </ListItem>
                  {index < documents.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={executing}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={executing || loading}
          variant="contained"
          color={transitionConfig.color}
          startIcon={executing ? <CircularProgress size={16} /> : transitionConfig.icon}
          sx={{ fontWeight: 600 }}
        >
          {executing ? 'Procesando...' : transitionConfig.actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkStatusChangeModal;
