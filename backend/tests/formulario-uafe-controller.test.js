import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock Prisma Client ──────────────────────────────────────────────
const mockPrisma = {
  protocoloUAFE: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  personaRegistrada: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  personaProtocolo: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  sesionFormularioUAFE: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock db.js (default export)
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
  generarTokenSesion: jest.fn().mockReturnValue('mock-session-token-12345'),
}));

// Mock pdf helpers (not needed for these tests)
jest.unstable_mockModule('pdfkit', () => ({
  default: jest.fn(),
}));
jest.unstable_mockModule('archiver', () => ({
  default: jest.fn(),
}));
jest.unstable_mockModule('../src/utils/pdf-uafe-helpers.js', () => ({
  drawHeader: jest.fn(),
  drawDisclaimer: jest.fn(),
  drawProtocolBox: jest.fn(),
  drawSection: jest.fn(),
  drawField: jest.fn(),
  drawTextAreaField: jest.fn(),
  drawSignature: jest.fn(),
  drawFooter: jest.fn(),
  getNombreCompleto: jest.fn(),
  formatCurrency: jest.fn(),
  formatDate: jest.fn(),
  checkAndAddPage: jest.fn(),
  drawFormasPago: jest.fn(),
  drawBienesSection: jest.fn(),
  COLORS: {},
  FONTS: {},
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
    estado: 'PENDIENTE',
    porcentaje: 0,
    camposFaltantes: [],
  }),
}));

// Import after mocking
const { crearProtocolo, agregarPersonaAProtocolo, loginFormularioUAFE } =
  await import('../src/controllers/formulario-uafe-controller.js');
const bcrypt = (await import('bcryptjs')).default;

