/**
 * Servicio generador de reportes UAFE (TRANSACCION e INTERVINIENTE)
 * Genera archivos XLSX en el formato exacto requerido por la UAFE de Ecuador.
 *
 * Formato TRANSACCION:
 *   Row 0 (metadata): ["TRA", secuencial_notario, fecha_corte_YYYYMMDD, total_registros]
 *   Data rows: [codigo_transaccion, fecha, tipo_acto_codigo, descripcion_acto, cuantia,
 *               avaluo_municipal, tipo_bien_codigo, descripcion_bien, canton_codigo,
 *               secuencial_notario, fecha_corte]
 *
 * Formato INTERVINIENTE:
 *   Row 0 (metadata): ["INT", secuencial_notario, fecha_corte_YYYYMMDD, total_registros]
 *   Data rows: [codigo_transaccion, tipo_identificacion, cedula, nombre_completo,
 *               nacionalidad_3char, rol_codigo, papel_codigo, secuencial_notario]
 */

import { getPrismaClient } from '../db.js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import os from 'os';
import logger from '../utils/logger.js';

const prisma = getPrismaClient();

// ── Constantes ──────────────────────────────────────────────────────
const SECUENCIAL_NOTARIO = '7866';
const CANTON_DEFAULT = '1701';
const NOTARIA_NUMERO = '018'; // Notaria 18

// ── Catalogo TIPOS_ACTO: descripcion → codigo (fuente: Catalogo-Notarios.xls) ──
const TIPOS_ACTO_CATALOGO = [
  { codigo: '73', descripcion: 'PROMESA DE CELEBRAR CONTRATOS' },
  { codigo: '74', descripcion: 'COMPRAVENTA' },
  { codigo: '75', descripcion: 'COMPRAVENTA DE INMUEBLES FINANCIADAS CON EL BONO QUE OTORGA EL ESTADO A TRAVES DEL MIDUVI' },
  { codigo: '76', descripcion: 'TRANSFERENCIA DE DOMINIO CON CONSTITUCION DE HIPOTECA' },
  { codigo: '77', descripcion: 'CONSTITUCION DE HIPOTECA' },
  { codigo: '78', descripcion: 'CONSTITUCION DE HIPOTECA A FAVOR DEL BIESS - ISSFA - ISSPOL - MUNICIPALIDADES - MUTUALISTAS O COOPERATIVAS DE AHORRO Y CREDITO PARA LA VIVIENDA' },
  { codigo: '79', descripcion: 'CONSTITUCION DE HIPOTECA ABIERTA' },
  { codigo: '80', descripcion: 'CONSTITUCION DE HIPOTECA EN LA QUE INTERVENGA EL MIDUVI' },
  { codigo: '81', descripcion: 'DONACION' },
  { codigo: '82', descripcion: 'PERMUTA' },
  { codigo: '83', descripcion: 'LIQUIDACION DE LA SOCIEDAD CONYUGAL' },
  { codigo: '84', descripcion: 'LIQUIDACION DE LA SOCIEDAD DE BIENES' },
  { codigo: '85', descripcion: 'DACION EN PAGO' },
  { codigo: '86', descripcion: 'CESION DE DERECHOS ONEROSOS' },
  { codigo: '87', descripcion: 'COMODATO' },
  { codigo: '88', descripcion: 'CONSTITUCION DE CONSORCIOS CON CUANTIA DETERMINADA' },
  { codigo: '89', descripcion: 'TRASPASO DE UN CREDITO CON CUANTIA' },
  { codigo: '90', descripcion: 'CESION DE PARTICIPACIONES' },
];

