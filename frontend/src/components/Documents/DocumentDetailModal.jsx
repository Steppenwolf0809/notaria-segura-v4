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
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Avatar,
  Stack,
  Tabs,
  Tab,
  Paper,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  InputLabel
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentTimeline from './DocumentTimeline';
import useDocumentHistory from '../../hooks/useDocumentHistory';
import useDocumentStore from '../../store/document-store';
import useAuthStore from '../../store/auth-store';
import EditDocumentModal from './EditDocumentModal';
import documentService from '../../services/document-service';
import notificationsService from '../../services/notifications-service';
import NotificationPolicySelector from '../common/NotificationPolicySelector';
import ImmediateDeliveryModal from '../common/ImmediateDeliveryModal';
 

/**
 * Componente DocumentDetailModal - Modal de detalle avanzado del documento
 * Incluye información completa, historial visual y acciones contextuales
 */
const DocumentDetailModal = ({ open, onClose, document, onDocumentUpdated }) => {
  const { updateDocumentStatus } = useDocumentStore();
  const { user } = useAuthStore();
  const { history, loading, error } = useDocumentHistory(document?.id);
  const [currentTab, setCurrentTab] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showMatrizadorDeliveryModal, setShowMatrizadorDeliveryModal] = useState(false);
  const [showImmediateDeliveryModal, setShowImmediateDeliveryModal] = useState(false);
  const [localDocument, setLocalDocument] = useState(document);
  

  // Actualizar documento local cuando cambie el prop
  useEffect(() => {
    if (document) {
      setLocalDocument(document);
    }
  }, [document]);

  if (!document || !localDocument) return null;

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
    if (!status) return 'default';
    const colors = {
      PENDIENTE: 'warning',
      EN_PROCESO: 'info',
      LISTO: 'success',
      ENTREGADO: 'default'
    };
    return colors[status] || 'default';
  };

  /**
   * Obtener texto del estado
   */
  const getStatusText = (status) => {
    if (!status) return 'Sin estado';
    const texts = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      LISTO: 'Listo para Entrega',
      ENTREGADO: 'Entregado'
    };
    return texts[status] || status;
  };

  /**
   * Manejar actualización de documento desde modal de edición
   */
  const handleDocumentUpdated = (updatedData) => {
    console.log('Documento actualizado:', updatedData);
    
    // Actualizar documento local con los nuevos datos
    if (updatedData.data && updatedData.data.document) {
      setLocalDocument(prev => ({
        ...prev,
        ...updatedData.data.document
      }));
    }
    
    // Cerrar modal de edición
    setShowEditModal(false);
    
    // Notificar al componente padre si existe callback
    if (onDocumentUpdated && updatedData.data) {
      onDocumentUpdated(updatedData.data);
    }
  };

  /**
   * Manejar entrega de documento desde modal de entrega
   */
  const handleDocumentDelivered = (deliveryData) => {
    console.log('Documento entregado:', deliveryData);
    
    // Actualizar documento local
    if (deliveryData.document) {
      setLocalDocument(prev => ({
        ...prev,
        ...deliveryData.document
      }));
    }
    
    // Cerrar modal de entrega
    setShowDeliveryModal(false);
    
    // Notificar al componente padre si existe callback
    if (onDocumentUpdated && deliveryData) {
      onDocumentUpdated(deliveryData);
    }
  };

  

  /**
   * Manejar entrega de documento desde modal simplificado de matrizador
   */
  const handleMatrizadorDelivered = (deliveryData) => {
    console.log('Documento entregado por matrizador:', deliveryData);
    
    // Actualizar documento local
    if (deliveryData.document) {
      setLocalDocument(prev => ({
        ...prev,
        ...deliveryData.document
      }));
    }
    
    // Cerrar modal de entrega de matrizador
    setShowMatrizadorDeliveryModal(false);
    
    // Notificar al componente padre si existe callback
    if (onDocumentUpdated && deliveryData) {
      onDocumentUpdated(deliveryData);
    }
  };

  /**
   * Manejar cambio de política de notificación
   * Se ejecuta automáticamente al cambiar la política en el componente NotificationPolicySelector
   */
  const handleNotificationPolicyChange = (newPolicy, updatedData) => {
    console.log('🔔 Política de notificación cambiada:', { newPolicy, updatedData });
    
    // Actualizar documento local
    setLocalDocument(prev => ({
      ...prev,
      notificationPolicy: newPolicy,
      ...(updatedData || {})
    }));

    // Notificar al componente padre si existe callback
    if (onDocumentUpdated) {
      onDocumentUpdated({
        ...localDocument,
        notificationPolicy: newPolicy,
        ...(updatedData || {})
      });
    }
  };

  /**
   * Formatear moneda
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  /**
   * Formatear fecha
   */
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  /**
   * Obtener botón de acción contextual
   */
  const getActionButton = () => {
    switch (document.status) {
      case 'PENDIENTE':
        // Si la política es de entrega inmediata, permitir saltar directamente a ENTREGADO
        if (localDocument?.notificationPolicy === 'entrega_inmediata') {
          return {
            text: 'Entregar Inmediatamente',
            action: 'ENTREGADO',
            color: 'warning',
            icon: <LocalShippingIcon />
          };
        }
        
        return {
          text: 'Iniciar Procesamiento',
          action: 'EN_PROCESO',
          color: 'info',
          icon: <ScheduleIcon />
        };
      case 'EN_PROCESO':
        // Si la política es de entrega inmediata, permitir saltar directamente a ENTREGADO
        if (localDocument?.notificationPolicy === 'entrega_inmediata') {
          return {
            text: 'Entregar Inmediatamente',
            action: 'ENTREGADO',
            color: 'warning',
            icon: <LocalShippingIcon />
          };
        }
        
        return {
          text: 'Marcar como Listo y Notificar',
          action: 'LISTO',
          color: 'success',
          icon: <CheckCircleIcon />
        };
      case 'LISTO':
        // Cambiar texto según política de notificación
        const deliveryText = localDocument?.notificationPolicy === 'entrega_inmediata' 
          ? 'Entregar Inmediatamente'
          : 'Marcar como Entregado';
        
        return {
          text: deliveryText,
          action: 'ENTREGADO',
          color: localDocument?.notificationPolicy === 'entrega_inmediata' ? 'warning' : 'default',
          icon: <LocalShippingIcon />
        };
      default:
        return null;
    }
  };

  /**
   * Obtener estado anterior disponible (para ARCHIVO)
   */
  const getPreviousStatus = (status) => {
    const order = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const idx = order.indexOf(status);
    return idx > 0 ? order[idx - 1] : null;
  };

  /**
   * Revertir estado al anterior con razón obligatoria (rol ARCHIVO)
   */
  const handleRevert = async (targetStatus) => {
    if (!targetStatus) return;
    const reason = prompt('Ingrese la razón para revertir el estado:');
    if (!reason || !reason.trim()) return;
    setActionLoading(true);
    try {
      const result = await documentService.revertDocumentStatus(document.id, targetStatus, reason.trim());
      if (result.success) {
        setLocalDocument(prev => ({ ...prev, status: targetStatus }));
        alert(result.message || `Documento revertido a ${targetStatus}`);
      } else {
        const errorMsg = result.error || result.message || 'No se pudo revertir el estado';
        alert('Error: ' + errorMsg);
      }
    } catch (error) {
      alert('Error al revertir estado: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Manejar acción contextual
   */
  const handleAction = async () => {
    const actionConfig = getActionButton();
    if (!actionConfig) return;

    // Si es para marcar como entregado, verificar política de notificación
    if (actionConfig.action === 'ENTREGADO') {
      // Si la política es de entrega inmediata, abrir modal específico
      if (localDocument?.notificationPolicy === 'entrega_inmediata') {
        setShowImmediateDeliveryModal(true);
      } else if (user?.role === 'MATRIZADOR') {
        setShowMatrizadorDeliveryModal(true);
      } else {
        setShowDeliveryModal(true);
      }
      return;
    }

    setActionLoading(true);
    try {
      const result = await updateDocumentStatus(document.id, actionConfig.action);
      console.log('🔍 Resultado completo de updateDocumentStatus:', result);
      
      if (result.success) {
        // Actualizar documento local
        setLocalDocument(prev => ({
          ...prev,
          status: actionConfig.action,
          verificationCode: result.data?.document?.verificationCode || prev.verificationCode
        }));

        // Mostrar mensaje de éxito
        const message = result.message || `Documento actualizado a: ${actionConfig.action}`;
        
        // Crear un alert temporal o notification
        if (actionConfig.action === 'LISTO') {
          const whatsappInfo = result.data?.whatsapp;
          let alertMessage = message;
          
          if (whatsappInfo?.sent) {
            alertMessage += '\n\n✅ Notificación WhatsApp enviada exitosamente';
          } else if (whatsappInfo?.error) {
            alertMessage += '\n\n⚠️ Error enviando WhatsApp: ' + whatsappInfo.error;
          } else if (!whatsappInfo?.phone) {
            alertMessage += '\n\nℹ️ Sin número de teléfono para WhatsApp';
          }
          
          alert(alertMessage);
          if (typeof onClose === 'function') {
            onClose();
          }
        } else {
          alert(message);
        }
        
        console.log(`✅ Documento actualizado a: ${actionConfig.action}`, result);
      } else {
        console.error('❌ Error en updateDocumentStatus:', result);
        const errorMsg = result.error || result.message || 'No se pudo actualizar el documento';
        alert('Error: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error al actualizar documento:', error);
      alert('Error al actualizar documento: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const actionConfig = getActionButton();
  const previousStatus = getPreviousStatus(localDocument?.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      {/* Header del Modal */}
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.15)' 
                : 'white', 
              color: 'primary.main', 
              mr: 2,
              border: (theme) => theme.palette.mode === 'dark' 
                ? '1px solid rgba(255, 255, 255, 0.2)' 
                : 'none'
            }}>
              <AssignmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Detalle del Documento
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {localDocument?.protocolNumber || 'Sin número'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Navegación por pestañas */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab 
            icon={<InfoIcon />} 
            label="Información General" 
            sx={{ fontWeight: 'bold' }}
          />
          <Tab 
            icon={<HistoryIcon />} 
            label="Historial" 
            sx={{ fontWeight: 'bold' }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Pestaña: Información General */}
        {currentTab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Estado y tipo */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Chip
                label={localDocument?.documentType || 'Sin tipo'}
                sx={{ 
                  fontSize: '1rem', 
                  p: 1,
                  bgcolor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgb(226, 232, 240)',
                  color: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.7)'
                    : 'rgb(71, 85, 105)',
                  border: 'none',
                  borderRadius: '12px' // rounded-full
                }}
              />
              <Chip
                label={getStatusText(localDocument?.status)}
                color={getStatusColor(localDocument?.status)}
                variant="filled"
                sx={{ fontSize: '1rem', p: 1 }}
              />
            </Box>

            <Grid container spacing={3}>
              {/* Información del Cliente */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                      👤 Información del Cliente
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {localDocument?.clientName || 'Sin nombre'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cliente principal
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {localDocument?.clientPhone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PhoneIcon sx={{ mr: 2, color: 'info.main' }} />
                        <Typography variant="body1">
                          {localDocument.clientPhone}
                        </Typography>
                      </Box>
                    )}

                    {localDocument?.clientId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AssignmentIcon sx={{ mr: 2, color: 'warning.main' }} />
                        <Typography variant="body1">
                          <strong>Identificación:</strong> {localDocument.clientId}
                        </Typography>
                      </Box>
                    )}

                    {localDocument?.clientEmail && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EmailIcon sx={{ mr: 2, color: 'info.main' }} />
                        <Typography variant="body1">
                          {localDocument.clientEmail}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ 
                      mt: 2, 
                      p: 2, 
                      bgcolor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'grey.50', 
                      borderRadius: 1,
                      border: (theme) => theme.palette.mode === 'dark' 
                        ? '1px solid rgba(255, 255, 255, 0.1)' 
                        : 'none'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Documento creado:</strong> {formatDate(document.createdAt)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Acto Principal */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'success.main' }}>
                      📋 Acto Principal
                    </Typography>
                    
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                      {document.actoPrincipalDescripcion || 'No especificado'}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {formatCurrency(document.totalFactura)} {/* ⭐ CAMBIO: Usar valor total de factura */}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ 
                      p: 2, 
                      bgcolor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(34, 197, 94, 0.1)' 
                        : 'success.50', 
                      borderRadius: 1,
                      border: (theme) => theme.palette.mode === 'dark' 
                        ? '1px solid rgba(34, 197, 94, 0.2)' 
                        : 'none'
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Información del Documento:
                      </Typography>
                      <Typography variant="body2">
                        <strong>Protocolo:</strong> {document.protocolNumber}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Total Factura:</strong> {formatCurrency(document.totalFactura)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Matrizador XML:</strong> {document.matrizadorName || 'No especificado'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>


            </Grid>
          </Box>
        )}

        {/* Pestaña: Historial */}
        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            <DocumentTimeline 
              documentId={document?.id}
              showRefresh={true}
              showLoadMore={true}
              autoRefresh={false}
              options={{
                limit: 20,
                fallbackToSimulated: true
              }}
            />
          </Box>
        )}

        {/* 🔔 CONFIGURACIÓN DE NOTIFICACIÓN - COMPONENTE REUTILIZABLE */}
        <NotificationPolicySelector 
          document={localDocument}
          onPolicyChange={handleNotificationPolicyChange}
          autoSave={true}
          sx={{ 
            borderTop: (theme) => theme.palette.mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.1)' 
              : '1px solid #e0e0e0',
            m: 3, 
            mt: 0,
            pt: 3
          }}
        />
      </DialogContent>

      {/* Acciones */}
      <DialogActions sx={{ 
        p: 3, 
        bgcolor: (theme) => theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.03)' 
          : 'grey.50',
        borderTop: (theme) => theme.palette.mode === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : 'none'
      }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ mr: 1 }}
        >
          Cerrar
        </Button>
        
        
        {/* Botón de Edición - NUEVA FUNCIONALIDAD */}
        <Button
          onClick={() => setShowEditModal(true)}
          variant="outlined"
          startIcon={<EditIcon />}
          sx={{ mr: 1 }}
        >
          Editar Información
        </Button>
        
        {/* Botón para regresar al estado anterior (solo ARCHIVO) */}
        {user?.role === 'ARCHIVO' && previousStatus && (
          <Button
            onClick={() => handleRevert(previousStatus)}
            variant="outlined"
            color="warning"
            startIcon={<HistoryIcon />}
            disabled={actionLoading}
            sx={{ mr: 1 }}
          >
            Regresar al estado anterior
          </Button>
        )}

        {actionConfig && (
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionConfig.color}
            disabled={actionLoading}
            startIcon={actionConfig.icon}
            sx={{ fontWeight: 'bold' }}
          >
            {actionLoading ? 'Procesando...' : actionConfig.text}
          </Button>
        )}
      </DialogActions>

      {/* Modal de Edición Profesional - NUEVA FUNCIONALIDAD */}
      <EditDocumentModal
        documento={localDocument}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={async (formData) => {
          try {
            const response = await documentService.updateDocumentInfo(localDocument.id, formData);
            if (response.success) {
              handleDocumentUpdated(response);
              setShowEditModal(false);
            }
          } catch (error) {
            console.error('Error actualizando documento:', error);
          }
        }}
        userRole="matrizador"
      />

      {/* Modal de Entrega - NUEVA FUNCIONALIDAD */}
      <DeliveryModal
        open={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        document={localDocument}
        onDocumentDelivered={handleDocumentDelivered}
      />

      {/* Modal de Entrega Simplificado para Matrizadores */}
      <MatrizadorDeliveryModal
        open={showMatrizadorDeliveryModal}
        onClose={() => setShowMatrizadorDeliveryModal(false)}
        document={localDocument}
        onDocumentDelivered={handleMatrizadorDelivered}
      />

      {/* Modal de Entrega Inmediata */}
      <ImmediateDeliveryModal
        open={showImmediateDeliveryModal}
        onClose={() => setShowImmediateDeliveryModal(false)}
        document={localDocument}
        onDocumentDelivered={(deliveryData) => {
          console.log('Documento entregado inmediatamente:', deliveryData);
          
          // Actualizar documento local
          if (deliveryData.document) {
            setLocalDocument(prev => ({
              ...prev,
              ...deliveryData.document
            }));
          }
          
          // Cerrar modal
          setShowImmediateDeliveryModal(false);
          
          // Notificar al componente padre
          if (onDocumentUpdated && deliveryData) {
            onDocumentUpdated(deliveryData);
          }
        }}
      />

      
    </Dialog>
  );
};

