// Servicio principal de generación de concuerdos
// ------------------------------------------------
// Propósito (T1):
// - Definir interfaces y flujo de alto nivel para la generación de concuerdos
//   usando: router de estructura (A/B/C) + templates base + modificadores.
// - Sin lógica de negocio; sólo stubs y comentarios para orientar T2/T3.

// Métricas en memoria para observabilidad
const metrics = {
  totalGenerations: 0,
  structures: { A: 0, B: 0, C: 0 },
  templateModes: { structural: 0, family: 0 },
  forceTemplates: { auto: 0, A: 0, B: 0, C: 0 },
  timings: [], // Array para calcular percentiles
  lastUpdated: new Date().toISOString(),
  reset() {
    this.totalGenerations = 0;
    this.structures = { A: 0, B: 0, C: 0 };
    this.templateModes = { structural: 0, family: 0 };
    this.forceTemplates = { auto: 0, A: 0, B: 0, C: 0 };
    this.timings = [];
    this.lastUpdated = new Date().toISOString();
  },
  addTiming(duration) {
    this.timings.push(duration);
    // Mantener solo las últimas 1000 mediciones para eficiencia
    if (this.timings.length > 1000) {
      this.timings = this.timings.slice(-1000);
    }
  },
  getPercentile(p) {
    if (this.timings.length === 0) return 0;
    const sorted = [...this.timings].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
};

// Cache de templates compilados para rendimiento
const templateCache = new Map();
const TEMPLATE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene template del cache o lo carga desde disco
 * @param {string} templatePath - Ruta del template
 * @returns {string} - Contenido del template
 */
function getCachedTemplate(templatePath) {
  const cacheKey = templatePath;
  const cached = templateCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < TEMPLATE_CACHE_TTL) {
    return cached.content;
  }

  // Cargar desde disco
  const fullPath = path.join(process.cwd(), 'src', 'templates', templatePath);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Guardar en cache
  templateCache.set(cacheKey, {
    content,
    timestamp: Date.now()
  });

  return content;
}

/**
 * Limpia el cache de templates (útil para desarrollo)
 */
function clearTemplateCache() {
  templateCache.clear();
  console.log('🧹 Cache de templates limpiado');
}

import { detectStructure, explainStructure } from './structure-router.js'
import { Templates } from '../templates/index.js'
import { Mods, detectFamily } from '../templates/mods/index.js'
import { renderListaPersonas } from './text-helpers.js'
import { logConcuerdoAudit } from './audit-service.js'
import fs from 'fs'
import path from 'path'

/**
 * Datos mínimos de entrada para generar un concuerdo.
 * @typedef {Object} ConcuerdoInput
 * @property {string} acto - Nombre del acto/contrato normalizado
 * @property {Array} otorgantes - Comparecientes otorgantes normalizados
 * @property {Array} [beneficiarios] - Comparecientes beneficiarios normalizados
 * @property {Object} [notaria] - Datos de notaría (nombre/numero/suplente)
 * @property {Object} [options] - Flags y overrides (definir en T2)
 */

/**
 * Resultado de generación del concuerdo.
 * @typedef {Object} ConcuerdoResult
 * @property {string} structure - Código A/B/C
 * @property {string} template - Template base seleccionado
 * @property {Object} variables - Variables calculadas para el template
 * @property {Array} [warnings] - Advertencias o sugerencias
 */

/**
 * Prepara variables para la capa de templates a partir de la entrada.
 * NOTA: Stub T1 sin transformaciones. En T2 se agregan flags y normalizaciones.
 * @param {ConcuerdoInput} input
 * @returns {Object}
 */
function buildTemplateVariables(input) {
  const { acto, otorgantes = [], beneficiarios = [], notaria = {} } = input || {}
  return {
    acto,
    otorgantes,
    beneficiarios,
    notarioNombre: notaria?.nombre || '',
    notariaNumero: notaria?.numero || '',
  }
}

/**
 * Selecciona el archivo de template base en función de la decisión del router.
 * @param {('A'|'B'|'C')} tipo
 * @returns {string}
 */
function pickBaseTemplate(tipo) {
  if (tipo === 'A') return Templates.base_A_otorgante_beneficiario
  if (tipo === 'B') return Templates.base_B_solo_otorgante
  return Templates.base_C_especial
}