// Mapa inverso: descripcion (normalizada) → codigo
const DESCRIPCION_TO_CODIGO = {};
for (const item of TIPOS_ACTO_CATALOGO) {
  DESCRIPCION_TO_CODIGO[item.descripcion.toUpperCase().trim()] = item.codigo;
}
// Aliases retrocompatibles (nombres viejos que pueden estar en BD)
DESCRIPCION_TO_CODIGO['COMPRAVENTA DE INMUEBLES'] = '74';
DESCRIPCION_TO_CODIGO['COMPRAVENTA DE VEHICULOS'] = '74';
DESCRIPCION_TO_CODIGO['PROMESA DE COMPRAVENTA DE INMUEBLES'] = '73';
DESCRIPCION_TO_CODIGO['PROMESA DE COMPRAVENTA'] = '73';
DESCRIPCION_TO_CODIGO['DONACION DE INMUEBLES'] = '81';
DESCRIPCION_TO_CODIGO['DONACION DE VEHICULOS'] = '81';
DESCRIPCION_TO_CODIGO['PERMUTA DE INMUEBLES'] = '82';
DESCRIPCION_TO_CODIGO['PERMUTA DE VEHICULOS'] = '82';
DESCRIPCION_TO_CODIGO['DACION EN PAGO DE INMUEBLES'] = '85';
DESCRIPCION_TO_CODIGO['DACION EN PAGO DE VEHICULOS'] = '85';
DESCRIPCION_TO_CODIGO['HIPOTECA ABIERTA'] = '79';
DESCRIPCION_TO_CODIGO['LIQUIDACION DE SOCIEDAD CONYUGAL'] = '83';
DESCRIPCION_TO_CODIGO['CESION DE DERECHOS HERENCIALES'] = '86';
DESCRIPCION_TO_CODIGO['RECONOCIMIENTO DE FIRMAS DE VEHÍCULO - COMPRAVENTA'] = '74';
DESCRIPCION_TO_CODIGO['RECONOCIMIENTO DE FIRMAS DE VEHICULO - COMPRAVENTA'] = '74';

// ── Calidad → Papel UAFE (fuente: Catalogo-Notarios.xls, hoja Papel_Interviniente) ──
const CALIDAD_PAPEL_MAP = {
  'VENDEDOR': '63',
  'COMPRADOR': '20',
  'COMPRADOR_DEUDOR': '21',
  'COMPRADOR_DEUDOR_HIPOTECARIO': '22',
  'DONANTE': '32',
  'DONATARIO': '33',
  'PERMUTANTE': '45',
  'DEUDOR_HIPOTECARIO': '29',
  'DEUDOR_PRINCIPAL': '31',
  'ACREEDOR': '02',
  'ACREEDOR_HIPOTECARIO': '03',
  'PROMITENTE_VENDEDOR': '55',
  'PROMITENTE_COMPRADOR': '52',
  'CEDENTE': '15',
  'CESIONARIO': '16',
  'ADJUDICATARIO': '07',
  'COMPARECIENTE': '24',
  'COMODANTE': '18',
  'COMODATARIO': '19',
  'MANDANTE': '42',
  'MANDATARIO': '43',
  'APODERADO': '09',
  'APODERADO_ESPECIAL': '10',
  'APODERADO_GENERAL': '11',
  'REPRESENTANTE_LEGAL': '57',
};

// ── Calidad → Rol UAFE ─────────────────────────────────────────────
// 01 = Otorgado por (quien transfiere/entrega/debe)
// 02 = A favor de (quien recibe/adquiere/acreedor)
const ROL_OTORGADO_POR = new Set([
  'VENDEDOR', 'DONANTE', 'PERMUTANTE', 'DEUDOR_HIPOTECARIO', 'DEUDOR_PRINCIPAL',
  'PROMITENTE_VENDEDOR', 'CEDENTE', 'COMODANTE',
]);
const ROL_A_FAVOR_DE = new Set([
  'COMPRADOR', 'COMPRADOR_DEUDOR', 'COMPRADOR_DEUDOR_HIPOTECARIO',
  'DONATARIO', 'ACREEDOR', 'ACREEDOR_HIPOTECARIO',
  'PROMITENTE_COMPRADOR', 'CESIONARIO', 'ADJUDICATARIO', 'COMODATARIO',
]);

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Obtiene el ultimo dia del mes en formato YYYYMMDD.
 */
