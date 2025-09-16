// Servicio: Router de estructura de concuerdos (A/B/C)
// ----------------------------------------------------
// Propósito:
// - Determinar la "estructura base" del concuerdo a usar según los comparecientes
//   y el tipo de relación detectada en los datos: 
//   • A: Otorgante → Beneficiario (al menos 1 otorgante y 1 beneficiario)
//   • B: Solo otorgante (no hay beneficiarios explícitos)
//   • C: Especial (casos mixtos, múltiples actos, o reglas específicas)
//
// Alcance (T1):
// - Solo stub con interfaces y comentarios. Sin lógica de negocio todavía.
// - Mantiene la arquitectura simple (KISS) y preparada para T2 (flags).
//
// Uso esperado (futuro):
// - Será invocado por `concuerdo-service` con datos ya normalizados
//   (otorgantes/beneficiarios) para decidir qué template base renderizar.

/**
 * Tipo de retorno para la detección de estructura.
 * @typedef {Object} StructureDecision
 * @property {('A'|'B'|'C')} tipo - Código de estructura base seleccionada
 * @property {string} template - Nombre del template base sugerido
 * @property {Object} [metadata] - Información adicional para modificadores
 */

/**
 * Determina la estructura base del concuerdo a partir de datos del documento.
 *
 * @param {Object} data - Datos del documento extraído
 * @param {Array} [data.beneficiarios] - Lista de beneficiarios
 * @param {string} [data.source] - Texto fuente del documento
 * @param {string} [data.acto_o_contrato] - Tipo de acto/contrato
 * @returns {string} - Código de estructura: 'A', 'B', o 'C'
 */
export function detectStructure(data = {}) {
  const { beneficiarios = [], source = '', acto_o_contrato = '' } = data;

  // Lista de actos especiales que requieren estructura C
  const specialActs = [
    'AUTORIZACIÓN DE SALIDA',
    'AUTORIZACION DE SALIDA',
    'PROTOCOLIZACIÓN',
    'PROTOCOLIZACION',
    'POSESIÓN EFECTIVA',
    'POSESION EFECTIVA'
  ];

  // Regla 1: Si acto_o_contrato está en la lista de especiales → C
  if (acto_o_contrato && specialActs.some(act => acto_o_contrato.toUpperCase().includes(act))) {
    return 'C';
  }

  // Regla 2: Si hay beneficiarios o el texto contiene "a favor de" → A
  if (beneficiarios.length > 0 || source.toLowerCase().includes('a favor de')) {
    return 'A';
  }

  // Regla 3: Caso por defecto → B
  return 'B';
}

// Contadores en memoria para auditoría
const structureCounters = {
  A: 0,
  B: 0,
  C: 0,
  total: 0
};

/**
 * Genera explicación de la estructura detectada para auditoría.
 *
 * @param {string} structure - Código de estructura ('A', 'B', 'C')
 * @returns {Object} - Información de auditoría
 */
export function explainStructure(structure) {
  // Incrementar contadores
  if (structureCounters.hasOwnProperty(structure)) {
    structureCounters[structure]++;
  }
  structureCounters.total++;

  // Generar explicación según estructura
  const explanations = {
    A: 'Estructura A: Otorgante → Beneficiario (beneficiarios presentes o frase "a favor de")',
    B: 'Estructura B: Solo otorgante (sin beneficiarios explícitos)',
    C: 'Estructura C: Especial (acto en lista de casos especiales)'
  };

  return {
    structure,
    explanation: explanations[structure] || 'Estructura desconocida',
    counters: { ...structureCounters },
    timestamp: new Date().toISOString()
  };
}

export default { detectStructure, explainStructure }


