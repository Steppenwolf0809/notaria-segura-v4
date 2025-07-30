import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Collapse,
  IconButton,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Tarjeta de documento para dashboard del matrizador
 * Muestra información básica y acciones disponibles
 */
const DocumentCard = ({ document, onStatusChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Obtiene el color del chip según el tipo de documento
   */
  const getDocumentTypeColor = (type) => {
    const typeColors = {
      PROTOCOLO: 'primary',
      DILIGENCIA: 'secondary', 
      CERTIFICACION: 'info',
      ARRENDAMIENTO: 'warning',
      OTROS: 'default'
    };
    return typeColors[type] || 'default';
  };

  /**
   * Obtiene el color del badge según el estado
   */
  const getStatusColor = (status) => {
    const statusColors = {
      PENDIENTE: 'default',
      EN_PROCESO: 'info',
      LISTO: 'success',
      ENTREGADO: 'secondary'
    };
    return statusColors[status] || 'default';
  };

  /**
   * Obtiene el texto en español del estado
   */
  const getStatusText = (status) => {
    const statusTexts = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      LISTO: 'Listo',
      ENTREGADO: 'Entregado'
    };
    return statusTexts[status] || status;
  };

  /**
   * Formatea el valor monetario
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  /**
   * Formatea la fecha
   */
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  /**
   * Maneja el cambio de estado a LISTO
   */
  const handleMarkAsReady = async () => {
    if (loading || !onStatusChange) return;
    
    setLoading(true);
    try {
      await onStatusChange(document.id, 'LISTO');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja la expansión/colapso de detalles
   */
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Removido bgcolor ya que el tema enterprise lo maneja automáticamente
        // Las cards ahora usan la configuración enterprise del tema
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {/* Header con tipo y estado */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Chip
            label={document.documentType}
            color={getDocumentTypeColor(document.documentType)}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip
            label={getStatusText(document.status)}
            color={getStatusColor(document.status)}
            size="small"
            variant={document.status === 'LISTO' ? 'filled' : 'outlined'}
          />
        </Box>

        {/* Información del cliente */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
              <PersonIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold', color: 'text.primary' }}>
              {document.clientName}
            </Typography>
          </Box>
          
          {document.clientPhone && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {document.clientPhone}
              </Typography>
            </Box>
          )}
          
          {document.clientEmail && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {document.clientEmail}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Acto principal detectado */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AssignmentIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Acto Principal
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
            {document.actoPrincipalDescripcion}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MoneyIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
              {formatCurrency(document.actoPrincipalValor)}
            </Typography>
          </Box>
        </Box>

        {/* Información adicional colapsible */}
        <Box>
          <IconButton
            onClick={handleExpandClick}
            size="small"
            sx={{ p: 0.5 }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            <Typography variant="body2" sx={{ ml: 0.5, color: 'text.primary' }}>
              {expanded ? 'Menos detalles' : 'Más detalles'}
            </Typography>
          </IconButton>
          
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Protocolo:</strong> {document.protocolNumber}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Total Factura:</strong> {formatCurrency(document.totalFactura)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Matrizador XML:</strong> {document.matrizadorName}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Creado:</strong> {formatDate(document.createdAt)}
              </Typography>
              
              {document.verificationCode && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Código de Verificación:</strong> {document.verificationCode}
                </Typography>
              )}

              {/* Items secundarios */}
              {document.itemsSecundarios && document.itemsSecundarios.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                    Items Secundarios ({document.itemsSecundarios.length}):
                  </Typography>
                  <Stack spacing={0.5}>
                    {document.itemsSecundarios.slice(0, 3).map((item, index) => (
                      <Typography key={index} variant="caption" color="text.secondary">
                        • {item.descripcion} - {formatCurrency(item.valor)}
                      </Typography>
                    ))}
                    {document.itemsSecundarios.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        ... y {document.itemsSecundarios.length - 3} más
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>

        {/* Botón de acción */}
        {document.status === 'EN_PROCESO' && onStatusChange && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              onClick={handleMarkAsReady}
              disabled={loading}
              startIcon={<CheckCircleIcon />}
              sx={{
                // Removido estilos manuales - el tema enterprise maneja los colores automáticamente
                // Los botones success ahora usan gradientes y colores enterprise
              }}
            >
              {loading ? 'Marcando...' : 'Marcar como Listo'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentCard; 