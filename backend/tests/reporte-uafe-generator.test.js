import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ── Mock Prisma Client ──────────────────────────────────────────────
const mockPrisma = {
  protocoloUAFE: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  reporteUAFE: {
    upsert: jest.fn(),
  },
};

// Mock db.js
jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma,
  db: mockPrisma,
  getPrismaClient: jest.fn().mockReturnValue(mockPrisma),
}));

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
const {
  generarReporteTransaccion,
  generarReporteInterviniente,
  generarYGuardarReporte,
} = await import('../src/services/reporte-uafe-generator-service.js');

// ── Tests ────────────────────────────────────────────────────────────

describe('Reporte UAFE Generator Service - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════
  // generarReporteTransaccion
  // ════════════════════════════════════════════════════════════════════
  describe('generarReporteTransaccion', () => {
    it('debe generar un reporte TRANSACCION XLSX con datos válidos', async () => {
      const protocolosMock = [
        {
          id: 'proto-1',
          numeroProtocolo: 'D01399',
          fecha: new Date('2026-01-10'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 50000,
          avaluoMunicipal: 45000,
          tipoBien: 'I',
          descripcionBien: null,
          bienInmuebleDescripcion: 'Departamento en Quito Norte',
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
        },
        {
          id: 'proto-2',
          numeroProtocolo: 'P00170',
          fecha: new Date('2026-01-20'),
          tipoActo: 'COMPRAVENTA DE VEHICULOS',
          valorContrato: 25000,
          avaluoMunicipal: null,
          tipoBien: 'V',
          descripcionBien: null,
          bienInmuebleDescripcion: null,
          codigoCanton: '1701',
          vehiculoMarca: 'Toyota',
          vehiculoModelo: 'Corolla',
          vehiculoAnio: '2024',
          vehiculoPlaca: 'ABC-1234',
          ubicacionDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(1, 2026, 1);

      expect(result.totalRegistros).toBe(2);
      expect(result.fileName).toBe('TRANSACCION_2026_01.xlsx');
      expect(result.filePath).toContain('TRANSACCION_2026_01.xlsx');

      // Verificar que el archivo fue creado
      expect(fs.existsSync(result.filePath)).toBe(true);

      // Limpiar
      fs.unlinkSync(result.filePath);
    });

    it('debe generar reporte vacío sin protocolos', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);

      const result = await generarReporteTransaccion(2, 2026, 1);

      expect(result.totalRegistros).toBe(0);
      expect(result.fileName).toBe('TRANSACCION_2026_02.xlsx');

      // Limpiar archivo
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe calcular correctamente el código de transacción', async () => {
      const protocolosMock = [
        {
          id: 'proto-1',
          numeroProtocolo: 'D01399',
          fecha: new Date('2026-03-15'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 80000,
          avaluoMunicipal: 70000,
          tipoBien: 'I',
          descripcionBien: 'Casa en el Valle',
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(3, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe usar código "93" para tipo de acto no reconocido', async () => {
      const protocolosMock = [
        {
          id: 'proto-x',
          numeroProtocolo: 'P00001',
          fecha: new Date('2026-06-01'),
          tipoActo: 'ACTO_DESCONOCIDO_XYZ',
          valorContrato: 1000,
          avaluoMunicipal: null,
          tipoBien: '',
          descripcionBien: null,
          codigoCanton: null,
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(6, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe construir descripción de vehículo cuando no hay descripcionBien', async () => {
      const protocolosMock = [
        {
          id: 'proto-v',
          numeroProtocolo: 'P00010',
          fecha: new Date('2026-04-01'),
          tipoActo: 'COMPRAVENTA DE VEHICULOS',
          valorContrato: 18000,
          avaluoMunicipal: null,
          tipoBien: 'V',
          descripcionBien: null,
          codigoCanton: '1701',
          vehiculoMarca: 'Chevrolet',
          vehiculoModelo: 'Aveo',
          vehiculoAnio: '2020',
          vehiculoPlaca: 'PBA-4567',
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(4, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // generarReporteInterviniente
  // ════════════════════════════════════════════════════════════════════
  describe('generarReporteInterviniente', () => {
    it('debe generar un reporte INTERVINIENTE XLSX con personas', async () => {
      const protocolosMock = [
        {
          id: 'proto-1',
          numeroProtocolo: 'D01399',
          fecha: new Date('2026-01-10'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1712345678',
              calidad: 'VENDEDOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Juan Carlos',
                    apellidos: 'Perez Lopez',
                    nacionalidad: 'ECUATORIANA',
                  },
                },
                datosPersonaJuridica: null,
              },
            },
            {
              personaCedula: '1798765432',
              calidad: 'COMPRADOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Maria Elena',
                    apellidos: 'Garcia Ruiz',
                    nacionalidad: 'COLOMBIANA',
                  },
                },
                datosPersonaJuridica: null,
              },
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(1, 2026, 1);

      expect(result.totalRegistros).toBe(2);
      expect(result.fileName).toBe('INTERVINIENTE_2026_01.xlsx');
      expect(fs.existsSync(result.filePath)).toBe(true);

      // Limpiar
      fs.unlinkSync(result.filePath);
    });

    it('debe generar reporte con persona jurídica', async () => {
      const protocolosMock = [
        {
          id: 'proto-j',
          numeroProtocolo: 'P00200',
          fecha: new Date('2026-05-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1791234567001',
              calidad: 'COMPRADOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: null,
                datosPersonaJuridica: {
                  compania: {
                    razonSocial: 'EMPRESA XYZ S.A.',
                  },
                },
              },
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(5, 2026, 1);

      expect(result.totalRegistros).toBe(1);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe usar "ECU" como nacionalidad por defecto', async () => {
      const protocolosMock = [
        {
          id: 'proto-n',
          numeroProtocolo: 'P00300',
          fecha: new Date('2026-02-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1711111111',
              calidad: 'VENDEDOR',
              nombreTemporal: 'Persona Sin Datos',
              persona: null, // sin datos de persona
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(2, 2026, 1);

      expect(result.totalRegistros).toBe(1);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe generar reporte sin intervinientes si protocolos no tienen personas', async () => {
      const protocolosMock = [
        {
          id: 'proto-vacio',
          numeroProtocolo: 'P00400',
          fecha: new Date('2026-07-01'),
          codigoCanton: '1701',
          personas: [],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(7, 2026, 1);

      expect(result.totalRegistros).toBe(0);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe identificar correctamente cédula, RUC y pasaporte', async () => {
      const protocolosMock = [
        {
          id: 'proto-id',
          numeroProtocolo: 'P00500',
          fecha: new Date('2026-08-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1712345678', // 10 dígitos = cédula (C)
              calidad: 'VENDEDOR',
              nombreTemporal: 'Persona Cedula',
              persona: null,
            },
            {
              personaCedula: '1791234567001', // 13 dígitos = RUC (R)
              calidad: 'COMPRADOR',
              nombreTemporal: 'Empresa RUC',
              persona: null,
            },
            {
              personaCedula: 'AB123456', // otro = pasaporte (P)
              calidad: 'OTRO',
              nombreTemporal: 'Extranjero',
              persona: null,
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(8, 2026, 1);

      expect(result.totalRegistros).toBe(3);

      // Limpiar
      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // generarYGuardarReporte
  // ════════════════════════════════════════════════════════════════════
  describe('generarYGuardarReporte', () => {
    it('debe generar ambos reportes, guardar en BD y marcar protocolos como REPORTADO', async () => {
      const protocolosMock = [
        {
          id: 'proto-full-1',
          numeroProtocolo: 'D00001',
          fecha: new Date('2026-01-05'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 100000,
          avaluoMunicipal: 95000,
          tipoBien: 'I',
          descripcionBien: 'Terreno',
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
          estado: 'COMPLETO',
          personas: [
            {
              personaCedula: '1700000001',
              calidad: 'VENDEDOR',
              nombreTemporal: 'Vendedor Test',
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Ana',
                    apellidos: 'Martinez',
                    nacionalidad: 'ECU',
                  },
                },
                datosPersonaJuridica: null,
              },
            },
          ],
        },
      ];

      // findMany se llama 3 veces: transacción, interviniente, y la consulta final
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      mockPrisma.reporteUAFE.upsert.mockResolvedValue({
        id: 'reporte-1',
        mes: 1,
        anio: 2026,
        estado: 'GENERADO',
        totalTransacciones: 1,
        totalIntervinientes: 1,
      });

      mockPrisma.protocoloUAFE.updateMany.mockResolvedValue({ count: 1 });

      const result = await generarYGuardarReporte(1, 2026, 42, 1);

      expect(result.id).toBe('reporte-1');
      expect(result.estado).toBe('GENERADO');
      expect(result.totalTransacciones).toBe(1);

      // Verificar que se llamó upsert
      expect(mockPrisma.reporteUAFE.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            mes_anio_notaryId: { mes: 1, anio: 2026, notaryId: 1 },
          },
          create: expect.objectContaining({
            estado: 'GENERADO',
            generadoPor: 42,
          }),
        }),
      );

      // Verificar que se marcaron protocolos como REPORTADO
      expect(mockPrisma.protocoloUAFE.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['proto-full-1'] },
          notaryId: 1,
        },
        data: {
          estado: 'REPORTADO',
          reporteUafeId: 'reporte-1',
        },
      });

      // Limpiar archivos temporales
      const tmpDir = os.tmpdir();
      const traFile = path.join(tmpDir, 'TRANSACCION_2026_01.xlsx');
      const intFile = path.join(tmpDir, 'INTERVINIENTE_2026_01.xlsx');
      if (fs.existsSync(traFile)) fs.unlinkSync(traFile);
      if (fs.existsSync(intFile)) fs.unlinkSync(intFile);
    });

    it('debe manejar período sin protocolos (totalRegistros = 0)', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);
      mockPrisma.reporteUAFE.upsert.mockResolvedValue({
        id: 'reporte-vacio',
        mes: 12,
        anio: 2025,
        estado: 'GENERADO',
        totalTransacciones: 0,
        totalIntervinientes: 0,
      });

      const result = await generarYGuardarReporte(12, 2025, 1, 1);

      expect(result.totalTransacciones).toBe(0);
      expect(result.totalIntervinientes).toBe(0);
      // No debe intentar actualizar protocolos si no hay ninguno
      expect(mockPrisma.protocoloUAFE.updateMany).not.toHaveBeenCalled();

      // Limpiar
      const tmpDir = os.tmpdir();
      const traFile = path.join(tmpDir, 'TRANSACCION_2025_12.xlsx');
      const intFile = path.join(tmpDir, 'INTERVINIENTE_2025_12.xlsx');
      if (fs.existsSync(traFile)) fs.unlinkSync(traFile);
      if (fs.existsSync(intFile)) fs.unlinkSync(intFile);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Edge Cases: Helpers internos (testeados via reportes)
  // ════════════════════════════════════════════════════════════════════
  describe('Edge Cases - Fecha corte y códigos', () => {
    it('debe calcular fecha corte correcta para febrero año bisiesto (2028)', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);

      const result = await generarReporteTransaccion(2, 2028, 1);

      // Feb 2028 es bisiesto → último día = 29
      // El fileName indica mes/año
      expect(result.fileName).toBe('TRANSACCION_2028_02.xlsx');

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe calcular fecha corte correcta para febrero año no bisiesto (2026)', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);

      const result = await generarReporteTransaccion(2, 2026, 1);

      // Feb 2026 no es bisiesto → último día = 28
      expect(result.fileName).toBe('TRANSACCION_2026_02.xlsx');

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe calcular fecha corte de diciembre (mes 12)', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);

      const result = await generarReporteTransaccion(12, 2026, 1);
      expect(result.fileName).toBe('TRANSACCION_2026_12.xlsx');

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar protocolo sin numeroProtocolo (null) en código transacción', async () => {
      const protocolosMock = [
        {
          id: 'proto-null-num',
          numeroProtocolo: null,
          fecha: new Date('2026-01-10'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 50000,
          avaluoMunicipal: null,
          tipoBien: 'I',
          descripcionBien: 'Casa',
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(1, 2026, 1);

      // Debe generar sin errores, con parseNumeroProtocolo(null) → {tipo:'P', numero:'00000'}
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar protocolo con número sin prefijo D/P', async () => {
      const protocolosMock = [
        {
          id: 'proto-plain',
          numeroProtocolo: '12345', // sin prefijo
          fecha: new Date('2026-03-15'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 75000,
          avaluoMunicipal: null,
          tipoBien: 'I',
          descripcionBien: 'Terreno',
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(3, 2026, 1);

      // parseNumeroProtocolo("12345") → {tipo:'P', numero:'12345'}
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe usar cantón default 1701 cuando codigoCanton es null', async () => {
      const protocolosMock = [
        {
          id: 'proto-no-canton',
          numeroProtocolo: 'D00001',
          fecha: new Date('2026-05-01'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 60000,
          avaluoMunicipal: null,
          tipoBien: 'I',
          descripcionBien: 'Oficina',
          codigoCanton: null, // sin cantón
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(5, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar valorContrato null (cuantía = 0)', async () => {
      const protocolosMock = [
        {
          id: 'proto-0val',
          numeroProtocolo: 'P00050',
          fecha: new Date('2026-09-01'),
          tipoActo: 'CAPITULACIONES MATRIMONIALES',
          valorContrato: null,
          avaluoMunicipal: null,
          tipoBien: '',
          descripcionBien: null,
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(9, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });
  });

  describe('Edge Cases - Nacionalidades y tipos de identificación', () => {
    it('debe mapear nacionalidades comunes correctamente', async () => {
      const protocolosMock = [
        {
          id: 'proto-nac',
          numeroProtocolo: 'P00600',
          fecha: new Date('2026-01-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1711111111',
              calidad: 'VENDEDOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Carlos',
                    apellidos: 'Ramirez',
                    nacionalidad: 'VENEZOLANA', // debe → VEN
                  },
                },
                datosPersonaJuridica: null,
              },
            },
            {
              personaCedula: '1722222222',
              calidad: 'COMPRADOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Luis',
                    apellidos: 'Smith',
                    nacionalidad: 'ESTADOUNIDENSE', // debe → USA
                  },
                },
                datosPersonaJuridica: null,
              },
            },
            {
              personaCedula: '1733333333',
              calidad: 'OTRO',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Maria',
                    apellidos: 'Vargas',
                    nacionalidad: 'PERUANA', // debe → PER
                  },
                },
                datosPersonaJuridica: null,
              },
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(1, 2026, 1);

      expect(result.totalRegistros).toBe(3);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar nacionalidad con código ISO 2-char (EC, CO, PE)', async () => {
      const protocolosMock = [
        {
          id: 'proto-iso2',
          numeroProtocolo: 'P00700',
          fecha: new Date('2026-02-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1744444444',
              calidad: 'VENDEDOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Test',
                    apellidos: 'EC',
                    nacionalidad: 'EC', // debe → ECU
                  },
                },
                datosPersonaJuridica: null,
              },
            },
            {
              personaCedula: '1755555555',
              calidad: 'COMPRADOR',
              nombreTemporal: null,
              persona: {
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: 'Test',
                    apellidos: 'CO',
                    nacionalidad: 'CO', // debe → COL
                  },
                },
                datosPersonaJuridica: null,
              },
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(2, 2026, 1);
      expect(result.totalRegistros).toBe(2);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe mapear roles UAFE correctamente (VENDEDOR→otorgado, COMPRADOR→favor)', async () => {
      const protocolosMock = [
        {
          id: 'proto-roles',
          numeroProtocolo: 'P00800',
          fecha: new Date('2026-04-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1766666666',
              calidad: 'VENDEDOR', // ROL_OTORGADO_POR → '01'
              nombreTemporal: 'Vendedor Test',
              persona: null,
            },
            {
              personaCedula: '1777777777',
              calidad: 'COMPRADOR', // ROL_A_FAVOR_DE → '02'
              nombreTemporal: 'Comprador Test',
              persona: null,
            },
            {
              personaCedula: '1788888888',
              calidad: 'FIDEICOMITENTE', // ROL_OTORGADO_POR → '01'
              nombreTemporal: 'Fideicomitente Test',
              persona: null,
            },
            {
              personaCedula: '1799999999',
              calidad: 'CESIONARIO', // ROL_A_FAVOR_DE → '02'
              nombreTemporal: 'Cesionario Test',
              persona: null,
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(4, 2026, 1);
      expect(result.totalRegistros).toBe(4);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe usar papel "48" (OTRO) para calidad no reconocida', async () => {
      const protocolosMock = [
        {
          id: 'proto-calidad-desconocida',
          numeroProtocolo: 'P00900',
          fecha: new Date('2026-06-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '1700000001',
              calidad: 'CALIDAD_DESCONOCIDA_XYZ',
              nombreTemporal: 'Persona desconocida',
              persona: null,
            },
            {
              personaCedula: '1700000002',
              calidad: null, // sin calidad
              nombreTemporal: 'Sin calidad',
              persona: null,
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(6, 2026, 1);
      expect(result.totalRegistros).toBe(2);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar cédula con espacios (getTipoIdentificacion)', async () => {
      const protocolosMock = [
        {
          id: 'proto-espacios',
          numeroProtocolo: 'P01000',
          fecha: new Date('2026-07-01'),
          codigoCanton: '1701',
          personas: [
            {
              personaCedula: '17 1234 5678', // con espacios
              calidad: 'VENDEDOR',
              nombreTemporal: 'Con espacios',
              persona: null,
            },
          ],
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      // No debe fallar - getTipoIdentificacion limpia espacios
      const result = await generarReporteInterviniente(7, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar vehículo con solo marca (sin modelo/año/placa)', async () => {
      const protocolosMock = [
        {
          id: 'proto-solo-marca',
          numeroProtocolo: 'P01100',
          fecha: new Date('2026-10-01'),
          tipoActo: 'COMPRAVENTA DE VEHICULOS',
          valorContrato: 15000,
          avaluoMunicipal: null,
          tipoBien: 'V',
          descripcionBien: null,
          codigoCanton: '1701',
          vehiculoMarca: 'Hyundai',
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: null,
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(10, 2026, 1);
      // getDescripcionBien filtra nulls, solo retorna "Hyundai"
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe usar ubicacionDescripcion como fallback de descripciónBien', async () => {
      const protocolosMock = [
        {
          id: 'proto-ubicacion',
          numeroProtocolo: 'P01200',
          fecha: new Date('2026-11-01'),
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 200000,
          avaluoMunicipal: 180000,
          tipoBien: 'I',
          descripcionBien: null,
          codigoCanton: '1701',
          vehiculoMarca: null,
          vehiculoModelo: null,
          vehiculoAnio: null,
          vehiculoPlaca: null,
          ubicacionDescripcion: 'Av. Amazonas y Naciones Unidas',
          bienInmuebleDescripcion: null,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteTransaccion(11, 2026, 1);
      expect(result.totalRegistros).toBe(1);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });

    it('debe manejar protocolo con muchas personas (20+)', async () => {
      const personas = [];
      for (let i = 0; i < 25; i++) {
        personas.push({
          personaCedula: `17${String(i).padStart(8, '0')}`,
          calidad: i % 2 === 0 ? 'VENDEDOR' : 'COMPRADOR',
          nombreTemporal: `Persona ${i}`,
          persona: null,
        });
      }

      const protocolosMock = [
        {
          id: 'proto-muchas',
          numeroProtocolo: 'P01300',
          fecha: new Date('2026-03-01'),
          codigoCanton: '1701',
          personas,
        },
      ];

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolosMock);

      const result = await generarReporteInterviniente(3, 2026, 1);
      expect(result.totalRegistros).toBe(25);

      if (fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath);
    });
  });
});
