import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
  TextField,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Undo as UndoIcon,
  ArrowForward as ArrowIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

/**
 * MODAL DE CONFIRMACIÓN PARA CAMBIOS DE ESTADO
 * 
 * Componente conservador que se integra con el sistema existente
 * sin modificar la lógica principal de drag & drop
 */
const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  document,
  currentStatus,
  newStatus,
  confirmationInfo,
  isLoading = false,
  // 🔗 NUEVOS PROPS para soporte de grupos
  isGroupMove = false,
  groupSize = 1,
  // 🔗 NUEVO PROP: Acción alternativa (ej: Entregar Directamente)
  alternativeAction = null
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [reversionReason, setReversionReason] = useState('');
  const [showReversionField, setShowReversionField] = useState(false);
  const [deliveredTo, setDeliveredTo] = useState('');

  // Reset del estado cuando se abre/cierra el modal
  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setReversionReason('');
      setShowReversionField(false);
      setDeliveredTo('');
    }
  }, [open]);

  // Determinar tipo de cambio
  const getChangeType = (from, to) => {
    const criticalForward = [
      { from: 'EN_PROCESO', to: 'LISTO' },
      { from: 'LISTO', to: 'ENTREGADO' }
    ];

    const isCriticalForward = criticalForward.some(
      change => change.from === from && change.to === to
    );

    const isReversion = isBackwardMovement(from, to);

    return {
      isCriticalForward,
      isReversion,
      type: isCriticalForward ? 'critical' : isReversion ? 'reversion' : 'normal'
    };
  };

  // Verificar si es movimiento hacia atrás
  const isBackwardMovement = (from, to) => {
    const statusOrder = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const fromIndex = statusOrder.indexOf(from);
    const toIndex = statusOrder.indexOf(to);
    return fromIndex > toIndex;
  };

  // Obtener texto de estado legible
  const getStatusText = (status) => {
    const statusTexts = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'LISTO': 'Listo para Entrega',
      'ENTREGADO': 'Entregado'
    };
    return statusTexts[status] || status;
  };

  // Usar confirmationInfo si está disponible, o calcular internamente como fallback
  const changeInfo = confirmationInfo || getChangeType(currentStatus, newStatus);

  // Verificar si se necesita campo de motivo para reversión
  useEffect(() => {
    setShowReversionField(changeInfo.isReversion);
  }, [currentStatus, newStatus, changeInfo]);

  const handleConfirm = () => {
    // Para reversiones, verificar que se haya dado un motivo
    if (showReversionField && !reversionReason.trim()) {
      return;
    }

    onConfirm({
      document,
      newStatus,
      reversionReason: showReversionField ? reversionReason : null,
      changeType: changeInfo.type,
      deliveredTo: changeInfo.isDirectDelivery ? deliveredTo : null
    });
  };

  // Deshabilitar si no ha confirmado (excepto entrega directa que no requiere check)
  // O si es reversión y no puso motivo
  const isConfirmDisabled = (!changeInfo.isDirectDelivery && !confirmed) ||
    (showReversionField && !reversionReason.trim()) ||
    isLoading;

  if (!document) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: changeInfo.isReversion ? 'warning.light' : 'info.light',
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2
        }}
      >
        {changeInfo.isReversion ? (
          <UndoIcon />
        ) : (
          <WarningIcon />
        )}
        <Typography variant="h6" component="div">
          {changeInfo.isDirectDelivery ? 'Confirmar Entrega Directa' : 'Confirmar Cambio de Estado'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {/* Información del documento */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {isGroupMove ? 'INFORMACIÓN DEL GRUPO' : 'INFORMACIÓN DEL DOCUMENTO'}
          </Typography>

          {/* 🔗 NUEVA FUNCIONALIDAD: Información de grupo */}
          {isGroupMove && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Movimiento de Grupo:</strong> Se actualizarán {groupSize} documentos del mismo cliente simultáneamente.
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body2">
                <strong>{isGroupMove ? 'Documento principal:' : 'Documento:'}</strong> {document.protocolNumber}
              </Typography>
            </Box>

            <Typography variant="body2">
              <strong>Cliente:</strong> {document.clientName || 'Sin nombre'}
            </Typography>

            <Typography variant="body2">
              <strong>Tipo:</strong> {document.documentType || 'No especificado'}
            </Typography>

            {document.clientPhone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 16, color: 'info.main' }} />
                <Typography variant="body2">
                  <strong>Teléfono:</strong> {document.clientPhone}
                </Typography>
              </Box>
            )}

            {/* 🔗 NUEVA FUNCIONALIDAD: Mostrar cantidad de documentos en grupo */}
            {isGroupMove && (
              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                <strong>Documentos en grupo:</strong> {groupSize}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Visualización del cambio */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Chip
            label={getStatusText(currentStatus)}
            color="default"
            variant="outlined"
          />
          <ArrowIcon color="primary" />
          <Chip
            label={getStatusText(newStatus)}
            color={changeInfo.isReversion ? "warning" : "primary"}
            variant="filled"
          />
        </Box>

        {/* Alertas específicas por tipo de cambio */}
        {changeInfo.isCriticalForward && newStatus === 'LISTO' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <WhatsAppIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Se enviará notificación automática:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>📱 WhatsApp al cliente: "Su documento está listo"</li>
              <li>🔢 Se generará código de retiro automáticamente</li>
              <li>📋 Documento aparecerá en recepción para entrega</li>
            </Box>
          </Alert>
        )}

        {changeInfo.isCriticalForward && newStatus === 'ENTREGADO' && !changeInfo.isDirectDelivery && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Se registrará entrega:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>📱 WhatsApp de confirmación al cliente</li>
              <li>📝 Documento marcado como completado</li>
              <li>📊 Se actualizarán métricas de productividad</li>
            </Box>
          </Alert>
        )}

        {changeInfo.isDirectDelivery && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Entrega Directa por {changeInfo.userRole === 'MATRIZADOR' ? 'Matrizador' : 'Archivo'}:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>✅ Se registrará como entrega directa</li>
                <li>👤 Usted aparecerá como quien entregó</li>
                <li>📝 Se mantendrá trazabilidad completa</li>
                <li>⚡ Proceso simplificado sin códigos</li>
              </Box>
            </Alert>

            {/* Campo para nombre de quien retira */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Nombre de quien retira el documento"
                placeholder="Ej: Juan Pérez, Cliente directo, etc."
                value={deliveredTo}
                onChange={(e) => setDeliveredTo(e.target.value)}
                variant="outlined"
                size="small"
                helperText="Campo opcional para control posterior"
              />
            </Box>
          </>
        )}

        {changeInfo.isReversion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <UndoIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Reversión de estado:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>⚠️ Esta acción puede confundir al cliente</li>
              <li>📝 Se registrará motivo en el historial</li>
              <li>🔔 Considere notificar al cliente manualmente</li>
            </Box>
          </Alert>
        )}

        {/* Campo de motivo para reversiones */}
        {showReversionField && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Motivo de la reversión"
              placeholder="Ej: Error en procesamiento, falta información adicional..."
              value={reversionReason}
              onChange={(e) => setReversionReason(e.target.value)}
              variant="outlined"
              size="small"
              required
              helperText="Este motivo se guardará en el historial del documento"
            />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Checkbox de confirmación - Solo mostrar si NO es entrega directa */}
        {!changeInfo.isDirectDelivery && (
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" fontWeight={600}>
                'Entiendo las consecuencias y deseo continuar'
              </Typography>
            }
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        {/* 🔗 BOTÓN DE ACCIÓN ALTERNATIVA */}
        {alternativeAction && (
          <Button
            onClick={alternativeAction.onClick}
            variant="outlined"
            color="primary"
            startIcon={alternativeAction.icon || <ArrowIcon />}
            sx={{ mr: 1 }}
          >
            {alternativeAction.label}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={changeInfo.isReversion ? "warning" : "primary"}
          disabled={isConfirmDisabled}
          startIcon={changeInfo.isReversion ? <UndoIcon /> : <CheckCircleIcon />}
        >
          {isLoading ? 'Procesando...' : 'Confirmar Cambio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;