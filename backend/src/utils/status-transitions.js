// Utilidades comunes para transiciones de estado de documentos

const STATUS_ORDER = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];

export function isValidStatus(status) {
  return STATUS_ORDER.includes(status);
}

export function isReversion(previousStatus, newStatus) {
  return STATUS_ORDER.indexOf(newStatus) < STATUS_ORDER.indexOf(previousStatus);
}

// Devuelve los campos que deben limpiarse cuando hay una reversión
export function getReversionCleanupData(previousStatus, newStatus) {
  const cleanup = {};
  const idx = (s) => STATUS_ORDER.indexOf(s);

  // Si se revierte desde LISTO hacia atrás, limpiar códigos de retiro/verificación
  if (previousStatus === 'LISTO' && idx(newStatus) < idx('LISTO')) {
    cleanup.codigoRetiro = null;
    cleanup.verificationCode = null;
  }

  // Si se revierte desde ENTREGADO, limpiar datos de entrega y códigos
  if (previousStatus === 'ENTREGADO') {
    cleanup.usuarioEntregaId = null;
    cleanup.fechaEntrega = null;
    cleanup.entregadoA = null;
    cleanup.relacionTitular = null;
    cleanup.codigoRetiro = null;
    cleanup.verificationCode = null;
  }

  return cleanup;
}

export const STATUS_ORDER_LIST = STATUS_ORDER;

