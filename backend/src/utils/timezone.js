// Utilidades de zona horaria y formateo de fechas en backend

const DEFAULT_LOCALE = 'es-EC';
const DEFAULT_TIMEZONE = 'America/Guayaquil';

export function getAppTimeZone() {
  return process.env.APP_TIMEZONE || process.env.TZ || DEFAULT_TIMEZONE;
}

export function formatDateTime(dateInput, options = {}, locale = DEFAULT_LOCALE) {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: getAppTimeZone(),
    ...options
  });
  return formatter.format(date);
}

export function formatDateOnly(dateInput, options = {}, locale = DEFAULT_LOCALE) {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: getAppTimeZone(),
    ...options
  });
  return formatter.format(date);
}

export function formatTimeOnly(dateInput, options = {}, locale = DEFAULT_LOCALE) {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: getAppTimeZone(),
    ...options
  });
  return formatter.format(date);
}

export function formatLongDateTime(dateInput, locale = DEFAULT_LOCALE) {
  const date = new Date(dateInput);
  // Ej: 26 de agosto de 2025, 12:22 p. m.
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: getAppTimeZone() }).format(date);
  const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: getAppTimeZone() }).format(date);
  const year = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: getAppTimeZone() }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: getAppTimeZone() }).format(date);
  return `${day} de ${month} de ${year}, ${time}`;
}

/**
 * Formatea fecha a string legible en español para Ecuador
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada: "14 de noviembre de 2025"
 */
export function formatDateES(date) {
  if (!date) return 'No disponible';

  const dateObj = new Date(date);
  const locale = DEFAULT_LOCALE;
  const timezone = getAppTimeZone();

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: timezone }).format(dateObj);
  const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: timezone }).format(dateObj);
  const year = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: timezone }).format(dateObj);

  return `${day} de ${month} de ${year}`;
}

/**
 * Formatea fecha y hora completa con segundos en formato 24h
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada: "14 de noviembre de 2025, 15:30:45"
 */
export function formatDateTimeES(date) {
  if (!date) return 'No disponible';

  const dateObj = new Date(date);
  const locale = DEFAULT_LOCALE;
  const timezone = getAppTimeZone();

  // Obtener partes de fecha
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: timezone }).format(dateObj);
  const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: timezone }).format(dateObj);
  const year = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: timezone }).format(dateObj);

  // Obtener partes de hora en formato 24h
  const formatter24h = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone
  });
  const timePart = formatter24h.format(dateObj);

  return `${day} de ${month} de ${year}, ${timePart}`;
}

/**
 * Obtiene la fecha/hora actual de Ecuador
 * @returns {Date} Fecha actual en timezone Ecuador
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
  return new Date(dateObj.toLocaleString('en-US', { timeZone: getAppTimeZone() }));
}

export default {
  getAppTimeZone,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  formatLongDateTime,
  formatDateES,
  formatDateTimeES,
  nowEcuador,
  toEcuadorTime
};


