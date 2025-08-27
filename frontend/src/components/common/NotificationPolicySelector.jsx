import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import { NotificationsActive as NotificationIcon } from '@mui/icons-material';
import documentService from '../../services/document-service';

/**
 * Componente reutilizable para seleccionar política de notificación
 * Maneja tanto documentos individuales como grupos automáticamente
 */
const NotificationPolicySelector = ({
  document,
  onPolicyChange,
  autoSave = false,
  sx = {},
  disabled = false
}) => {
  const [policy, setPolicy] = useState(document?.notificationPolicy || 'automatica');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Actualizar política local cuando cambie el documento
  useEffect(() => {
    if (document) {
      setPolicy(document.notificationPolicy || 'automatica');
    }
  }, [document]);

  /**
   * Manejar cambio de política
   */
  const handlePolicyChange = async (newPolicy) => {
    setPolicy(newPolicy);
    setError('');

    // Si autoSave está habilitado, guardar inmediatamente
    if (autoSave) {
      await savePolicy(newPolicy);
    }

    // Notificar al componente padre
    if (onPolicyChange) {
      onPolicyChange(newPolicy);
    }
  };

  /**
   * Guardar política en el backend
   */
  const savePolicy = async (policyToSave = policy) => {
    if (!document?.id) return;

    setSaving(true);
    setError('');

    try {
      let result;
      
      if (document.isGrouped && document.groupId) {
        // Si es documento agrupado, actualizar política del grupo
        result = await documentService.updateGroupNotificationPolicy(document.groupId, policyToSave);
      } else {
        // Si es documento individual, actualizar política del documento
        result = await documentService.updateNotificationPolicy(document.id, policyToSave);
      }

      if (!result.success) {
        setError(result.error || 'Error al guardar la política de notificación');
        // Revertir cambio si falló
        setPolicy(document.notificationPolicy || 'automatica');
        return false;
      }

      console.log('✅ Política de notificación guardada exitosamente');
      
      // Notificar al componente padre sobre el éxito
      if (onPolicyChange) {
        onPolicyChange(policyToSave, result.data);
      }

      return true;
    } catch (error) {
      console.error('❌ Error guardando política de notificación:', error);
      setError('Error de conexión al guardar la política');
      // Revertir cambio si falló
      setPolicy(document.notificationPolicy || 'automatica');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Obtener descripción de la política seleccionada
   */
  const getPolicyDescription = (selectedPolicy) => {
    switch (selectedPolicy) {
      case 'automatica':
        return 'Se enviará notificación WhatsApp automáticamente cuando el documento esté listo';
      case 'no_notificar':
        return 'No se enviará ninguna notificación. El cliente debe consultar directamente';
      case 'entrega_inmediata':
        return 'El documento se marcará como entregado inmediatamente sin pasar por estado "Listo"';
      default:
        return '';
    }
  };

  if (!document) return null;

  return (
    <Box sx={{ 
      p: 2, 
      borderRadius: 1,
      bgcolor: (theme) => theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.02)' 
        : 'rgba(23, 162, 184, 0.02)',
      border: (theme) => theme.palette.mode === 'dark' 
        ? '1px solid rgba(255, 255, 255, 0.1)' 
        : '1px solid rgba(23, 162, 184, 0.1)',
      ...sx 
    }}>
      <Typography variant="h6" sx={{ 
        color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#162840', 
        mb: 2, 
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <NotificationIcon sx={{ 
          color: (theme) => theme.palette.mode === 'dark' ? '#17a2b8' : '#162840'
        }} />
        Configuración de Notificaciones
        {document.isGrouped && (
          <Chip 
            label="Afecta a todo el grupo" 
            size="small" 
            color="warning"
            sx={{ ml: 1 }}
          />
        )}
        {saving && (
          <CircularProgress size={16} sx={{ ml: 1 }} />
        )}
      </Typography>
      
      <FormControl fullWidth sx={{ maxWidth: 400, mb: 2 }}>
        <InputLabel>Política de Notificación</InputLabel>
        <Select
          value={policy}
          onChange={(e) => handlePolicyChange(e.target.value)}
          label="Política de Notificación"
          disabled={disabled || saving}
        >
          <MenuItem value="automatica">🔔 Notificar automáticamente</MenuItem>
          <MenuItem value="no_notificar">🚫 No notificar</MenuItem>
          <MenuItem value="entrega_inmediata">⚡ Entrega inmediata</MenuItem>
        </Select>
      </FormControl>

      {/* Descripción de la política seleccionada */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          {getPolicyDescription(policy)}
        </Typography>
      </Alert>

      {/* Información adicional para grupos */}
      {document.isGrouped && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          <Typography variant="body2">
            ℹ️ Los cambios en la política de notificación se aplicarán a todos los documentos del grupo.
          </Typography>
        </Alert>
      )}

      {/* Mostrar error si existe */}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default NotificationPolicySelector;