/**
 * Genera concuerdos PRIMERA y SEGUNDA usando templates base.
 *
 * @param {Object} params
 * @param {Object} params.data - Datos del documento
 * @param {Object} params.settings - Configuraciones del sistema
 * @param {number} [params.userId] - ID del usuario que genera (para auditoría)
 * @param {string} [params.docId] - ID del documento fuente (opcional)
 * @returns {Object} - Resultado con primera, segunda, estructura y audit
 */
export async function generarConcuerdos({ data = {}, settings = {}, userId, docId } = {}) {
  const startTime = Date.now();
  const warnings = [];

  // 1) Determinar estructura base
  let estructura = detectStructure(data);

  // 2) Respetar PROMPT_FORCE_TEMPLATE si no es "auto"
  if (settings.PROMPT_FORCE_TEMPLATE && settings.PROMPT_FORCE_TEMPLATE !== 'auto') {
    estructura = settings.PROMPT_FORCE_TEMPLATE;
  }

  // 3) Construir viewModel
  const viewModel = buildViewModel(data, warnings);

  // 4) Aplicar mods por familia si TEMPLATE_MODE=family
  let finalViewModel = viewModel;
  if (settings.TEMPLATE_MODE === 'family') {
    const family = detectFamily(data.actos?.[0]?.tipo || '');
    finalViewModel = applyFamilyMods(viewModel, family);
  }

  // 5) Seleccionar y renderizar templates
  const primera = renderTemplate(estructura, { ...finalViewModel, numeroCopia: 'PRIMERA' }, settings.TEMPLATE_MODE);
  const segunda = renderTemplate(estructura, { ...finalViewModel, numeroCopia: 'SEGUNDA' }, settings.TEMPLATE_MODE);

  // 5) Registrar en contadores de auditoría
  explainStructure(estructura);

  // 6) Registrar timing y actualizar métricas
  const generationTime = Date.now() - startTime;
  metrics.addTiming(generationTime);
  metrics.totalGenerations++;
  if (metrics.structures[estructura] !== undefined) {
    metrics.structures[estructura]++;
  }
  if (metrics.templateModes[settings.TEMPLATE_MODE]) {
    metrics.templateModes[settings.TEMPLATE_MODE]++;
  }
  if (metrics.forceTemplates[settings.PROMPT_FORCE_TEMPLATE]) {
    metrics.forceTemplates[settings.PROMPT_FORCE_TEMPLATE]++;
  }
  metrics.lastUpdated = new Date().toISOString();

  // 7) Registrar auditoría en base de datos (si hay userId)
  if (userId) {
    try {
      await logConcuerdoAudit({
        docId,
        estructura,
        templateMode: settings.TEMPLATE_MODE || 'structural',
        force: settings.PROMPT_FORCE_TEMPLATE || 'auto',
        primera,
        segunda,
        createdBy: userId,
        meta: {
          warnings,
          templateVersion: '1.0',
          generationTime,
          p95Timing: metrics.getPercentile(95),
          otorgantesCount: data.otorgantes?.length || 0,
          beneficiariosCount: data.beneficiarios?.length || 0
        }
      });
    } catch (auditError) {
      console.error('Error registrando auditoría:', auditError.message);
      // No fallar la generación por error de auditoría
    }
  }

  // 8) Retornar resultado
  return {
    primera,
    segunda,
    estructura,
    audit: {
      force: settings.PROMPT_FORCE_TEMPLATE || 'auto',
      templateMode: settings.TEMPLATE_MODE || 'structural',
      warnings
    }
  };
}

/**
 * Construye el viewModel para el template a partir de los datos.
 * @param {Object} data - Datos del documento
 * @param {Array} warnings - Array para agregar warnings
 * @returns {Object} - ViewModel para el template
 */
function buildViewModel(data = {}, warnings = []) {
  const { actos = [], notario = '', notaria = '', otorgantes = [], beneficiarios = [] } = data;

  // Validar notario/notaria
  if (!notario) {
    warnings.push('notario_missing');
  }
  if (!notaria) {
    warnings.push('notaria_missing');
  }

  // Obtener tipo de acto del primer acto
  const tipo_acto = actos[0]?.tipo || '';

  return {
    numeroCopia: '', // Se asigna en renderTemplate
    tipo_documento: 'AUTÉNTICA',
    acto: tipo_acto.toUpperCase(),
    otorgantes: otorgantes, // Mantener array original para template
    beneficiarios: beneficiarios, // Mantener array original para template
    otorgantes_render: renderListaPersonas(otorgantes),
    beneficiarios_render: beneficiarios.length > 0 ? renderListaPersonas(beneficiarios) : '',
    notarioNombre: notario || '',
    notariaNumero: notaria || ''
  };
}

