import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  whatsAppNotification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn()
  },
  documentEvent: {
    create: jest.fn(),
    createMany: jest.fn()
  },
  $transaction: jest.fn((callback) => callback(mockPrisma))
};

// Mock the entire db.js module
jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma,
  getPrismaClient: jest.fn().mockReturnValue(mockPrisma)
}));

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Import modules after mocking
const { updateDocumentStatus } = await import('../src/controllers/document-controller.js');

describe('Notification Center Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cuando RECEPCION marca documento como LISTO', () => {
    it('debe crear notificación PENDING automáticamente', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        status: 'EN_PROCESO',
        assignedToId: null,
        clientName: 'Juan Perez',
        clientPhone: '0987654321',
        protocolNumber: '2024P001'
      };

      const mockUpdatedDocument = {
        ...mockDocument,
        status: 'LISTO',
        verificationCode: '1234'
      };

      const mockNotification = {
        id: 'notif-456',
        documentId: 'doc-123',
        status: 'PENDING',
        clientPhone: '0987654321'
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);
      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(null); // No existe notificación previa
      mockPrisma.whatsAppNotification.create.mockResolvedValue(mockNotification);
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-789' });

      const req = {
        params: { id: 'doc-123' },
        body: { status: 'LISTO' },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await updateDocumentStatus(req, res);

      // Assert
      expect(mockPrisma.whatsAppNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc-123',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          messageType: 'DOCUMENTO_LISTO',
          status: 'PENDING',
          sentAt: null
        })
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            whatsapp: expect.objectContaining({
              notificationCreated: true,
              notificationId: 'notif-456'
            })
          })
        })
      );
    });

    it('no debe crear notificación duplicada si ya existe una PENDING', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        status: 'EN_PROCESO',
        assignedToId: null,
        clientName: 'Juan Perez',
        clientPhone: '0987654321',
        protocolNumber: '2024P001'
      };

      const mockUpdatedDocument = {
        ...mockDocument,
        status: 'LISTO',
        verificationCode: '1234'
      };

      const existingNotification = {
        id: 'notif-existing',
        documentId: 'doc-123',
        status: 'PENDING'
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);
      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(existingNotification);
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-789' });

      const req = {
        params: { id: 'doc-123' },
        body: { status: 'LISTO' },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await updateDocumentStatus(req, res);

      // Assert
      expect(mockPrisma.whatsAppNotification.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            whatsapp: expect.objectContaining({
              notificationCreated: false,
              notificationId: null
            })
          })
        })
      );
    });

    it('debe crear notificación incluso si el cliente no tiene teléfono', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        status: 'EN_PROCESO',
        assignedToId: null,
        clientName: 'Juan Perez',
        clientPhone: null,
        protocolNumber: '2024P001'
      };

      const mockUpdatedDocument = {
        ...mockDocument,
        status: 'LISTO',
        verificationCode: '1234'
      };

      const mockNotification = {
        id: 'notif-456',
        documentId: 'doc-123',
        status: 'PENDING',
        clientPhone: ''
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);
      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(null);
      mockPrisma.whatsAppNotification.create.mockResolvedValue(mockNotification);
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-789' });

      const req = {
        params: { id: 'doc-123' },
        body: { status: 'LISTO' },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await updateDocumentStatus(req, res);

      // Assert
      expect(mockPrisma.whatsAppNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc-123',
          clientPhone: '',
          status: 'PENDING'
        })
      });
    });

    it('no debe fallar la operación principal si falla la creación de notificación', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        status: 'EN_PROCESO',
        assignedToId: null,
        clientName: 'Juan Perez',
        clientPhone: '0987654321',
        protocolNumber: '2024P001'
      };

      const mockUpdatedDocument = {
        ...mockDocument,
        status: 'LISTO',
        verificationCode: '1234'
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);
      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(null);
      mockPrisma.whatsAppNotification.create.mockRejectedValue(new Error('DB Error'));
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-789' });

      const req = {
        params: { id: 'doc-123' },
        body: { status: 'LISTO' },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await updateDocumentStatus(req, res);

      // Assert - La operación debe completarse aunque falle la notificación
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            whatsapp: expect.objectContaining({
              notificationCreated: false,
              error: 'DB Error'
            })
          })
        })
      );
    });
  });

  describe('Cuando MATRIZADOR marca documento como LISTO', () => {
    it('debe crear notificación PENDING automáticamente', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-456',
        status: 'EN_PROCESO',
        assignedToId: 2,
        clientName: 'Maria Garcia',
        clientPhone: '0999999999',
        protocolNumber: '2024P002'
      };

      const mockUpdatedDocument = {
        ...mockDocument,
        status: 'LISTO',
        verificationCode: '5678'
      };

      const mockNotification = {
        id: 'notif-789',
        documentId: 'doc-456',
        status: 'PENDING'
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);
      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(null);
      mockPrisma.whatsAppNotification.create.mockResolvedValue(mockNotification);
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-001' });

      const req = {
        params: { id: 'doc-456' },
        body: { status: 'LISTO' },
        user: { id: 2, role: 'MATRIZADOR', firstName: 'Carlos', lastName: 'Ruiz' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await updateDocumentStatus(req, res);

      // Assert
      expect(mockPrisma.whatsAppNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId: 'doc-456',
          status: 'PENDING'
        })
      });
    });
  });

  describe('Cuando se marca como ENTREGADO', () => {
    it('no debe crear notificación', async () => {
      // Arrange
      const mockDocument = {
        id: 'doc-123',
        status: 'LISTO',
        assignedToId: null,
        clientName: 'Juan Perez',
        clientPhone: '0987654321'
      };

      const mockUpdatedDocument = {
        ...mockDocument,
        status: 'ENTREGADO'
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedDocument);
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-789' });

      const req = {
        params: { id: 'doc-123' },
        body: { status: 'ENTREGADO' },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await updateDocumentStatus(req, res);

      // Assert
      expect(mockPrisma.whatsAppNotification.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.whatsAppNotification.create).not.toHaveBeenCalled();
    });
  });
});
