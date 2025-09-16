// Utilidades para enmascarar PII en logs
// ---------------------------------------

/**
 * Enmascara cédulas/RUC en logs
 * @param {string} text - Texto que puede contener PII
 * @returns {string} - Texto con PII enmascarada
 */
export function maskPII(text) {
  if (!text || typeof text !== 'string') return text;

  // Enmascarar cédulas ecuatorianas (10 dígitos)
  const cedulaPattern = /\b(\d{2})(\d{6})(\d{2})\b/g;
  let masked = text.replace(cedulaPattern, '$1******$3');

  // Enmascarar RUC (13 dígitos)
  const rucPattern = /\b(\d{2})(\d{7})(\d{4})\b/g;
  masked = masked.replace(rucPattern, '$1*******$3');

  // Enmascarar números de teléfono (10 dígitos)
  const phonePattern = /\b(\d{3})(\d{3})(\d{4})\b/g;
  masked = masked.replace(phonePattern, '$1***$3');

  return masked;
}

/**
 * Enmascara nombres completos en logs
 * @param {string} name - Nombre completo
 * @returns {string} - Nombre enmascarado
 */
export function maskName(name) {
  if (!name || typeof name !== 'string') return name;

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;

  // Mantener primera letra del primer nombre y primer apellido
  if (parts.length >= 2) {
    const firstName = parts[0].charAt(0) + '*'.repeat(Math.max(0, parts[0].length - 1));
    const lastName = parts[1].charAt(0) + '*'.repeat(Math.max(0, parts[1].length - 1));
    const rest = parts.slice(2).map(p => '*'.repeat(p.length)).join(' ');
    return `${firstName} ${lastName}${rest ? ' ' + rest : ''}`;
  }

  // Si solo hay un nombre, enmascarar parcialmente
  if (parts[0].length > 2) {
    return parts[0].charAt(0) + '*'.repeat(parts[0].length - 2) + parts[0].charAt(parts[0].length - 1);
  }

  return name;
}

/**
 * Enmascara datos sensibles en objetos
 * @param {Object} obj - Objeto que puede contener PII
 * @returns {Object} - Objeto con PII enmascarada
 */
export function maskObjectPII(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = { ...obj };

  // Enmascarar campos sensibles conocidos
  const sensitiveFields = ['nombre', 'name', 'cedula', 'ruc', 'telefono', 'phone', 'email'];

  for (const field of sensitiveFields) {
    if (masked[field]) {
      if (typeof masked[field] === 'string') {
        if (field === 'nombre' || field === 'name') {
          masked[field] = maskName(masked[field]);
        } else {
          masked[field] = maskPII(masked[field]);
        }
      }
    }
  }

  // Procesar arrays recursivamente
  if (Array.isArray(masked)) {
    return masked.map(maskObjectPII);
  }

  // Procesar objetos anidados
  for (const key in masked) {
    if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskObjectPII(masked[key]);
    }
  }

  return masked;
}

export default { maskPII, maskName, maskObjectPII };