// ── Helpers para mock de req/res ────────────────────────────────────
function mockReq(body = {}, params = {}, user = { id: 1, role: 'ADMIN' }) {
  return { body, params, user };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Formulario UAFE Controller - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════
  // crearProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('crearProtocolo', () => {
    it('debe crear un protocolo exitosamente con datos válidos', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        numeroProtocolo: 'P00100',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null); // no existe
      mockPrisma.protocoloUAFE.create.mockResolvedValue({
        id: 'proto-1',
        numeroProtocolo: 'P00100',
        tipoActo: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: 50000,
      });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Protocolo creado exitosamente');
      expect(mockPrisma.protocoloUAFE.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          numeroProtocolo: 'P00100',
          tipoActo: 'COMPRAVENTA DE INMUEBLES',
          valorContrato: 50000,
          createdBy: 1,
        }),
      });
    });

    it('debe crear protocolo sin numeroProtocolo (opcional)', async () => {
      const req = mockReq({
        fecha: '2026-03-01',
        actoContrato: 'DONACION DE INMUEBLES',
        valorContrato: '30000',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockResolvedValue({
        id: 'proto-2',
        numeroProtocolo: null,
        tipoActo: 'DONACION DE INMUEBLES',
      });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      // No debe llamar findUnique porque no hay numeroProtocolo
      expect(mockPrisma.protocoloUAFE.findUnique).not.toHaveBeenCalled();
    });

    it('debe rechazar si falta la fecha', async () => {
      const req = mockReq({
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Campos obligatorios');
    });

    it('debe rechazar si falta el actoContrato', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        valorContrato: '50000',
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe rechazar si falta el valorContrato', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe rechazar actoContrato "OTROS" sin tipoActoOtro', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'OTROS',
        valorContrato: '10000',
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('especificar el tipo de acto');
    });

    it('debe aceptar actoContrato "OTROS" con tipoActoOtro', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'OTROS',
        tipoActoOtro: 'Acto especial personalizado',
        valorContrato: '10000',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockResolvedValue({
        id: 'proto-3',
        tipoActo: 'OTROS',
        tipoActoOtro: 'Acto especial personalizado',
      });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('debe rechazar si ya existe un protocolo con el mismo número', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        numeroProtocolo: 'P00100',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'existente' });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('Ya existe un protocolo');
    });

    it('debe rechazar formasPago que no sea un array', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        formasPago: 'invalido',
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('formasPago debe ser un array');
    });

    it('debe rechazar formasPago con monto inválido', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        formasPago: [{ tipo: 'EFECTIVO', monto: 0 }],
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('monto válido');
    });

    it('debe rechazar CHEQUE sin banco', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        formasPago: [{ tipo: 'CHEQUE', monto: 50000 }],
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('requiere especificar el banco');
    });

    it('debe rechazar TRANSFERENCIA sin banco', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        formasPago: [{ tipo: 'TRANSFERENCIA', monto: 50000 }],
      });
      const res = mockRes();

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('requiere especificar el banco');
    });

    it('debe aceptar formasPago válidas con CHEQUE y banco', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
        formasPago: [
          { tipo: 'CHEQUE', monto: 30000, banco: 'Banco Pichincha' },
          { tipo: 'EFECTIVO', monto: 20000 },
        ],
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockResolvedValue({ id: 'proto-fp' });

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('debe manejar errores internos del servidor', async () => {
      const req = mockReq({
        fecha: '2026-01-15',
        actoContrato: 'COMPRAVENTA DE INMUEBLES',
        valorContrato: '50000',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.create.mockRejectedValue(new Error('DB error'));

      await crearProtocolo(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // agregarPersonaAProtocolo
  // ════════════════════════════════════════════════════════════════════
  describe('agregarPersonaAProtocolo', () => {
    it('debe agregar persona existente al protocolo', async () => {
      const req = mockReq(
        { cedula: '1712345678', calidad: 'COMPRADOR', actuaPor: 'SI_MISMO' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        id: 'persona-1',
        numeroIdentificacion: '1712345678',
        tipoPersona: 'NATURAL',
      });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue(null); // no existe en protocolo
      mockPrisma.personaProtocolo.create.mockResolvedValue({
        id: 'pp-1',
        calidad: 'COMPRADOR',
        actuaPor: 'SI_MISMO',
        completado: false,
        completadoAt: null,
        createdAt: new Date(),
        persona: {
          numeroIdentificacion: '1712345678',
          tipoPersona: 'NATURAL',
          completado: true,
          datosPersonaNatural: {
            datosPersonales: { nombres: 'Juan', apellidos: 'Perez' },
          },
          datosPersonaJuridica: null,
        },
        representado: null,
      });

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cedula).toBe('1712345678');
      expect(res.body.data.nombre).toBe('Juan Perez');
    });

    it('debe crear placeholder si la persona no existe', async () => {
      const req = mockReq(
        { cedula: '1799999999', calidad: 'VENDEDOR', actuaPor: 'SI_MISMO' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaRegistrada.findUnique.mockResolvedValue(null); // no existe
      mockPrisma.personaRegistrada.create.mockResolvedValue({
        id: 'persona-new',
        numeroIdentificacion: '1799999999',
        tipoPersona: 'NATURAL',
      });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue(null);
      mockPrisma.personaProtocolo.create.mockResolvedValue({
        id: 'pp-2',
        calidad: 'VENDEDOR',
        actuaPor: 'SI_MISMO',
        completado: false,
        completadoAt: null,
        createdAt: new Date(),
        persona: {
          numeroIdentificacion: '1799999999',
          tipoPersona: 'NATURAL',
          completado: false,
          datosPersonaNatural: { datosPersonales: { nombres: '', apellidos: '' } },
          datosPersonaJuridica: null,
        },
        representado: null,
      });

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.personaCreada).toBe(true);
      expect(res.body.message).toContain('pendiente de registro');
      expect(mockPrisma.personaRegistrada.create).toHaveBeenCalled();
    });

    it('debe rechazar si faltan campos obligatorios (cedula)', async () => {
      const req = mockReq(
        { calidad: 'COMPRADOR', actuaPor: 'SI_MISMO' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Campos obligatorios');
    });

    it('debe rechazar si faltan campos obligatorios (calidad)', async () => {
      const req = mockReq(
        { cedula: '1712345678', actuaPor: 'SI_MISMO' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('debe rechazar si faltan campos obligatorios (actuaPor)', async () => {
      const req = mockReq(
        { cedula: '1712345678', calidad: 'COMPRADOR' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq(
        { cedula: '1712345678', calidad: 'COMPRADOR', actuaPor: 'SI_MISMO' },
        { protocoloId: 'proto-inexistente' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue(null);

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Protocolo no encontrado');
    });

    it('debe retornar 409 si la persona ya está en el protocolo', async () => {
      const req = mockReq(
        { cedula: '1712345678', calidad: 'COMPRADOR', actuaPor: 'SI_MISMO' },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaRegistrada.findUnique.mockResolvedValue({
        id: 'persona-1',
        numeroIdentificacion: '1712345678',
      });
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue({ id: 'pp-existente' });

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('ya está agregada');
    });

    it('debe rechazar representación sin representado registrado', async () => {
      const req = mockReq(
        {
          cedula: '1712345678',
          calidad: 'COMPRADOR',
          actuaPor: 'REPRESENTANDO_A',
          representadoId: '0999999999',
        },
        { protocoloId: 'proto-1' },
      );
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaRegistrada.findUnique
        .mockResolvedValueOnce({ id: 'persona-1', numeroIdentificacion: '1712345678' }) // persona
        .mockResolvedValueOnce(null); // representado no existe
      mockPrisma.personaProtocolo.findUnique.mockResolvedValue(null);

      await agregarPersonaAProtocolo(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('representado');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // loginFormularioUAFE
  // ════════════════════════════════════════════════════════════════════
  describe('loginFormularioUAFE', () => {
    it('debe rechazar si faltan campos obligatorios', async () => {
      const req = mockReq({ numeroProtocolo: 'P001', cedula: '1712345678' }); // sin PIN
      const res = mockRes();

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('obligatorios');
    });

    it('debe rechazar PIN que no tiene 6 dígitos', async () => {
      const req = mockReq({
        numeroProtocolo: 'P001',
        cedula: '1712345678',
        pin: '123',
      });
      const res = mockRes();

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('6 dígitos');
    });

    it('debe retornar 404 si el protocolo no existe', async () => {
      const req = mockReq({
        numeroProtocolo: 'P999',
        cedula: '1712345678',
        pin: '123456',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique
        .mockResolvedValueOnce(null)   // búsqueda por número
        .mockResolvedValueOnce(null);  // búsqueda por identificador temporal

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('no encontrado');
    });

    it('debe retornar 404 si la persona no está en el protocolo', async () => {
      const req = mockReq({
        numeroProtocolo: 'P001',
        cedula: '1712345678',
        pin: '123456',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaProtocolo.findFirst.mockResolvedValue(null);

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('no está registrada');
    });

    it('debe retornar 403 si la persona está bloqueada', async () => {
      const req = mockReq({
        numeroProtocolo: 'P001',
        cedula: '1712345678',
        pin: '123456',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaProtocolo.findFirst.mockResolvedValue({
        persona: {
          id: 'p-1',
          pinHash: 'hash',
          pinCreado: true,
          bloqueadoHasta: new Date(Date.now() + 600000), // 10 min en el futuro
        },
        protocolo: { id: 'proto-1' },
      });

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('bloqueada');
    });

    it('debe retornar 403 si el PIN fue reseteado', async () => {
      const req = mockReq({
        numeroProtocolo: 'P001',
        cedula: '1712345678',
        pin: '123456',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaProtocolo.findFirst.mockResolvedValue({
        persona: {
          id: 'p-1',
          pinHash: null,
          pinCreado: false,
          bloqueadoHasta: null,
        },
        protocolo: { id: 'proto-1' },
      });

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.pinReseteado).toBe(true);
    });

    it('debe retornar 401 si el PIN es incorrecto', async () => {
      const req = mockReq({
        numeroProtocolo: 'P001',
        cedula: '1712345678',
        pin: '999999',
      });
      const res = mockRes();

      mockPrisma.protocoloUAFE.findUnique.mockResolvedValue({ id: 'proto-1' });
      mockPrisma.personaProtocolo.findFirst.mockResolvedValue({
        persona: {
          id: 'p-1',
          pinHash: '$2a$10$hasheado',
          pinCreado: true,
          bloqueadoHasta: null,
        },
        protocolo: { id: 'proto-1' },
      });

      bcrypt.compare.mockResolvedValue(false);

      await loginFormularioUAFE(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('PIN incorrecto');
    });
  });
});