function getFechaCorte(mes, anio) {
  // mes is 1-based
  const lastDay = new Date(anio, mes, 0); // day 0 of next month = last day of this month
  const yyyy = String(anio);
  const mm = String(mes).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Formatea una fecha como YYYYMMDD.
 */
function formatFechaYYYYMMDD(date) {
  const d = new Date(date);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Extrae tipo (D/P) y numero del numeroProtocolo.
 * Formato: "D01399", "P00170", etc.
 */
function parseNumeroProtocolo(numeroProtocolo) {
  if (!numeroProtocolo) {
    return { tipo: 'P', numero: '00000' };
  }
  const match = numeroProtocolo.match(/^([DP])(\d+)$/i);
  if (match) {
    const tipo = match[1].toUpperCase();
    const numero = match[2].padStart(5, '0');
    return { tipo, numero };
  }
  // Si no tiene prefijo, asumimos protocolo
  const numMatch = numeroProtocolo.match(/(\d+)/);
  const numero = numMatch ? numMatch[1].padStart(5, '0') : '00000';
  return { tipo: 'P', numero };
}

/**
 * Construye el codigo_transaccion UAFE.
 * Formato: YYYY1701018{tipo}{numero}
 */
function buildCodigoTransaccion(protocolo) {
  const fecha = new Date(protocolo.fecha);
  const yyyy = String(fecha.getFullYear());
  const canton = protocolo.codigoCanton || CANTON_DEFAULT;
  const { tipo, numero } = parseNumeroProtocolo(protocolo.numeroProtocolo);
  return `${yyyy}${canton}${NOTARIA_NUMERO}${tipo}${numero}`;
}

/**
 * Obtiene el codigo de tipo de acto desde la descripcion almacenada.
 */
function getTipoActoCodigo(tipoActo) {
  if (!tipoActo) return '93'; // Otros
  const normalizado = tipoActo.toUpperCase().trim();
  // Busca exacto
  if (DESCRIPCION_TO_CODIGO[normalizado]) {
    return DESCRIPCION_TO_CODIGO[normalizado];
  }
  // Busca parcial (por si el campo tiene variaciones)
  for (const [desc, codigo] of Object.entries(DESCRIPCION_TO_CODIGO)) {
    if (normalizado.includes(desc) || desc.includes(normalizado)) {
      return codigo;
    }
  }
  return '93'; // Default: Otros actos notariales
}

/**
 * Obtiene la descripcion del tipo de acto desde el codigo.
 */
function getTipoActoDescripcion(tipoActo) {
  if (!tipoActo) return 'OTROS ACTOS NOTARIALES SUJETOS A REPORTE';
  const normalizado = tipoActo.toUpperCase().trim();
  // Si ya es una descripcion del catalogo, devolverla
  if (DESCRIPCION_TO_CODIGO[normalizado]) {
    return normalizado;
  }
  // Si no coincide exacto, devolver lo que hay
  return normalizado || 'OTROS ACTOS NOTARIALES SUJETOS A REPORTE';
}

/**
 * Determina tipo de identificacion UAFE.
 */
function getTipoIdentificacion(numeroIdentificacion) {
  if (!numeroIdentificacion) return 'P';
  const limpio = numeroIdentificacion.replace(/\s/g, '');
  if (limpio.length === 10 && /^\d+$/.test(limpio)) return 'C'; // Cedula
  if (limpio.length === 13 && /^\d+$/.test(limpio)) return 'R'; // RUC
  return 'P'; // Pasaporte
}

/**
 * Obtiene el rol UAFE desde la calidad del compareciente.
 */
function getRolCodigo(calidad) {
  if (!calidad) return '01';
  const calidadUpper = calidad.toUpperCase().trim();
  if (ROL_OTORGADO_POR.has(calidadUpper)) return '01';
  if (ROL_A_FAVOR_DE.has(calidadUpper)) return '02';
  return '01'; // Default
}

/**
 * Obtiene el papel UAFE desde la calidad del compareciente.
 */
function getPapelCodigo(calidad) {
  if (!calidad) return '24'; // COMPARECIENTE (default)
  const calidadUpper = calidad.toUpperCase().trim();
  return CALIDAD_PAPEL_MAP[calidadUpper] || '24';
}

/**
 * Extrae el nombre completo de una persona registrada.
 * Prioriza persona natural, luego juridica.
 */
function getNombreCompleto(persona, personaProtocolo) {
  if (!persona) {
    // Fallback al nombre temporal del protocolo
    return personaProtocolo?.nombreTemporal || '';
  }

  // Persona natural
  if (persona.datosPersonaNatural) {
    const datos = persona.datosPersonaNatural;
    const personales = datos.datosPersonales || datos;
    const apellidos = personales.apellidos || personales.apellido || '';
    const nombres = personales.nombres || personales.nombre || '';
    if (apellidos || nombres) {
      return `${apellidos} ${nombres}`.trim().toUpperCase();
    }
  }

  // Persona juridica
  if (persona.datosPersonaJuridica) {
    const datos = persona.datosPersonaJuridica;
    const compania = datos.compania || datos;
    if (compania.razonSocial) {
      return compania.razonSocial.toUpperCase();
    }
  }

  // Ultimo fallback
  return personaProtocolo?.nombreTemporal || '';
}

/**
 * Extrae la nacionalidad de una persona registrada.
 * Devuelve codigo ISO 3 caracteres, default "ECU".
 */
function getNacionalidad(persona) {
  if (!persona) return 'ECU';

  if (persona.datosPersonaNatural) {
    const datos = persona.datosPersonaNatural;
    const personales = datos.datosPersonales || datos;
    const nac = personales.nacionalidad || personales.pais || '';
    if (nac) {
      // Si ya es 3 caracteres, devolverlo
      const nacUpper = nac.toUpperCase().trim();
      if (nacUpper.length === 3) return nacUpper;
      // Mapeo basico de nombres comunes
      if (nacUpper === 'ECUATORIANA' || nacUpper === 'ECUADOR' || nacUpper === 'EC') return 'ECU';
      if (nacUpper === 'COLOMBIANA' || nacUpper === 'COLOMBIA' || nacUpper === 'CO') return 'COL';
      if (nacUpper === 'PERUANA' || nacUpper === 'PERU' || nacUpper === 'PE') return 'PER';
      if (nacUpper === 'VENEZOLANA' || nacUpper === 'VENEZUELA' || nacUpper === 'VE') return 'VEN';
      if (nacUpper === 'ESTADOUNIDENSE' || nacUpper === 'ESTADOS UNIDOS' || nacUpper === 'US') return 'USA';
      // Si no se reconoce, devolver los primeros 3 caracteres
      return nacUpper.substring(0, 3);
    }
  }

  return 'ECU';
}

/**
 * Construye la descripcion del bien para el reporte.
 */
function getDescripcionBien(protocolo) {
  if (protocolo.descripcionBien) {
    return protocolo.descripcionBien;
  }

  // Para vehiculos, construir descripcion
  if (protocolo.vehiculoMarca || protocolo.vehiculoModelo) {
    const partes = [
      protocolo.vehiculoMarca,
      protocolo.vehiculoModelo,
      protocolo.vehiculoAnio,
      protocolo.vehiculoPlaca ? `PLACA ${protocolo.vehiculoPlaca}` : null,
    ].filter(Boolean);
    return partes.join(' ');
  }

  // Para inmuebles
  if (protocolo.ubicacionDescripcion) {
    return protocolo.ubicacionDescripcion;
  }
  if (protocolo.bienInmuebleDescripcion) {
    return protocolo.bienInmuebleDescripcion;
  }

  return '';
}

// ── Consulta comun de protocolos ────────────────────────────────────

/**
 * Consulta protocolos UAFE para un periodo dado.
 */
async function queryProtocolos(mes, anio, notaryId, includePersonas = false) {
  const startDate = new Date(anio, mes - 1, 1);
  const endDate = new Date(anio, mes, 0, 23, 59, 59, 999);

  const include = includePersonas
    ? {
        personas: {
          include: {
            persona: true,
          },
        },
      }
    : undefined;

  const protocolos = await prisma.protocoloUAFE.findMany({
    where: {
      fecha: {
        gte: startDate,
        lte: endDate,
      },
      estado: {
        in: ['COMPLETO', 'REPORTADO'],
      },
      notaryId,
    },
    include,
    orderBy: { fecha: 'asc' },
  });

  return protocolos;
}

// ── Generadores de reportes ─────────────────────────────────────────

/**
 * Genera el reporte TRANSACCION en formato XLSX.
 * @param {number} mes - Mes (1-12)
 * @param {number} anio - Anio (e.g., 2026)
 * @param {number} notaryId - ID de la notaria
 * @returns {{ filePath: string, totalRegistros: number, fileName: string }}
 */
export async function generarReporteTransaccion(mes, anio, notaryId = 1) {
  logger.info(`[UAFE] Generando reporte TRANSACCION para ${mes}/${anio}, notaryId=${notaryId}`);

  const protocolos = await queryProtocolos(mes, anio, notaryId, false);
  const fechaCorte = getFechaCorte(mes, anio);
  const totalRegistros = protocolos.length;

  // Construir datos del sheet (sin headers - formato UAFE)
  const rows = [];

  // Row 0: metadata
  rows.push(['TRA', SECUENCIAL_NOTARIO, fechaCorte, totalRegistros]);

  // Data rows
  for (const protocolo of protocolos) {
    const codigoTransaccion = buildCodigoTransaccion(protocolo);
    const fechaProtocolo = formatFechaYYYYMMDD(protocolo.fecha);
    const tipoActoCodigo = getTipoActoCodigo(protocolo.tipoActo);
    const descripcionActo = getTipoActoDescripcion(protocolo.tipoActo);
    const cuantia = protocolo.valorContrato ? Number(protocolo.valorContrato) : 0;
    const avaluoMunicipal = protocolo.avaluoMunicipal ? Number(protocolo.avaluoMunicipal) : 0;
    const tipoBienCodigo = protocolo.tipoBien || '';
    const descripcionBien = getDescripcionBien(protocolo);
    const cantonCodigo = protocolo.codigoCanton || CANTON_DEFAULT;

    rows.push([
      codigoTransaccion,
      fechaProtocolo,
      tipoActoCodigo,
      descripcionActo,
      cuantia,
      avaluoMunicipal,
      tipoBienCodigo,
      descripcionBien,
      cantonCodigo,
      SECUENCIAL_NOTARIO,
      fechaCorte,
    ]);
  }

  // Generar XLSX
  const sheetName = `TRA${SECUENCIAL_NOTARIO}${fechaCorte}`;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Max 31 chars sheet name

  const fileName = `TRANSACCION_${anio}_${String(mes).padStart(2, '0')}.xlsx`;
  const filePath = path.join(os.tmpdir(), fileName);
  XLSX.writeFile(wb, filePath);

  logger.info(`[UAFE] Reporte TRANSACCION generado: ${filePath} (${totalRegistros} registros)`);

  return { filePath, totalRegistros, fileName };
}

/**
 * Genera el reporte INTERVINIENTE en formato XLSX.
 * @param {number} mes - Mes (1-12)
 * @param {number} anio - Anio (e.g., 2026)
 * @param {number} notaryId - ID de la notaria
 * @returns {{ filePath: string, totalRegistros: number, fileName: string }}
 */
export async function generarReporteInterviniente(mes, anio, notaryId = 1) {
  logger.info(`[UAFE] Generando reporte INTERVINIENTE para ${mes}/${anio}, notaryId=${notaryId}`);

  const protocolos = await queryProtocolos(mes, anio, notaryId, true);
  const fechaCorte = getFechaCorte(mes, anio);

  // Contar total de intervinientes
  let totalRegistros = 0;
  const dataRows = [];

  for (const protocolo of protocolos) {
    const codigoTransaccion = buildCodigoTransaccion(protocolo);
    const personas = protocolo.personas || [];

    for (const personaProtocolo of personas) {
      const persona = personaProtocolo.persona;
      const cedula = personaProtocolo.personaCedula || '';
      const tipoIdentificacion = getTipoIdentificacion(cedula);
      const nombreCompleto = getNombreCompleto(persona, personaProtocolo);
      const nacionalidad = getNacionalidad(persona);
      const rolCodigo = getRolCodigo(personaProtocolo.calidad);
      const papelCodigo = getPapelCodigo(personaProtocolo.calidad);

      dataRows.push([
        codigoTransaccion,
        tipoIdentificacion,
        cedula,
        nombreCompleto,
        nacionalidad,
        rolCodigo,
        papelCodigo,
        SECUENCIAL_NOTARIO,
      ]);

      totalRegistros++;

      // Si tiene mandante (representado), agregar fila extra con la misma calidad
      if (personaProtocolo.actuaPor && personaProtocolo.actuaPor !== 'PROPIOS_DERECHOS' && personaProtocolo.mandanteCedula) {
        const mandanteCedula = personaProtocolo.mandanteCedula;
        const mandanteNombre = (personaProtocolo.mandanteNombre || '').toUpperCase();
        const mandanteTipoId = getTipoIdentificacion(mandanteCedula);

        dataRows.push([
          codigoTransaccion,
          mandanteTipoId,
          mandanteCedula,
          mandanteNombre,
          'ECU', // nacionalidad por defecto para mandante
          rolCodigo,
          papelCodigo, // misma calidad que el compareciente
          SECUENCIAL_NOTARIO,
        ]);

        totalRegistros++;
      }
    }
  }

  // Construir sheet
  const rows = [];

  // Row 0: metadata
  rows.push(['INT', SECUENCIAL_NOTARIO, fechaCorte, totalRegistros]);

  // Data rows
  rows.push(...dataRows);

  // Generar XLSX
  const sheetName = `INT${SECUENCIAL_NOTARIO}${fechaCorte}`;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const fileName = `INTERVINIENTE_${anio}_${String(mes).padStart(2, '0')}.xlsx`;
  const filePath = path.join(os.tmpdir(), fileName);
  XLSX.writeFile(wb, filePath);

  logger.info(`[UAFE] Reporte INTERVINIENTE generado: ${filePath} (${totalRegistros} registros)`);

  return { filePath, totalRegistros, fileName };
}

/**
 * Genera ambos reportes y guarda/actualiza el registro ReporteUAFE en base de datos.
 * Marca los protocolos incluidos como REPORTADO.
 *
 * @param {number} mes - Mes (1-12)
 * @param {number} anio - Anio (e.g., 2026)
 * @param {number} userId - ID del usuario que genera el reporte
 * @param {number} notaryId - ID de la notaria
 * @returns {object} El registro ReporteUAFE creado/actualizado
 */
export async function generarYGuardarReporte(mes, anio, userId, notaryId = 1) {
  logger.info(`[UAFE] Generando reporte completo ${mes}/${anio} por usuario ${userId}, notaryId=${notaryId}`);

  // Generar ambos archivos
  const [transaccion, interviniente] = await Promise.all([
    generarReporteTransaccion(mes, anio, notaryId),
    generarReporteInterviniente(mes, anio, notaryId),
  ]);

  // Upsert del registro ReporteUAFE
  const reporte = await prisma.reporteUAFE.upsert({
    where: {
      mes_anio_notaryId: {
        mes,
        anio,
        notaryId,
      },
    },
    create: {
      mes,
      anio,
      estado: 'GENERADO',
      totalTransacciones: transaccion.totalRegistros,
      totalIntervinientes: interviniente.totalRegistros,
      archivoTransacciones: transaccion.filePath,
      archivoIntervinientes: interviniente.filePath,
      generadoPor: userId,
      generadoAt: new Date(),
      notaryId,
    },
    update: {
      estado: 'GENERADO',
      totalTransacciones: transaccion.totalRegistros,
      totalIntervinientes: interviniente.totalRegistros,
      archivoTransacciones: transaccion.filePath,
      archivoIntervinientes: interviniente.filePath,
      generadoPor: userId,
      generadoAt: new Date(),
    },
  });

  // Obtener IDs de protocolos incluidos para actualizarlos
  const protocolos = await queryProtocolos(mes, anio, notaryId, false);
  const protocoloIds = protocolos.map((p) => p.id);

  if (protocoloIds.length > 0) {
    await prisma.protocoloUAFE.updateMany({
      where: {
        id: { in: protocoloIds },
        notaryId,
      },
      data: {
        estado: 'REPORTADO',
        reporteUafeId: reporte.id,
      },
    });

    logger.info(`[UAFE] ${protocoloIds.length} protocolos marcados como REPORTADO`);
  }

  logger.info(`[UAFE] ReporteUAFE id=${reporte.id} guardado exitosamente`);

  return reporte;
}
