import React from 'react';
import { Chip, Tooltip } from '@mui/material';

/**
 * 💰 Indicador de estado de pago
 * Muestra el estado de pago de un documento con colores distintivos
 * 
 * @param {string} paymentStatus - PAGADO, PARCIAL, PENDIENTE, SIN_FACTURA
 * @param {Object} paymentInfo - { totalFacturado, totalPagado, saldoPendiente, facturas }
 * @param {string} documentStatus - Estado del documento (opcional, para detectar NC anuladas)
 */
const PaymentIndicator = ({ paymentStatus, paymentInfo, documentStatus }) => {
  // No mostrar indicador de pago para documentos anulados por nota de crédito
  if (documentStatus === 'ANULADO_NOTA_CREDITO') {
    return null;
  }
  
  const config = {
    PAGADO: { 
      label: '💵 Pagado', 
      color: '#16a34a', 
      bgColor: '#dcfce7',
      darkBgColor: '#166534'
    },
    PARCIAL: { 
      label: '⚠️ Pago parcial', 
      color: '#d97706', 
      bgColor: '#fef3c7',
      darkBgColor: '#92400e'
    },
    PENDIENTE: { 
      label: '❌ Pago pendiente', 
      color: '#dc2626', 
      bgColor: '#fee2e2',
      darkBgColor: '#991b1b'
    },
    SIN_FACTURA: { 
      label: '📄 Sin factura', 
      color: '#6b7280', 
      bgColor: '#f3f4f6',
      darkBgColor: '#374151'
    }
  };
  
  const statusConfig = config[paymentStatus] || config.SIN_FACTURA;
  
  const tooltipContent = paymentInfo 
    ? `Total: $${paymentInfo.totalFacturado?.toFixed(2) || '0.00'} | Pagado: $${paymentInfo.totalPagado?.toFixed(2) || '0.00'} | Pendiente: $${paymentInfo.saldoPendiente?.toFixed(2) || '0.00'}`
    : 'Sin información de factura';
  
  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        label={statusConfig.label}
        size="small"
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          height: 22,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? statusConfig.darkBgColor : statusConfig.bgColor,
          color: (theme) => theme.palette.mode === 'dark' ? '#fff' : statusConfig.color,
          border: '1px solid',
          borderColor: statusConfig.color,
          '& .MuiChip-label': { px: 1 }
        }}
      />
    </Tooltip>
  );
};

export default PaymentIndicator;
