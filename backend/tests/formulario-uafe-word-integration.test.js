import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Readable } from 'node:stream';
import { createInflateRaw } from 'node:zlib';

// ── Mock logger ──────────────────────────────────────────────────────
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Import service after mocks ──────────────────────────────────────
const { generarFormularioWord } = await import('../src/services/formulario-uafe-word-service.js');

// ── Helper: extract all text from docx buffer ────────────────────────
// docx files are ZIP archives; we read word/document.xml and strip XML tags
async function extractTextFromDocx(buffer) {
  // Minimal ZIP parser — find local file headers, decompress word/document.xml
  const entries = [];
  let offset = 0;
  while (offset < buffer.length - 4) {
    // Local file header signature = 0x04034b50
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const compMethod = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const uncompSize = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    entries.push({ name, compMethod, data: buffer.subarray(dataStart, dataEnd), uncompSize });
    offset = dataEnd;
  }
  const docEntry = entries.find(e => e.name === 'word/document.xml');
  if (!docEntry) return '';
  let xml;
  if (docEntry.compMethod === 0) {
    xml = docEntry.data.toString('utf8');
  } else {
    xml = await new Promise((resolve, reject) => {
      const chunks = [];
      const inflate = createInflateRaw();
      inflate.on('data', c => chunks.push(c));
      inflate.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      inflate.on('error', reject);
      Readable.from(docEntry.data).pipe(inflate);
    });
  }
  // Strip XML tags and return text
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Fixtures ─────────────────────────────────────────────────────────

/** Datos de protocolo típico de compraventa */
const protocoloCompraventa = {
  id: 'proto-001',
  tipoActo: 'COMPRAVENTA',
  numeroProtocolo: '2026-0150',
  fecha: new Date('2026-03-09T10:00:00Z'),
  valorContrato: 85000,
  avaluoMunicipal: 72000,
  formasPago: [
    { tipo: 'TRANSFERENCIA', monto: 50000, detalle: 'Banco Pichincha' },
    { tipo: 'CHEQUE', monto: 35000, detalle: 'Cheque certificado Produbanco' },
  ],
  tipoBien: 'INMUEBLE',
  descripcionBien: 'Departamento de 120m2 en sector La Carolina',
  ubicacionDescripcion: 'Av. Amazonas N34-56',
  ubicacionParroquia: 'Iñaquito',
  ubicacionCanton: 'Quito',
  ubicacionProvincia: 'Pichincha',
};

/** Datos de persona natural completa (estructura real de datosPersonaNatural) */
const datosPersonaNaturalCompleta = {
  datosPersonales: {
    apellidos: 'GARCÍA MORENO',
    nombres: 'JUAN CARLOS',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '1712345678',
    fechaNacimiento: '1985-06-15',
    lugarNacimiento: 'Quito',
    nacionalidad: 'ECUATORIANA',
    nivelEstudio: 'SUPERIOR',
    genero: 'M',
    estadoCivil: 'CASADO',
  },
  contacto: {
    celular: '0991234567',
    correoElectronico: 'jgarcia@email.com',
  },
  direccion: {
    callePrincipal: 'Av. 6 de Diciembre',
    calleSecundaria: 'N34-12 y Whymper',
    numero: 'N34-12',
    provincia: 'Pichincha',
    canton: 'Quito',
    parroquia: 'Iñaquito',
  },
  informacionLaboral: {
    situacion: 'EMPLEADO',
    profesionOcupacion: 'Ingeniero Civil',
    entidad: 'Constructora XYZ S.A.',
    cargo: 'Gerente de Proyectos',
    ingresoMensual: 4500,
  },
  conyuge: {
    apellidos: 'LÓPEZ MARTÍNEZ',
    nombres: 'MARÍA ELENA',
    numeroIdentificacion: '1723456789',
    nacionalidad: 'ECUATORIANA',
    correoElectronico: 'mlopez@email.com',
    celular: '0987654321',
  },
  declaracionPEP: {
    esPEP: false,
    esFamiliarPEP: false,
    esColaboradorPEP: false,
  },
};

/** Datos de persona natural soltera (sin cónyuge) */
const datosPersonaNaturalSoltera = {
  datosPersonales: {
    apellidos: 'RODRÍGUEZ PÉREZ',
    nombres: 'ANA LUCÍA',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '1798765432',
    fechaNacimiento: '1990-11-20',
    lugarNacimiento: 'Guayaquil',
    nacionalidad: 'ECUATORIANA',
    nivelEstudio: 'POSTGRADO',
    genero: 'F',
    estadoCivil: 'SOLTERO',
  },
  contacto: {
    celular: '0998877665',
    correoElectronico: 'arodriguez@email.com',
  },
  direccion: {
    callePrincipal: 'Calle Toledo',
    calleSecundaria: 'y Lerida',
    numero: 'E4-56',
    provincia: 'Pichincha',
    canton: 'Quito',
    parroquia: 'La Floresta',
  },
  informacionLaboral: {
    situacion: 'INDEPENDIENTE',
    profesionOcupacion: 'Abogada',
    entidad: 'Bufete Rodríguez & Asociados',
    cargo: 'Socia Principal',
    ingresoMensual: 6000,
  },
  declaracionPEP: {
    esPEP: true,
    esFamiliarPEP: false,
    esColaboradorPEP: false,
    cargo: 'Concejal de Quito',
    institucion: 'Municipio de Quito',
    fechaDesde: '2023-05-15',
    fechaHasta: '2027-05-15',
  },
};

/** Datos de persona jurídica (estructura real de datosPersonaJuridica) */
const datosPersonaJuridica = {
  compania: {
    razonSocial: 'INMOBILIARIA ECUATORIANA S.A.',
    ruc: '1791234567001',
    actividadEconomica: 'Promoción inmobiliaria',
    fechaConstitucion: '2010-03-01',
    objetoSocial: 'Compraventa de bienes inmuebles',
    direccion: 'Av. República E7-123',
    parroquia: 'Iñaquito',
    telefonoCompania: '02-2234567',
    celularCompania: '0999887766',
    emailCompania: 'info@inmobecuador.com',
  },
  representanteLegal: {
    apellidos: 'MARTÍNEZ VEGA',
    nombres: 'CARLOS ANDRÉS',
    cargo: 'Gerente General',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '1756789012',
    genero: 'M',
    estadoCivil: 'CASADO',
  },
  socios: [
    { nombre: 'CARLOS MARTÍNEZ VEGA', identificacion: '1756789012', porcentaje: 60, nacionalidad: 'ECUATORIANA' },
    { nombre: 'LUCÍA TORRES ABAD', identificacion: '1745678901', porcentaje: 40, nacionalidad: 'ECUATORIANA' },
  ],
  declaracionPEP: {
    esPEP: false,
    esFamiliarPEP: false,
  },
};

/** Persona natural con apoderado (mandante) */
const datosPersonaNaturalConApoderado = {
  datosPersonales: {
    apellidos: 'TORRES ABAD',
    nombres: 'PEDRO LUIS',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '1712345000',
    nacionalidad: 'ECUATORIANA',
    genero: 'M',
    estadoCivil: 'SOLTERO',
  },
  contacto: {
    celular: '0991111111',
    correoElectronico: 'ptorres@email.com',
  },
  direccion: {
    callePrincipal: 'Av. 10 de Agosto',
    provincia: 'Pichincha',
    canton: 'Quito',
    parroquia: 'Centro Histórico',
  },
  informacionLaboral: {
    situacion: 'EMPLEADO',
    profesionOcupacion: 'Comerciante',
    entidad: 'Comercial Torres',
    cargo: 'Propietario',
    ingresoMensual: 3000,
  },
  mandante: {
    apellidos: 'VÁSQUEZ LUNA',
    nombres: 'ROSA MARÍA',
    tipoIdentificacion: 'Cédula',
    numeroIdentificacion: '1798765000',
    nacionalidad: 'ECUATORIANA',
    genero: 'F',
    direccion: 'Calle Sucre 123',
    sector: 'Centro',
    referencia: 'Junto al mercado',
    parroquia: 'Centro Histórico',
    canton: 'Quito',
    provincia: 'Pichincha',
    celular: '0992222222',
    correo: 'rvazquez@email.com',
    actividadOcupacional: 'Jubilada',
    ingresoMensual: '1500',
  },
  declaracionPEP: {
    esPEP: false,
    esFamiliarPEP: false,
    esColaboradorPEP: false,
  },
};

/** Persona jurídica con apoderado (no representante legal directo) */
const datosPersonaJuridicaConApoderado = {
  compania: {
    razonSocial: 'CONSTRUCTORA ANDINA CIA. LTDA.',
    ruc: '1792345678001',
    actividadEconomica: 'Construcción de edificios',
    fechaConstitucion: '2015-07-01',
  },
  representanteLegal: {
    apellidos: 'MORALES CASTRO',
    nombres: 'ROBERTO ANDRÉS',
    cargo: 'Gerente General',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '1756700000',
    genero: 'M',
    estadoCivil: 'SOLTERO',
  },
  socios: [
    { nombre: 'ROBERTO MORALES CASTRO', identificacion: '1756700000', porcentaje: 50, nacionalidad: 'ECUATORIANA' },
    { nombre: 'ANA LÓPEZ VEGA', identificacion: '1745600000', porcentaje: 50, nacionalidad: 'ECUATORIANA' },
  ],
  declaracionPEP: {
    esPEP: false,
    esFamiliarPEP: false,
  },
};

// ── Tests ────────────────────────────────────────────────────────────

describe('Formulario UAFE Word Service - Tests de Integración', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Persona Natural Completa (casada, con cónyuge)
  // ═══════════════════════════════════════════════════════════════════
  describe('Persona Natural - datos completos (casado)', () => {
    let result;

    beforeEach(async () => {
      result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: datosPersonaNaturalCompleta,
      });
    });

    it('debe generar un buffer válido de Word', () => {
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('debe generar un filename con nombre de persona y fecha', () => {
      expect(result.filename).toContain('FormularioUAFE_PN_');
      expect(result.filename).toContain('GARCÍA_MORENO_JUAN_CARLOS');
      expect(result.filename).toContain('Prot2026-0150');
      expect(result.filename).toContain('20260309');
      expect(result.filename).toMatch(/\.docx$/);
    });

    it('el buffer debe iniciar con signature de archivo ZIP/DOCX', () => {
      // Los .docx son archivos ZIP con magic bytes PK (0x50, 0x4B)
      expect(result.buffer[0]).toBe(0x50);
      expect(result.buffer[1]).toBe(0x4B);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Persona Natural Soltera (PEP)
  // ═══════════════════════════════════════════════════════════════════
  describe('Persona Natural - soltera, PEP', () => {
    let result;

    beforeEach(async () => {
      result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        datos: datosPersonaNaturalSoltera,
      });
    });

    it('debe generar un buffer válido', () => {
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('filename debe contener nombre de la persona', () => {
      expect(result.filename).toContain('RODRÍGUEZ_PÉREZ_ANA_LUCÍA');
    });

    it('no debe incluir sección de cónyuge (persona soltera)', async () => {
      // La persona soltera no debería incluir la sección de cónyuge.
      // Verificamos indirectamente: el archivo de la soltera debe ser más pequeño
      // que el de la casada (menos contenido)
      const resultCasada = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: datosPersonaNaturalCompleta,
      });
      // Casada tiene sección cónyuge extra = más bytes
      expect(resultCasada.buffer.length).toBeGreaterThan(result.buffer.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Persona Jurídica
  // ═══════════════════════════════════════════════════════════════════
  describe('Persona Jurídica', () => {
    let result;

    beforeEach(async () => {
      result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: datosPersonaJuridica,
      });
    });

    it('debe generar buffer válido', () => {
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('filename debe indicar PJ y contener nombre del representante legal', () => {
      expect(result.filename).toContain('FormularioUAFE_PJ_');
      expect(result.filename).toContain('MARTÍNEZ_VEGA');
      expect(result.filename).toMatch(/\.docx$/);
    });

    it('el buffer debe ser un ZIP/DOCX válido', () => {
      expect(result.buffer[0]).toBe(0x50);
      expect(result.buffer[1]).toBe(0x4B);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Datos vacíos / parciales
  // ═══════════════════════════════════════════════════════════════════
  describe('Datos parciales o vacíos', () => {
    it('debe generar documento con datos vacíos sin crashear', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: {},
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toContain('formulario');
    });

    it('debe manejar datos null sin crashear', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        datos: null,
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('debe manejar datos como string JSON', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: JSON.stringify(datosPersonaNaturalCompleta),
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('GARCÍA_MORENO');
    });

    it('persona jurídica sin socios no debe crashear', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: {
          compania: { razonSocial: 'TEST S.A.', ruc: '1790000000001' },
          representanteLegal: { nombres: 'Juan', apellidos: 'Test' },
          socios: [],
        },
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('protocolo sin formas de pago no debe crashear', async () => {
      const protSinPago = { ...protocoloCompraventa, formasPago: [] };
      const result = await generarFormularioWord(protSinPago, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: datosPersonaNaturalCompleta,
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('protocolo sin datos de bien no debe crashear', async () => {
      const protSinBien = { ...protocoloCompraventa, tipoBien: null, descripcionBien: null };
      const result = await generarFormularioWord(protSinBien, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: datosPersonaNaturalCompleta,
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Filename
  // ═══════════════════════════════════════════════════════════════════
  describe('Formato de filename', () => {
    it('debe incluir fecha del protocolo en formato YYYYMMDD', async () => {
      const result = await generarFormularioWord(
        { ...protocoloCompraventa, fecha: new Date('2026-01-15') },
        { tipo: 'NATURAL', calidad: 'VENDEDOR', datos: datosPersonaNaturalCompleta }
      );
      expect(result.filename).toContain('20260115');
    });

    it('debe usar fecha actual si protocolo no tiene fecha', async () => {
      const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const result = await generarFormularioWord(
        { ...protocoloCompraventa, fecha: null },
        { tipo: 'NATURAL', calidad: 'VENDEDOR', datos: datosPersonaNaturalCompleta }
      );
      expect(result.filename).toContain(hoy);
    });

    it('debe incluir número de protocolo', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: datosPersonaNaturalCompleta,
      });
      expect(result.filename).toContain('Prot2026-0150');
    });

    it('debe truncar nombres muy largos a 40 chars', async () => {
      const datosNombreLargo = {
        ...datosPersonaNaturalCompleta,
        datosPersonales: {
          ...datosPersonaNaturalCompleta.datosPersonales,
          apellidos: 'DE LA TORRE GÓMEZ DE LA BARRERA ESPINOZA RODRIGUEZ',
          nombres: 'JUAN CARLOS ALBERTO FERNANDO',
        },
      };
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        datos: datosNombreLargo,
      });
      // Nombre en el filename no debe exceder ~40 chars
      const nameMatch = result.filename.match(/PN_(.+?)_Prot/);
      expect(nameMatch).toBeTruthy();
      expect(nameMatch[1].length).toBeLessThanOrEqual(40);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Persona Natural con Apoderado
  // ═══════════════════════════════════════════════════════════════════
  describe('Persona Natural con Apoderado', () => {
    it('debe generar documento sin crashear cuando actuaPor es APODERADO_GENERAL', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'APODERADO_GENERAL',
        datos: datosPersonaNaturalConApoderado,
        cedula: '1712345000',
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('debe incluir sección DATOS DEL REPRESENTANTE / APODERADO cuando hay mandante', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'APODERADO_GENERAL',
        datos: datosPersonaNaturalConApoderado,
        cedula: '1712345000',
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('REPRESENTANTE');
      expect(text).toContain('APODERADO');
      // Datos del mandante
      expect(text).toContain('VÁSQUEZ LUNA');
      expect(text).toContain('ROSA MARÍA');
      expect(text).toContain('1798765000');
    });

    it('firma debe indicar "Firma del Apoderado / Representante" cuando actúa por apoderado', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'APODERADO_GENERAL',
        datos: datosPersonaNaturalConApoderado,
        cedula: '1712345000',
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('Firma del Apoderado');
      // Should show the mandante as signer and the represented person
      expect(text).toContain('En representación de');
    });

    it('firma debe mostrar datos del apoderado (mandante) y del representado', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'APODERADO_ESPECIAL',
        datos: datosPersonaNaturalConApoderado,
        cedula: '1712345000',
      });
      const text = await extractTextFromDocx(result.buffer);
      // The mandante (apoderado) signs
      expect(text).toContain('ROSA MARÍA VÁSQUEZ LUNA');
      // Should NOT contain a different person's name
      expect(text).not.toContain('JUAN CARLOS GARCÍA MORENO');
      // The actual represented person should appear
      expect(text).toContain('PEDRO LUIS');
      expect(text).toContain('TORRES ABAD');
    });

    it('cuando actuaPor es PROPIOS_DERECHOS no debe generar firma de apoderado', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'PROPIOS_DERECHOS',
        datos: datosPersonaNaturalConApoderado,
        cedula: '1712345000',
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).not.toContain('Firma del Apoderado');
      expect(text).toContain('Firma');
    });

    it('cuando actuaPor indica apoderado pero no hay datos de mandante, no debe crashear', async () => {
      const datosSinMandante = {
        ...datosPersonaNaturalConApoderado,
        mandante: undefined,
      };
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'APODERADO_GENERAL',
        datos: datosSinMandante,
        cedula: '1712345000',
      });
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Persona Jurídica — firma y representante legal
  // ═══════════════════════════════════════════════════════════════════
  describe('Persona Jurídica - representante legal y firma', () => {
    it('firma debe decir "Firma del Representante Legal" por defecto', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: datosPersonaJuridica,
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('Firma del Representante Legal');
      expect(text).toContain('CARLOS ANDRÉS');
      expect(text).toContain('MARTÍNEZ VEGA');
    });

    it('debe incluir sección de representante legal con datos completos', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: datosPersonaJuridica,
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('REPRESENTANTE LEGAL');
      expect(text).toContain('1756789012');
      expect(text).toContain('Gerente General');
    });

    it('debe incluir datos de la compañía', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: datosPersonaJuridica,
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('INMOBILIARIA ECUATORIANA S.A.');
      expect(text).toContain('1791234567001');
    });

    it('debe incluir socios/accionistas', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: datosPersonaJuridica,
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('SOCIOS');
      expect(text).toContain('CARLOS MARTÍNEZ VEGA');
      expect(text).toContain('60%');
      expect(text).toContain('LUCÍA TORRES ABAD');
      expect(text).toContain('40%');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Procedencia de Fondos
  // ═══════════════════════════════════════════════════════════════════
  describe('Procedencia de Fondos', () => {
    it('debe incluir sección de procedencia de fondos para COMPRADOR', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'PROPIOS_DERECHOS',
        datos: datosPersonaNaturalCompleta,
        procedenciaFondos: 'Ahorros personales y venta de vehículo',
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('PROCEDENCIA DE FONDOS');
      expect(text).toContain('Ahorros personales y venta de vehículo');
    });

    it('no debe incluir procedencia de fondos para VENDEDOR', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'VENDEDOR',
        actuaPor: 'PROPIOS_DERECHOS',
        datos: datosPersonaNaturalCompleta,
        procedenciaFondos: 'Esto no debería aparecer',
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).not.toContain('PROCEDENCIA DE FONDOS');
    });

    it('no debe incluir sección si procedenciaFondos está vacío', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'NATURAL',
        calidad: 'COMPRADOR',
        actuaPor: 'PROPIOS_DERECHOS',
        datos: datosPersonaNaturalCompleta,
        procedenciaFondos: null,
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).not.toContain('PROCEDENCIA DE FONDOS');
    });

    it('debe incluir procedencia de fondos para persona jurídica COMPRADOR', async () => {
      const result = await generarFormularioWord(protocoloCompraventa, {
        tipo: 'JURIDICA',
        calidad: 'COMPRADOR',
        datos: datosPersonaJuridica,
        procedenciaFondos: 'Capital social y crédito bancario',
      });
      const text = await extractTextFromDocx(result.buffer);
      expect(text).toContain('PROCEDENCIA DE FONDOS');
      expect(text).toContain('Capital social y crédito bancario');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Escenario real: escritura con mandataria dual + persona jurídica
  // ANA LUCÍA comparece por sus propios derechos Y como mandataria
  // NORMA BEATRIZ representada por ANA LUCÍA
  // SURKUNA persona jurídica representada por su directora ejecutiva
  // ═══════════════════════════════════════════════════════════════════
  describe('Escenario real: mandataria dual + persona jurídica', () => {
    // Protocolo: compraventa de inmueble
    const protocoloEscritura = {
      id: 'proto-real-001',
      tipoActo: 'COMPRAVENTA',
      numeroProtocolo: '2026-0027',
      fecha: new Date('2026-01-27T10:00:00Z'),
      valorContrato: 120000,
      avaluoMunicipal: 95000,
      formasPago: [
        { tipo: 'TRANSFERENCIA', monto: 120000, detalle: 'Banco Pichincha' },
      ],
      tipoBien: 'INMUEBLE',
      descripcionBien: 'Oficina en Av. Eloy Alfaro',
    };

    // ANA LUCÍA — vendedora por sus propios derechos
    const datosAnaLucia = {
      datosPersonales: {
        apellidos: 'SÁNCHEZ JARRÍN',
        nombres: 'ANA LUCÍA',
        tipoIdentificacion: 'CEDULA',
        numeroIdentificacion: '1706544929',
        nacionalidad: 'ECUATORIANA',
        genero: 'F',
        estadoCivil: 'CASADO',
      },
      contacto: { celular: '0991000001', correoElectronico: 'alucia@email.com' },
      direccion: { callePrincipal: 'Calle Sucre', provincia: 'Pichincha', canton: 'Quito' },
      informacionLaboral: { situacion: 'INDEPENDIENTE', profesionOcupacion: 'Comerciante', ingresoMensual: 3000 },
      conyuge: {
        apellidos: 'PÉREZ MORA',
        nombres: 'CARLOS',
        numeroIdentificacion: '1701111111',
        nacionalidad: 'ECUATORIANA',
      },
      declaracionPEP: { esPEP: false, esFamiliarPEP: false, esColaboradorPEP: false },
    };

    // NORMA BEATRIZ — vendedora representada por ANA LUCÍA
    const datosNormaBeatriz = {
      datosPersonales: {
        apellidos: 'SÁNCHEZ JARRÍN',
        nombres: 'NORMA BEATRIZ',
        tipoIdentificacion: 'CEDULA',
        numeroIdentificacion: '1704000000',
        nacionalidad: 'ECUATORIANA',
        genero: 'F',
        estadoCivil: 'SOLTERO',
      },
      contacto: { celular: '0992000002', correoElectronico: 'norma@email.com' },
      direccion: { callePrincipal: 'Av. Amazonas', provincia: 'Pichincha', canton: 'Quito' },
      informacionLaboral: { situacion: 'JUBILADO', profesionOcupacion: 'Profesora', ingresoMensual: 800 },
      // ANA LUCÍA es la mandataria (quien actúa en nombre de NORMA BEATRIZ)
      mandante: {
        apellidos: 'SÁNCHEZ JARRÍN',
        nombres: 'ANA LUCÍA',
        tipoIdentificacion: 'Cédula',
        numeroIdentificacion: '1706544929',
        nacionalidad: 'ECUATORIANA',
        genero: 'F',
        direccion: 'Calle Sucre',
        canton: 'Quito',
        provincia: 'Pichincha',
        celular: '0991000001',
        correo: 'alucia@email.com',
        actividadOcupacional: 'Comerciante',
        ingresoMensual: '3000',
      },
      declaracionPEP: { esPEP: false, esFamiliarPEP: false, esColaboradorPEP: false },
    };

    // SURKUNA — compradora (persona jurídica)
    const datosSurkuna = {
      compania: {
        razonSocial: 'CENTRO DE APOYO Y PROTECCIÓN DE LOS DERECHOS HUMANOS SURKUNA',
        ruc: '1791000000001',
        actividadEconomica: 'Defensa de derechos humanos',
        fechaConstitucion: '2010-05-15',
        direccion: 'Av. Eloy Alfaro N32-614 y Bélgica',
        parroquia: 'Iñaquito',
        telefonoCompania: '0963630034',
        emailCompania: 'surkuna.ec@gmail.com',
      },
      representanteLegal: {
        apellidos: 'TIRIRA RUBIO',
        nombres: 'MAYRA LUCÍA',
        cargo: 'Directora Ejecutiva',
        tipoIdentificacion: 'CEDULA',
        numeroIdentificacion: '1714274964',
        genero: 'F',
        estadoCivil: 'SOLTERO',
      },
      socios: [],
      declaracionPEP: { esPEP: false, esFamiliarPEP: false },
    };

    describe('ANA LUCÍA (vendedora por propios derechos)', () => {
      it('debe generar formulario normal sin sección de mandante', async () => {
        const result = await generarFormularioWord(protocoloEscritura, {
          tipo: 'NATURAL',
          calidad: 'VENDEDOR',
          actuaPor: 'PROPIOS_DERECHOS',
          datos: datosAnaLucia,
          cedula: '1706544929',
        });
        const text = await extractTextFromDocx(result.buffer);

        // Datos personales presentes
        expect(text).toContain('ANA LUCÍA');
        expect(text).toContain('SÁNCHEZ JARRÍN');
        expect(text).toContain('1706544929');

        // No debe tener sección de mandante (comparece por sí misma)
        expect(text).not.toContain('DATOS DEL REPRESENTANTE / APODERADO');

        // Firma normal
        expect(text).toContain('Firma');
        expect(text).not.toContain('Firma del Apoderado');

        // Cónyuge presente (casada)
        expect(text).toContain('CÓNYUGE');
        expect(text).toContain('PÉREZ MORA');
      });
    });

    describe('NORMA BEATRIZ (vendedora representada por mandataria ANA LUCÍA)', () => {
      it('debe mostrar datos de NORMA BEATRIZ y sección de mandataria ANA LUCÍA', async () => {
        const result = await generarFormularioWord(protocoloEscritura, {
          tipo: 'NATURAL',
          calidad: 'VENDEDOR',
          actuaPor: 'APODERADO_GENERAL',
          datos: datosNormaBeatriz,
          cedula: '1704000000',
        });
        const text = await extractTextFromDocx(result.buffer);

        // Datos de NORMA BEATRIZ (la representada)
        expect(text).toContain('NORMA BEATRIZ');
        expect(text).toContain('1704000000');
        expect(text).toContain('JUBILADO');

        // Sección de mandataria (ANA LUCÍA)
        expect(text).toContain('DATOS DEL REPRESENTANTE / APODERADO');
        expect(text).toContain('ANA LUCÍA');
        expect(text).toContain('1706544929');
        expect(text).toContain('Comerciante');
      });

      it('firma debe ser de ANA LUCÍA en representación de NORMA BEATRIZ', async () => {
        const result = await generarFormularioWord(protocoloEscritura, {
          tipo: 'NATURAL',
          calidad: 'VENDEDOR',
          actuaPor: 'APODERADO_GENERAL',
          datos: datosNormaBeatriz,
          cedula: '1704000000',
        });
        const text = await extractTextFromDocx(result.buffer);

        expect(text).toContain('Firma del Apoderado');
        expect(text).toContain('Apoderado / Representante');
        // ANA LUCÍA firma
        expect(text).toContain('ANA LUCÍA SÁNCHEZ JARRÍN');
        // En representación de NORMA BEATRIZ
        expect(text).toContain('En representación de');
        expect(text).toContain('NORMA BEATRIZ SÁNCHEZ JARRÍN');
        expect(text).toContain('Cédula del Representado');
        expect(text).toContain('1704000000');
      });
    });

    describe('SURKUNA (persona jurídica con representante legal)', () => {
      it('debe generar formulario jurídico con datos de SURKUNA y MAYRA LUCÍA', async () => {
        const result = await generarFormularioWord(protocoloEscritura, {
          tipo: 'JURIDICA',
          calidad: 'COMPRADOR',
          actuaPor: 'REPRESENTANTE_LEGAL',
          datos: datosSurkuna,
          procedenciaFondos: 'Donaciones internacionales y fondos propios de la organización',
        });
        const text = await extractTextFromDocx(result.buffer);

        // Datos de la compañía
        expect(text).toContain('SURKUNA');
        expect(text).toContain('1791000000001');
        expect(text).toContain('Defensa de derechos humanos');

        // Representante legal
        expect(text).toContain('TIRIRA RUBIO');
        expect(text).toContain('MAYRA LUCÍA');
        expect(text).toContain('Directora Ejecutiva');

        // Firma del representante legal
        expect(text).toContain('Firma del Representante Legal');
        expect(text).not.toContain('Firma del Apoderado');

        // No debe tener sección de mandante (comparece por representante legal)
        expect(text).not.toContain('DATOS DEL REPRESENTANTE / APODERADO');

        // Procedencia de fondos
        expect(text).toContain('PROCEDENCIA DE FONDOS');
        expect(text).toContain('Donaciones internacionales');
      });
    });

    describe('Persona jurídica con apoderado externo (no representante legal)', () => {
      const datosSurkunaConApoderado = {
        ...datosSurkuna,
        mandante: {
          apellidos: 'GARCÍA LUNA',
          nombres: 'ROBERTO',
          tipoIdentificacion: 'Cédula',
          numeroIdentificacion: '1799999999',
          nacionalidad: 'ECUATORIANA',
          genero: 'M',
          direccion: 'Av. Colón E5-30',
          canton: 'Quito',
          provincia: 'Pichincha',
          celular: '0993333333',
          correo: 'rgarcia@email.com',
          actividadOcupacional: 'Abogado',
          ingresoMensual: '5000',
        },
      };

      it('debe incluir sección de mandante/apoderado', async () => {
        const result = await generarFormularioWord(protocoloEscritura, {
          tipo: 'JURIDICA',
          calidad: 'COMPRADOR',
          actuaPor: 'APODERADO_ESPECIAL',
          datos: datosSurkunaConApoderado,
        });
        const text = await extractTextFromDocx(result.buffer);

        // Datos del apoderado externo
        expect(text).toContain('DATOS DEL REPRESENTANTE / APODERADO');
        expect(text).toContain('ROBERTO');
        expect(text).toContain('GARCÍA LUNA');
        expect(text).toContain('1799999999');
      });

      it('firma debe ser del apoderado, no del representante legal', async () => {
        const result = await generarFormularioWord(protocoloEscritura, {
          tipo: 'JURIDICA',
          calidad: 'COMPRADOR',
          actuaPor: 'APODERADO_ESPECIAL',
          datos: datosSurkunaConApoderado,
        });
        const text = await extractTextFromDocx(result.buffer);

        expect(text).toContain('Firma del Apoderado');
        expect(text).toContain('ROBERTO GARCÍA LUNA');
        expect(text).toContain('En representación de');
        expect(text).toContain('SURKUNA');
      });
    });
  });
});
