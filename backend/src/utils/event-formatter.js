/**
 * Utilidades para formatear eventos del historial de documentos
 * Convierte datos técnicos en mensajes legibles para el usuario
 */

/**
 * Formatea la descripción de un evento para mostrar al usuario
 * @param {Object} event - Evento de documento
 * @param {Object} event.eventType - Tipo de evento
 * @param {Object} event.details - Detalles del evento
 * @param {Object} event.user - Usuario que ejecutó la acción
 * @returns {string} Descripción formateada
 */
function formatEventDescription(event) {
  const { eventType, details = {}, user } = event;
  
  // Nombre del usuario que ejecutó la acción
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Sistema';
  const userRole = user?.role || 'SISTEMA';

  switch (eventType) {
    case 'DOCUMENT_CREATED':
      if (details.source === 'XML_UPLOAD') {
        return `Documento creado desde archivo XML por ${userName}`;
      } else if (details.migration) {
        return `Documento registrado en el sistema`;
      } else {
        return `Documento creado por ${userName}`;
      }

    case 'DOCUMENT_ASSIGNED':
      const matrizadorName = details.matrizadorName || 'un matrizador';
      const assignmentType = details.assignmentType;
      
      if (assignmentType === 'AUTOMATIC') {
        return `Asignado automáticamente a ${matrizadorName}`;
      } else if (assignmentType === 'MANUAL') {
        return `Asignado por ${userName} a ${matrizadorName}`;
      } else if (details.migration) {
        return `Asignado a ${matrizadorName}`;
      } else {
        return `Documento asignado a ${matrizadorName}`;
      }

    case 'STATUS_CHANGED':
      const { previousStatus, newStatus } = details;
      
      switch (newStatus) {
        case 'EN_PROCESO':
          return `Documento en proceso de matrizarización`;
        case 'LISTO':
          const completedBy = details.completedBy || userName;
          if (details.migration) {
            return `Documento completado y listo para entrega`;
          } else {
            return `Documento completado por ${completedBy} y listo para entrega`;
          }
        case 'ENTREGADO':
          const deliveredTo = details.deliveredTo || details.clientName || 'cliente';
          const deliveredBy = details.deliveredBy || userName;
          
          if (details.migration) {
            return `Documento entregado a ${deliveredTo}`;
          } else {
            return `Documento entregado a ${deliveredTo} por ${deliveredBy}`;
          }
        default:
          if (previousStatus && newStatus) {
            return `Estado cambiado de ${translateStatus(previousStatus)} a ${translateStatus(newStatus)}`;
          }
          return `Estado del documento actualizado por ${userName}`;
      }

    case 'INFO_EDITED':
      const changedFields = Object.keys(details.changes || {});
      if (changedFields.length > 0) {
        const fieldNames = changedFields.map(field => translateFieldName(field)).join(', ');
        return `Información actualizada por ${userName}: ${fieldNames}`;
      } else {
        return `Información del documento actualizada por ${userName}`;
      }

    case 'GROUP_CREATED':
      const groupSize = details.groupSize || 'varios';
      return `Documento agrupado con ${groupSize} documentos más por ${userName}`;

    case 'GROUP_DELIVERED':
      const groupDeliveredTo = details.deliveredTo || 'cliente';
      return `Grupo de documentos entregado a ${groupDeliveredTo} por ${userName}`;

    case 'VERIFICATION_GENERATED':
      if (details.verificationCodeGenerated) {
        return `Código de verificación generado por ${userName}`;
      } else {
        return `Proceso de verificación iniciado por ${userName}`;
      }

    case 'WHATSAPP_SENT':
      const messageType = details.messageType;
      const phoneNumber = details.phoneNumber || 'cliente';
      
      switch (messageType) {
        case 'DOCUMENT_READY':
          return `Notificación de documento listo enviada a ${phoneNumber}`;
        case 'DOCUMENT_DELIVERED':
          return `Notificación de entrega enviada a ${phoneNumber}`;
        case 'GROUP_DELIVERY':
          return `Notificación de entrega grupal enviada a ${phoneNumber}`;
        default:
          if (details.status === 'SENT' || details.whatsappSent) {
            const recipient = details.clientName || phoneNumber;
            return `Notificación WhatsApp enviada a ${recipient}`;
          } else {
            const error = details.errorMessage || 'Error desconocido';
            return `Error al enviar WhatsApp: ${error}`;
          }
      }

    default:
      // Fallback para tipos de evento desconocidos
      return event.description || `Acción realizada por ${userName}`;
  }
}

/**
 * Traduce estados técnicos a lenguaje natural
 */
function translateStatus(status) {
  const statusMap = {
    'PENDIENTE': 'Pendiente',
    'EN_PROCESO': 'En Proceso',
    'LISTO': 'Listo',
    'ENTREGADO': 'Entregado'
  };
  return statusMap[status] || status;
}

/**
 * Traduce nombres de campos técnicos a lenguaje natural
 */
function translateFieldName(fieldName) {
  const fieldMap = {
    'clientName': 'Nombre del cliente',
    'clientPhone': 'Teléfono',
    'clientEmail': 'Email',
    'clientRuc': 'RUC/Cédula',
    'documentType': 'Tipo de documento',
    'actoPrincipalDescripcion': 'Descripción del acto',
    'actoPrincipalValor': 'Valor del acto',
    'totalFactura': 'Total de la factura',
    'detalle_documento': 'Detalle del documento',
    'comentarios_recepcion': 'Comentarios de recepción'
  };
  return fieldMap[fieldName] || fieldName;
}

