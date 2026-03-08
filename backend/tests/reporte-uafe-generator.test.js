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
});
