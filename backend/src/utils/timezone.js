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

export default {
  getAppTimeZone,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  formatLongDateTime
};