/**
 * Modal de Entrega de Documentos
 * Permite registrar toda la información de entrega
 */
const DeliveryModal = ({ open, onClose, document, onDocumentDelivered }) => {
  const [formData, setFormData] = useState({
    entregadoA: '',
    cedulaReceptor: '',
    relacionTitular: 'titular',
    codigoVerificacion: '',
    verificacionManual: false,
    facturaPresenta: false,
    observacionesEntrega: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      setFormData({
        entregadoA: '',
        cedulaReceptor: '',
        relacionTitular: 'titular',
        codigoVerificacion: '',
        verificacionManual: false,
        facturaPresenta: false,
        observacionesEntrega: ''
      });
      setErrors([]);
    }
  }, [open]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]);
  };

  const handleDeliver = async () => {
    // Validaciones
    const validationErrors = [];
    
    if (!formData.entregadoA.trim()) {
      validationErrors.push('Nombre de quien retira es obligatorio');
    }

    if (!formData.verificacionManual && !formData.codigoVerificacion.trim()) {
      validationErrors.push('Código de verificación es obligatorio (o marcar verificación manual)');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      const result = await documentService.deliverDocument(document.id, formData);
      
      if (result.success) {
        // Notificar al componente padre
        if (onDocumentDelivered) {
          onDocumentDelivered(result.data);
        }
        
        // Mostrar mensaje de éxito
        const message = result.message || 'Documento entregado exitosamente';
        const whatsappInfo = result.data?.whatsapp;
        
        let alertMessage = message;
        if (whatsappInfo?.sent) {
          alertMessage += '\n\n✅ Notificación WhatsApp de entrega enviada';
        } else if (whatsappInfo?.error) {
          alertMessage += '\n\n⚠️ Error enviando WhatsApp: ' + whatsappInfo.error;
        }
        
        alert(alertMessage);
        onClose();
      } else {
        setErrors([result.message || 'Error al entregar documento']);
      }
    } catch (error) {
      console.error('Error entregando documento:', error);
      setErrors(['Error de conexión al entregar el documento']);
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h6">Entregar Documento</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={saving}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Información del documento */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              📄 Documento a Entregar
            </Typography>
            <Typography variant="body2">
              <strong>Número:</strong> {document.protocolNumber} | 
              <strong> Tipo:</strong> {document.documentType} | 
              <strong> Cliente:</strong> {document.clientName}
            </Typography>
            {document.verificationCode && (
              <Typography variant="body2" color="primary">
                <strong>Código del Sistema:</strong> {document.verificationCode}
              </Typography>
            )}
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

          <Grid container spacing={2}>
            {/* Quien retira */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Persona que Retira"
                value={formData.entregadoA}
                onChange={(e) => handleFieldChange('entregadoA', e.target.value)}
                placeholder="Nombre completo"
                disabled={saving}
              />
            </Grid>

            {/* Cédula/Pasaporte */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cédula/Pasaporte"
                value={formData.cedulaReceptor}
                onChange={(e) => handleFieldChange('cedulaReceptor', e.target.value)}
                placeholder="Opcional"
                disabled={saving}
              />
            </Grid>

            {/* Relación con titular */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                select
                label="Relación con Titular"
                value={formData.relacionTitular}
                onChange={(e) => handleFieldChange('relacionTitular', e.target.value)}
                disabled={saving}
              >
                <MenuItem value="titular">Titular</MenuItem>
                <MenuItem value="abogado">Abogado</MenuItem>
                <MenuItem value="empleado">Empleado</MenuItem>
                <MenuItem value="tercero">Tercero Autorizado</MenuItem>
              </TextField>
            </Grid>

            {/* Código de verificación */}
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Código de Verificación"
                value={formData.codigoVerificacion}
                onChange={(e) => handleFieldChange('codigoVerificacion', e.target.value)}
                placeholder="Código proporcionado por el cliente"
                disabled={saving || formData.verificacionManual}
                required={!formData.verificacionManual}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.verificacionManual}
                    onChange={(e) => handleFieldChange('verificacionManual', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Verificación Manual"
              />
            </Grid>

            {/* Factura presenta */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.facturaPresenta}
                    onChange={(e) => handleFieldChange('facturaPresenta', e.target.checked)}
                    disabled={saving}
                  />
                }
                label="Cliente presentó factura de pago"
              />
            </Grid>

            {/* Observaciones */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones de Entrega"
                value={formData.observacionesEntrega}
                onChange={(e) => handleFieldChange('observacionesEntrega', e.target.value)}
                placeholder="Notas adicionales sobre la entrega (opcional)"
                disabled={saving}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={handleDeliver}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <LocalShippingIcon />}
        >
          {saving ? 'Entregando...' : 'Entregar Documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Modal Simplificado de Entrega para Matrizadores
 * Solo requiere información básica, sin códigos de verificación
 */
const MatrizadorDeliveryModal = ({ open, onClose, document, onDocumentDelivered }) => {
  const [formData, setFormData] = useState({
    entregadoA: '',
    observacionesEntrega: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      setFormData({
        entregadoA: '',
        observacionesEntrega: ''
      });
      setErrors([]);
    }
  }, [open]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors([]);
  };

  const handleDeliver = async () => {
    // Validaciones simplificadas
    const validationErrors = [];
    
    if (!formData.entregadoA.trim()) {
      validationErrors.push('Nombre de quien retira es obligatorio');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      // Preparar datos simplificados para matrizador
      const deliveryData = {
        entregadoA: formData.entregadoA.trim(),
        relacionTitular: 'titular', // Por defecto para matrizadores
        verificacionManual: true, // Siempre manual para matrizadores
        codigoVerificacion: '', // Sin código para matrizadores
        facturaPresenta: false, // Sin validación de factura
        observacionesEntrega: formData.observacionesEntrega.trim()
      };

      const result = await documentService.deliverDocument(document.id, deliveryData);
      
      if (result.success) {
        // Notificar al componente padre
        if (onDocumentDelivered) {
          onDocumentDelivered(result.data);
        }
        
        // Mostrar mensaje de éxito
        const message = result.message || 'Documento entregado exitosamente';
        alert(message);
        onClose();
      } else {
        setErrors([result.message || 'Error al entregar documento']);
      }
    } catch (error) {
      console.error('Error entregando documento:', error);
      setErrors(['Error de conexión al entregar el documento']);
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h6">Entregar Documento</Typography>
          </Box>
          <IconButton onClick={onClose} disabled={saving}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Información del documento */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              📄 Documento a Entregar
            </Typography>
            <Typography variant="body2">
              <strong>Número:</strong> {document.protocolNumber} | 
              <strong> Tipo:</strong> {document.documentType} | 
              <strong> Cliente:</strong> {document.clientName}
            </Typography>
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

          {/* Formulario simplificado */}
          <Grid container spacing={2}>
            {/* Quien retira */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Persona que Retira"
                value={formData.entregadoA}
                onChange={(e) => handleFieldChange('entregadoA', e.target.value)}
                placeholder="Nombre completo"
                disabled={saving}
              />
            </Grid>

            {/* Observaciones */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observaciones de Entrega"
                value={formData.observacionesEntrega}
                onChange={(e) => handleFieldChange('observacionesEntrega', e.target.value)}
                placeholder="Notas adicionales sobre la entrega (opcional)"
                disabled={saving}
              />
            </Grid>
          </Grid>

          {/* Nota informativa */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ℹ️ Entrega simplificada para matrizadores: No requiere código de verificación ni validación de factura.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={handleDeliver}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <LocalShippingIcon />}
        >
          {saving ? 'Entregando...' : 'Entregar Documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentDetailModal;