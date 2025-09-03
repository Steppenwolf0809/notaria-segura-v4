// Utilidades comunes para transiciones de estado de documentos

const STATUS_ORDER = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
// Estados especiales fuera del flujo normal
const EXTRA_STATUSES = ['ANULADO_NOTA_CREDITO'];

export function isValidStatus(status) {
  return STATUS_ORDER.includes(status) || EXTRA_STATUSES.includes(status);
}

export function isReversion(previousStatus, newStatus) {
  // Transiciones a estados especiales no forman parte del flujo de reversión estándar
  if (EXTRA_STATUSES.includes(newStatus) || EXTRA_STATUSES.includes(previousStatus)) return false;
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
export const EXTRA_STATUS_LIST = EXTRA_STATUSES;
