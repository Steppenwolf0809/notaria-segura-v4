import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  CalendarToday as DateIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  ArrowForward as ArrowForwardIcon,
  LocalShipping as EntregarIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/currencyUtils';

/**
 * Componente de tarjeta unificado para ambos roles (Matrizador y Archivo)
 * Implementa el patrón consistente de interacción especificado por el usuario:
 * - Click en tarjeta → Ver detalles
 * - Click en lápiz → Editar documento  
 * - Botón visible para avanzar estado
 * - Información esencial organizada
 */
const UnifiedDocumentCard = ({
  document,
  role = 'matrizador', // 'matrizador' | 'archivo'
  onOpenDetail,
  onOpenEdit,
  onAdvanceStatus,
  isDragging = false,
  dragHandlers = {},
  style = {}
}) => {

  /**
   * Formatear teléfono con guiones
   */
  const formatPhone = (phone) => {
    if (!phone) return null;
    if (phone.length === 10 && phone.startsWith('09')) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  /**
   * Formatear fecha de manera compacta
   */
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yy', { locale: es });
    } catch (error) {
      return 'N/A';
    }
  };

  // Función de formateo de moneda movida a utils/currencyUtils.js

  /**
   * Obtener color del estado
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
   * Obtener texto del estado
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
   * Obtener configuración del botón de avance según el estado
   */
  const getAdvanceButtonConfig = () => {
    const { status } = document;

    if (role === 'matrizador') {
      if (status === 'EN_PROCESO') {
        return {
          text: 'Marcar Listo',
          color: 'success',
          icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
          newStatus: 'LISTO'
        };
      }
      if (status === 'LISTO') {
        return {
          text: 'Entregar',
          color: 'primary',
          icon: <EntregarIcon sx={{ fontSize: 16 }} />,
          newStatus: 'ENTREGADO'
        };
      }
    }

    if (role === 'archivo') {
      if (status === 'EN_PROCESO') {
        return {
          text: 'Marcar Listo',
          color: 'success',
          icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
          newStatus: 'LISTO'
        };
      }
      if (status === 'LISTO') {
        return {
          text: 'Entregar',
          color: 'primary',
          icon: <EntregarIcon sx={{ fontSize: 16 }} />,
          newStatus: 'ENTREGADO'
        };
      }
    }

    return null;
  };

  /**
   * Obtener fecha relevante según el rol y estado
   */
  const getRelevantDate = () => {
    const { status, createdAt, updatedAt } = document;

    if (role === 'archivo' && status === 'ENTREGADO') {
      return { label: 'Entregado', date: updatedAt };
    }

    if (status === 'LISTO') {
      return { label: 'Listo', date: updatedAt };
    }

    return { label: 'Recibido', date: createdAt };
  };

  // Obtener configuraciones
  const advanceButtonConfig = getAdvanceButtonConfig();
  const relevantDate = getRelevantDate();
  const formattedPhone = formatPhone(document.clientPhone);
  const formattedAmount = formatCurrency(document.totalFactura); // ⭐ CAMBIO: Usar valor total de factura

  return (
    <Card
      draggable={dragHandlers.onDragStart ? "true" : "false"}
      onDragStart={dragHandlers.onDragStart}
      onDragEnd={dragHandlers.onDragEnd}
      onClick={(e) => {
        // Solo abrir detalles si no se está arrastrando y no se hizo click en un botón
        if (!isDragging && !e.target.closest('button')) {
          onOpenDetail?.(document);
        }
      }}
      sx={{
        mb: 2,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        },
        '&:active': {
          cursor: 'grabbing'
        },
        ...style
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header: Nombre del cliente y Estado */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.2 }}>
              {document.clientName || 'Sin nombre'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              #{document.protocolNumber}
            </Typography>
          </Box>
          <Chip
            label={getStatusText(document.status)}
            color={getStatusColor(document.status)}
            size="small"
            variant="filled"
          />
        </Box>

        {/* Tipo de documento */}
        <Box sx={{ mb: 1.5 }}>
          <Chip
            label={document.documentType}
            size="small"
            sx={{
              fontSize: '0.75rem',
              height: 24,
              bgcolor: 'action.hover',
              color: 'text.primary'
            }}
          />
        </Box>

        {/* Descripción del trámite (acto principal) */}
        {document.actoPrincipalDescripcion && (
          <Typography
            variant="body2"
            sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}
          >
            {document.actoPrincipalDescripcion}
          </Typography>
        )}

        {/* Información de contacto */}
        {formattedPhone && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {formattedPhone}
            </Typography>
          </Box>
        )}

        {/* Fecha relevante */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DateIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {relevantDate.label}: {formatDate(relevantDate.date)}
          </Typography>
        </Box>

        {/* Monto si aplica */}
        {formattedAmount && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <MoneyIcon sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
            <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'success.main' }}>
              {formattedAmount}
            </Typography>
          </Box>
        )}

        {/* 🚫 Indicador de grupo ELIMINADO */}



        {/* Acciones: Botón de editar y botón de avance */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          {/* Botón de editar */}
          <Tooltip title="Editar documento" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit?.(document);
              }}
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'action.hover',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s'
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          {/* Botón de avanzar estado */}
          {advanceButtonConfig && (
            <Button
              variant="contained"
              color={advanceButtonConfig.color}
              size="small"
              startIcon={advanceButtonConfig.icon}
              onClick={(e) => {
                e.stopPropagation();
                onAdvanceStatus?.(document, advanceButtonConfig.newStatus);
              }}
              sx={{
                fontSize: '0.75rem',
                height: 32,
                minWidth: 'auto',
                px: 1.5,
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              {advanceButtonConfig.text}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default UnifiedDocumentCard;
