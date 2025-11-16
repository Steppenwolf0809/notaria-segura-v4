/**
 * Utilidades para manejo de fechas en el sistema
 * Funciones conservadoras y bien testeadas para cálculos temporales
 */

/**
 * Obtiene la fecha de hace N días desde hoy
 * @param {number} days - Número de días hacia atrás
 * @returns {Date} - Fecha calculada
 */
export const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0); // Inicio del día
  return date;
};

/**
 * Verifica si una fecha está dentro de los últimos N días
 * @param {string|Date} dateToCheck - Fecha a verificar
 * @param {number} days - Número de días hacia atrás (por defecto 7)
 * @returns {boolean} - True si está dentro del rango
 */
export const isWithinLastDays = (dateToCheck, days = 7) => {
  if (!dateToCheck) return false;
  
  try {
    const targetDate = new Date(dateToCheck);
    const cutoffDate = getDaysAgo(days);
    
    return targetDate >= cutoffDate;
  } catch (error) {
    console.warn('Error al verificar fecha:', error);
    return false;
  }
};

/**
 * Filtra documentos que fueron entregados en los últimos N días
 * Función específica para la columna "ENTREGADO"
 * @param {Array} documents - Array de documentos
 * @param {number} days - Días hacia atrás (por defecto 7)
 * @returns {Array} - Documentos filtrados
 */
export const filterRecentlyDelivered = (documents, days = 7) => {
  if (!Array.isArray(documents)) return [];
  
  return documents.filter(doc => {
    // Usar fechaEntrega si existe, sino fechaActualizacion, sino createdAt
    const deliveryDate = doc.fechaEntrega || doc.updatedAt || doc.createdAt;
    return isWithinLastDays(deliveryDate, days);
  });
};

/**
 * Formatea una fecha para mostrar en la interfaz
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export const formatDisplayDate = (date) => {
  if (!date) return 'Fecha no disponible';
  
  try {
    return new Date(date).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

/**
 * Obtiene el texto descriptivo para la nota informativa
 * @param {number} days - Número de días del filtro
 * @returns {string} - Texto descriptivo
 */
export const getDeliveryFilterNote = (days = 7) => {
  return `Mostrando entregas de los últimos ${days} días`;
};

/**
 * Constantes para períodos comunes
 */
export const DELIVERY_FILTER_PERIODS = {
  WEEK: 7,
  TWO_WEEKS: 14,
  MONTH: 30
};

// ============================================================================
// UTILIDADES DE TIMEZONE ECUADOR (GMT-5)
// ============================================================================

const ECUADOR_TIMEZONE = 'America/Guayaquil';
const ECUADOR_LOCALE = 'es-EC';

/**
 * Formatea fecha a string legible en español (Ecuador)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada: "14 de noviembre de 2025"
 */
export function formatDateES(date) {
  if (!date) return 'No disponible';

  const dateObj = new Date(date);

  const options = {
    timeZone: ECUADOR_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  return new Intl.DateTimeFormat(ECUADOR_LOCALE, options).format(dateObj);
}

/**
 * Formatea fecha y hora completa con segundos
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada: "14 de noviembre de 2025, 15:30:45"
 */
export function formatDateTimeES(date) {
  if (!date) return 'No disponible';

  const dateObj = new Date(date);

  const options = {
    timeZone: ECUADOR_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  return new Intl.DateTimeFormat(ECUADOR_LOCALE, options).format(dateObj);
}

/**
 * Formatea solo la fecha en formato corto
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada: "14/11/2025"
 */
export function formatDateShort(date) {
  if (!date) return 'No disponible';

  const dateObj = new Date(date);

  const options = {
    timeZone: ECUADOR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  return new Intl.DateTimeFormat(ECUADOR_LOCALE, options).format(dateObj);
}

/**
 * Formatea fecha y hora en formato corto
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada: "14/11/2025, 15:30"
 */
export function formatDateTimeShort(date) {
  if (!date) return 'No disponible';

  const dateObj = new Date(date);

  const options = {
    timeZone: ECUADOR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  return new Intl.DateTimeFormat(ECUADOR_LOCALE, options).format(dateObj);
}

/**
 * Obtiene la fecha/hora actual de Ecuador
 * @returns {Date} Fecha actual
 */
export function nowEcuador() {
  return new Date();
}

/**
 * Convierte fecha a timezone de Ecuador
 * @param {Date|string} date - Fecha a convertir
 * @returns {Date} Fecha ajustada a timezone Ecuador
 */
export function toEcuadorTime(date) {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.toLocaleString('en-US', { timeZone: ECUADOR_TIMEZONE }));
}