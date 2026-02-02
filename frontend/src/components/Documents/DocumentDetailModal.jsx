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
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentTimeline from './DocumentTimeline';
import useDocumentStore from '../../store/document-store';
import useAuthStore from '../../store/auth-store';
import EditDocumentModal from './EditDocumentModal';
import documentService from '../../services/document-service';
import notificationsService from '../../services/notifications-service';


import { toast } from 'react-toastify';
import archivoService from '../../services/archivo-service';
import EstadoPago from '../billing/EstadoPago';
import ModalEntrega from '../recepcion/ModalEntrega';


/**
 * Componente DocumentDetailModal - Modal de detalle avanzado del documento
 * Incluye información completa, historial visual y acciones contextuales
 */
// Opciones estables para el timeline - fuera del componente para evitar re-renders
const TIMELINE_OPTIONS = { limit: 50, fallbackToSimulated: true };

const DocumentDetailModal = ({ open, onClose, document, onDocumentUpdated, readOnly = false }) => {
  const { updateDocumentStatus } = useDocumentStore();
  const { user } = useAuthStore();
  // NOTA: useDocumentHistory se usa directamente en DocumentTimeline, no aquí
  // para evitar fetches duplicados que causaban race conditions
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showMatrizadorDeliveryModal, setShowMatrizadorDeliveryModal] = useState(false);

  const [localDocument, setLocalDocument] = useState(document);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState(null);
  const [timelineKey, setTimelineKey] = useState(0); // Key para forzar re-render del timeline

  // Obtener el ID del documento de manera robusta
  const documentId = document?.id || localDocument?.id;

  // Función para refrescar el timeline
  const handleRefreshTimeline = () => {
    setTimelineKey(prev => prev + 1);
  };

  // Cargar documento completo cuando se abre el modal
  useEffect(() => {
    const loadFullDocument = async () => {
      // Si no hay ID o el modal está cerrado, no hacer nada
      if (!open || !documentId) return;

      // Si ya tenemos datos suficientes, no recargar
      // Debe incluir al menos protocolNumber y datos de factura (numero/fecha)
      if (
        localDocument?.id === documentId &&
        localDocument?.protocolNumber &&
        (localDocument?.numeroFactura || localDocument?.fechaFactura)
      ) {
        return;
      }

      setDocumentLoading(true);
      setDocumentError(null);

      try {
        const response = await documentService.getDocumentById(documentId);
        console.log('[DocumentDetailModal] getDocumentById response:', response);

        if (response.success && response.data) {
          // FIX: Handle both response structures { document: {...} } or direct document
          const documentData = response.data.document || response.data;
          console.log('[DocumentDetailModal] Extracted document data:', documentData?.id, documentData?.protocolNumber);

          if (documentData && documentData.id) {
            setLocalDocument(documentData);
          } else {
            console.warn('[DocumentDetailModal] Invalid document data received, using prop');
            if (document) {
              setLocalDocument(document);
            }
          }
        } else {
          // Si falla la carga completa, usar los datos que tenemos
          console.warn('No se pudo cargar documento completo, usando datos parciales');
          if (document) {
            setLocalDocument(document);
          }
        }
      } catch (err) {
        console.error('Error cargando documento:', err);
        // Usar datos parciales si existen
        if (document) {
          setLocalDocument(document);
        } else {
          setDocumentError('Error al cargar el documento');
        }
      } finally {
        setDocumentLoading(false);
      }

    };

    loadFullDocument();
  }, [open, documentId]);

  // Actualizar documento local cuando cambie el prop (para actualizaciones externas)
  useEffect(() => {
    if (document && document.id && (!localDocument || localDocument.id !== document.id)) {
      setLocalDocument(document);
    }
  }, [document?.id]);

  // Si no hay documento ni ID, no renderizar
  if (!documentId) return null;

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
    switch (localDocument?.status) {
      case 'PENDIENTE':

        return {
          text: 'Iniciar Procesamiento',
          action: 'EN_PROCESO',
          color: 'info',
          icon: <ScheduleIcon />
        };
      case 'EN_PROCESO':

        return {
          text: 'Marcar como Listo',
          action: 'LISTO',
          color: 'success',
          icon: <CheckCircleIcon />
        };
      case 'LISTO':
        const deliveryText = 'Marcar como Entregado';

        return {
          text: deliveryText,
          action: 'ENTREGADO',
          color: 'default',
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
        toast.success(result.message || `Documento revertido a ${targetStatus}`);
      } else {
        const errorMsg = result.error || result.message || 'No se pudo revertir el estado';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Error al revertir estado: ' + error.message);
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
      setShowDeliveryModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const result = await updateDocumentStatus(localDocument?.id, actionConfig.action);

      if (result.success) {
        // Actualizar documento local
        setLocalDocument(prev => ({
          ...prev,
          status: actionConfig.action,
          verificationCode: result.data?.document?.verificationCode || prev.verificationCode
        }));

        // Notificar al componente padre si existe callback
        if (onDocumentUpdated && result.data) {
          onDocumentUpdated(result.data);
        }

        // Notificación global y cierre
        const baseMessage = result.message || `Documento actualizado a: ${actionConfig.action}`;
        if (actionConfig.action === 'LISTO') {
          const w = result.data?.whatsapp || {};
          const esGrupo = result.data?.esGrupo || result.data?.documents?.length > 1;
          // Feedback claro para operaciones en lote
          if (esGrupo && Array.isArray(result.data?.documents) && result.data.documents.length > 1) {
            const count = result.data.documents.length;
            if (w.sent) {
              toast.success(`Grupo marcado como LISTO (${count} documentos). WhatsApp enviado con todos los códigos.`);
            } else if (w.error) {
              toast.error(`Grupo marcado como LISTO (${count}). WhatsApp falló: ${w.error}`);
            } else if (w.error) {
              toast.error(`Grupo marcado como LISTO (${count}). WhatsApp falló: ${w.error}`);
            } else {
              toast.success(baseMessage);
            }
            if (typeof onClose === 'function') {
              onClose();
            }
            return;
          }
          const sentLike = !!(w.sent || ['sent', 'queued', 'delivered'].includes(w.status) || w.sid || w.messageId);
          if (sentLike) {
            toast.success('Documento marcado como LISTO. WhatsApp enviado.');
          } else if (w.error) {
            toast.error(`Documento LISTO, pero WhatsApp falló: ${w.error}`);
          } else {
            toast.success(baseMessage);
          }
          // Mantener el modal abierto para que el usuario decida cuándo cerrar
        } else {
          toast.success(baseMessage);
        }

      } else {
        const errorMsg = result.error || result.message || 'No se pudo actualizar el documento';
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error('Error al actualizar documento: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isReadOnly = !!readOnly;
  const actionConfig = isReadOnly ? null : getActionButton();
  const previousStatus = getPreviousStatus(localDocument?.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl" // Widescreen
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          height: '90vh', // Fixed height for better scrolling
          maxHeight: '90vh',
          overflowY: 'hidden' // Ensure no scroll on the modal container itself
        }
      }}
    >
      {/* Dense Header */}
      <DialogTitle sx={{
        m: 0,
        p: 2,
        py: 1.5,
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '64px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'inherit',
            width: 40,
            height: 40
          }}>
            <AssignmentIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {localDocument?.documentType || 'Detalle del Documento'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
              {localDocument?.protocolNumber || 'Sin número de protocolo'}
            </Typography>
          </Box>

          <Chip
            label={getStatusText(localDocument?.status)}
            color={getStatusColor(localDocument?.status)}
            size="small"
            sx={{
              ml: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          />
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {isReadOnly && (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            Vista en modo solo lectura. No puedes modificar este documento.
          </Alert>
        )}

        {/* Estado de carga del documento */}
        {documentLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
            <CircularProgress />
            <Typography color="text.secondary">Cargando información del documento...</Typography>
          </Box>
        )}

        {/* Estado de error */}
        {documentError && !documentLoading && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{documentError}</Alert>
          </Box>
        )}

        {/* Contenido principal - solo mostrar si no está cargando y hay documento */}
        {!documentLoading && localDocument && (
          <Grid container sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
            {/* Left Column: Context (Client & Act info) - Scrollable */}
            <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{
              height: '100%',
              overflowY: 'auto',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

                {/* Información del Cliente */}
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">
                    Información del Cliente
                  </Typography>
                  <Card variant="outlined" sx={{ mt: 1 }}>
                    <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {localDocument?.clientName || 'Sin nombre'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Cliente principal
                          </Typography>
                        </Box>
                      </Box>

                      <Stack spacing={1.5}>
                        {localDocument?.clientPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">{localDocument.clientPhone}</Typography>
                          </Box>
                        )}

                        {localDocument?.clientId && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <AssignmentIcon fontSize="small" color="action" />
                            <Typography variant="body2">{localDocument.clientId}</Typography>
                          </Box>
                        )}

                        {localDocument?.clientEmail && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              {localDocument.clientEmail}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* Acto Principal */}
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">
                    Detalles del Acto
                  </Typography>
                  <Card variant="outlined" sx={{ mt: 1 }}>
                    <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {localDocument?.actoPrincipalDescripcion || 'No especificado'}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" color="success.main" fontWeight="bold">
                          {formatCurrency(localDocument?.totalFactura)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'flex-end', mb: 0.5 }}>
                          Total Facturado
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Protocolo:</Typography>
                          <Typography variant="body2" fontWeight="medium">{localDocument?.protocolNumber}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">N° Factura:</Typography>
                          <Typography variant="body2" fontWeight="medium" color={localDocument?.numeroFactura ? 'text.primary' : 'text.disabled'}>
                            {localDocument?.numeroFactura || 'Sin asignar'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Matrizador:</Typography>
                          <Typography variant="body2" fontWeight="medium">{localDocument?.matrizadorName || 'N/A'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Fecha Factura:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {localDocument?.fechaFactura
                              ? formatDate(localDocument.fechaFactura)
                              : (localDocument?.createdAt || localDocument?.fechaCreacion ? formatDate(localDocument?.createdAt || localDocument?.fechaCreacion) : 'Pendiente')}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* Estado de Pago */}
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">
                    Estado Financiero
                  </Typography>
                  <EstadoPago documentId={localDocument?.id} />
                </Box>

              </Box>
            </Grid>

            {/* Right Column: Timeline - Scrollable */}
            <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{
              height: '100%',
              overflowY: 'auto',
              bgcolor: 'action.hover' // Adapts to dark mode (light: grey, dark: dark grey)
            }}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">
                    Línea de Tiempo
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefreshTimeline}
                    sx={{ textTransform: 'none' }}
                  >
                    Actualizar
                  </Button>
                </Box>

                <DocumentTimeline
                  key={`timeline-${localDocument?.id}-${timelineKey}`}
                  documentId={localDocument?.id}
                  showRefresh={true}
                  showLoadMore={true}
                  autoRefresh={false}
                  options={TIMELINE_OPTIONS}
                />
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      {/* Acciones */}
      <DialogActions sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        height: 'auto'
      }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
        >
          Cerrar
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        {/* Botón de Edición */}
        {!isReadOnly && (
          <Button
            onClick={() => setShowEditModal(true)}
            variant="outlined"
            startIcon={<EditIcon />}
            sx={{ mr: 1 }}
          >
            Editar Info
          </Button>
        )}

        {/* Botón Revertir (Archivo) */}
        {user?.role === 'ARCHIVO' && previousStatus && !isReadOnly && (
          <Button
            onClick={() => handleRevert(previousStatus)}
            variant="outlined"
            color="warning"
            startIcon={<HistoryIcon />}
            disabled={actionLoading}
            sx={{ mr: 1 }}
          >
            Revertir
          </Button>
        )}

        {/* Botón Acción Principal */}
        {!isReadOnly && actionConfig && (
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionConfig.color}
            disabled={actionLoading}
            startIcon={actionConfig.icon}
            disableElevation
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
          }
        }}
        userRole="matrizador"
      />

      {/* Modal de Entrega Unificado - Usa ModalEntrega que muestra código prominentemente */}
      {(showDeliveryModal || showMatrizadorDeliveryModal) && (
        <ModalEntrega
          documento={localDocument}
          onClose={() => {
            setShowDeliveryModal(false);
            setShowMatrizadorDeliveryModal(false);
          }}
          onEntregaExitosa={() => {
            // Actualizar documento local con status ENTREGADO
            setLocalDocument(prev => ({ ...prev, status: 'ENTREGADO' }));
            setShowDeliveryModal(false);
            setShowMatrizadorDeliveryModal(false);
            // Refrescar timeline
            handleRefreshTimeline();
            // Notificar al componente padre
            if (onDocumentUpdated) {
              onDocumentUpdated({ ...localDocument, status: 'ENTREGADO' });
            }
          }}
          serviceType={user?.role === 'ARCHIVO' ? 'archivo' : 'reception'}
        />
      )}




    </Dialog>
  );
};

export default DocumentDetailModal;
