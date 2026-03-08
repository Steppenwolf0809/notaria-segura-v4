import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock Prisma Client ──────────────────────────────────────────────
const mockPrisma = {
  invoice: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  importLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  document: {
    findUnique: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

// Mock db.js
jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma,
  db: mockPrisma,
  getPrismaClient: jest.fn().mockReturnValue(mockPrisma),
}));

// Import after mocking
const {
  getPaymentStatusForDocument,
  healthCheck,
  getInvoices,
  getInvoiceById,
  getStats,
  getDocumentPaymentStatus,
} = await import('../src/controllers/billing-controller.js');

// ── Helpers ──────────────────────────────────────────────────────────
function mockReq(query = {}, params = {}, user = { id: 1, role: 'ADMIN' }) {
  return { query, params, user };
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

describe('Billing Controller - Tests Unitarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════
  // getPaymentStatusForDocument (función interna, no req/res)
  // ════════════════════════════════════════════════════════════════════
  describe('getPaymentStatusForDocument', () => {
    it('debe retornar NO_INVOICE si no hay facturas', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await getPaymentStatusForDocument(999);

      expect(result.hasInvoice).toBe(false);
      expect(result.status).toBe('NO_INVOICE');
      expect(result.totalDebt).toBe(0);
      expect(result.infoPago).toBe('');
    });

    it('debe retornar PAID si la factura está completamente pagada', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: '001-001-00000123',
          totalAmount: 100,
          paidAmount: 100,
          payments: [{ amount: 100 }],
        },
      ]);

      const result = await getPaymentStatusForDocument(1);

      expect(result.hasInvoice).toBe(true);
      expect(result.status).toBe('PAID');
      expect(result.totalDebt).toBe(0);
      expect(result.infoPago).toBe('');
    });

    it('debe retornar PARTIAL con saldo pendiente', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-2',
          invoiceNumber: '001-001-00000456',
          totalAmount: 200,
          paidAmount: 80,
          payments: [{ amount: 80 }],
        },
      ]);

      const result = await getPaymentStatusForDocument(2);

      expect(result.hasInvoice).toBe(true);
      expect(result.status).toBe('PARTIAL');
      expect(result.totalDebt).toBe(120);
      expect(result.totalPaid).toBe(80);
      expect(result.totalAmount).toBe(200);
      expect(result.infoPago).toContain('$120.00');
    });

    it('debe retornar PENDING si no hay pagos', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-3',
          invoiceNumber: '001-001-00000789',
          totalAmount: 500,
          paidAmount: 0,
          payments: [],
        },
      ]);

      const result = await getPaymentStatusForDocument(3);

      expect(result.hasInvoice).toBe(true);
      expect(result.status).toBe('PENDING');
      expect(result.totalDebt).toBe(500);
      expect(result.totalPaid).toBe(0);
    });

    it('debe usar el valor mayor entre payments y paidAmount (sync)', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-sync',
          invoiceNumber: '001-001-00001000',
          totalAmount: 300,
          paidAmount: 250, // sync tiene valor mayor
          payments: [{ amount: 100 }, { amount: 50 }], // payments = 150
        },
      ]);

      const result = await getPaymentStatusForDocument(10);

      // Debe usar max(250, 150) = 250
      expect(result.totalPaid).toBe(250);
      expect(result.totalDebt).toBe(50);
    });

    it('debe buscar facturas por numeroFactura del documento si no hay vinculadas', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        numeroFactura: '001-001-00005555',
        protocolNumber: null,
      });
      // Primera llamada: facturas vinculadas directamente (vacío)
      mockPrisma.invoice.findMany
        .mockResolvedValueOnce([]) // documentId
        .mockResolvedValueOnce([   // fallback por número
          {
            id: 'inv-fallback',
            invoiceNumber: '001-001-00005555',
            totalAmount: 400,
            paidAmount: 400,
            documentId: null,
            payments: [{ amount: 400 }],
          },
        ]);

      mockPrisma.invoice.update.mockResolvedValue({});

      const result = await getPaymentStatusForDocument(50);

      expect(result.hasInvoice).toBe(true);
      expect(result.status).toBe('PAID');
    });

    it('debe manejar errores y retornar estado ERROR', async () => {
      mockPrisma.document.findUnique.mockRejectedValue(new Error('DB connection failed'));

      const result = await getPaymentStatusForDocument(99);

      expect(result.hasInvoice).toBe(false);
      expect(result.status).toBe('ERROR');
    });

    it('debe calcular múltiples facturas correctamente', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-a',
          invoiceNumber: '001-001-00001',
          totalAmount: 100,
          paidAmount: 100,
          payments: [{ amount: 100 }],
        },
        {
          id: 'inv-b',
          invoiceNumber: '001-001-00002',
          totalAmount: 200,
          paidAmount: 50,
          payments: [{ amount: 50 }],
        },
      ]);

      const result = await getPaymentStatusForDocument(20);

      expect(result.totalAmount).toBe(300);
      expect(result.totalPaid).toBe(150);
      expect(result.totalDebt).toBe(150);
      expect(result.invoices).toHaveLength(2);
      expect(result.invoices[0].status).toBe('PAID');
      expect(result.invoices[1].status).toBe('PARTIAL');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // healthCheck
  // ════════════════════════════════════════════════════════════════════
  describe('healthCheck', () => {
    it('debe retornar status ok con conteos', async () => {
      mockPrisma.invoice.count.mockResolvedValue(150);
      mockPrisma.payment.count.mockResolvedValue(75);

      const req = mockReq();
      const res = mockRes();

      await healthCheck(req, res);

      expect(res.body.status).toBe('ok');
      expect(res.body.stats.invoices).toBe(150);
      expect(res.body.stats.payments).toBe(75);
    });

    it('debe retornar error 500 si la BD falla', async () => {
      mockPrisma.invoice.count.mockRejectedValue(new Error('DB error'));

      const req = mockReq();
      const res = mockRes();

      await healthCheck(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.status).toBe('error');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getStats
  // ════════════════════════════════════════════════════════════════════
  describe('getStats', () => {
    it('debe retornar estadísticas de facturación', async () => {
      mockPrisma.invoice.count
        .mockResolvedValueOnce(200) // total invoices
        .mockResolvedValueOnce(45); // pending invoices
      mockPrisma.payment.count.mockResolvedValue(120);

      const req = mockReq();
      const res = mockRes();

      await getStats(req, res);

      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalInvoices).toBe(200);
      expect(res.body.stats.totalPayments).toBe(120);
      expect(res.body.stats.pendingInvoices).toBe(45);
    });

    it('debe manejar errores de BD', async () => {
      mockPrisma.invoice.count.mockRejectedValue(new Error('timeout'));

      const req = mockReq();
      const res = mockRes();

      await getStats(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getInvoices
  // ════════════════════════════════════════════════════════════════════
  describe('getInvoices', () => {
    it('debe retornar facturas con paginación', async () => {
      const invoicesMock = [
        {
          id: 'inv-1',
          invoiceNumber: '001-001-001',
          totalAmount: 100,
          paidAmount: 50,
          payments: [{ id: 'p1', amount: 50, paymentDate: new Date(), receiptNumber: 'R1' }],
          document: { id: 1, protocolNumber: 'P001', clientName: 'Test', status: 'ACTIVO' },
        },
      ];

      mockPrisma.invoice.findMany.mockResolvedValue(invoicesMock);
      mockPrisma.invoice.count.mockResolvedValue(1);

      const req = mockReq({ page: '1', limit: '20' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].totalAmount).toBe(100);
      expect(res.body.data[0].totalPaid).toBe(50);
      expect(res.body.data[0].balance).toBe(50);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.pagination.page).toBe(1);
    });

    it('debe filtrar por estado', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const req = mockReq({ page: '1', limit: '10', status: 'PENDING' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('debe filtrar por búsqueda (search)', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const req = mockReq({ page: '1', limit: '10', search: 'Garcia' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ clientName: { contains: 'Garcia', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('debe filtrar por rango de fechas', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const req = mockReq({ page: '1', limit: '10', dateFrom: '2026-01-01', dateTo: '2026-01-31' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('debe manejar errores de BD', async () => {
      mockPrisma.invoice.findMany.mockRejectedValue(new Error('DB error'));

      const req = mockReq({ page: '1', limit: '10' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getInvoiceById
  // ════════════════════════════════════════════════════════════════════
  describe('getInvoiceById', () => {
    it('debe retornar factura por ID para ADMIN', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-100',
        invoiceNumber: '001-001-100',
        totalAmount: 500,
        paidAmount: 200,
        payments: [{ amount: 150 }, { amount: 50 }],
        document: {
          id: 1,
          protocolNumber: 'P100',
          clientName: 'Cliente Admin',
          clientPhone: '0991234567',
          status: 'ACTIVO',
          codigoRetiro: 'ABC',
          assignedToId: 5,
        },
      });

      const req = mockReq({}, { id: 'inv-100' }, { id: 1, role: 'ADMIN' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.body.totalAmount).toBe(500);
      expect(res.body.totalPaid).toBe(200); // max(200, 200) = 200
      expect(res.body.balance).toBe(300);
      // assignedToId should NOT be in response document
      expect(res.body.document.assignedToId).toBeUndefined();
    });

    it('debe retornar 404 si la factura no existe', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      const req = mockReq({}, { id: 'inv-999' }, { id: 1, role: 'ADMIN' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 403 para MATRIZADOR accediendo factura ajena', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-200',
        invoiceNumber: '001-001-200',
        totalAmount: 100,
        paidAmount: 0,
        payments: [],
        document: {
          id: 2,
          protocolNumber: 'P200',
          clientName: 'Otro',
          clientPhone: null,
          status: 'ACTIVO',
          codigoRetiro: null,
          assignedToId: 99, // diferente al userId
        },
      });

      const req = mockReq({}, { id: 'inv-200' }, { id: 5, role: 'MATRIZADOR' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('permisos');
    });

    it('debe permitir acceso a CAJA sin verificar ownership', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-300',
        invoiceNumber: '001-001-300',
        totalAmount: 100,
        paidAmount: 0,
        payments: [],
        document: {
          id: 3,
          protocolNumber: 'P300',
          clientName: 'Test',
          clientPhone: null,
          status: 'ACTIVO',
          codigoRetiro: null,
          assignedToId: 99,
        },
      });

      const req = mockReq({}, { id: 'inv-300' }, { id: 7, role: 'CAJA' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalAmount).toBe(100);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // getDocumentPaymentStatus
  // ════════════════════════════════════════════════════════════════════
  describe('getDocumentPaymentStatus', () => {
    it('debe retornar NO_INVOICE si no hay facturas asociadas', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const req = mockReq({}, { documentId: '1' });
      const res = mockRes();

      await getDocumentPaymentStatus(req, res);

      expect(res.body.hasInvoice).toBe(false);
      expect(res.body.status).toBe('NO_INVOICE');
    });

    it('debe calcular correctamente el estado PAID', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-paid',
          invoiceNumber: '001-001-999',
          totalAmount: 300,
          paidAmount: 300,
          payments: [{ amount: 200 }, { amount: 100 }],
        },
      ]);

      const req = mockReq({}, { documentId: '5' });
      const res = mockRes();

      await getDocumentPaymentStatus(req, res);

      expect(res.body.hasInvoice).toBe(true);
      expect(res.body.status).toBe('PAID');
      expect(res.body.totalDebt).toBe(0);
      expect(res.body.message).toContain('Pagado');
    });

    it('debe calcular correctamente el estado PARTIAL', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-partial',
          invoiceNumber: '001-001-888',
          totalAmount: 500,
          paidAmount: 100,
          payments: [{ amount: 100 }],
        },
      ]);

      const req = mockReq({}, { documentId: '6' });
      const res = mockRes();

      await getDocumentPaymentStatus(req, res);

      expect(res.body.status).toBe('PARTIAL');
      expect(res.body.totalDebt).toBe(400);
      expect(res.body.message).toContain('$400.00');
    });

    it('debe manejar errores', async () => {
      mockPrisma.invoice.findMany.mockRejectedValue(new Error('timeout'));

      const req = mockReq({}, { documentId: '7' });
      const res = mockRes();

      await getDocumentPaymentStatus(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Edge Cases: Sobrepago y cálculos de punto flotante
  // ════════════════════════════════════════════════════════════════════
  describe('Edge Cases - Cálculos financieros', () => {
    it('debe manejar sobrepago (paidAmount > totalAmount)', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-over',
          invoiceNumber: '001-001-99999',
          totalAmount: 100,
          paidAmount: 150, // sobrepago
          payments: [{ amount: 150 }],
        },
      ]);

      const result = await getPaymentStatusForDocument(100);

      expect(result.hasInvoice).toBe(true);
      expect(result.status).toBe('PAID'); // totalDebt <= 0
      expect(result.totalDebt).toBe(-50); // negativo = crédito a favor
      expect(result.totalPaid).toBe(150);
      expect(result.infoPago).toBe(''); // no muestra info de pago si no hay deuda
    });

    it('debe manejar valores decimales sin problemas de punto flotante', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-decimal',
          invoiceNumber: '001-001-33333',
          totalAmount: 99.99,
          paidAmount: 0,
          payments: [
            { amount: 33.33 },
            { amount: 33.33 },
            { amount: 33.33 },
          ],
        },
      ]);

      const result = await getPaymentStatusForDocument(200);

      expect(result.totalPaid).toBeCloseTo(99.99, 2);
      // 99.99 - 99.99 = 0 (o muy cercano)
      expect(result.totalDebt).toBeCloseTo(0, 2);
    });

    it('debe manejar factura con totalAmount = 0', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-zero',
          invoiceNumber: '001-001-00000',
          totalAmount: 0,
          paidAmount: 0,
          payments: [],
        },
      ]);

      const result = await getPaymentStatusForDocument(300);

      expect(result.hasInvoice).toBe(true);
      expect(result.status).toBe('PAID'); // 0 <= 0
      expect(result.totalDebt).toBe(0);
    });

    it('debe calcular correctamente con mix de facturas pagadas y pendientes', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-mix-1',
          invoiceNumber: '001-001-AAA',
          totalAmount: 1000,
          paidAmount: 1000,
          payments: [{ amount: 500 }, { amount: 500 }],
        },
        {
          id: 'inv-mix-2',
          invoiceNumber: '001-001-BBB',
          totalAmount: 500,
          paidAmount: 0,
          payments: [], // sin pagos
        },
        {
          id: 'inv-mix-3',
          invoiceNumber: '001-001-CCC',
          totalAmount: 200,
          paidAmount: 100,
          payments: [{ amount: 100 }],
        },
      ]);

      const result = await getPaymentStatusForDocument(400);

      expect(result.totalAmount).toBe(1700);
      expect(result.totalPaid).toBe(1100);
      expect(result.totalDebt).toBe(600);
      expect(result.status).toBe('PARTIAL');
      expect(result.invoices).toHaveLength(3);
      expect(result.invoices[0].status).toBe('PAID');
      expect(result.invoices[1].status).toBe('PENDING');
      expect(result.invoices[2].status).toBe('PARTIAL');
    });

    it('getDocumentPaymentStatus debe usar max(sync, payments) para paidAmount', async () => {
      // endpoint version (req/res)
      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-sync2',
          invoiceNumber: '001-001-SYNC',
          totalAmount: 400,
          paidAmount: 350, // sync mayor que payments
          payments: [{ amount: 200 }],
        },
      ]);

      const req = mockReq({}, { documentId: '88' });
      const res = mockRes();

      await getDocumentPaymentStatus(req, res);

      // max(350, 200) = 350
      expect(res.body.totalPaid).toBe(350);
      expect(res.body.totalDebt).toBe(50);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Edge Cases: getInvoiceById - ownership y roles
  // ════════════════════════════════════════════════════════════════════
  describe('Edge Cases - getInvoiceById ownership', () => {
    it('debe permitir RECEPCION sin verificar ownership', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-rec',
        invoiceNumber: '001-001-REC',
        totalAmount: 100,
        paidAmount: 0,
        payments: [],
        document: {
          id: 10,
          protocolNumber: 'P-REC',
          clientName: 'Test',
          clientPhone: null,
          status: 'ACTIVO',
          codigoRetiro: null,
          assignedToId: 999, // no es del usuario
        },
      });

      const req = mockReq({}, { id: 'inv-rec' }, { id: 5, role: 'RECEPCION' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('debe bloquear ARCHIVO si no tiene ownership', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-arch',
        invoiceNumber: '001-001-ARCH',
        totalAmount: 100,
        paidAmount: 0,
        payments: [],
        document: {
          id: 11,
          protocolNumber: 'P-ARCH',
          clientName: 'Test',
          clientPhone: null,
          status: 'ACTIVO',
          codigoRetiro: null,
          assignedToId: 999,
        },
      });

      const req = mockReq({}, { id: 'inv-arch' }, { id: 5, role: 'ARCHIVO' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('debe permitir MATRIZADOR si es dueño del documento', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-mat',
        invoiceNumber: '001-001-MAT',
        totalAmount: 250,
        paidAmount: 100,
        payments: [{ amount: 100 }],
        document: {
          id: 12,
          protocolNumber: 'P-MAT',
          clientName: 'Test',
          clientPhone: null,
          status: 'ACTIVO',
          codigoRetiro: null,
          assignedToId: 42, // mismo que userId
        },
      });

      const req = mockReq({}, { id: 'inv-mat' }, { id: 42, role: 'MATRIZADOR' });
      const res = mockRes();

      await getInvoiceById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalAmount).toBe(250);
    });

    it('debe manejar factura sin documento asociado (document: null)', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-nodoc',
        invoiceNumber: '001-001-NODOC',
        totalAmount: 100,
        paidAmount: 0,
        payments: [],
        document: null,
      });

      const req = mockReq({}, { id: 'inv-nodoc' }, { id: 5, role: 'MATRIZADOR' });
      const res = mockRes();

      await getInvoiceById(req, res);

      // document?.assignedToId → undefined !== userId → 403
      expect(res.statusCode).toBe(403);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Edge Cases: getInvoices - paginación y filtros extremos
  // ════════════════════════════════════════════════════════════════════
  describe('Edge Cases - getInvoices paginación', () => {
    it('debe manejar solo dateFrom sin dateTo', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const req = mockReq({ page: '1', limit: '10', dateFrom: '2026-01-01' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
      // No debe tener lte
      const whereArg = mockPrisma.invoice.findMany.mock.calls[0][0].where;
      expect(whereArg.issueDate.lte).toBeUndefined();
    });

    it('debe manejar solo dateTo sin dateFrom', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const req = mockReq({ page: '1', limit: '10', dateTo: '2026-12-31' });
      const res = mockRes();

      await getInvoices(req, res);

      const whereArg = mockPrisma.invoice.findMany.mock.calls[0][0].where;
      expect(whereArg.issueDate.lte).toEqual(expect.any(Date));
      expect(whereArg.issueDate.gte).toBeUndefined();
    });

    it('debe combinar clientTaxId con otros filtros', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      const req = mockReq({
        page: '1',
        limit: '10',
        clientTaxId: '1712345678',
        status: 'PENDING',
      });
      const res = mockRes();

      await getInvoices(req, res);

      const whereArg = mockPrisma.invoice.findMany.mock.calls[0][0].where;
      expect(whereArg.clientTaxId).toBe('1712345678');
      expect(whereArg.status).toBe('PENDING');
    });

    it('debe calcular skip correctamente para paginación', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(100);

      const req = mockReq({ page: '5', limit: '20' });
      const res = mockRes();

      await getInvoices(req, res);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 80, // (5-1) * 20
          take: 20,
        }),
      );
      expect(res.body.pagination.pages).toBe(5); // 100 / 20
    });
  });
});
