import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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

const {
  generarReporteTransaccion,
  generarReporteInterviniente,
  generarYGuardarReporte,
} = await import('../src/services/reporte-uafe-generator-service.js');

import XLSX from 'xlsx';
import fs from 'fs';

// ── Helpers ─────────────────────────────────────────────────────────
function createMockProtocolo(overrides = {}) {
  return {
    id: 'proto-1',
    numeroProtocolo: 'P01399',
    fecha: new Date('2026-03-15'),
    tipoActo: 'COMPRAVENTA',
    actoContrato: 'COMPRAVENTA',
    valorContrato: 25000,
    avaluoMunicipal: 30000,
    tipoBien: 'INM',
    descripcionBien: 'TERRENO URBANO',
    codigoCanton: '1701',
    estado: 'COMPLETO',
    notaryId: 1,
    personas: [],
    ...overrides,
  };
}

function createMockPersonaProtocolo(overrides = {}) {
  return {
    id: 'pp-1',
    personaCedula: '1712345678',
    calidad: 'VENDEDOR',
    actuaPor: 'PROPIOS_DERECHOS',
    nombreTemporal: null,
    mandanteCedula: null,
    mandanteNombre: null,
    persona: {
      id: 'per-1',
      numeroIdentificacion: '1712345678',
      tipoPersona: 'NATURAL',
      datosPersonaNatural: {
        datosPersonales: {
          nombres: 'Juan Carlos',
          apellidos: 'Perez Lopez',
          nacionalidad: 'ECUATORIANA',
        },
      },
      datosPersonaJuridica: null,
    },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Reporte UAFE Generator - Integration Tests Extra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════
  // generarReporteTransaccion — Edge Cases
  // ════════════════════════════════════════════════════════════════════
  describe('generarReporteTransaccion - Edge Cases', () => {
    it('debe generar reporte con protocolo de vehículo', async () => {
      const protocoloVehiculo = createMockProtocolo({
        id: 'proto-veh',
        tipoActo: 'COMPRAVENTA',
        tipoBien: 'VEH',
        descripcionBien: 'VEHICULO COMERCIALIZADO EN QUITO, MARCA: TOYOTA, Placa: ABC-1234',
        valorContrato: 20000,
        vehiculoMarca: 'TOYOTA',
        vehiculoPlaca: 'ABC-1234',
        personas: [],
      });

      // Primer findMany para COMPLETO/REPORTADO, segundo para todos
      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocoloVehiculo])
        .mockResolvedValueOnce([protocoloVehiculo]);

      const result = await generarReporteTransaccion(3, 2026, 1);

      expect(result.totalRegistros).toBe(1);
      expect(result.fileName).toBe('TRANSACCION_2026_03.xlsx');

      // Leer el XLSX generado y verificar contenido
      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Row 0: metadata [TRA, secuencial, fechaCorte, total]
      expect(data[0][0]).toBe('TRA');
      expect(data[0][3]).toBe(1);

      // Row 1: data row del vehículo
      expect(data[1][6]).toBe('VEH'); // tipoBien
      expect(data[1][7]).toContain('TOYOTA'); // descripcion

      // Cleanup
      fs.unlinkSync(result.filePath);
    });

    it('debe generar reporte vacío correctamente (0 protocolos)', async () => {
      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await generarReporteTransaccion(1, 2026, 1);

      expect(result.totalRegistros).toBe(0);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // Solo fila metadata
      expect(data.length).toBe(1);
      expect(data[0][3]).toBe(0);

      fs.unlinkSync(result.filePath);
    });

    it('debe usar código "93" para tipo de acto desconocido', async () => {
      const protocoloRaro = createMockProtocolo({
        tipoActo: 'ACTO COMPLETAMENTE DESCONOCIDO QUE NO EXISTE EN CATALOGO',
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocoloRaro])
        .mockResolvedValueOnce([protocoloRaro]);

      const result = await generarReporteTransaccion(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      expect(data[1][2]).toBe('93'); // Default "Otros"

      fs.unlinkSync(result.filePath);
    });

    it('debe mapear alias de tipo de acto correctamente', async () => {
      // "COMPRAVENTA DE VEHICULOS" es alias para código 74
      const protocoloAlias = createMockProtocolo({
        tipoActo: 'COMPRAVENTA DE VEHICULOS',
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocoloAlias])
        .mockResolvedValueOnce([protocoloAlias]);

      const result = await generarReporteTransaccion(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      expect(data[1][2]).toBe('74'); // Compraventa

      fs.unlinkSync(result.filePath);
    });

    it('debe parsear número de protocolo con prefijo D (diligencia)', async () => {
      const protocoloD = createMockProtocolo({
        numeroProtocolo: 'D01000',
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocoloD])
        .mockResolvedValueOnce([protocoloD]);

      const result = await generarReporteTransaccion(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // codigo_transaccion: 2026 + 1701 + 018 + D + 01000
      expect(data[1][0]).toBe('20261701018D01000');

      fs.unlinkSync(result.filePath);
    });

    it('debe generar fecha corte correcta para febrero (año bisiesto)', async () => {
      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await generarReporteTransaccion(2, 2028, 1); // 2028 es bisiesto

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      expect(data[0][2]).toBe('20280229'); // Feb 29 en bisiesto

      fs.unlinkSync(result.filePath);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // generarReporteInterviniente — Edge Cases
  // ════════════════════════════════════════════════════════════════════
  describe('generarReporteInterviniente - Edge Cases', () => {
    it('debe generar fila extra para mandante cuando actuaPor != PROPIOS_DERECHOS', async () => {
      const protocolo = createMockProtocolo({
        personas: [
          createMockPersonaProtocolo({
            calidad: 'VENDEDOR',
            actuaPor: 'REPRESENTANDO_A',
            mandanteCedula: '0999888777',
            mandanteNombre: 'Pedro Garcia',
          }),
        ],
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocolo])
        .mockResolvedValueOnce([protocolo]);

      const result = await generarReporteInterviniente(3, 2026, 1);

      expect(result.totalRegistros).toBe(2); // compareciente + mandante

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Row 0: metadata
      expect(data[0][3]).toBe(2);
      // Row 1: compareciente (apoderado)
      expect(data[1][2]).toBe('1712345678');
      expect(data[1][3]).toContain('PEREZ');
      // Row 2: mandante
      expect(data[2][2]).toBe('0999888777');
      expect(data[2][3]).toContain('PEDRO GARCIA');
      // Mismo rol y papel que el compareciente
      expect(data[2][5]).toBe(data[1][5]); // rol
      expect(data[2][6]).toBe(data[1][6]); // papel

      fs.unlinkSync(result.filePath);
    });

    it('NO debe generar fila extra si actuaPor es PROPIOS_DERECHOS', async () => {
      const protocolo = createMockProtocolo({
        personas: [
          createMockPersonaProtocolo({
            calidad: 'COMPRADOR',
            actuaPor: 'PROPIOS_DERECHOS',
            mandanteCedula: null,
          }),
        ],
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocolo])
        .mockResolvedValueOnce([protocolo]);

      const result = await generarReporteInterviniente(3, 2026, 1);

      expect(result.totalRegistros).toBe(1); // solo compareciente

      fs.unlinkSync(result.filePath);
    });

    it('debe asignar rol "01" a vendedor y "02" a comprador', async () => {
      const protocolo = createMockProtocolo({
        personas: [
          createMockPersonaProtocolo({ calidad: 'VENDEDOR' }),
          createMockPersonaProtocolo({
            id: 'pp-2', personaCedula: '0988776655',
            calidad: 'COMPRADOR',
            persona: {
              id: 'per-2', numeroIdentificacion: '0988776655', tipoPersona: 'NATURAL',
              datosPersonaNatural: { datosPersonales: { nombres: 'Ana', apellidos: 'Lopez', nacionalidad: 'ECUATORIANA' } },
            },
          }),
        ],
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocolo])
        .mockResolvedValueOnce([protocolo]);

      const result = await generarReporteInterviniente(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Vendedor = rol 01, papel 63
      expect(data[1][5]).toBe('01');
      expect(data[1][6]).toBe('63');
      // Comprador = rol 02, papel 20
      expect(data[2][5]).toBe('02');
      expect(data[2][6]).toBe('20');

      fs.unlinkSync(result.filePath);
    });

    it('debe mapear nacionalidades correctamente', async () => {
      const protocolo = createMockProtocolo({
        personas: [
          createMockPersonaProtocolo({
            persona: {
              id: 'per-col',
              numeroIdentificacion: '1712345678',
              tipoPersona: 'NATURAL',
              datosPersonaNatural: {
                datosPersonales: { nombres: 'Carlos', apellidos: 'Garcia', nacionalidad: 'COLOMBIANA' },
              },
            },
          }),
        ],
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocolo])
        .mockResolvedValueOnce([protocolo]);

      const result = await generarReporteInterviniente(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      expect(data[1][4]).toBe('COL'); // Nacionalidad colombiana

      fs.unlinkSync(result.filePath);
    });

    it('debe usar "C" para cédula de 10 dígitos y "R" para RUC de 13', async () => {
      const protocolo = createMockProtocolo({
        personas: [
          createMockPersonaProtocolo({
            personaCedula: '1712345678', // 10 digits
          }),
          createMockPersonaProtocolo({
            id: 'pp-ruc', personaCedula: '1791234567001', // 13 digits
            calidad: 'COMPRADOR',
            persona: {
              id: 'per-j', numeroIdentificacion: '1791234567001', tipoPersona: 'JURIDICA',
              datosPersonaJuridica: { compania: { razonSocial: 'EMPRESA XYZ S.A.' } },
            },
          }),
        ],
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocolo])
        .mockResolvedValueOnce([protocolo]);

      const result = await generarReporteInterviniente(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      expect(data[1][1]).toBe('C'); // Cedula
      expect(data[2][1]).toBe('R'); // RUC

      fs.unlinkSync(result.filePath);
    });

    it('debe usar nombreTemporal como fallback si no hay datos', async () => {
      const protocolo = createMockProtocolo({
        personas: [
          createMockPersonaProtocolo({
            persona: null, // sin datos de persona
            nombreTemporal: 'GARCIA MENDEZ PEDRO',
          }),
        ],
      });

      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protocolo])
        .mockResolvedValueOnce([protocolo]);

      const result = await generarReporteInterviniente(3, 2026, 1);

      const wb = XLSX.readFile(result.filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      expect(data[1][3]).toBe('GARCIA MENDEZ PEDRO');

      fs.unlinkSync(result.filePath);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // generarYGuardarReporte — Integración
  // ════════════════════════════════════════════════════════════════════
  describe('generarYGuardarReporte - Integración', () => {
    it('debe generar ambos reportes y marcar protocolos como REPORTADO', async () => {
      const protocolos = [
        createMockProtocolo({
          personas: [createMockPersonaProtocolo()],
        }),
      ];

      // Se llama findMany múltiples veces (una por cada reporte + una final)
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue(protocolos);

      mockPrisma.reporteUAFE.upsert.mockResolvedValue({
        id: 'reporte-1', mes: 3, anio: 2026, estado: 'GENERADO',
        totalTransacciones: 1, totalIntervinientes: 1,
      });
      mockPrisma.protocoloUAFE.updateMany.mockResolvedValue({ count: 1 });

      const result = await generarYGuardarReporte(3, 2026, 'user-1', 1);

      expect(result.estado).toBe('GENERADO');
      expect(result.totalTransacciones).toBe(1);
      expect(mockPrisma.protocoloUAFE.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'REPORTADO' }),
        }),
      );
    });

    it('debe funcionar con 0 protocolos (sin marcar como REPORTADO)', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);
      mockPrisma.reporteUAFE.upsert.mockResolvedValue({
        id: 'reporte-vacio', mes: 1, anio: 2026, estado: 'GENERADO',
        totalTransacciones: 0, totalIntervinientes: 0,
      });

      const result = await generarYGuardarReporte(1, 2026, 'user-1', 1);

      expect(result.totalTransacciones).toBe(0);
      // No debería llamar updateMany si no hay protocolos
      expect(mockPrisma.protocoloUAFE.updateMany).not.toHaveBeenCalled();
    });

    it('debe hacer upsert en reporteUAFE con la clave compuesta mes_anio_notaryId', async () => {
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([]);
      mockPrisma.reporteUAFE.upsert.mockResolvedValue({ id: 'rep-upsert' });

      await generarYGuardarReporte(6, 2026, 'user-1', 2);

      expect(mockPrisma.reporteUAFE.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            mes_anio_notaryId: { mes: 6, anio: 2026, notaryId: 2 },
          },
          create: expect.objectContaining({ mes: 6, anio: 2026, notaryId: 2, estado: 'GENERADO' }),
          update: expect.objectContaining({ estado: 'GENERADO' }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Umbral Acumulación — Protocolos incluidos por umbral
  // ════════════════════════════════════════════════════════════════════
  describe('Umbral de acumulación en reportes', () => {
    it('debe incluir protocolos menores a $10K si un compareciente acumula >= $10K', async () => {
      // Protocolo A: $6K (COMPLETO) — incluido por estado
      // Protocolo B: $5K (EN_PROGRESO) — NO COMPLETO, pero su persona acumula $11K
      const protoA = createMockProtocolo({
        id: 'pA', valorContrato: 6000, estado: 'COMPLETO',
        personas: [{ personaCedula: '111' }],
      });
      const protoB = createMockProtocolo({
        id: 'pB', valorContrato: 5000, estado: 'EN_PROGRESO',
        personas: [{ personaCedula: '111' }],
      });

      // Call 1: COMPLETO/REPORTADO only → solo protoA
      // Call 2: ALL protocols → both
      // Call 3 (if umbral activated): carga protocolos extra
      mockPrisma.protocoloUAFE.findMany
        .mockResolvedValueOnce([protoA])         // base: COMPLETO/REPORTADO
        .mockResolvedValueOnce([protoA, protoB]) // todos del mes
        .mockResolvedValueOnce([protoB]);         // extra por umbral (con include correcto)

      const result = await generarReporteTransaccion(3, 2026, 1);

      // Ambos protocolos deben estar incluidos porque cédula 111 acumula $11K
      expect(result.totalRegistros).toBe(2);

      fs.unlinkSync(result.filePath);
    });
  });
});
