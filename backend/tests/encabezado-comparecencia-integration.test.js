import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Import services (no mocks needed - pure functions) ───────────────
const { generarEncabezado, formatearCalidad } = await import('../src/services/encabezado-generator-service.js');
const { generarComparecencia } = await import('../src/services/comparecencia-generator-service.js');

// ── Fixtures ─────────────────────────────────────────────────────────

const protocoloCompraventa = {
  id: 'proto-001',
  tipoActo: 'COMPRAVENTA',
  numeroProtocolo: '2026-0150',
  fecha: new Date('2026-03-09T15:00:00Z'),
  valorContrato: 85000,
  avaluoMunicipal: 72000,
  ubicacionDescripcion: 'Av. Amazonas N34-56',
  ubicacionParroquia: 'Iñaquito',
  ubicacionCanton: 'Quito',
  ubicacionProvincia: 'Pichincha',
};

const protocoloPromesa = {
  ...protocoloCompraventa,
  tipoActo: 'PROMESA_COMPRAVENTA',
  multa: 17000,
};

/** PersonaProtocolo con datos de persona natural (estructura real de Prisma include) */
function crearParticipanteNatural(overrides = {}) {
  return {
    id: 'pp-001',
    personaCedula: '1712345678',
    calidad: 'VENDEDOR',
    actuaPor: 'PROPIOS_DERECHOS',
    orden: 0,
    compareceConyugeJunto: false,
    esApoderado: false,
    nombreTemporal: null,
    persona: {
      id: 'per-001',
      tipoPersona: 'NATURAL',
      numeroIdentificacion: '1712345678',
      datosPersonaNatural: {
        datosPersonales: {
          apellidos: 'GARCÍA MORENO',
          nombres: 'JUAN CARLOS',
          genero: 'M',
          estadoCivil: 'CASADO',
          nacionalidad: 'ECUATORIANA',
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
          profesionOcupacion: 'ingeniero civil',
          entidad: 'Constructora XYZ',
          cargo: 'Gerente',
          ingresoMensual: 4500,
        },
        conyuge: {
          apellidos: 'LÓPEZ MARTÍNEZ',
          nombres: 'MARÍA ELENA',
          numeroIdentificacion: '1723456789',
        },
        declaracionPEP: { esPEP: false },
      },
      datosPersonaJuridica: null,
    },
    ...overrides,
  };
}

function crearParticipanteNaturalFemenina(overrides = {}) {
  return crearParticipanteNatural({
    id: 'pp-002',
    personaCedula: '1798765432',
    calidad: 'COMPRADOR',
    orden: 1,
    persona: {
      id: 'per-002',
      tipoPersona: 'NATURAL',
      numeroIdentificacion: '1798765432',
      datosPersonaNatural: {
        datosPersonales: {
          apellidos: 'RODRÍGUEZ PÉREZ',
          nombres: 'ANA LUCÍA',
          genero: 'F',
          estadoCivil: 'SOLTERO',
          nacionalidad: 'ECUATORIANA',
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
          profesionOcupacion: 'abogada',
        },
        declaracionPEP: { esPEP: false },
      },
      datosPersonaJuridica: null,
    },
    ...overrides,
  });
}

function crearParticipanteJuridica(overrides = {}) {
  return {
    id: 'pp-003',
    personaCedula: '1791234567001',
    calidad: 'COMPRADOR',
    actuaPor: 'PROPIOS_DERECHOS',
    orden: 1,
    compareceConyugeJunto: false,
    esApoderado: false,
    nombreTemporal: null,
    persona: {
      id: 'per-003',
      tipoPersona: 'JURIDICA',
      numeroIdentificacion: '1791234567001',
      datosPersonaNatural: null,
      datosPersonaJuridica: {
        compania: {
          razonSocial: 'INMOBILIARIA ECUATORIANA S.A.',
          ruc: '1791234567001',
          actividadEconomica: 'Promoción inmobiliaria',
          direccion: 'Av. República E7-123',
        },
        representanteLegal: {
          apellidos: 'MARTÍNEZ VEGA',
          nombres: 'CARLOS ANDRÉS',
          genero: 'M',
          estadoCivil: 'CASADO',
          numeroIdentificacion: '1756789012',
        },
        socios: [
          { nombre: 'CARLOS MARTÍNEZ VEGA', identificacion: '1756789012', porcentaje: 60, nacionalidad: 'ECUATORIANA' },
        ],
        declaracionPEP: { esPEP: false },
      },
    },
    ...overrides,
  };
}

// ── Tests del generador de encabezado ───────────────────────────────