/**
 * Obtiene información contextual adicional para mostrar en el timeline
 */
function getEventContextInfo(event) {
  const { eventType, details = {} } = event;
  const contextInfo = [];

  switch (eventType) {
    case 'DOCUMENT_CREATED':
      if (details.documentType) {
        contextInfo.push(`Tipo: ${details.documentType}`);
      }
      if (details.totalFactura) {
        contextInfo.push(`Valor: ${formatCurrency(details.totalFactura)}`);
      }
      break;

    case 'DOCUMENT_ASSIGNED':
      if (details.matrizadorRole) {
        contextInfo.push(`Rol: ${details.matrizadorRole}`);
      }
      if (details.assignmentType === 'AUTOMATIC') {
        contextInfo.push('Asignación automática');
      }
      break;

    case 'STATUS_CHANGED':
      if (details.newStatus === 'ENTREGADO') {
        if (details.verificationCode) {
          contextInfo.push(`Código: ${details.verificationCode}`);
        }
        if (details.relationship && details.relationship !== 'titular') {
          contextInfo.push(`Relación: ${translateRelationship(details.relationship)}`);
        }
        if (details.invoicePresented) {
          contextInfo.push('Con factura');
        }
        if (details.manualVerification) {
          contextInfo.push('Verificación manual');
        }
      }
      break;

    case 'INFO_EDITED':
      const changes = details.changes || {};
      Object.entries(changes).forEach(([field, change]) => {
        if (change.from && change.to) {
          contextInfo.push(`${translateFieldName(field)}: ${change.from} → ${change.to}`);
        }
      });
      break;

    case 'WHATSAPP_SENT':
      if (details.channel) {
        contextInfo.push(`Canal: ${details.channel}`);
      }
      if (details.recipient) {
        contextInfo.push(`Destinatario: ${details.recipient}`);
      }
      break;
  }

  return contextInfo;
}

/**
 * Traduce relaciones con el titular
 */
function translateRelationship(relationship) {
  const relationshipMap = {
    'titular': 'Titular',
    'abogado': 'Abogado',
    'empleado': 'Empleado',
    'tercero': 'Tercero autorizado'
  };
  return relationshipMap[relationship] || relationship;
}

/**
 * Formatea valores monetarios
 */
function formatCurrency(amount) {
  if (!amount) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Formatea fechas de manera legible
 */
function formatEventDate(date) {
  if (!date) return '';
  
  const eventDate = new Date(date);
  const now = new Date();
  const diffMs = now - eventDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Si fue hace menos de 1 minuto
  if (diffMinutes < 1) {
    return 'Hace unos segundos';
  }
  
  // Si fue hace menos de 1 hora
  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  }
  
  // Si fue hace menos de 24 horas
  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }
  
  // Si fue hace menos de 7 días
  if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  }
  
  // Si fue hace más de una semana, mostrar fecha completa
  return eventDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Obtiene el título apropiado para cada tipo de evento
 */
function getEventTitle(eventType) {
  const titleMap = {
    'DOCUMENT_CREATED': 'Documento Creado',
    'DOCUMENT_ASSIGNED': 'Documento Asignado',
    'STATUS_CHANGED': 'Estado Actualizado',
    'INFO_EDITED': 'Información Editada',
    'GROUP_CREATED': 'Grupo Creado',
    'GROUP_DELIVERED': 'Grupo Entregado',
    'VERIFICATION_GENERATED': 'Código Generado',
    'WHATSAPP_SENT': 'Notificación Enviada'
  };
  return titleMap[eventType] || eventType;
}

/**
 * Obtiene el ícono apropiado para cada tipo de evento
 */
function getEventIcon(eventType) {
  const iconMap = {
    'DOCUMENT_CREATED': 'create',
    'DOCUMENT_ASSIGNED': 'assignment',
    'STATUS_CHANGED': 'play',
    'INFO_EDITED': 'edit',
    'GROUP_CREATED': 'group',
    'GROUP_DELIVERED': 'delivery',
    'VERIFICATION_GENERATED': 'check_circle',
    'WHATSAPP_SENT': 'notification'
  };
  return iconMap[eventType] || 'default';
}

/**
 * Obtiene el color apropiado para cada tipo de evento
 */
function getEventColor(eventType, details = {}) {
  switch (eventType) {
    case 'DOCUMENT_CREATED':
      return 'info';
    case 'DOCUMENT_ASSIGNED':
      return 'primary';
    case 'STATUS_CHANGED':
      if (details.newStatus === 'ENTREGADO') return 'success';
      if (details.newStatus === 'LISTO') return 'success';
      return 'warning';
    case 'INFO_EDITED':
      return 'info';
    case 'GROUP_CREATED':
    case 'GROUP_DELIVERED':
      return 'success';
    case 'VERIFICATION_GENERATED':
      return 'success';
    case 'WHATSAPP_SENT':
      return details.whatsappSent || details.status === 'SENT' ? 'info' : 'error';
    default:
      return 'grey';
  }
}

export {
  formatEventDescription,
  getEventContextInfo,
  formatEventDate,
  getEventTitle,
  getEventIcon,
  getEventColor,
  translateStatus,
  translateFieldName,
  translateRelationship,
  formatCurrency
};