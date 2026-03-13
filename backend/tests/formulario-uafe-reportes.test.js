import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';

// ── Mock Prisma Client ──────────────────────────────────────────────
const mockPrisma = {
  protocoloUAFE: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  personaRegistrada: {
    findUnique: jest.fn(),
  },
  personaProtocolo: {
    findFirst: jest.fn(),
  },
  reporteUAFE: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma,
  db: mockPrisma,
  getPrismaClient: jest.fn().mockReturnValue(mockPrisma),
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: { compare: jest.fn(), hash: jest.fn() },
}));
jest.unstable_mockModule('../src/utils/pin-validator.js', () => ({
  generarTokenSesion: jest.fn().mockReturnValue('mock-token'),
}));
jest.unstable_mockModule('pdfkit', () => ({ default: jest.fn() }));
jest.unstable_mockModule('archiver', () => ({ default: jest.fn() }));
jest.unstable_mockModule('../src/utils/pdf-uafe-helpers.js', () => ({
  drawHeader: jest.fn(), drawDisclaimer: jest.fn(), drawProtocolBox: jest.fn(),
  drawSection: jest.fn(), drawField: jest.fn(), drawTextAreaField: jest.fn(),
  drawSignature: jest.fn(), drawFooter: jest.fn(), getNombreCompleto: jest.fn(),
  formatCurrency: jest.fn(), formatDate: jest.fn(), checkAndAddPage: jest.fn(),
  drawFormasPago: jest.fn(), drawBienesSection: jest.fn(),
  COLORS: {}, FONTS: {},
}));
jest.unstable_mockModule('../src/services/encabezado-generator-service.js', () => ({
  generarEncabezado: jest.fn(),
}));
jest.unstable_mockModule('../src/services/comparecencia-generator-service.js', () => ({
  generarComparecencia: jest.fn(),
}));
jest.unstable_mockModule('../src/services/completitud-service.js', () => ({
  obtenerEstadoGeneralProtocolo: jest.fn(),
  calcularYActualizarCompletitud: jest.fn().mockResolvedValue({}),
  calcularEstadoProtocolo: jest.fn().mockResolvedValue('PENDIENTE'),
}));

// Mock del servicio de reportes para generarReporteMensual
const mockGenerarYGuardarReporte = jest.fn();
jest.unstable_mockModule('../src/services/reporte-uafe-generator-service.js', () => ({
  generarYGuardarReporte: mockGenerarYGuardarReporte,
}));

const {
  generarReporteMensual,
  descargarReporte,
  vincularDocumento,
  buscarDocumentosParaVincular,
  consultarUmbral,
} = await import('../src/controllers/formulario-uafe-controller.js');

