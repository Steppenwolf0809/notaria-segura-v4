import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock Prisma Client ──────────────────────────────────────────────
const mockPrisma = {
  protocoloUAFE: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  personaRegistrada: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  personaProtocolo: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock db.js
jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma,
  db: mockPrisma,
  getPrismaClient: jest.fn().mockReturnValue(mockPrisma),
}));

// Mock bcryptjs
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

// Mock pin-validator
jest.unstable_mockModule('../src/utils/pin-validator.js', () => ({
  generarTokenSesion: jest.fn().mockReturnValue('mock-session-token'),
}));

// Mock pdf/archiver (no se usan en estos tests)
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
  calcularYActualizarCompletitud: jest.fn().mockResolvedValue({
    estado: 'PENDIENTE', porcentaje: 0, camposFaltantes: [],
  }),
  calcularEstadoProtocolo: jest.fn().mockResolvedValue('PENDIENTE'),
}));

// Import controller functions after mocking
const {
  responderFormulario,
  actualizarDatosPersona,
  buscarRepresentado,
  obtenerProtocolo,
  actualizarProtocolo,
  actualizarPersonaEnProtocolo,
  eliminarPersonaDeProtocolo,
  eliminarProtocolo,
  crearProtocolo,
} = await import('../src/controllers/formulario-uafe-controller.js');