describe('Encabezado Generator Service - Tests de Integración', () => {
  describe('generarEncabezado', () => {
    it('debe generar encabezado con título de compraventa', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteNaturalFemenina()];
      const result = generarEncabezado(protocoloCompraventa, participantes);

      expect(result.success).toBe(true);
      expect(result.encabezado).toBeTruthy();
      expect(result.encabezado).toContain('COMPRAVENTA');
    });

    it('debe incluir datos de todos los otorgantes', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteNaturalFemenina()];
      const result = generarEncabezado(protocoloCompraventa, participantes);

      expect(result.encabezado).toContain('GARCÍA MORENO JUAN CARLOS');
      expect(result.encabezado).toContain('1712345678');
      expect(result.encabezado).toContain('RODRÍGUEZ PÉREZ ANA LUCÍA');
      expect(result.encabezado).toContain('1798765432');
    });

    it('debe formatear calidad según género', () => {
      const participantes = [
        crearParticipanteNatural({ calidad: 'VENDEDOR' }),
        crearParticipanteNaturalFemenina({ calidad: 'COMPRADOR' }),
      ];
      const result = generarEncabezado(protocoloCompraventa, participantes);

      expect(result.encabezado).toContain('VENDEDOR');
      expect(result.encabezado).toContain('COMPRADORA');
    });

    it('debe incluir cuantía y avalúo', () => {
      const result = generarEncabezado(protocoloCompraventa, [crearParticipanteNatural()]);
      expect(result.encabezado).toContain('CUANTÍA');
      expect(result.encabezado).toContain('85,000.00');
      expect(result.encabezado).toContain('AVALÚO');
      expect(result.encabezado).toContain('72,000.00');
    });

    it('debe incluir ubicación del inmueble', () => {
      const result = generarEncabezado(protocoloCompraventa, [crearParticipanteNatural()]);
      expect(result.encabezado).toContain('Av. Amazonas N34-56');
      expect(result.encabezado).toContain('PARROQUIA Iñaquito');
      expect(result.encabezado).toContain('CANTÓN Quito');
    });

    it('debe mostrar MULTA en vez de AVALÚO para promesa de compraventa', () => {
      const result = generarEncabezado(protocoloPromesa, [crearParticipanteNatural()]);
      expect(result.encabezado).toContain('MULTA');
      expect(result.encabezado).toContain('17,000.00');
    });

    it('debe manejar persona jurídica como otorgante', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteJuridica()];
      const result = generarEncabezado(protocoloCompraventa, participantes);

      expect(result.encabezado).toContain('INMOBILIARIA ECUATORIANA S.A.');
      expect(result.encabezado).toContain('1791234567001');
    });

    it('debe rechazar tipos de acto sin encabezado', () => {
      const protVehiculo = { ...protocoloCompraventa, tipoActo: 'VENTA_VEHICULO' };
      const result = generarEncabezado(protVehiculo, [crearParticipanteNatural()]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('no requiere encabezado');
    });

    it('debe fallar con lista vacía de participantes', () => {
      const result = generarEncabezado(protocoloCompraventa, []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No hay participantes');
    });

    it('debe usar nombreTemporal si persona no tiene datos', () => {
      const participante = crearParticipanteNatural({
        nombreTemporal: 'PERSONA TEMPORAL',
        persona: { tipoPersona: 'NATURAL', datosPersonaNatural: null },
      });
      const result = generarEncabezado(protocoloCompraventa, [participante]);
      expect(result.success).toBe(true);
      expect(result.encabezado).toContain('PERSONA TEMPORAL');
    });
  });

  describe('formatearCalidad', () => {
    it('debe retornar calidad masculina por defecto', () => {
      expect(formatearCalidad('VENDEDOR', 'M')).toBe('VENDEDOR');
    });

    it('debe retornar calidad femenina para género F', () => {
      expect(formatearCalidad('COMPRADOR', 'F')).toBe('COMPRADORA');
      expect(formatearCalidad('VENDEDOR', 'F')).toBe('VENDEDORA');
    });

    it('calidades neutras deben ser iguales para M y F', () => {
      expect(formatearCalidad('DONANTE', 'M')).toBe('DONANTE');
      expect(formatearCalidad('DONANTE', 'F')).toBe('DONANTE');
    });

    it('calidad desconocida debe formatearse con replace de guiones bajos', () => {
      expect(formatearCalidad('CALIDAD_NUEVA_DESCONOCIDA', 'M')).toBe('CALIDAD NUEVA DESCONOCIDA');
    });
  });
});

// ── Tests del generador de comparecencia ────────────────────────────