// ── Helpers ─────────────────────────────────────────────────────────
function mockReq(body = {}, params = {}, user = { id: 1, role: 'ADMIN', notaryId: 1 }, query = {}) {
  return { body, params, user, query };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    piped: false,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    setHeader(key, val) { res.headers[key] = val; return res; },
  };
  return res;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Formulario UAFE Controller - Reportes y Vinculación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════
  // generarReporteMensual
  // ════════════════════════════════════════════════════════════════════
  describe('generarReporteMensual', () => {
    it('debe generar reporte exitosamente', async () => {
      const req = mockReq({ mes: 3, anio: 2026 });
      const res = mockRes();

      mockGenerarYGuardarReporte.mockResolvedValue({
        id: 'reporte-1',
        mes: 3, anio: 2026,
        estado: 'GENERADO',
        totalTransacciones: 5,
        totalIntervinientes: 12,
      });

      await generarReporteMensual(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTransacciones).toBe(5);
    });

    it('debe retornar 400 si falta mes o año', async () => {
      const req = mockReq({ mes: 3 }); // falta anio
      const res = mockRes();

      await generarReporteMensual(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('requeridos');
    });

    it('debe retornar 400 si ambos faltan', async () => {
      const req = mockReq({});
      const res = mockRes();

      await generarReporteMensual(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('debe manejar error del servicio de reportes', async () => {
      const req = mockReq({ mes: 1, anio: 2026 });
      const res = mockRes();

      mockGenerarYGuardarReporte.mockRejectedValue(new Error('No hay protocolos'));

      await generarReporteMensual(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain('No hay protocolos');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // descargarReporte
  // ════════════════════════════════════════════════════════════════════
  describe('descargarReporte', () => {
    it('debe retornar 404 si el reporte no existe', async () => {
      const req = mockReq({}, { reporteId: 'inexistente', tipo: 'transaccion' });
      const res = mockRes();

      mockPrisma.reporteUAFE.findUnique.mockResolvedValue(null);

      await descargarReporte(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Reporte no encontrado');
    });

    it('debe retornar 404 si el archivo no existe en disco', async () => {
      const req = mockReq({}, { reporteId: 'rep-1', tipo: 'transaccion' });
      const res = mockRes();

      mockPrisma.reporteUAFE.findUnique.mockResolvedValue({
        id: 'rep-1',
        archivoTransacciones: '/tmp/no_existe.xlsx',
        archivoIntervinientes: '/tmp/intervinientes.xlsx',
      });

      await descargarReporte(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Archivo no encontrado');
    });

    it('debe seleccionar archivoIntervinientes cuando tipo es interviniente', async () => {
      const req = mockReq({}, { reporteId: 'rep-1', tipo: 'interviniente' });
      const res = mockRes();

      mockPrisma.reporteUAFE.findUnique.mockResolvedValue({
        id: 'rep-1',
        archivoTransacciones: '/tmp/trans.xlsx',
        archivoIntervinientes: '/tmp/no_existe_intv.xlsx',
      });

      await descargarReporte(req, res);

      // El archivo no existe, así que 404 para el tipo interviniente
      expect(res.statusCode).toBe(404);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // vincularDocumento
  // ════════════════════════════════════════════════════════════════════
  describe('vincularDocumento', () => {
    it('debe vincular documento a protocolo exitosamente', async () => {
      const req = mockReq(
        { documentId: 'doc-1' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.document.findUnique.mockResolvedValue({ id: 'doc-1' });
      mockPrisma.protocoloUAFE.update.mockResolvedValue({ id: 'proto-1', documentId: 'doc-1' });

      await vincularDocumento(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.protocoloUAFE.update).toHaveBeenCalledWith({
        where: { id: 'proto-1' },
        data: { documentId: 'doc-1' },
      });
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq({ documentId: 'doc-1' }, { protocoloId: 'inexistente' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await vincularDocumento(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Protocolo');
    });

    it('debe retornar 404 si el documento no existe', async () => {
      const req = mockReq({ documentId: 'inexistente' }, { protocoloId: 'proto-1' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await vincularDocumento(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Documento');
    });

    it('debe manejar error P2002 (documento ya vinculado)', async () => {
      const req = mockReq({ documentId: 'doc-1' }, { protocoloId: 'proto-1' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.document.findUnique.mockResolvedValue({ id: 'doc-1' });
      const error = new Error('Unique constraint');
      error.code = 'P2002';
      mockPrisma.protocoloUAFE.update.mockRejectedValue(error);

      await vincularDocumento(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('ya esta vinculado');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // buscarDocumentosParaVincular
  // ════════════════════════════════════════════════════════════════════
  describe('buscarDocumentosParaVincular', () => {
    it('debe buscar documentos por query', async () => {
      const req = mockReq({}, {}, { id: 1, role: 'ADMIN', notaryId: 1 }, { q: 'compraventa' });
      const res = mockRes();

      mockPrisma.document.findMany.mockResolvedValue([
        { id: 'doc-1', protocolNumber: 'P00100', clientName: 'Juan Perez' },
      ]);

      await buscarDocumentosParaVincular(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('debe retornar array vacío con query muy corto', async () => {
      const req = mockReq({}, {}, { id: 1 }, { q: 'a' });
      const res = mockRes();

      await buscarDocumentosParaVincular(req, res);

      expect(res.body.data).toEqual([]);
    });

    it('debe retornar array vacío sin query', async () => {
      const req = mockReq({}, {}, { id: 1 }, {});
      const res = mockRes();

      await buscarDocumentosParaVincular(req, res);

      expect(res.body.data).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // consultarUmbral
  // ════════════════════════════════════════════════════════════════════
  describe('consultarUmbral', () => {
    it('debe retornar sin alertas cuando nadie supera $10,000', async () => {
      const req = mockReq({}, { mes: '3', anio: '2026' }, { id: 1, notaryId: 1 });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([
        {
          id: 'p1', valorContrato: 5000, fecha: new Date('2026-03-10'),
          actoContrato: 'COMPRAVENTA',
          personas: [{ personaCedula: '1712345678', persona: { numeroIdentificacion: '1712345678', datosPersonaNatural: { datosPersonales: { nombres: 'Juan', apellidos: 'Perez' } }, tipoPersona: 'NATURAL' } }],
        },
      ]);

      await consultarUmbral(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalAlertas).toBe(0);
      expect(res.body.data.alertas).toEqual([]);
    });

    it('debe retornar alertas por acumulación mensual >= $10,000', async () => {
      const req = mockReq({}, { mes: '3', anio: '2026' }, { id: 1, notaryId: 1 });
      const res = mockRes();

      // Dos protocolos de $6K cada uno para la misma cédula = $12K > $10K
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([
        {
          id: 'p1', valorContrato: 6000, fecha: new Date('2026-03-05'),
          actoContrato: 'COMPRAVENTA DE VEHICULOS', tipoBien: 'VEH',
          numeroProtocolo: 'D00100',
          personas: [{
            personaCedula: '1712345678',
            persona: { numeroIdentificacion: '1712345678', datosPersonaNatural: { datosPersonales: { nombres: 'Juan', apellidos: 'Perez' } }, tipoPersona: 'NATURAL' },
          }],
        },
        {
          id: 'p2', valorContrato: 6000, fecha: new Date('2026-03-15'),
          actoContrato: 'COMPRAVENTA DE VEHICULOS', tipoBien: 'VEH',
          numeroProtocolo: 'D00200',
          personas: [{
            personaCedula: '1712345678',
            persona: { numeroIdentificacion: '1712345678', datosPersonaNatural: { datosPersonales: { nombres: 'Juan', apellidos: 'Perez' } }, tipoPersona: 'NATURAL' },
          }],
        },
      ]);

      await consultarUmbral(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalAlertas).toBe(1);
      expect(res.body.data.alertas[0].cedula).toBe('1712345678');
      expect(res.body.data.alertas[0].total).toBe(12000);
      expect(res.body.data.alertas[0].actos).toHaveLength(2);
    });

    it('NO debe alertar si todos los actos son >= $10,000 individualmente', async () => {
      const req = mockReq({}, { mes: '3', anio: '2026' }, { id: 1, notaryId: 1 });
      const res = mockRes();

      // Un solo protocolo de $15K — no necesita alerta por acumulación
      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([
        {
          id: 'p1', valorContrato: 15000, fecha: new Date('2026-03-10'),
          actoContrato: 'COMPRAVENTA', tipoBien: 'INM',
          personas: [{
            personaCedula: '1712345678',
            persona: { numeroIdentificacion: '1712345678', datosPersonaNatural: { datosPersonales: { nombres: 'Juan', apellidos: 'Perez' } }, tipoPersona: 'NATURAL' },
          }],
        },
      ]);

      await consultarUmbral(req, res);

      expect(res.body.data.totalAlertas).toBe(0);
    });

    it('debe retornar 400 con mes inválido', async () => {
      const req = mockReq({}, { mes: '13', anio: '2026' }, { id: 1, notaryId: 1 });
      const res = mockRes();

      await consultarUmbral(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('debe retornar 400 con año inválido', async () => {
      const req = mockReq({}, { mes: '3', anio: '2019' }, { id: 1, notaryId: 1 });
      const res = mockRes();

      await consultarUmbral(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('debe calcular umbral correctamente con múltiples personas', async () => {
      const req = mockReq({}, { mes: '6', anio: '2026' }, { id: 1, notaryId: 1 });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findMany.mockResolvedValue([
        {
          id: 'p1', valorContrato: 7000, fecha: new Date('2026-06-01'),
          actoContrato: 'COMPRAVENTA',
          personas: [
            { personaCedula: '111', persona: { numeroIdentificacion: '111', tipoPersona: 'NATURAL', datosPersonaNatural: { datosPersonales: { nombres: 'A', apellidos: 'B' } } } },
            { personaCedula: '222', persona: { numeroIdentificacion: '222', tipoPersona: 'NATURAL', datosPersonaNatural: { datosPersonales: { nombres: 'C', apellidos: 'D' } } } },
          ],
        },
        {
          id: 'p2', valorContrato: 5000, fecha: new Date('2026-06-15'),
          actoContrato: 'COMPRAVENTA DE VEHICULOS',
          personas: [
            { personaCedula: '111', persona: { numeroIdentificacion: '111', tipoPersona: 'NATURAL', datosPersonaNatural: { datosPersonales: { nombres: 'A', apellidos: 'B' } } } },
          ],
        },
      ]);

      await consultarUmbral(req, res);

      // Persona 111: $7000 + $5000 = $12000 (alerta, ambos < $10K)
      // Persona 222: $7000 (sin alerta)
      expect(res.body.data.totalAlertas).toBe(1);
      expect(res.body.data.alertas[0].cedula).toBe('111');
      expect(res.body.data.alertas[0].total).toBe(12000);
    });
  });
});
