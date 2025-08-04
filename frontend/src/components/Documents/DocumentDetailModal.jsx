import React, { useState } from 'react';
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
  Paper
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

/**
 * Componente DocumentDetailModal - Modal de detalle avanzado del documento
 * Incluye información completa, historial visual y acciones contextuales
 */
const DocumentDetailModal = ({ open, onClose, document }) => {
  const { updateDocumentStatus } = useDocumentStore();
  const { history, loading, error } = useDocumentHistory(document?.id);
  const [currentTab, setCurrentTab] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  if (!document) return null;

  /**
   * Obtener color del estado
   */
  const getStatusColor = (status) => {
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
    const texts = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      LISTO: 'Listo para Entrega',
      ENTREGADO: 'Entregado'
    };
    return texts[status] || status;
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
        return {
          text: 'Iniciar Procesamiento',
          action: 'EN_PROCESO',
          color: 'info',
          icon: <ScheduleIcon />
        };
      case 'EN_PROCESO':
        return {
          text: 'Marcar como Listo y Notificar',
          action: 'LISTO',
          color: 'success',
          icon: <CheckCircleIcon />
        };
      case 'LISTO':
        return {
          text: 'Marcar como Entregado',
          action: 'ENTREGADO',
          color: 'default',
          icon: <LocalShippingIcon />
        };
      default:
        return null;
    }
  };

  /**
   * Manejar acción contextual
   */
  const handleAction = async () => {
    const actionConfig = getActionButton();
    if (!actionConfig) return;

    setActionLoading(true);
    try {
      const success = await updateDocumentStatus(document.id, actionConfig.action);
      if (success) {
        // El modal se actualizará automáticamente cuando el store se actualice
        console.log(`Documento actualizado a: ${actionConfig.action}`);
      }
    } catch (error) {
      console.error('Error al actualizar documento:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const actionConfig = getActionButton();

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
            <Avatar sx={{ bgcolor: 'white', color: 'primary.main', mr: 2 }}>
              <AssignmentIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Detalle del Documento
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {document.protocolNumber}
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
                label={document.documentType}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '1rem', p: 1 }}
              />
              <Chip
                label={getStatusText(document.status)}
                color={getStatusColor(document.status)}
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
                          {document.clientName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cliente principal
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {document.clientPhone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PhoneIcon sx={{ mr: 2, color: 'info.main' }} />
                        <Typography variant="body1">
                          {document.clientPhone}
                        </Typography>
                      </Box>
                    )}

                    {document.clientEmail && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EmailIcon sx={{ mr: 2, color: 'info.main' }} />
                        <Typography variant="body1">
                          {document.clientEmail}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
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
                      {document.actoPrincipalDescripcion}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {formatCurrency(document.actoPrincipalValor)}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
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
                        <strong>Matrizador XML:</strong> {document.matrizadorName}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Items Secundarios */}
              {document.itemsSecundarios && document.itemsSecundarios.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
                        📄 Items Secundarios ({document.itemsSecundarios.length})
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {document.itemsSecundarios.map((item, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                                {item.descripcion}
                              </Typography>
                              <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                {formatCurrency(item.valor)}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Pestaña: Historial */}
        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            <DocumentTimeline 
              history={history}
              loading={loading}
              error={error}
            />
          </Box>
        )}
      </DialogContent>

      {/* Acciones */}
      <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ mr: 1 }}
        >
          Cerrar
        </Button>
        
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
    </Dialog>
  );
};

export default DocumentDetailModal;