// ── Helpers ─────────────────────────────────────────────────────────
function mockReq(body = {}, params = {}, user = { id: 1, role: 'ADMIN' }, query = {}) {
  return {
    body, params, user, query,
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
    personaProtocoloVerificada: body._personaProtocoloVerificada || { id: 'pp-1' },
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    setHeader(key, val) { res.headers[key] = val; return res; },
    send(data) { res.sentData = data; return res; },
  };
  return res;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Formulario UAFE Controller - Tests Extra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════
  // responderFormulario
  // ════════════════════════════════════════════════════════════════════
  describe('responderFormulario', () => {
    it('debe enviar formulario exitosamente con datos de persona natural', async () => {
      const req = mockReq({
        datosPersonales: { nombres: 'Juan', apellidos: 'Perez' },
        contacto: { celular: '0991234567' },
        _declaracionAceptada: true,
        _declaracionFecha: '2026-01-15',
        _personaProtocoloVerificada: { id: 'pp-1' },
      });
      const res = mockRes();

      mockPrisma.personaProtocolo.update.mockResolvedValue({
        completado: true,
        completadoAt: new Date(),
        persona: {
          tipoPersona: 'NATURAL',
          numeroIdentificacion: '1712345678',
        },
      });
      mockPrisma.personaRegistrada.update.mockResolvedValue({});

      await responderFormulario(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completado).toBe(true);
      expect(res.body.data.sincronizadoConBDMaestra).toBe(true);
    });

    it('debe incluir datosRepresentado cuando se envía', async () => {
      const req = mockReq({
        datosPersonales: { nombres: 'Ana', apellidos: 'Lopez' },
        representadoId: '0999999999',
        datosRepresentado: { tipoPersona: 'NATURAL', nombres: 'Pedro', apellidos: 'Gomez' },
        _declaracionAceptada: true,
        _declaracionFecha: '2026-01-15',
        _personaProtocoloVerificada: { id: 'pp-1' },
      });
      const res = mockRes();

      mockPrisma.personaProtocolo.update.mockResolvedValue({
        completado: true,
        completadoAt: new Date(),
        persona: { tipoPersona: 'NATURAL', numeroIdentificacion: '1712345678' },
      });
      mockPrisma.personaRegistrada.update.mockResolvedValue({});

      await responderFormulario(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.personaProtocolo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            representadoId: '0999999999',
            datosRepresentado: expect.objectContaining({ tipoPersona: 'NATURAL' }),
          }),
        }),
      );
    });

    it('debe actualizar datosPersonaJuridica para persona jurídica', async () => {
      const req = mockReq({
        compania: { razonSocial: 'EMPRESA XYZ S.A.' },
        _declaracionAceptada: true,
        _personaProtocoloVerificada: { id: 'pp-1' },
      });
      const res = mockRes();

      mockPrisma.personaProtocolo.update.mockResolvedValue({
        completado: true,
        completadoAt: new Date(),
        persona: { tipoPersona: 'JURIDICA', numeroIdentificacion: '1791234567001' },
      });
      mockPrisma.personaRegistrada.update.mockResolvedValue({});

      await responderFormulario(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.personaRegistrada.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            datosPersonaJuridica: expect.objectContaining({
              compania: { razonSocial: 'EMPRESA XYZ S.A.' },
            }),
          }),
        }),
      );
    });

    it('debe manejar error de BD al actualizar', async () => {
      const req = mockReq({
        datosPersonales: { nombres: 'Test' },
        _personaProtocoloVerificada: { id: 'pp-1' },
      });
      const res = mockRes();

      mockPrisma.personaProtocolo.update.mockRejectedValue(new Error('DB error'));

      await responderFormulario(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // actualizarDatosPersona
  // ════════════════════════════════════════════════════════════════════
  describe('actualizarDatosPersona', () => {
    it('debe actualizar datos de persona natural exitosamente', async () => {
      const req = mockReq(
        { datosPersonales: { nombres: 'Carlos', apellidos: 'Garcia' } },
        { cedula: '1712345678' },
      );
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        tipoPersona: 'NATURAL',
        datosPersonaNatural: { datosPersonales: { nombres: 'Viejo', apellidos: 'Nombre' } },
      });
      mockPrisma.personaRegistrada.update.mockResolvedValue({ id: 'updated' });
      mockPrisma.personaProtocolo.findMany.mockResolvedValue([]);

      await actualizarDatosPersona(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('actualizados');
    });

    it('debe retornar 404 si la persona no existe', async () => {
      const req = mockReq({}, { cedula: '0000000000' });
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue(null);

      await actualizarDatosPersona(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('no encontrada');
    });

    it('debe hacer merge de datos existentes con nuevos', async () => {
      const req = mockReq(
        {
          contacto: { celular: '0991111111' },
          _origenEdicion: 'matrizador', // debe ser removido
        },
        { cedula: '1712345678' },
      );
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        tipoPersona: 'NATURAL',
        datosPersonaNatural: {
          datosPersonales: { nombres: 'Juan', apellidos: 'Perez' },
          contacto: { celular: '0990000000', email: 'old@mail.com' },
        },
      });
      mockPrisma.personaRegistrada.update.mockResolvedValue({ id: 'merged' });
      mockPrisma.personaProtocolo.findMany.mockResolvedValue([]);

      await actualizarDatosPersona(req, res);

      expect(res.statusCode).toBe(200);
      // Verifica que se hizo merge (los datos existentes se mantienen + nuevos)
      expect(mockPrisma.personaRegistrada.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            datosPersonaNatural: expect.objectContaining({
              datosPersonales: { nombres: 'Juan', apellidos: 'Perez' },
              contacto: { celular: '0991111111' }, // nuevo contacto
            }),
          }),
        }),
      );
    });

    it('debe recalcular completitud en todos los protocolos de la persona', async () => {
      const req = mockReq(
        { datosPersonales: { nombres: 'Test' } },
        { cedula: '1712345678' },
      );
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        tipoPersona: 'NATURAL',
        datosPersonaNatural: {},
      });
      mockPrisma.personaRegistrada.update.mockResolvedValue({});
      mockPrisma.personaProtocolo.findMany.mockResolvedValue([
        { id: 'pp-1' }, { id: 'pp-2' },
      ]);

      const { calcularYActualizarCompletitud } = await import('../src/services/completitud-service.js');

      await actualizarDatosPersona(req, res);

      expect(res.statusCode).toBe(200);
      // Debe llamar calcularYActualizarCompletitud para cada participación
      expect(calcularYActualizarCompletitud).toHaveBeenCalledTimes(2);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // buscarRepresentado
  // ════════════════════════════════════════════════════════════════════
  describe('buscarRepresentado', () => {
    it('debe encontrar persona natural existente', async () => {
      const req = mockReq({}, { identificacion: '1712345678' });
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        id: 'p-1',
        numeroIdentificacion: '1712345678',
        tipoPersona: 'NATURAL',
        completado: true,
        datosPersonaNatural: {
          datosPersonales: { nombres: 'Juan', apellidos: 'Perez' },
        },
        datosPersonaJuridica: null,
      });

      await buscarRepresentado(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.encontrado).toBe(true);
      expect(res.body.data.nombreCompleto).toBe('Juan Perez');
    });

    it('debe retornar encontrado=false si no existe', async () => {
      const req = mockReq({}, { identificacion: '9999999999' });
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue(null);

      await buscarRepresentado(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.encontrado).toBe(false);
    });

    it('debe rechazar identificación vacía', async () => {
      const req = mockReq({}, { identificacion: '   ' });
      const res = mockRes();

      await buscarRepresentado(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('requerido');
    });

    it('debe manejar persona jurídica', async () => {
      const req = mockReq({}, { identificacion: '1791234567001' });
      const res = mockRes();

      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        id: 'pj-1',
        numeroIdentificacion: '1791234567001',
        tipoPersona: 'JURIDICA',
        completado: true,
        datosPersonaNatural: null,
        datosPersonaJuridica: {
          compania: { razonSocial: 'EMPRESA ABC S.A.' },
        },
      });

      await buscarRepresentado(req, res);

      expect(res.body.data.nombreCompleto).toBe('EMPRESA ABC S.A.');
      expect(res.body.data.tipoPersona).toBe('JURIDICA');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // obtenerProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('obtenerProtocolo', () => {
    it('debe retornar protocolo con personas formateadas', async () => {
      const req = mockReq({}, { protocoloId: 'proto-1' }, { id: 1, role: 'ADMIN' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1',
        numeroProtocolo: 'P00100',
        createdBy: 1,
        personas: [{
          id: 'pp-1',
          calidad: 'VENDEDOR',
          actuaPor: 'SI_MISMO',
          completado: true,
          completadoAt: new Date(),
          estadoCompletitud: 'completo',
          porcentajeCompletitud: 100,
          camposFaltantes: [],
          personaCedula: '1712345678',
          createdAt: new Date(),
          updatedAt: new Date(),
          persona: {
            numeroIdentificacion: '1712345678',
            tipoPersona: 'NATURAL',
            completado: true,
            datosPersonaNatural: {
              datosPersonales: { nombres: 'Juan', apellidos: 'Perez', estadoCivil: 'CASADO' },
            },
            datosPersonaJuridica: null,
          },
          representado: null,
          datosRepresentado: null,
        }],
        creador: { id: 1, firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
      });

      await obtenerProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.personas[0].nombre).toBe('Juan Perez');
      expect(res.body.data.personas[0].estadoCivil).toBe('CASADO');
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq({}, { protocoloId: 'inexistente' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await obtenerProtocolo(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 403 si no es el creador ni ADMIN', async () => {
      const req = mockReq({}, { protocoloId: 'proto-1' }, { id: 99, role: 'MATRIZADOR' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1',
        createdBy: 1, // otro usuario
        personas: [],
      });

      await obtenerProtocolo(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // actualizarProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('actualizarProtocolo', () => {
    it('debe actualizar protocolo exitosamente', async () => {
      const req = mockReq(
        { valorContrato: '80000', avaluoMunicipal: '75000' },
        { protocoloId: 'proto-1' },
        { id: 1, role: 'MATRIZADOR' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1', createdBy: 1, vehiculoMarca: null,
      });
      mockPrisma.protocoloUAFE.update.mockResolvedValue({ id: 'proto-1' });

      await actualizarProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('actualizado');
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq({ valorContrato: '50000' }, { protocoloId: 'inexistente' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await actualizarProtocolo(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 403 si no es creador ni ADMIN', async () => {
      const req = mockReq(
        { valorContrato: '50000' },
        { protocoloId: 'proto-1' },
        { id: 99, role: 'MATRIZADOR' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1', createdBy: 1,
      });

      await actualizarProtocolo(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('debe rechazar número de protocolo duplicado', async () => {
      const req = mockReq(
        { numeroProtocolo: 'P00200' },
        { protocoloId: 'proto-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique
        .mockResolvedValueOnce({ id: 'proto-1', createdBy: 1, numeroProtocolo: 'P00100', vehiculoMarca: null })
        .mockResolvedValueOnce({ id: 'proto-otro' }); // duplicado

      await actualizarProtocolo(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('Ya existe');
    });

    it('debe auto-generar descripcionBien para vehículos', async () => {
      const req = mockReq(
        {
          vehiculoMarca: 'TOYOTA',
          vehiculoPlaca: 'ABC-1234',
          vehiculoMotor: 'MOT123',
          vehiculoChasis: 'CHS456',
        },
        { protocoloId: 'proto-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1', createdBy: 1,
        vehiculoMarca: null, vehiculoPlaca: null,
        vehiculoMotor: null, vehiculoChasis: null,
        vehiculoCiudadComercializacion: null,
      });
      mockPrisma.protocoloUAFE.update.mockResolvedValue({ id: 'proto-1' });

      await actualizarProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.protocoloUAFE.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipoBien: 'VEH',
            descripcionBien: expect.stringContaining('TOYOTA'),
          }),
        }),
      );
    });

    it('debe rechazar formasPago no array', async () => {
      const req = mockReq(
        { formasPago: 'invalido' },
        { protocoloId: 'proto-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1', createdBy: 1, vehiculoMarca: null,
      });

      await actualizarProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('formasPago');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // actualizarPersonaEnProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('actualizarPersonaEnProtocolo', () => {
    it('debe actualizar calidad de persona exitosamente', async () => {
      const req = mockReq(
        { calidad: 'VENDEDOR' },
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-1', protocoloId: 'proto-1' });
      mockPrisma.personaProtocolo.update.mockResolvedValue({
        id: 'pp-1', calidad: 'VENDEDOR', actuaPor: 'SI_MISMO',
        completado: false, completadoAt: null,
        persona: {
          numeroIdentificacion: '1712345678', tipoPersona: 'NATURAL',
          datosPersonaNatural: { datosPersonales: { nombres: 'Juan', apellidos: 'Perez' } },
          datosPersonaJuridica: null,
        },
      });

      await actualizarPersonaEnProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.calidad).toBe('VENDEDOR');
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq(
        { calidad: 'VENDEDOR' },
        { protocoloId: 'inexistente', personaProtocoloId: 'pp-1' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await actualizarPersonaEnProtocolo(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 400 si la persona no pertenece al protocolo', async () => {
      const req = mockReq(
        { calidad: 'VENDEDOR' },
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-otro' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-otro', protocoloId: 'proto-2' });

      await actualizarPersonaEnProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('no pertenece');
    });

    it('debe rechazar calidad inválida', async () => {
      const req = mockReq(
        { calidad: 'CALIDAD_INVALIDA' },
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-1', protocoloId: 'proto-1' });

      await actualizarPersonaEnProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('no válida');
    });

    it('debe manejar mandanteCedula al cambiar a REPRESENTANDO_A', async () => {
      const req = mockReq(
        { actuaPor: 'REPRESENTANDO_A', mandanteCedula: '0999999999' },
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-1', protocoloId: 'proto-1' });
      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        tipoPersona: 'NATURAL',
        datosPersonaNatural: { datosPersonales: { nombres: 'Pedro', apellidos: 'Gomez' } },
      });
      mockPrisma.personaProtocolo.update.mockResolvedValue({
        id: 'pp-1', calidad: 'COMPRADOR', actuaPor: 'REPRESENTANDO_A',
        completado: false, completadoAt: null,
        persona: {
          numeroIdentificacion: '1712345678', tipoPersona: 'NATURAL',
          datosPersonaNatural: { datosPersonales: { nombres: 'Juan', apellidos: 'Lopez' } },
          datosPersonaJuridica: null,
        },
      });

      await actualizarPersonaEnProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.personaProtocolo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mandanteCedula: '0999999999',
            mandanteNombre: 'Pedro Gomez',
          }),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // eliminarPersonaDeProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('eliminarPersonaDeProtocolo', () => {
    it('debe eliminar persona exitosamente', async () => {
      const req = mockReq(
        {},
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-1' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-1', protocoloId: 'proto-1' });
      mockPrisma.personaProtocolo.delete.mockResolvedValue({});

      await eliminarPersonaDeProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('eliminada');
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq({}, { protocoloId: 'inexistente', personaProtocoloId: 'pp-1' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await eliminarPersonaDeProtocolo(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 403 si no tiene permisos', async () => {
      const req = mockReq(
        {},
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-1' },
        { id: 99, role: 'MATRIZADOR' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });

      await eliminarPersonaDeProtocolo(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('debe retornar 400 si la persona no pertenece al protocolo', async () => {
      const req = mockReq(
        {},
        { protocoloId: 'proto-1', personaProtocoloId: 'pp-otro' },
        { id: 1, role: 'ADMIN' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1', createdBy: 1 });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-otro', protocoloId: 'proto-2' });

      await eliminarPersonaDeProtocolo(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // eliminarProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('eliminarProtocolo', () => {
    it('debe eliminar protocolo exitosamente como ADMIN', async () => {
      const req = mockReq({}, { protocoloId: 'proto-1' }, { id: 1, role: 'ADMIN' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1', createdBy: 2, personas: [],
        creador: { firstName: 'Test', lastName: 'User', email: 'test@test.com' },
      });
      mockPrisma.protocoloUAFE.delete.mockResolvedValue({});

      await eliminarProtocolo(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('eliminado');
    });

    it('debe retornar 404 si no existe', async () => {
      const req = mockReq({}, { protocoloId: 'inexistente' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await eliminarProtocolo(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 403 si no es ADMIN ni creador', async () => {
      const req = mockReq({}, { protocoloId: 'proto-1' }, { id: 99, role: 'MATRIZADOR' });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({
        id: 'proto-1', createdBy: 1, personas: [],
        creador: { firstName: 'Test', lastName: 'User', email: 'test@test.com' },
      });

      await eliminarProtocolo(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // crearProtocolo - Edge Cases Vehículos
  // ════════════════════════════════════════════════════════════════════
  describe('crearProtocolo - Vehículos', () => {
    it('debe crear protocolo con datos de vehículo y auto-generar descripcionBien', async () => {
      const req = mockReq({
        fecha: '2026-03-01',
        actoContrato: 'COMPRAVENTA DE VEHICULOS',
        valorContrato: '25000',
        vehiculoMarca: 'Toyota',
        vehiculoPlaca: 'PDG-9514',
        vehiculoMotor: 'JBC41552',
        vehiculoChasis: '2FMPK3J80JBC41552',
        vehiculoCiudadComercializacion: 'Guayaquil',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockResolvedValue({
        id: 'proto-veh',
        tipoActo: 'COMPRAVENTA DE VEHICULOS',
        tipoBien: 'VEH',
        descripcionBien: 'VEHÍCULO COMERCIALIZADO EN GUAYAQUIL, MARCA: TOYOTA, Placa: PDG-9514, Motor: JBC41552, Chasis: 2FMPK3J80JBC41552',
      });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockPrisma.protocoloUAFE.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipoBien: 'VEH',
          descripcionBien: expect.stringContaining('GUAYAQUIL'),
          vehiculoMarca: 'Toyota',
          vehiculoPlaca: 'PDG-9514',
        }),
      });
    });

    it('debe crear vehículo con solo marca (sin placa/motor/chasis)', async () => {
      const req = mockReq({
        fecha: '2026-03-01',
        actoContrato: 'COMPRAVENTA DE VEHICULOS',
        valorContrato: '15000',
        vehiculoMarca: 'Chevrolet',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockResolvedValue({ id: 'proto-marca' });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockPrisma.protocoloUAFE.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipoBien: 'VEH',
          descripcionBien: expect.stringContaining('CHEVROLET'),
          vehiculoPlaca: null,
          vehiculoMotor: null,
        }),
      });
    });

    it('debe usar "QUITO" como ciudad por defecto si no se proporciona', async () => {
      const req = mockReq({
        fecha: '2026-03-01',
        actoContrato: 'COMPRAVENTA DE VEHICULOS',
        valorContrato: '20000',
        vehiculoMarca: 'Hyundai',
        vehiculoPlaca: 'ABC-1234',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockResolvedValue({ id: 'proto-quito' });

      await crearProtocolo(req, res);

      expect(mockPrisma.protocoloUAFE.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          descripcionBien: expect.stringContaining('QUITO'),
        }),
      });
    });
  });
});
