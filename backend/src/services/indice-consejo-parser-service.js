import XLSX from 'xlsx';
import prisma from '../db.js';
import { getCurrentNotaryId } from '../middleware/tenant-context.js';

// ── Actos reportables UAFE ──────────────────────────────────────
// Mapeo: palabras clave del índice → código catálogo UAFE
const MAPEO_ACTOS_REPORTABLES = [
  { patron: /^COMPRAVENTA DE INMUEBLES FINANCIADA/i, codigo: '75' },
  { patron: /^TRANSFERENCIA DE DOMINIO CON CONSTITU/i, codigo: '76' },
  { patron: /^CONSTITUCION DE HIPOTECA ABIERTA/i, codigo: '79' },
  { patron: /^CONSTITUCION DE HIPOTECA A FAVOR DEL BIESS/i, codigo: '78' },
  { patron: /^CONSTITUCION DE HIPOTECA EN LA QUE INTERVENGA/i, codigo: '80' },
  { patron: /^CONSTITUCION DE HIPOTECA/i, codigo: '77' },
  { patron: /^PROMESA DE CELEBRAR CONTRATO/i, codigo: '73' },
  { patron: /^COMPRAVENTA/i, codigo: '74' },
  { patron: /^DONACI[OÓ]N/i, codigo: '81' },
  { patron: /^PERMUTA/i, codigo: '82' },
  { patron: /^LIQUIDACI[OÓ]N DE LA SOCIEDAD CONYUGAL/i, codigo: '83' },
  { patron: /^LIQUIDACI[OÓ]N DE LA SOCIEDAD DE BIENES/i, codigo: '84' },
  { patron: /^DACI[OÓ]N EN PAGO/i, codigo: '85' },
  { patron: /^CESI[OÓ]N DE DERECHOS/i, codigo: '86' },
  { patron: /^COMODATO/i, codigo: '87' },
  { patron: /^CONSTITUCI[OÓ]N DE CONSORCIOS/i, codigo: '88' },
  { patron: /^TRASPASO DE UN CR[EÉ]DITO/i, codigo: '89' },
  { patron: /^CESI[OÓ]N DE PARTICIPACIONES/i, codigo: '90' },
];

// Actos que NO son reportables aunque contengan palabras similares
const EXCLUSIONES = [
  /INSINUACI[OÓ]N/i,
  /CANCELACI[OÓ]N DE HIPOTECA/i,
  /CANCELACI[OÓ]N DE CONTRATO/i,
];

/**
 * Clasifica un nombre de acto del índice al código UAFE
 * @returns {{ codigo: string, descripcion: string } | null}
 */
function clasificarActo(descripcionActo) {
  if (!descripcionActo) return null;
  const desc = descripcionActo.trim().toUpperCase();

  // Verificar exclusiones primero
  for (const excl of EXCLUSIONES) {
    if (excl.test(desc)) return null;
  }

  for (const { patron, codigo } of MAPEO_ACTOS_REPORTABLES) {
    if (patron.test(desc)) {
      return { codigo, descripcionOriginal: descripcionActo.trim() };
    }
  }
  return null;
}

/**
 * Parsea precio del formato "$ 135,000.00" a número
 */
