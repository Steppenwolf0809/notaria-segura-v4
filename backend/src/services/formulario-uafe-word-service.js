/**
 * Servicio generador de Formulario UAFE en Word (.docx)
 * Genera un documento "Formulario de Conocimiento del Cliente" por compareciente.
 * Dos variantes: Persona Natural y Persona Jurídica.
 *
 * Usa el paquete `docx` v8.5.0 para construir el documento.
 */

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
} from 'docx';

import logger from '../utils/logger.js';

// ── Constantes ──────────────────────────────────────────────────────

const TIPOS_ACTO = {
  'COMPRAVENTA': 'Compraventa',
  'PROMESA_COMPRAVENTA': 'Promesa de Compraventa',
  'DONACION': 'Donación',
  'HIPOTECA': 'Hipoteca',
  'PODER_GENERAL': 'Poder General',
  'PODER_ESPECIAL': 'Poder Especial',
  'CONSTITUCION_COMPANIA': 'Constitución de Compañía',
  'TESTAMENTO': 'Testamento',
  'OTROS': 'Otros',
};

const CALIDADES = {
  'VENDEDOR': 'Vendedor',
  'COMPRADOR': 'Comprador',
  'DONANTE': 'Donante',
  'DONATARIO': 'Donatario',
  'HIPOTECANTE': 'Hipotecante',
  'ACREEDOR_HIPOTECARIO': 'Acreedor Hipotecario',
  'PODERDANTE': 'Poderdante',
  'APODERADO': 'Apoderado',
  'TESTADOR': 'Testador',
  'COMPARECIENTE': 'Compareciente',
};

// ── Estilos ─────────────────────────────────────────────────────────

const FONT = 'Calibri';
const FONT_SIZE_BODY = 20;       // docx uses half-points: 20 = 10pt
const FONT_SIZE_TITLE = 28;      // 14pt
const FONT_SIZE_SECTION = 22;    // 11pt
const HEADER_SHADING = { type: ShadingType.SOLID, color: 'D9E2F3' }; // light blue
const CELL_MARGINS = { top: 40, bottom: 40, left: 80, right: 80 };

// ── Helpers ─────────────────────────────────────────────────────────

function safeStr(val) {
  if (val === null || val === undefined) return '—';
  return String(val);
}

function formatDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return safeStr(val);
    return d.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Guayaquil',
    });
  } catch {
    return safeStr(val);
  }
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num)) return safeStr(val);
  return `$ ${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function textRun(text, opts = {}) {
  return new TextRun({
    text: safeStr(text),
    font: FONT,
    size: opts.size || FONT_SIZE_BODY,
    bold: opts.bold || false,
    italics: opts.italics || false,
  });
}

function paragraph(text, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: { after: opts.spacingAfter ?? 60 },
    children: [textRun(text, opts)],
  });
}

function emptyParagraph() {
  return new Paragraph({ spacing: { after: 0 }, children: [] });
}

// ── Table helpers ───────────────────────────────────────────────────

const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: '999999',
};

const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: HEADER_SHADING,
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [textRun(text, { bold: true })],
      }),
    ],
  });
}

function dataCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [textRun(text)],
      }),
    ],
  });
}

function twoColumnTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          headerCell(label, 35),
          dataCell(value, 65),
        ],
      })
    ),
  });
}

function multiColumnTable(headers, dataRows) {
  const colWidth = Math.floor(100 / headers.length);
  const headerRow = new TableRow({
    children: headers.map(h => headerCell(h, colWidth)),
  });
  const rows = dataRows.map(row =>
    new TableRow({
      children: row.map(cell => dataCell(cell, colWidth)),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...rows],
  });
}

// ── Section builders ────────────────────────────────────────────────

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      textRun(text, { bold: true, size: FONT_SIZE_SECTION }),
    ],
  });
}

function buildHeader(tipoPersona) {
  const tipoLabel = tipoPersona === 'JURIDICA'
    ? 'PERSONA JURÍDICA'
    : 'PERSONA NATURAL';

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        textRun('NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO', {
          bold: true,
          size: FONT_SIZE_TITLE,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        textRun(`FORMULARIO DE CONOCIMIENTO DEL USUARIO - ${tipoLabel}`, {
          bold: true,
          size: FONT_SIZE_SECTION,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        textRun(
          'Formulario de Prevención de Lavado de Activos y Financiamiento de Delitos (UAFE)',
          { italics: true, size: FONT_SIZE_BODY }
        ),
      ],
    }),
  ];
}

function buildDeclaracionAutorizacion() {
  return [
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        textRun(
          'La Unidad de Análisis Financiero y Económico UAFE, en cumplimiento a las políticas internas de prevención ' +
          'de lavado de activos, requiere la entrega de la siguiente información (favor completar todos los campos ' +
          'obligatoriamente). Autorizo expresamente a la UAFE, a través de la Notaría Décima Octava del cantón Quito, ' +
          'cuando lo considere oportuno, obtenga información ampliada relativa a mi persona o a la empresa que represento, ' +
          'de instituciones financieras y de control. Acepto que la presente información servirá como insumo para controles ' +
          'sobre prevención, detección y erradicación del delito de lavado de activos y financiamiento de delitos.',
          { size: FONT_SIZE_BODY }
        ),
      ],
    }),
  ];
}

function buildDatosActoNotarial(protocolo, calidad) {
  return [
    sectionTitle('1. DATOS DEL ACTO NOTARIAL'),
    twoColumnTable([
      ['Tipo de Acto', TIPOS_ACTO[protocolo.tipoActo] || safeStr(protocolo.tipoActo)],
      ['No. Protocolo', safeStr(protocolo.numeroProtocolo)],
      ['Fecha', formatDate(protocolo.fecha)],
      ['Cuantía USD', formatCurrency(protocolo.valorContrato)],
      ['Avalúo Municipal', formatCurrency(protocolo.avaluoMunicipal)],
      ['Calidad', CALIDADES[calidad] || safeStr(calidad)],
    ]),
  ];
}

function inferTipoIdentificacion(tipoExplicito, numId) {
  if (tipoExplicito) return safeStr(tipoExplicito);
  if (!numId) return '—';
  const len = String(numId).replace(/\D/g, '').length;
  if (len === 13) return 'RUC';
  if (len === 10) return 'Cédula';
  return 'Pasaporte';
}

function buildDatosPersonales(datos, cedula) {
  const dp = datos?.datosPersonales || {};
  const lab = datos?.informacionLaboral || {};
  const numId = dp.numeroIdentificacion || cedula;
  return [
    sectionTitle('2. DATOS PERSONALES'),
    twoColumnTable([
      ['Apellidos', safeStr(dp.apellidos)],
      ['Nombres', safeStr(dp.nombres)],
      ['Tipo de Identificación', inferTipoIdentificacion(dp.tipoIdentificacion, numId)],
      ['No. Identificación', safeStr(numId)],
      ['Nacionalidad', safeStr(dp.nacionalidad)],
      ['Nivel de Estudio', safeStr(dp.nivelEstudio)],
      ['Género', safeStr(dp.genero)],
      ['Estado Civil', safeStr(dp.estadoCivil)],
      ['Profesión / Ocupación', safeStr(lab.profesionOcupacion || dp.profesion)],
    ]),
  ];
}

function buildDomicilio(datos) {
  const dir = datos?.direccion || {};
  const ct = datos?.contacto || {};
  // Build address string from components
  const partesDireccion = [dir.callePrincipal, dir.numero, dir.calleSecundaria].filter(Boolean);
  const direccionStr = partesDireccion.join(' ') || dir.direccion;
  return [
    sectionTitle('3. DOMICILIO'),
    twoColumnTable([
      ['Dirección', safeStr(direccionStr)],
      ['Sector', safeStr(dir.sector)],
      ['Referencia', safeStr(dir.referencia)],
      ['Parroquia', safeStr(dir.parroquia)],
      ['Cantón / Ciudad', safeStr(dir.canton || dir.ciudad)],
      ['Provincia', safeStr(dir.provincia)],
      ['Celular', safeStr(ct.celular || dir.celular)],
      ['Correo Electrónico', safeStr(ct.correoElectronico || ct.email || dir.email)],
    ]),
  ];
}

function buildInformacionLaboral(datos) {
  const lab = datos?.informacionLaboral || {};
  return [
    sectionTitle('4. INFORMACIÓN LABORAL'),
    twoColumnTable([
      ['Situación Laboral', safeStr(lab.situacion || lab.situacionLaboral)],
      ['Profesión / Ocupación', safeStr(lab.profesionOcupacion)],
      ['Nombre de la Empresa / Entidad', safeStr(lab.entidad || lab.nombreEmpresa)],
      ['Cargo', safeStr(lab.cargo)],
      ['Dirección de la Empresa', safeStr(lab.direccionLaboral || lab.direccionEmpresa)],
      ['Provincia Laboral', safeStr(lab.provinciaLaboral)],
      ['Cantón Laboral', safeStr(lab.cantonLaboral)],
      ['Ingreso Mensual Aprox.', formatCurrency(lab.ingresoMensual)],
    ]),
  ];
}

function buildDatosConyuge(datos) {
  const ec = datos?.datosPersonales?.estadoCivil;
  if (ec !== 'CASADO' && ec !== 'UNION_LIBRE') return [];

  const con = datos?.conyuge || datos?.datosConyuge || {};
  return [
    sectionTitle('5. DATOS DEL CÓNYUGE'),
    twoColumnTable([
      ['Apellidos', safeStr(con.apellidos)],
      ['Nombres', safeStr(con.nombres)],
      ['Tipo de Identificación', inferTipoIdentificacion(con.tipoIdentificacion, con.numeroIdentificacion)],
      ['No. Identificación', safeStr(con.numeroIdentificacion)],
      ['Nacionalidad', safeStr(con.nacionalidad)],
      ['Correo Electrónico', safeStr(con.correoElectronico)],
      ['Celular', safeStr(con.celular)],
    ]),
  ];
}

function buildDatosMandante(datos) {
  const m = datos?.mandante;
  if (!m || !m.nombres) return [];

  const dirParts = [m.direccion, m.sector, m.referencia].filter(Boolean);
  const ubicParts = [m.parroquia, m.canton, m.provincia].filter(Boolean);

  return [
    sectionTitle('DATOS DEL REPRESENTANTE / APODERADO (Art. 30 §1.3)'),
    twoColumnTable([
      ['Apellidos', safeStr(m.apellidos)],
      ['Nombres', safeStr(m.nombres)],
      ['Tipo de Identificación', safeStr(m.tipoIdentificacion)],
      ['No. Identificación', safeStr(m.numeroIdentificacion)],
      ['Nacionalidad', safeStr(m.nacionalidad)],
      ['Género', safeStr(m.genero)],
      ['Dirección', safeStr(dirParts.join(', '))],
      ['Parroquia / Cantón / Provincia', safeStr(ubicParts.join(', '))],
      ['Celular', safeStr(m.celular)],
      ['Correo Electrónico', safeStr(m.correo)],
      ['Actividad Ocupacional', safeStr(m.actividadOcupacional)],
      ['Ingreso Mensual Aprox.', safeStr(m.ingresoMensual)],
    ]),
  ];
}

function buildDeclaracionPEP(datos) {
  const pep = datos?.declaracionPEP || datos?.pep || {};
  const esPEP = pep.esPEP === true || pep.esPEP === 'SI';
  const esFamiliarPEP = pep.esFamiliarPEP === true || pep.vinculoPEP === true || pep.vinculoPEP === 'SI';
  const esColaboradorPEP = pep.esColaboradorPEP === true;

  const rows = [
    ['¿Es Persona Expuesta Políticamente (PEP)?', esPEP ? 'SÍ' : 'NO'],
  ];

  if (esPEP) {
    rows.push(
      ['Institución donde labora', safeStr(pep.pepInstitucion || pep.institucion)],
      ['Cargo que desempeña', safeStr(pep.pepCargo || pep.cargo)],
      ['Dirección laboral', safeStr(pep.pepDireccionLaboral)],
      ['Fecha de designación', formatDate(pep.pepFechaDesde || pep.fechaDesde)],
      ['Fecha de culminación', formatDate(pep.pepFechaHasta || pep.fechaHasta)],
    );
  }

  rows.push(['¿Es familiar de un PEP? (1er y 2do grado)', esFamiliarPEP ? 'SÍ' : 'NO']);

  if (esFamiliarPEP) {
    rows.push(
      ['Nombre del PEP', safeStr(pep.pepFamiliarNombre || pep.nombrePEP)],
      ['Parentesco con el PEP', safeStr(pep.pepFamiliarParentesco || pep.parentescoPEP)],
      ['Cargo del PEP', safeStr(pep.pepFamiliarCargo || pep.cargoPEP)],
      ['Institución del PEP', safeStr(pep.pepFamiliarInstitucion)],
    );
  }

  rows.push(['¿Es colaborador cercano de un PEP?', esColaboradorPEP ? 'SÍ' : 'NO']);

  if (esColaboradorPEP) {
    rows.push(
      ['Nombre del PEP', safeStr(pep.pepColaboradorNombre)],
      ['Tipo de relación', safeStr(pep.pepColaboradorTipoRelacion)],
    );
  }

  // Dynamic section number based on whether cónyuge was included
  const ec = datos?.datosPersonales?.estadoCivil;
  const hasConyuge = ec === 'CASADO' || ec === 'UNION_LIBRE';
  const secNum = hasConyuge ? '6' : '5';

  return [
    sectionTitle(`${secNum}. DECLARACIÓN PEP (Persona Expuesta Políticamente)`),
    twoColumnTable(rows),
  ];
}

function buildFormasPago(protocolo, datos) {
  const ec = datos?.datosPersonales?.estadoCivil;
  const hasConyuge = ec === 'CASADO' || ec === 'UNION_LIBRE';
  const secNum = hasConyuge ? '7' : '6';

  const formas = protocolo.formasPago || [];
  if (formas.length === 0) {
    return [
      sectionTitle(`${secNum}. FORMAS DE PAGO`),
      paragraph('No se registraron formas de pago.'),
    ];
  }

  const dataRows = formas.map(fp => [
    safeStr(fp.tipo),
    formatCurrency(fp.monto),
    safeStr(fp.detalle),
  ]);

  return [
    sectionTitle(`${secNum}. FORMAS DE PAGO`),
    multiColumnTable(['Tipo', 'Monto', 'Detalle'], dataRows),
  ];
}

function buildDatosBien(protocolo, datos) {
  const ec = datos?.datosPersonales?.estadoCivil;
  const hasConyuge = ec === 'CASADO' || ec === 'UNION_LIBRE';
  const secNum = hasConyuge ? '8' : '7';

  if (!protocolo.tipoBien && !protocolo.descripcionBien) return [];

  const rows = [
    ['Tipo de Bien', safeStr(protocolo.tipoBien)],
    ['Descripción del Bien', safeStr(protocolo.descripcionBien)],
  ];

  if (protocolo.ubicacionDescripcion || protocolo.ubicacionCanton) {
    rows.push(
      ['Ubicación', safeStr(protocolo.ubicacionDescripcion)],
      ['Parroquia', safeStr(protocolo.ubicacionParroquia)],
      ['Cantón', safeStr(protocolo.ubicacionCanton)],
      ['Provincia', safeStr(protocolo.ubicacionProvincia)],
    );
  }

  return [
    sectionTitle(`${secNum}. DATOS DEL BIEN`),
    twoColumnTable(rows),
  ];
}

function buildDeclaracionOrigenLicito(datos) {
  const ec = datos?.datosPersonales?.estadoCivil;
  const hasConyuge = ec === 'CASADO' || ec === 'UNION_LIBRE';
  const hasBien = true; // approximate – always include the section
  let secNum = hasConyuge ? 9 : 8;

  return [
    sectionTitle(`${secNum}. DECLARACIÓN DE ORIGEN LÍCITO DE RECURSOS`),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        textRun(
          'Declaro bajo juramento que los recursos, bienes y/o valores que empleo en la presente ' +
          'transacción son de origen lícito, no provienen ni se encuentran destinados a la ' +
          'realización de ninguna actividad ilícita, especialmente las relacionadas con el lavado ' +
          'de activos, financiamiento del terrorismo y otros delitos. Me comprometo a entregar ' +
          'toda la documentación e información adicional que me sea requerida para verificar la ' +
          'procedencia lícita de mis fondos. Autorizo a la Notaría a reportar cualquier operación ' +
          'inusual o sospechosa a la Unidad de Análisis Financiero y Económico (UAFE), de ' +
          'conformidad con la Ley Orgánica de Prevención, Detección y Erradicación del Delito ' +
          'de Lavado de Activos y del Financiamiento de Delitos.',
        ),
      ],
    }),
  ];
}

function buildFirma(datos, cedula, actuaPor) {
  const dp = datos?.datosPersonales || {};
  const m = datos?.mandante || {};
  const nombrePersona = [dp.nombres, dp.apellidos].filter(Boolean).join(' ') || '—';
  const fechaHoy = new Date().toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Guayaquil',
  });

  const isApoderado = actuaPor && actuaPor !== 'PROPIOS_DERECHOS' && m.nombres;

  const firmaLabel = isApoderado ? 'Firma del Apoderado / Representante' : 'Firma';
  const rows = [];

  if (isApoderado) {
    const nombreApoderado = [m.nombres, m.apellidos].filter(Boolean).join(' ') || '—';
    rows.push(
      ['Apoderado / Representante', nombreApoderado],
      ['Cédula del Apoderado', safeStr(m.numeroIdentificacion)],
      ['En representación de', nombrePersona],
      ['Cédula del Representado', safeStr(dp.numeroIdentificacion || cedula)],
    );
  } else {
    rows.push(
      ['Nombre', nombrePersona],
      ['Cédula / RUC', safeStr(dp.numeroIdentificacion || cedula)],
    );
  }
  rows.push(['Fecha', fechaHoy]);

  return [
    new Paragraph({ spacing: { before: 400, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [textRun('_________________________________________')],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [textRun(firmaLabel, { bold: true })],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    twoColumnTable(rows),
  ];
}

// ── Persona Jurídica specific sections ──────────────────────────────

function buildDatosCompania(datos) {
  const comp = datos?.compania || {};
  return [
    sectionTitle('2. DATOS DE LA COMPAÑÍA'),
    twoColumnTable([
      ['Razón Social', safeStr(comp.razonSocial)],
      ['RUC', safeStr(comp.ruc)],
      ['Actividad Económica / Objeto Social', safeStr(comp.actividadEconomica || comp.objetoSocial)],
      ['Fecha de Constitución', formatDate(comp.fechaConstitucion)],
    ]),
  ];
}

function buildRepresentanteLegal(datos) {
  const rep = datos?.representanteLegal || {};
  return [
    sectionTitle('3. REPRESENTANTE LEGAL'),
    twoColumnTable([
      ['Apellidos', safeStr(rep.apellidos)],
      ['Nombres', safeStr(rep.nombres)],
      ['Tipo de Identificación', inferTipoIdentificacion(rep.tipoIdentificacion, rep.numeroIdentificacion)],
      ['No. Identificación', safeStr(rep.numeroIdentificacion)],
      ['Nacionalidad', safeStr(rep.nacionalidad)],
      ['Género', safeStr(rep.genero)],
      ['Estado Civil', safeStr(rep.estadoCivil)],
      ['Nivel de Estudio', safeStr(rep.nivelEstudio)],
      ['Cargo', safeStr(rep.cargo)],
      ['Celular', safeStr(rep.celular)],
      ['Correo Electrónico', safeStr(rep.correoElectronico)],
      ['Dirección', safeStr(rep.direccion)],
    ]),
  ];
}

function flattenSocios(socios, prefix = '') {
  const rows = [];
  for (const s of socios) {
    const isJuridica = s.tipoSocio === 'JURIDICA';
    if (isJuridica) {
      const nombre = prefix + (s.razonSocial || '(Empresa sin nombre)');
      const identificacion = s.ruc || '';
      const pct = s.porcentaje ?? s.porcentajeParticipacion;
      rows.push([
        safeStr(nombre),
        safeStr(identificacion),
        pct != null && pct !== '' ? `${pct}%` : '—',
        safeStr(s.nacionalidad),
      ]);
      // Recursively add sub-socios with indent
      if (s.subSocios && s.subSocios.length > 0) {
        rows.push(...flattenSocios(s.subSocios, prefix + '  ↳ '));
      }
    } else {
      // Persona natural (default if no tipoSocio)
      const nombre = prefix + (s.nombre || [s.apellidos, s.nombres].filter(Boolean).join(' ') || '—');
      const identificacion = s.identificacion || s.numeroIdentificacion;
      const pct = s.porcentaje ?? s.porcentajeParticipacion;
      rows.push([
        safeStr(nombre),
        safeStr(identificacion),
        pct != null && pct !== '' ? `${pct}%` : '—',
        safeStr(s.nacionalidad),
      ]);
    }
  }
  return rows;
}

function buildSocios(datos) {
  const socios = datos?.socios || [];
  if (socios.length === 0) {
    return [
      sectionTitle('5. SOCIOS / ACCIONISTAS'),
      paragraph('No se registraron socios o accionistas.'),
    ];
  }

  const dataRows = flattenSocios(socios);

  return [
    sectionTitle('5. SOCIOS / ACCIONISTAS'),
    multiColumnTable(
      ['Nombre', 'Identificación', 'Participación %', 'Nacionalidad'],
      dataRows,
    ),
  ];
}

function buildConyugeRepresentante(datos) {
  const rep = datos?.representanteLegal || {};
  const ec = rep.estadoCivil;
  if (ec !== 'CASADO' && ec !== 'UNION_LIBRE') return [];

  const con = datos?.conyugeRepresentante || {};
  return [
    sectionTitle('4. DATOS DEL CÓNYUGE DEL REPRESENTANTE LEGAL'),
    twoColumnTable([
      ['Apellidos', safeStr(con.apellidos)],
      ['Nombres', safeStr(con.nombres)],
      ['Tipo de Identificación', inferTipoIdentificacion(con.tipoIdentificacion, con.numeroIdentificacion)],
      ['No. Identificación', safeStr(con.numeroIdentificacion)],
      ['Nacionalidad', safeStr(con.nacionalidad)],
      ['Correo Electrónico', safeStr(con.correoElectronico)],
      ['Celular', safeStr(con.celular)],
    ]),
  ];
}

function buildDomicilioJuridica(datos) {
  const comp = datos?.compania || {};
  const dom = datos?.domicilio || {};
  return [
    sectionTitle('6. DOMICILIO'),
    twoColumnTable([
      ['Dirección', safeStr(comp.direccion || dom.direccion)],
      ['Parroquia', safeStr(comp.parroquia || dom.parroquia)],
      ['Cantón / Ciudad', safeStr(dom.canton || dom.ciudad || 'Quito')],
      ['Provincia', safeStr(dom.provincia || 'Pichincha')],
      ['País', safeStr(dom.pais || 'Ecuador')],
      ['Teléfono', safeStr(comp.telefonoCompania || dom.telefono)],
      ['Celular', safeStr(comp.celularCompania || dom.celular)],
      ['Correo Electrónico', safeStr(comp.emailCompania || dom.email)],
    ]),
  ];
}

function buildPEPJuridica(datos) {
  const pep = datos?.declaracionPEP || datos?.pep || {};
  const esPEP = pep.esPEP === true || pep.esPEP === 'SI';
  const esFamiliarPEP = pep.esFamiliarPEP === true || pep.vinculoPEP === true || pep.vinculoPEP === 'SI';

  const rows = [
    ['¿Es Persona Expuesta Políticamente (PEP)?', esPEP ? 'SÍ' : 'NO'],
  ];

  if (esPEP) {
    rows.push(
      ['Cargo PEP', safeStr(pep.cargo)],
      ['Institución', safeStr(pep.institucion)],
      ['Fecha Desde', formatDate(pep.fechaDesde)],
      ['Fecha Hasta', formatDate(pep.fechaHasta)],
    );
  }

  rows.push(['¿Es familiar de un PEP?', esFamiliarPEP ? 'SÍ' : 'NO']);

  if (esFamiliarPEP) {
    rows.push(
      ['Nombre del PEP', safeStr(pep.nombrePEP)],
      ['Parentesco con el PEP', safeStr(pep.parentescoPEP)],
      ['Cargo del PEP', safeStr(pep.cargoPEP)],
    );
  }

  return [
    sectionTitle('7. DECLARACIÓN PEP (Persona Expuesta Políticamente)'),
    twoColumnTable(rows),
  ];
}

function buildFormasPagoJuridica(protocolo) {
  const formas = protocolo.formasPago || [];
  if (formas.length === 0) {
    return [
      sectionTitle('8. FORMAS DE PAGO'),
      paragraph('No se registraron formas de pago.'),
    ];
  }

  const dataRows = formas.map(fp => [
    safeStr(fp.tipo),
    formatCurrency(fp.monto),
    safeStr(fp.detalle),
  ]);

  return [
    sectionTitle('8. FORMAS DE PAGO'),
    multiColumnTable(['Tipo', 'Monto', 'Detalle'], dataRows),
  ];
}

function buildDatosBienJuridica(protocolo) {
  if (!protocolo.tipoBien && !protocolo.descripcionBien) return [];

  const rows = [
    ['Tipo de Bien', safeStr(protocolo.tipoBien)],
    ['Descripción del Bien', safeStr(protocolo.descripcionBien)],
  ];

  if (protocolo.ubicacionDescripcion || protocolo.ubicacionCanton) {
    rows.push(
      ['Ubicación', safeStr(protocolo.ubicacionDescripcion)],
      ['Parroquia', safeStr(protocolo.ubicacionParroquia)],
      ['Cantón', safeStr(protocolo.ubicacionCanton)],
      ['Provincia', safeStr(protocolo.ubicacionProvincia)],
    );
  }

  return [
    sectionTitle('9. DATOS DEL BIEN'),
    twoColumnTable(rows),
  ];
}

function buildDeclaracionOrigenLicitoJuridica() {
  return [
    sectionTitle('10. DECLARACIÓN DE ORIGEN LÍCITO DE RECURSOS'),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        textRun(
          'Declaro bajo juramento que los recursos, bienes y/o valores que empleo en la presente ' +
          'transacción son de origen lícito, no provienen ni se encuentran destinados a la ' +
          'realización de ninguna actividad ilícita, especialmente las relacionadas con el lavado ' +
          'de activos, financiamiento del terrorismo y otros delitos. Me comprometo a entregar ' +
          'toda la documentación e información adicional que me sea requerida para verificar la ' +
          'procedencia lícita de mis fondos. Autorizo a la Notaría a reportar cualquier operación ' +
          'inusual o sospechosa a la Unidad de Análisis Financiero y Económico (UAFE), de ' +
          'conformidad con la Ley Orgánica de Prevención, Detección y Erradicación del Delito ' +
          'de Lavado de Activos y del Financiamiento de Delitos.',
        ),
      ],
    }),
  ];
}

function buildFirmaJuridica(datos) {
  const rep = datos?.representanteLegal || {};
  const nombreCompleto = [rep.nombres, rep.apellidos].filter(Boolean).join(' ') || '—';
  const fechaHoy = new Date().toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Guayaquil',
  });

  return [
    new Paragraph({ spacing: { before: 400, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [textRun('_________________________________________')],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [textRun('Firma del Representante Legal', { bold: true })],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    twoColumnTable([
      ['Nombre', nombreCompleto],
      ['Cédula / RUC', safeStr(rep.numeroIdentificacion)],
      ['Cargo', safeStr(rep.cargo)],
      ['Fecha', fechaHoy],
    ]),
  ];
}

// ── Main export ─────────────────────────────────────────────────────

/**
 * Genera un documento Word (.docx) con el formulario UAFE KYC para un compareciente.
 *
 * @param {object} protocolo - ProtocoloUAFE record (includes tipoActo, numeroProtocolo, fecha, etc.)
 * @param {object} personaProtocolo - PersonaProtocolo record (includes calidad, tipo, datos JSON)
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 */
export async function generarFormularioWord(protocolo, personaProtocolo) {
  const tipo = personaProtocolo.tipo; // 'NATURAL' or 'JURIDICA'
  const calidad = personaProtocolo.calidad;
  const datos = typeof personaProtocolo.datos === 'string'
    ? JSON.parse(personaProtocolo.datos)
    : (personaProtocolo.datos || {});

  logger.info(
    `[formulario-uafe-word] Generando formulario ${tipo} para protocolo ${protocolo.id}, calidad ${calidad}`,
  );

  const cedula = personaProtocolo.cedula || personaProtocolo.personaCedula;

  let sections;

  if (tipo === 'JURIDICA') {
    sections = [
      ...buildHeader('JURIDICA'),
      ...buildDeclaracionAutorizacion(),
      ...buildDatosActoNotarial(protocolo, calidad),
      ...buildDatosCompania(datos),
      ...buildRepresentanteLegal(datos),
      ...buildConyugeRepresentante(datos),
      ...buildSocios(datos),
      ...buildDomicilioJuridica(datos),
      ...buildPEPJuridica(datos),
      ...buildFormasPagoJuridica(protocolo),
      ...buildDatosBienJuridica(protocolo),
      ...buildDeclaracionOrigenLicitoJuridica(),
      ...buildFirmaJuridica(datos),
    ];
  } else {
    // NATURAL (default)
    sections = [
      ...buildHeader('NATURAL'),
      ...buildDeclaracionAutorizacion(),
      ...buildDatosActoNotarial(protocolo, calidad),
      ...buildDatosPersonales(datos, cedula),
      ...buildDomicilio(datos),
      ...buildInformacionLaboral(datos),
      ...buildDatosConyuge(datos),
      ...buildDatosMandante(datos),
      ...buildDeclaracionPEP(datos),
      ...buildFormasPago(protocolo, datos),
      ...buildDatosBien(protocolo, datos),
      ...buildDeclaracionOrigenLicito(datos),
      ...buildFirma(datos, cedula, personaProtocolo.actuaPor),
    ];
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE_BODY,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 1080,  // 0.75 inch
              right: 1080,
            },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Build filename with person name and date
  const dp = datos?.datosPersonales || datos?.representanteLegal || {};
  const nombreCorto = [dp.apellidos, dp.nombres]
    .filter(Boolean)
    .join('_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
    .substring(0, 40) || 'formulario';

  const tipoLabel = tipo === 'JURIDICA' ? 'PJ' : 'PN';
  // Include date in filename for easier identification
  const fechaStr = protocolo.fecha
    ? new Date(protocolo.fecha).toISOString().slice(0, 10).replace(/-/g, '')
    : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const numProt = protocolo.numeroProtocolo || protocolo.id;
  const filename = `FormularioUAFE_${tipoLabel}_${nombreCorto}_Prot${numProt}_${fechaStr}.docx`;

  logger.info(`[formulario-uafe-word] Generado: ${filename} (${buffer.length} bytes)`);

  return { buffer, filename };
}
