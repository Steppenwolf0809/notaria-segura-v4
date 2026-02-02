import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
    importLog: {
        create: jest.fn(),
        update: jest.fn()
    },
    invoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn()
    },
    payment: {
        findFirst: jest.fn(),
        create: jest.fn()
    },
    document: {
        update: jest.fn()
    },
    $transaction: jest.fn()
};

// Mock the entire db.js module
jest.unstable_mockModule('../src/db.js', () => ({
    default: mockPrisma,
    db: mockPrisma
}));

// Mock xml-koinor-parser
jest.unstable_mockModule('../src/services/xml-koinor-parser.js', () => ({
    parseKoinorXML: jest.fn()
}));

// Import modules after mocking
const { importKoinorXMLFile } = await import('../src/services/import-koinor-xml-service.js');
const { parseKoinorXML } = await import('../src/services/xml-koinor-parser.js');

describe('Módulo Caja - Tests Unitarios', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    describe('Ingreso Exitoso - Crear movimiento de caja (pago)', () => {
        it('debe crear un pago correctamente cuando la factura existe', async () => {
            // Arrange
            const mockInvoice = {
                id: 'invoice-123',
                invoiceNumberRaw: '001002-00123341',
                totalAmount: 100,
                paidAmount: 0,
                status: 'PENDING',
                documentId: 'doc-123'
            };

            const mockPaymentData = {
                receiptNumber: '001-2601000305',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123341',
                    amount: 50
                }]
            };

            // Mock responses
            mockPrisma.importLog.create.mockResolvedValue({ id: 'log-123' });
            parseKoinorXML.mockResolvedValue({
                payments: [mockPaymentData],
                notasCredito: [],
                summary: {
                    totalTransactions: 1,
                    paymentsFound: 1,
                    notasCreditoFound: 0,
                    errors: 0
                }
            });
            mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
            mockPrisma.payment.findFirst.mockResolvedValue(null); // No existe pago previo
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });
            mockPrisma.payment.create.mockResolvedValue({ id: 'payment-123' });
            mockPrisma.invoice.update.mockResolvedValue({ ...mockInvoice, paidAmount: 50 });
            mockPrisma.importLog.update.mockResolvedValue({ id: 'log-123' });

            // Act
            const result = await importKoinorXMLFile(
                Buffer.from('mock xml'),
                'test.xml',
                1
            );

            // Assert
            expect(result.success).toBe(true);
            expect(result.stats.paymentsCreated).toBe(1);
            expect(mockPrisma.payment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    receiptNumber: '001-2601000305',
                    amount: 50,
                    invoiceId: 'invoice-123'
                })
            });
            expect(mockPrisma.invoice.update).toHaveBeenCalled();
        });
    });

    describe('Validación - Intentar registrar monto negativo o cero', () => {
        it('debe fallar al intentar crear un pago con monto cero', async () => {
            // Arrange
            const mockInvoice = {
                id: 'invoice-123',
                invoiceNumberRaw: '001002-00123341',
                totalAmount: 100,
                paidAmount: 0,
                status: 'PENDING'
            };

            const mockPaymentData = {
                receiptNumber: '001-2601000305',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123341',
                    amount: 0 // Monto inválido
                }]
            };

            mockPrisma.importLog.create.mockResolvedValue({ id: 'log-123' });
            parseKoinorXML.mockResolvedValue({
                payments: [mockPaymentData],
                notasCredito: [],
                summary: { totalTransactions: 1, paymentsFound: 1 }
            });
            mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
            mockPrisma.importLog.update.mockResolvedValue({ id: 'log-123' });

            // Act
            const result = await importKoinorXMLFile(
                Buffer.from('mock xml'),
                'test.xml',
                1
            );

            // Assert
            expect(result.stats.errors).toBeGreaterThan(0);
            expect(result.stats.paymentsCreated).toBe(0);
            expect(mockPrisma.payment.create).not.toHaveBeenCalled();
        });

        it('debe fallar al intentar crear un pago con monto negativo', async () => {
            // Arrange
            const mockInvoice = {
                id: 'invoice-123',
                invoiceNumberRaw: '001002-00123341',
                totalAmount: 100,
                paidAmount: 0,
                status: 'PENDING'
            };

            const mockPaymentData = {
                receiptNumber: '001-2601000305',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123341',
                    amount: -50 // Monto negativo
                }]
            };

            mockPrisma.importLog.create.mockResolvedValue({ id: 'log-123' });
            parseKoinorXML.mockResolvedValue({
                payments: [mockPaymentData],
                notasCredito: [],
                summary: { totalTransactions: 1, paymentsFound: 1 }
            });
            mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
            mockPrisma.importLog.update.mockResolvedValue({ id: 'log-123' });

            // Act
            const result = await importKoinorXMLFile(
                Buffer.from('mock xml'),
                'test.xml',
                1
            );

            // Assert
            expect(result.stats.errors).toBeGreaterThan(0);
            expect(result.stats.paymentsCreated).toBe(0);
            expect(mockPrisma.payment.create).not.toHaveBeenCalled();
        });
    });

    describe('Integridad - Verificar asociación al usuario (cajero) correcto', () => {
        it('debe asociar el movimiento al usuario ejecutor (cajero)', async () => {
            // Arrange
            const userId = 42; // ID del cajero
            const mockInvoice = {
                id: 'invoice-123',
                invoiceNumberRaw: '001002-00123341',
                totalAmount: 100,
                paidAmount: 0,
                status: 'PENDING'
            };

            const mockPaymentData = {
                receiptNumber: '001-2601000305',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123341',
                    amount: 50
                }]
            };

            mockPrisma.importLog.create.mockResolvedValue({ id: 'log-123' });
            parseKoinorXML.mockResolvedValue({
                payments: [mockPaymentData],
                notasCredito: [],
                summary: { totalTransactions: 1, paymentsFound: 1 }
            });
            mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
            mockPrisma.payment.findFirst.mockResolvedValue(null);
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });
            mockPrisma.payment.create.mockResolvedValue({ id: 'payment-123' });
            mockPrisma.invoice.update.mockResolvedValue({ ...mockInvoice, paidAmount: 50 });
            mockPrisma.importLog.update.mockResolvedValue({ id: 'log-123' });

            // Act
            await importKoinorXMLFile(
                Buffer.from('mock xml'),
                'test.xml',
                userId
            );

            // Assert
            expect(mockPrisma.importLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    executedBy: userId
                })
            });
        });
    });

    describe('Cierre de Caja - Verificar que los totales coincidan', () => {
        it('debe calcular correctamente los totales al finalizar la importación', async () => {
            // Arrange
            const mockInvoice1 = {
                id: 'invoice-1',
                invoiceNumberRaw: '001002-00123341',
                totalAmount: 100,
                paidAmount: 0,
                status: 'PENDING'
            };

            const mockInvoice2 = {
                id: 'invoice-2',
                invoiceNumberRaw: '001002-00123342',
                totalAmount: 200,
                paidAmount: 0,
                status: 'PENDING'
            };

            const mockPaymentData1 = {
                receiptNumber: '001-2601000305',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123341',
                    amount: 50
                }]
            };

            const mockPaymentData2 = {
                receiptNumber: '001-2601000306',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123342',
                    amount: 100
                }]
            };

            mockPrisma.importLog.create.mockResolvedValue({ id: 'log-123' });
            parseKoinorXML.mockResolvedValue({
                payments: [mockPaymentData1, mockPaymentData2],
                notasCredito: [],
                summary: { totalTransactions: 2, paymentsFound: 2 }
            });
            
            // Mock para ambas facturas
            mockPrisma.invoice.findFirst
                .mockResolvedValueOnce(mockInvoice1)
                .mockResolvedValueOnce(mockInvoice2);
            
            mockPrisma.payment.findFirst.mockResolvedValue(null);
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });
            mockPrisma.payment.create.mockResolvedValue({ id: 'payment-123' });
            mockPrisma.invoice.update.mockResolvedValue({});
            mockPrisma.importLog.update.mockResolvedValue({ id: 'log-123' });

            // Act
            const result = await importKoinorXMLFile(
                Buffer.from('mock xml'),
                'test.xml',
                1
            );

            // Assert
            expect(result.success).toBe(true);
            expect(result.stats.paymentsCreated).toBe(2);
            expect(mockPrisma.importLog.update).toHaveBeenCalledWith({
                where: { id: 'log-123' },
                data: expect.objectContaining({
                    paymentsCreated: 2,
                    status: 'COMPLETED'
                })
            });
        });

        it('debe manejar errores parciales y reportar totales correctos', async () => {
            // Arrange
            const mockInvoice = {
                id: 'invoice-123',
                invoiceNumberRaw: '001002-00123341',
                totalAmount: 100,
                paidAmount: 0,
                status: 'PENDING'
            };

            const mockPaymentValid = {
                receiptNumber: '001-2601000305',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123341',
                    amount: 50
                }]
            };

            const mockPaymentInvalid = {
                receiptNumber: '001-2601000306',
                clientTaxId: '1234567890',
                clientName: 'Cliente Test',
                paymentDate: new Date('2026-01-20'),
                type: 'AB',
                details: [{
                    invoiceNumberRaw: '001002-00123342',
                    amount: 0 // Monto inválido
                }]
            };

            mockPrisma.importLog.create.mockResolvedValue({ id: 'log-123' });
            parseKoinorXML.mockResolvedValue({
                payments: [mockPaymentValid, mockPaymentInvalid],
                notasCredito: [],
                summary: { totalTransactions: 2, paymentsFound: 2 }
            });
            
            mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
            mockPrisma.payment.findFirst.mockResolvedValue(null);
            mockPrisma.$transaction.mockImplementation(async (callback) => {
                return await callback(mockPrisma);
            });
            mockPrisma.payment.create.mockResolvedValue({ id: 'payment-123' });
            mockPrisma.invoice.update.mockResolvedValue({});
            mockPrisma.importLog.update.mockResolvedValue({ id: 'log-123' });

            // Act
            const result = await importKoinorXMLFile(
                Buffer.from('mock xml'),
                'test.xml',
                1
            );

            // Assert
            expect(result.success).toBe(true);
            expect(result.stats.paymentsCreated).toBe(1);
            expect(result.stats.errors).toBe(1);
            expect(mockPrisma.importLog.update).toHaveBeenCalledWith({
                where: { id: 'log-123' },
                data: expect.objectContaining({
                    paymentsCreated: 1,
                    errors: 1,
                    status: 'COMPLETED_WITH_ERRORS'
                })
            });
        });
    });
});