function parsePrecio(val) {
  if (!val) return null;
  const str = String(val).replace(/[$,\s]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parsea el Excel del índice del Consejo de la Judicatura
 * Retorna solo actos reportables UAFE con sus comparecientes
 */
export function parseIndiceConsejo(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Detectar mes/año del título (row 4 típicamente: "PROTOCOLO - MARZO 2026")
  let mesDetectado = null;
  let anioDetectado = null;
  const mesesMap = {
    ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
    JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
  };
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const text = (rows[i] || []).join(' ').toUpperCase();
    for (const [mes, num] of Object.entries(mesesMap)) {
      if (text.includes(mes)) {
        mesDetectado = num;
        const anioMatch = text.match(/20\d{2}/);
        if (anioMatch) anioDetectado = parseInt(anioMatch[0]);
        break;
      }
    }
    if (mesDetectado) break;
  }

  // Parsear filas agrupando por escritura
  const escrituras = [];
  let currentEscritura = null;
  let currentActo = null;

  for (let i = 8; i < rows.length; i++) {
    const row = rows[i] || [];

    // Fila de nueva escritura: col[1] tiene número de escritura
    if (row[1] && /^\d{10,}/.test(String(row[1]))) {
      // Guardar acto anterior si era reportable
      if (currentActo && currentActo.clasificacion) {
        currentEscritura.actos.push(currentActo);
      }
      // Guardar escritura anterior si tenía actos reportables
      if (currentEscritura && currentEscritura.actos.length > 0) {
        escrituras.push(currentEscritura);
      }

      currentEscritura = {
        numeroEscritura: String(row[1]).trim(),
        fecha: row[2] ? String(row[2]).trim() : null,
        estado: row[3] ? String(row[3]).trim() : null,
        actos: []
      };
      currentActo = null;

      // La fila de escritura también puede tener un acto en col[4]
      if (row[4]) {
        const clasificacion = clasificarActo(String(row[4]));
        currentActo = {
          descripcion: String(row[4]).trim(),
          clasificacion,
          otorga: [],
          aFavorDe: [],
          cuantia: parsePrecio(row[9])
        };
        // Recoger participantes de esta misma fila
        if (row[5] && String(row[5]).trim()) {
          currentActo.otorga.push({ nombre: String(row[5]).trim(), cedula: row[6] ? String(row[6]).trim() : null });
        }
        if (row[7] && String(row[7]).trim()) {
          currentActo.aFavorDe.push({ nombre: String(row[7]).trim(), cedula: row[8] ? String(row[8]).trim() : null });
        }
      }
      continue;
    }

    if (!currentEscritura) continue;

    // Fila de sub-acto: col[4] tiene contenido
    if (row[4] && String(row[4]).trim()) {
      // Guardar acto anterior si era reportable
      if (currentActo && currentActo.clasificacion) {
        currentEscritura.actos.push(currentActo);
      }

      const clasificacion = clasificarActo(String(row[4]));
      currentActo = {
        descripcion: String(row[4]).trim(),
        clasificacion,
        otorga: [],
        aFavorDe: [],
        cuantia: parsePrecio(row[9])
      };
      // Recoger participantes de esta fila
      if (row[5] && String(row[5]).trim()) {
        currentActo.otorga.push({ nombre: String(row[5]).trim(), cedula: row[6] ? String(row[6]).trim() : null });
      }
      if (row[7] && String(row[7]).trim()) {
        currentActo.aFavorDe.push({ nombre: String(row[7]).trim(), cedula: row[8] ? String(row[8]).trim() : null });
      }
      continue;
    }

    // Fila de participante adicional: col[4] vacío, col[5] o col[7] tiene nombre
    if (currentActo) {
      if (row[5] && String(row[5]).trim()) {
        currentActo.otorga.push({ nombre: String(row[5]).trim(), cedula: row[6] ? String(row[6]).trim() : null });
      }
      if (row[7] && String(row[7]).trim()) {
        currentActo.aFavorDe.push({ nombre: String(row[7]).trim(), cedula: row[8] ? String(row[8]).trim() : null });
      }
    }
  }

  // Guardar últimos pendientes
  if (currentActo && currentActo.clasificacion) {
    currentEscritura?.actos.push(currentActo);
  }
  if (currentEscritura && currentEscritura.actos.length > 0) {
    escrituras.push(currentEscritura);
  }

  return { escrituras, mesDetectado, anioDetectado };
}

/**
 * Cruza los actos reportables del índice contra ProtocoloUAFE del mes
 */
export async function cruzarConProtocolos(escrituras, mes, anio) {
  const notaryId = getCurrentNotaryId();

  // Obtener protocolos del mes
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 1);

  const protocolos = await prisma.protocoloUAFE.findMany({
    where: {
      fecha: { gte: fechaInicio, lt: fechaFin },
      ...(notaryId ? { notaryId } : {})
    },
    include: {
      personas: {
        include: {
          persona: {
            select: {
              numeroIdentificacion: true,
              datosPersonaNatural: true,
              datosPersonaJuridica: true,
              tipoPersona: true
            }
          }
        }
      }
    }
  });

  // Indexar protocolos por número de escritura
  const protocolosPorNumero = new Map();
  for (const p of protocolos) {
    if (p.numeroProtocolo) {
      protocolosPorNumero.set(p.numeroProtocolo, p);
    }
  }

  // Indexar protocolos por cédulas de participantes
  const protocolosPorCedula = new Map();
  for (const p of protocolos) {
    for (const pp of p.personas) {
      const ced = pp.persona.numeroIdentificacion;
      if (!protocolosPorCedula.has(ced)) protocolosPorCedula.set(ced, []);
      protocolosPorCedula.get(ced).push(p);
    }
  }

  const coincidencias = [];
  const faltantes = [];
  const protocolosUsados = new Set();

  // Aplanar escrituras en actos individuales para el cruce
  for (const esc of escrituras) {
    for (const acto of esc.actos) {
      const todasCedulas = [
        ...acto.otorga.map(p => p.cedula).filter(Boolean),
        ...acto.aFavorDe.map(p => p.cedula).filter(Boolean)
      ];

      const actoInfo = {
        numeroEscritura: esc.numeroEscritura,
        fecha: esc.fecha,
        descripcionActo: acto.descripcion,
        codigoUAFE: acto.clasificacion?.codigo,
        cuantia: acto.cuantia,
        otorga: acto.otorga,
        aFavorDe: acto.aFavorDe
      };

      // Match 1: por número de escritura
      const matchPorNumero = protocolosPorNumero.get(esc.numeroEscritura);
      if (matchPorNumero) {
        protocolosUsados.add(matchPorNumero.id);
        coincidencias.push({
          ...actoInfo,
          protocoloId: matchPorNumero.id,
          matchTipo: 'numero_escritura'
        });
        continue;
      }

      // Match 2: por cédula + tipo de acto
      let matched = false;
      for (const ced of todasCedulas) {
        const candidatos = protocolosPorCedula.get(ced) || [];
        for (const cand of candidatos) {
          if (!protocolosUsados.has(cand.id) && cand.tipoActo === acto.clasificacion?.codigo) {
            protocolosUsados.add(cand.id);
            coincidencias.push({
              ...actoInfo,
              protocoloId: cand.id,
              matchTipo: 'cedula_tipo_acto'
            });
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        faltantes.push(actoInfo);
      }
    }
  }

  // Extras: protocolos en el sistema que no fueron matcheados
  const extras = protocolos
    .filter(p => !protocolosUsados.has(p.id))
    .map(p => {
      const nombrePersona = (pp) => {
        if (pp.persona.tipoPersona === 'NATURAL' && pp.persona.datosPersonaNatural) {
          const d = pp.persona.datosPersonaNatural;
          return d.datosPersonales ? `${d.datosPersonales.nombres || ''} ${d.datosPersonales.apellidos || ''}`.trim() : 'Sin nombre';
        }
        if (pp.persona.tipoPersona === 'JURIDICA' && pp.persona.datosPersonaJuridica) {
          return pp.persona.datosPersonaJuridica.compania?.razonSocial || 'Sin nombre';
        }
        return 'Sin nombre';
      };

      return {
        protocoloId: p.id,
        numeroProtocolo: p.numeroProtocolo,
        tipoActo: p.tipoActo,
        valorContrato: p.valorContrato,
        fecha: p.fecha,
        personas: p.personas.map(pp => ({
          cedula: pp.persona.numeroIdentificacion,
          nombre: nombrePersona(pp),
          calidad: pp.calidad
        }))
      };
    });

  return {
    mes,
    anio,
    totalEscrituras: escrituras.length,
    totalActosReportables: escrituras.reduce((sum, e) => sum + e.actos.length, 0),
    coincidencias,
    faltantes,
    extras
  };
}
