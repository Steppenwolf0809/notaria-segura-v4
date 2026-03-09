import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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
});
