import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
  document: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  whatsAppNotification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  documentEvent: {
    create: jest.fn()
  }
};

// Mock the entire db.js module
jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma
}));

// Mock CodigoRetiroService
jest.unstable_mockModule('../src/utils/codigo-retiro.js', () => ({
  default: {
    generarUnico: jest.fn().mockResolvedValue('ABC123')
  }
}));

// Mock plantillas
jest.unstable_mockModule('../src/controllers/admin-whatsapp-templates-controller.js', () => ({
  getActiveTemplateByType: jest.fn().mockResolvedValue({
    mensaje: 'Hola {nombreCompareciente}, su código es {codigo}'
  })
}));

// Import modules after mocking
const { bulkNotify } = await import('../src/controllers/document-controller.js');

describe('Notification Consolidation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cuando un cliente tiene múltiples documentos LISTO', () => {
    it('debe consolidar todos los documentos LISTO del cliente en una sola notificación', async () => {
      // Arrange
      // Documentos seleccionados por el usuario (solo 1)
      const selectedDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          clientId: '1234567890',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        }
      ];

      // Todos los documentos LISTO del cliente (incluyendo el seleccionado + 2 más)
      const allClientDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          clientId: '1234567890',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        },
        {
          id: 'doc-2',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          clientId: '1234567890',
          protocolNumber: '2024P002',
          documentType: 'Poder'
        },
        {
          id: 'doc-3',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          clientId: '1234567890',
          protocolNumber: '2024P003',
          documentType: 'Contrato'
        }
      ];

      mockPrisma.document.findMany
        .mockResolvedValueOnce(selectedDocs) // Primera llamada: documentos seleccionados
        .mockResolvedValueOnce(allClientDocs); // Segunda llamada: todos los del cliente

      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(null);
      mockPrisma.document.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.whatsAppNotification.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-1' });
      mockPrisma.whatsAppNotification.create.mockResolvedValue({ id: 'notif-1' });

      const req = {
        body: {
          documentIds: ['doc-1'],
          sendWhatsApp: true
        },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await bulkNotify(req, res);

      // Assert
      // Debe actualizar los 3 documentos con el mismo código
      expect(mockPrisma.document.updateMany).toHaveBeenCalledWith({
        where: { id: { in: expect.arrayContaining(['doc-1', 'doc-2', 'doc-3']) } },
        data: expect.objectContaining({
          codigoRetiro: 'ABC123'
        })
      });

      // Debe crear notificaciones para los 3 documentos
      expect(mockPrisma.whatsAppNotification.create).toHaveBeenCalledTimes(3);

      // La respuesta debe incluir información de consolidación
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            consolidacion: expect.objectContaining({
              documentosSeleccionados: 1,
              documentosTotales: 3,
              documentosAdicionales: 2
            })
          })
        })
      );
    });

    it('debe actualizar notificaciones PENDING existentes a PREPARED', async () => {
      // Arrange
      const selectedDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        }
      ];

      const allClientDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        },
        {
          id: 'doc-2',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P002',
          documentType: 'Poder'
        }
      ];

      mockPrisma.document.findMany
        .mockResolvedValueOnce(selectedDocs)
        .mockResolvedValueOnce(allClientDocs);

      // Simular que doc-2 ya tiene notificación PENDING
      mockPrisma.whatsAppNotification.findFirst
        .mockResolvedValueOnce(null) // doc-1 no tiene PREPARED/SENT
        .mockResolvedValueOnce({ id: 'notif-existing', status: 'PREPARED' }); // doc-2 ya tiene

      mockPrisma.document.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.whatsAppNotification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-1' });
      mockPrisma.whatsAppNotification.create.mockResolvedValue({ id: 'notif-new' });

      const req = {
        body: {
          documentIds: ['doc-1'],
          sendWhatsApp: true
        },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await bulkNotify(req, res);

      // Assert
      // Debe actualizar notificaciones PENDING a PREPARED
      expect(mockPrisma.whatsAppNotification.updateMany).toHaveBeenCalledWith({
        where: {
          documentId: { in: expect.arrayContaining(['doc-1', 'doc-2']) },
          status: 'PENDING',
          messageType: 'DOCUMENTO_LISTO'
        },
        data: expect.objectContaining({
          status: 'PREPARED'
        })
      });

      // No debe crear notificación para doc-2 porque ya tiene PREPARED
      expect(mockPrisma.whatsAppNotification.create).toHaveBeenCalledTimes(1);
    });

    it('debe incluir documentos de EN_PROCESO si fueron seleccionados', async () => {
      // Arrange
      const selectedDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        },
        {
          id: 'doc-en-proceso',
          status: 'EN_PROCESO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P002',
          documentType: 'Poder'
        }
      ];

      // Solo el LISTO se incluye en la búsqueda de todos los documentos del cliente
      const allClientDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        }
      ];

      mockPrisma.document.findMany
        .mockResolvedValueOnce(selectedDocs)
        .mockResolvedValueOnce(allClientDocs);

      mockPrisma.whatsAppNotification.findFirst.mockResolvedValue(null);
      mockPrisma.document.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.whatsAppNotification.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.documentEvent.create.mockResolvedValue({ id: 'event-1' });
      mockPrisma.whatsAppNotification.create.mockResolvedValue({ id: 'notif-1' });

      const req = {
        body: {
          documentIds: ['doc-1', 'doc-en-proceso'],
          sendWhatsApp: true
        },
        user: { id: 1, role: 'RECEPCION', firstName: 'Ana', lastName: 'Lopez' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await bulkNotify(req, res);

      // Assert
      // Debe incluir ambos documentos en la actualización
      expect(mockPrisma.document.updateMany).toHaveBeenCalledWith({
        where: { id: { in: expect.arrayContaining(['doc-1', 'doc-en-proceso']) } },
        data: expect.any(Object)
      });
    });
  });

  describe('Seguridad y permisos', () => {
    it('debe filtrar por assignedToId cuando el usuario es MATRIZADOR', async () => {
      // Arrange
      const selectedDocs = [
        {
          id: 'doc-1',
          status: 'LISTO',
          clientName: 'Juan Perez',
          clientPhone: '0987654321',
          protocolNumber: '2024P001',
          documentType: 'Escritura'
        }
      ];

      mockPrisma.document.findMany
        .mockResolvedValueOnce(selectedDocs) // Primera llamada: documentos seleccionados
        .mockResolvedValueOnce([]); // Segunda llamada: búsqueda con filtro

      const req = {
        body: { documentIds: ['doc-1'] },
        user: { id: 5, role: 'MATRIZADOR', firstName: 'Carlos', lastName: 'Ruiz' }
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Act
      await bulkNotify(req, res);

      // Assert
      // La segunda llamada (búsqueda de documentos del cliente) debe incluir filtro por assignedToId
      expect(mockPrisma.document.findMany).toHaveBeenCalledTimes(2);
      const secondCall = mockPrisma.document.findMany.mock.calls[1];
      expect(secondCall[0].where).toMatchObject({
        assignedToId: 5
      });
    });
  });
});
