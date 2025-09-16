// Índice de modificadores por familia de actos
// Permite acceso programático a los parciales de mods

export const Mods = {
  poderes: 'poderes.hbs',
  transacciones: 'transacciones.hbs',
  hipotecas: 'hipotecas.hbs',
  autorizaciones: 'autorizaciones.hbs',
  reconocimientos: 'reconocimientos.hbs',
  generico: 'generico.hbs'
};

/**
 * Determina la familia de un acto basado en palabras clave
 * @param {string} acto - Tipo de acto
 * @returns {string} - Nombre de la familia
 */
export function detectFamily(acto = '') {
  const actoLower = acto.toLowerCase();

  if (actoLower.includes('poder')) return 'poderes';
  if (actoLower.includes('compra') || actoLower.includes('venta') || actoLower.includes('donacion')) return 'transacciones';
  if (actoLower.includes('hipoteca')) return 'hipotecas';
  if (actoLower.includes('autorizacion') || actoLower.includes('autorización')) return 'autorizaciones';
  if (actoLower.includes('reconocimiento')) return 'reconocimientos';

  return 'generico';
}

export default { Mods, detectFamily };