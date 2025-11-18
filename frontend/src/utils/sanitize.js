/**
 * Servicio de Sanitización para Prevención de XSS
 *
 * Utiliza DOMPurify para limpiar todo contenido del usuario antes de renderizarlo,
 * previniendo ataques de Cross-Site Scripting (XSS).
 *
 * @module sanitize
 */

import DOMPurify from 'dompurify';

/**
 * Configuración por defecto para DOMPurify
 * - ALLOWED_TAGS: Solo permite texto plano (ninguna etiqueta HTML)
 * - ALLOWED_ATTR: No permite atributos
 * - KEEP_CONTENT: Mantiene el contenido de texto
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Configuración permisiva para HTML básico (usado en descripciones ricas)
 * Permite solo etiquetas seguras de formato
 */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Sanitiza una cadena de texto eliminando todo HTML y scripts
 *
 * @param {string} dirty - Texto potencialmente peligroso
 * @returns {string} Texto limpio y seguro
 *
 * @example
 * sanitize('<script>alert("XSS")</script>Hola')
 * // Retorna: 'Hola'
 *
 * sanitize('Juan <img src=x onerror=alert(1)> Pérez')
 * // Retorna: 'Juan  Pérez'
 */
export function sanitize(dirty) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, DEFAULT_CONFIG);
}

/**
 * Sanitiza HTML permitiendo solo etiquetas de formato básico
 *
 * @param {string} dirty - HTML potencialmente peligroso
 * @returns {string} HTML limpio con solo etiquetas seguras
 *
 * @example
 * sanitizeRichText('<p>Hola <b>mundo</b></p><script>alert(1)</script>')
 * // Retorna: '<p>Hola <b>mundo</b></p>'
 */
export function sanitizeRichText(dirty) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, RICH_TEXT_CONFIG);
}

/**
 * Sanitiza un objeto recursivamente, limpiando todos sus valores de tipo string
 *
 * @param {Object} obj - Objeto con datos potencialmente peligrosos
 * @returns {Object} Objeto con todos los strings sanitizados
 *
 * @example
 * sanitizeObject({
 *   nombre: '<script>alert(1)</script>Juan',
 *   edad: 25,
 *   direccion: { calle: '<img src=x onerror=alert(1)>Main St' }
 * })
 * // Retorna: { nombre: 'Juan', edad: 25, direccion: { calle: 'Main St' } }
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitize(item);
      } else if (typeof item === 'object') {
        return sanitizeObject(item);
      }
      return item;
    });
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Hook de React para sanitizar valores de forma reactiva
 *
 * @param {string} value - Valor a sanitizar
 * @param {boolean} allowRichText - Si permite HTML básico
 * @returns {string} Valor sanitizado
 *
 * @example
 * function MyComponent({ userName }) {
 *   const safeName = useSanitize(userName);
 *   return <div>{safeName}</div>;
 * }
 */
export function useSanitize(value, allowRichText = false) {
  if (allowRichText) {
    return sanitizeRichText(value);
  }
  return sanitize(value);
}

/**
 * Componente React para renderizar texto sanitizado
 *
 * @example
 * <SafeText value={userInput} />
 * <SafeText value={description} richText />
 */
export function SafeText({ value, richText = false, ...props }) {
  const sanitizedValue = useSanitize(value, richText);

  if (richText) {
    return <span {...props} dangerouslySetInnerHTML={{ __html: sanitizedValue }} />;
  }

  return <span {...props}>{sanitizedValue}</span>;
}

/**
 * Valida que un string no contenga patrones de XSS comunes
 * Útil para validación adicional antes de enviar al servidor
 *
 * @param {string} value - Valor a validar
 * @returns {boolean} true si es seguro, false si detecta XSS
 *
 * @example
 * isXSSFree('Juan Pérez') // true
 * isXSSFree('<script>alert(1)</script>') // false
 */
export function isXSSFree(value) {
  if (!value || typeof value !== 'string') {
    return true;
  }

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return !xssPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitiza parámetros de URL
 *
 * @param {string} param - Parámetro de URL
 * @returns {string} Parámetro sanitizado
 */
export function sanitizeURLParam(param) {
  if (!param || typeof param !== 'string') {
    return '';
  }

  // Eliminar caracteres peligrosos en URLs
  return param
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

// Exportaciones por defecto
export default {
  sanitize,
  sanitizeRichText,
  sanitizeObject,
  useSanitize,
  SafeText,
  isXSSFree,
  sanitizeURLParam,
};