/**
 * Aplica modificadores por familia al viewModel sin duplicar texto.
 * @param {Object} viewModel - ViewModel base
 * @param {string} family - Familia detectada
 * @returns {Object} - ViewModel modificado
 */
function applyFamilyMods(viewModel, family) {
  try {
    // Leer el parcial de la familia
    const modPath = path.join(process.cwd(), 'src', 'templates', 'mods', Mods[family]);
    let modSource = fs.readFileSync(modPath, 'utf8');

    // Reemplazar variables en el mod
    modSource = modSource.replace(/\{\{\s*otorgantes_render\s*\}\}/g, viewModel.otorgantes_render || '');
    modSource = modSource.replace(/\{\{\s*beneficiarios_render\s*\}\}/g, viewModel.beneficiarios_render || '');
    modSource = modSource.replace(/\{\{\s*acto\s*\}\}/g, viewModel.acto || '');
    modSource = modSource.replace(/\{\{\s*otorgantes\.length\s*\}\}/g, viewModel.otorgantes?.length || 0);
    modSource = modSource.replace(/\{\{\s*beneficiarios\.length\s*\}\}/g, viewModel.beneficiarios?.length || 0);

    // Retornar viewModel con mod aplicado (se insertará en el template base)
    return {
      ...viewModel,
      familyMod: modSource
    };
  } catch (error) {
    console.error('Error aplicando mod de familia:', error);
    return viewModel; // Retornar sin modificaciones si hay error
  }
}

/**
 * Renderiza un template base con el viewModel dado usando reemplazo simple.
 * @param {string} estructura - Código de estructura ('A', 'B', 'C')
 * @param {Object} viewModel - Datos para el template
 * @param {string} templateMode - Modo de template ('structural' o 'family')
 * @returns {string} - Template renderizado
 */
function renderTemplate(estructura, viewModel, templateMode = 'structural') {
  try {
    // Seleccionar template según estructura
    let templatePath;
    if (estructura === 'A') templatePath = Templates.base_A_otorgante_beneficiario;
    else if (estructura === 'B') templatePath = Templates.base_B_solo_otorgante;
    else templatePath = Templates.base_C_especial;

    // Leer archivo de template (con cache)
    let templateSource = getCachedTemplate(templatePath);

    // Aplicar mods por familia si está habilitado
    if (templateMode === 'family' && viewModel.familyMod) {
      // Insertar el mod antes del pie de firma (buscar patrón de cierre)
      const insertPoint = templateSource.lastIndexOf('{{notarioNombre}}');
      if (insertPoint !== -1) {
        templateSource = templateSource.slice(0, insertPoint) +
                        '\n\n' + viewModel.familyMod + '\n\n' +
                        templateSource.slice(insertPoint);
      }
    }

    // Reemplazar variables simples (sin lógica compleja)
    templateSource = templateSource.replace(/\{\{\s*numeroCopia\s*\}\}/g, viewModel.numeroCopia || '');
    templateSource = templateSource.replace(/\{\{\s*acto\s*\}\}/g, viewModel.acto || '');
    templateSource = templateSource.replace(/\{\{\s*notarioNombre\s*\}\}/g, viewModel.notarioNombre || '');
    templateSource = templateSource.replace(/\{\{\s*notariaNumero\s*\}\}/g, viewModel.notariaNumero || '');

    // Para arreglos, usar placeholders simples
    if (viewModel.otorgantes && viewModel.otorgantes.length > 0) {
      templateSource = templateSource.replace(/\{\{\s*otorgantes\s*\}\}/g, viewModel.otorgantes_render || '');
    }
    if (viewModel.beneficiarios && viewModel.beneficiarios.length > 0) {
      templateSource = templateSource.replace(/\{\{\s*beneficiarios\s*\}\}/g, viewModel.beneficiarios_render || '');
    }

    return templateSource;
  } catch (error) {
    console.error('Error renderizando template:', error);
    return `ERROR: No se pudo renderizar template para estructura ${estructura}`;
  }
}

export { metrics }
export default { generarConcuerdos }


