/**
 * Utilidades unificadas para formateo de moneda
 * Evita duplicación del símbolo $ y centraliza el formato
 */

/**
 * Formatea un valor como moneda USD
 * @param {number} value - Valor a formatear
 * @param {Object} options - Opciones de formateo
 * @returns {string} Valor formateado como moneda (ej: "$1,234.56")
 */
export const formatCurrency = (value, options = {}) => {
  if (!value && value !== 0) return '$0.00';
  
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'es-EC'
  } = options;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};

/**
 * Formatea un valor como moneda simple sin decimales
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado como moneda sin decimales (ej: "$1,234")
 */
export const formatCurrencySimple = (value) => {
  return formatCurrency(value, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
};

/**
 * Formatea un valor como número con separadores pero sin símbolo de moneda
 * @param {number} value - Valor a formatear
 * @param {string} locale - Locale a usar (por defecto 'es-EC')
 * @returns {string} Valor formateado como número (ej: "1,234.56")
 */
export const formatNumber = (value, locale = 'es-EC') => {
  if (!value && value !== 0) return '0';
  
  return new Intl.NumberFormat(locale).format(value);
};

export default {
  formatCurrency,
  formatCurrencySimple,
  formatNumber
};
