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