describe('Comparecencia Generator Service - Tests de Integración', () => {
  describe('generarComparecencia', () => {
    it('debe generar comparecencia con formato HTML', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteNaturalFemenina()];
      const result = generarComparecencia(protocoloCompraventa, participantes, { formatoHtml: true });

      expect(result.success).toBe(true);
      expect(result.comparecenciaHtml).toBeTruthy();
      expect(result.comparecencia).toBeTruthy();
    });

    it('debe incluir apertura con fecha y notaria en negritas', () => {
      const participantes = [crearParticipanteNatural()];
      const result = generarComparecencia(protocoloCompraventa, participantes, { formatoHtml: true });

      expect(result.comparecenciaHtml).toContain('<b style="font-weight:bold">');
      expect(result.comparecenciaHtml).toContain('DOCTORA GLENDA ZAPATA SILVA');
      expect(result.comparecenciaHtml).toContain('San Francisco de Quito');
    });

    it('comparecencia plana no debe tener tags HTML', () => {
      const participantes = [crearParticipanteNatural()];
      const result = generarComparecencia(protocoloCompraventa, participantes, { formatoHtml: true });

      expect(result.comparecencia).not.toContain('<strong>');
      expect(result.comparecencia).not.toContain('</strong>');
    });

    it('debe incluir nombres de los comparecientes en negritas', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteNaturalFemenina()];
      const result = generarComparecencia(protocoloCompraventa, participantes, { formatoHtml: true });

      expect(result.comparecenciaHtml).toContain('JUAN CARLOS GARCÍA MORENO');
      expect(result.comparecenciaHtml).toContain('ANA LUCÍA RODRÍGUEZ PÉREZ');
    });

    it('debe usar tratamiento correcto según género', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteNaturalFemenina()];
      const result = generarComparecencia(protocoloCompraventa, participantes, { formatoHtml: true });

      expect(result.comparecencia).toContain('el señor');
      expect(result.comparecencia).toContain('la señorita'); // ANA LUCÍA es SOLTERO
    });

    it('debe incluir estado civil', () => {
      const participantes = [crearParticipanteNatural()];
      const result = generarComparecencia(protocoloCompraventa, participantes);

      expect(result.comparecencia).toContain('casado');
    });

    it('debe incluir profesión del compareciente', () => {
      const participantes = [crearParticipanteNatural()];
      const result = generarComparecencia(protocoloCompraventa, participantes);

      expect(result.comparecencia).toContain('ingeniero civil');
    });

    it('debe incluir cédula del compareciente', () => {
      const participantes = [crearParticipanteNatural()];
      const result = generarComparecencia(protocoloCompraventa, participantes);

      expect(result.comparecencia).toContain('1712345678');
    });

    it('debe rechazar tipos sin comparecencia (vehiculo)', () => {
      const protVehiculo = { ...protocoloCompraventa, tipoActo: 'VENTA_VEHICULO' };
      const result = generarComparecencia(protVehiculo, [crearParticipanteNatural()]);
      expect(result.success).toBe(false);
    });

    it('debe fallar sin participantes', () => {
      const result = generarComparecencia(protocoloCompraventa, []);
      expect(result.success).toBe(false);
    });

    it('debe manejar persona jurídica en comparecencia', () => {
      const participantes = [crearParticipanteNatural(), crearParticipanteJuridica()];
      const result = generarComparecencia(protocoloCompraventa, participantes);

      expect(result.success).toBe(true);
      expect(result.comparecencia).toContain('INMOBILIARIA ECUATORIANA S.A.');
    });

    it('debe manejar persona sin datos (fallback a nombreTemporal)', () => {
      const participante = crearParticipanteNatural({
        nombreTemporal: 'PERSONA SIN DATOS',
        persona: null,
      });
      const result = generarComparecencia(protocoloCompraventa, [participante]);

      expect(result.success).toBe(true);
      expect(result.comparecencia).toContain('PERSONA SIN DATOS');
    });

    // ═══════════════════════════════════════════════════════════════════
    // Apoderados con actuaPor = APODERADO_GENERAL / APODERADO_ESPECIAL
    // ═══════════════════════════════════════════════════════════════════

    it('debe reconocer APODERADO_GENERAL: principal representado por mandatario', () => {
      // JUAN CARLOS (principal/comprador) representado por ANA LUCÍA (mandataria)
      const principal = crearParticipanteNatural({
        id: 'pp-apod-1',
        calidad: 'VENDEDOR',
        actuaPor: 'APODERADO_GENERAL',
        mandanteNombre: 'ANA LUCÍA SÁNCHEZ JARRÍN',  // mandataria (quien actúa)
        mandanteCedula: '1706544929',
      });
      const result = generarComparecencia(protocoloCompraventa, [principal]);

      expect(result.success).toBe(true);
      // El principal aparece primero, luego "representado por" el mandatario
      expect(result.comparecencia).toContain('JUAN CARLOS GARCÍA MORENO');
      expect(result.comparecencia).toContain('debidamente representado por ANA LUCÍA SÁNCHEZ JARRÍN');
      expect(result.comparecencia).toContain('poder general');
    });

    it('debe reconocer APODERADO_ESPECIAL: principal representado por mandatario', () => {
      const principal = crearParticipanteNatural({
        id: 'pp-apod-2',
        calidad: 'COMPRADOR',
        actuaPor: 'APODERADO_ESPECIAL',
        mandanteNombre: 'PEDRO TORRES',
        mandanteCedula: '1799000000',
      });
      const result = generarComparecencia(protocoloCompraventa, [principal]);

      expect(result.success).toBe(true);
      expect(result.comparecencia).toContain('JUAN CARLOS GARCÍA MORENO');
      expect(result.comparecencia).toContain('debidamente representado por PEDRO TORRES');
      expect(result.comparecencia).toContain('poder especial');
    });

    it('REPRESENTANDO_A legacy debe seguir funcionando', () => {
      const principal = crearParticipanteNatural({
        id: 'pp-apod-3',
        calidad: 'VENDEDOR',
        actuaPor: 'REPRESENTANDO_A',
        mandanteNombre: 'LEGACY MANDATARIO',
        mandanteCedula: '1700000000',
      });
      const result = generarComparecencia(protocoloCompraventa, [principal]);

      expect(result.success).toBe(true);
      expect(result.comparecencia).toContain('debidamente representado por LEGACY MANDATARIO');
    });

    it('mandataria dual: propios derechos + representación en mismo protocolo', () => {
      // ANA LUCÍA como vendedora por propios derechos
      const anaLuciaPropios = crearParticipanteNatural({
        id: 'pp-ana-propios',
        personaCedula: '1706544929',
        calidad: 'VENDEDOR',
        actuaPor: 'PROPIOS_DERECHOS',
        orden: 0,
        persona: {
          id: 'per-ana',
          tipoPersona: 'NATURAL',
          numeroIdentificacion: '1706544929',
          datosPersonaNatural: {
            datosPersonales: {
              apellidos: 'SÁNCHEZ JARRÍN',
              nombres: 'ANA LUCÍA',
              genero: 'F',
              estadoCivil: 'CASADO',
            },
            contacto: { celular: '0991000001' },
            direccion: { callePrincipal: 'Calle Sucre', provincia: 'Pichincha', canton: 'Quito', parroquia: 'Centro' },
            informacionLaboral: { profesionOcupacion: 'comerciante' },
            conyuge: { nombres: 'CARLOS', apellidos: 'PÉREZ', numeroIdentificacion: '1701111111' },
          },
          datosPersonaJuridica: null,
        },
      });

      // NORMA BEATRIZ como vendedora (principal), representada por ANA LUCÍA (mandataria)
      const normaBeatriz = crearParticipanteNatural({
        id: 'pp-norma',
        personaCedula: '1704000000',
        calidad: 'VENDEDOR',
        actuaPor: 'APODERADO_GENERAL',
        orden: 1,
        mandanteNombre: 'ANA LUCÍA SÁNCHEZ JARRÍN',   // mandataria (quien actúa)
        mandanteCedula: '1706544929',
        persona: {
          id: 'per-norma',
          tipoPersona: 'NATURAL',
          numeroIdentificacion: '1704000000',
          datosPersonaNatural: {
            datosPersonales: {
              apellidos: 'SÁNCHEZ JARRÍN',
              nombres: 'NORMA BEATRIZ',
              genero: 'F',
              estadoCivil: 'SOLTERO',
            },
            contacto: { celular: '0992000002' },
            direccion: { callePrincipal: 'Av. Amazonas', provincia: 'Pichincha', canton: 'Quito', parroquia: 'Iñaquito' },
            informacionLaboral: { profesionOcupacion: 'profesora' },
          },
          datosPersonaJuridica: null,
        },
      });

      // Compradora: persona jurídica SURKUNA
      const surkuna = crearParticipanteJuridica({
        id: 'pp-surkuna',
        orden: 2,
      });

      const participantes = [anaLuciaPropios, normaBeatriz, surkuna];
      const result = generarComparecencia(protocoloCompraventa, participantes);

      expect(result.success).toBe(true);
      const texto = result.comparecencia;

      // ANA LUCÍA debe aparecer por propios derechos
      expect(texto).toContain('ANA LUCÍA SÁNCHEZ JARRÍN');
      expect(texto).toContain('por sus propios y personales derechos');

      // NORMA BEATRIZ es la principal, representada por ANA LUCÍA
      expect(texto).toContain('NORMA BEATRIZ SÁNCHEZ JARRÍN');
      expect(texto).toContain('debidamente representado por ANA LUCÍA SÁNCHEZ JARRÍN');
      expect(texto).toContain('poder general');

      // SURKUNA como compradora
      expect(texto).toContain('INMOBILIARIA ECUATORIANA S.A.');

      // Vendedores primero, compradores después
      const idxVendedor = texto.indexOf('por una parte');
      const idxComprador = texto.indexOf('por otra parte');
      expect(idxVendedor).toBeLessThan(idxComprador);
    });
  });
});
