// Servicio: Helpers de texto para concuerdos
// ------------------------------------------
// Propósito: Funciones utilitarias para formateo de texto en concuerdos
// Todas las funciones son puras y sin efectos secundarios

/**
 * Determina la concordancia verbal para "otorga" según número de otorgantes.
 * @param {Array} otorgantes - Lista de otorgantes
 * @returns {string} - "que otorga" o "que otorgan"
 */
export function concordanciaOtorga(otorgantes = []) {
  return otorgantes.length === 1 ? 'que otorga' : 'que otorgan';
}

/**
 * Determina el género para "hijo/a" según el género especificado.
 * @param {string} genero - Género ("M", "F", u otro)
 * @returns {string} - "hijo", "hija", o "hijo/a"
 */
export function hijoOHija(genero = '') {
  const gen = genero.toUpperCase();
  if (gen === 'M') return 'hijo';
  if (gen === 'F') return 'hija';
  return 'hijo/a';
}

/**
 * Formatea una persona natural o jurídica con representación si aplica.
 * Preserva el case original de los nombres.
 * @param {Object} p - Objeto persona
 * @param {string} p.nombre - Nombre de la persona
 * @param {string} p.tipo_persona - "Natural" o "Jurídica"
 * @param {Array} [p.representantes] - Lista de representantes
 * @returns {string} - Texto formateado
 */
export function renderPersona(p = {}) {
  if (!p.nombre) return '';

  let result = p.nombre;

  // Agregar representación si existe
  if (p.representantes && p.representantes.length > 0) {
    const rep = p.representantes[0]; // Tomar el primer representante
    if (rep.cargo && rep.nombre) {
      result += `, ${rep.cargo} ${rep.nombre}`;
    }
  }

  return result;
}

/**
 * Formatea una lista de personas unidas con " y ".
 * @param {Array} arr - Lista de objetos persona
 * @returns {string} - Lista formateada
 */
export function renderListaPersonas(arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return '';

  const formatted = arr.map(p => renderPersona(p)).filter(name => name);

  if (formatted.length === 0) return '';
  if (formatted.length === 1) return formatted[0];

  const last = formatted.pop();
  return formatted.join(', ') + ' y ' + last;
}

export default {
  concordanciaOtorga,
  hijoOHija,
  renderPersona,
  renderListaPersonas
};