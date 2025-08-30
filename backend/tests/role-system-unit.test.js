import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn()
  },
  document: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn()
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

// Mock the entire db.js module
jest.unstable_mockModule('../src/db.js', () => ({
  default: mockPrisma
}));

// Mock bcryptjs
jest.unstable_mockModule('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jsonwebtoken
jest.unstable_mockModule('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 1, role: 'ADMIN', email: 'admin@example.com' })
}));

// Import modules after mocking
const { getAllUsers, createUser, updateUser } = await import('../src/controllers/admin-controller.js');

describe('Role System Unit Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('User Filtering and Search Logic', () => {
    it('should build correct filter object for search queries', async () => {
      // Mock request and response objects
      const mockReq = {
        query: {
          search: 'john',
          role: 'CAJA',
          status: 'true',
          page: '1',
          limit: '10'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock database response
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 1,
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'CAJA',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLogin: null
        }
      ]);

      mockPrisma.user.count.mockResolvedValue(1);

      await getAllUsers(mockReq, mockRes);

      // Verify the findMany was called with correct filters
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } }
            ],
            role: 'CAJA',
            isActive: true
          })
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          })
        })
      );
    });

    it('should handle search without role and status filters', async () => {
      const mockReq = {
        query: {
          search: 'admin',
          page: '1',
          limit: '5'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await getAllUsers(mockReq, mockRes);

      // Should only have search filters, no role or status
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: 'admin', mode: 'insensitive' } },
              { lastName: { contains: 'admin', mode: 'insensitive' } },
              { email: { contains: 'admin', mode: 'insensitive' } }
            ]
          })
        })
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            role: expect.anything(),
            isActive: expect.anything()
          })
        })
      );
    });

    it('should apply pagination correctly', async () => {
      const mockReq = {
        query: {
          page: '2',
          limit: '5'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(15);

      await getAllUsers(mockReq, mockRes);

      // Verify pagination parameters
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5 = 5
          take: 5
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 2,
            limit: 5,
            total: 15,
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: true
          })
        })
      );
    });
  });

  describe('User Validation Logic', () => {
    it('should validate required fields during user creation', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com'
          // Missing required fields: password, firstName, lastName, role
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Todos los campos son obligatorios',
          required: expect.arrayContaining(['email', 'password', 'firstName', 'lastName', 'role'])
        })
      );
    });

    it('should validate email format', async () => {
      const mockReq = {
        body: {
          email: 'invalid-email',
          password: 'ValidPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CAJA'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email no válido'
        })
      );
    });

    it('should validate role values', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'INVALID_ROLE'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Rol no válido',
          validRoles: expect.arrayContaining(['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'])
        })
      );
    });

    it('should prevent duplicate email addresses', async () => {
      const mockReq = {
        body: {
          email: 'existing@example.com',
          password: 'ValidPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CAJA'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock existing user found
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'existing@example.com'
      });

      await createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Ya existe un usuario con este email'
        })
      );
    });
  });

  describe('User Update Logic', () => {
    it('should update only provided fields', async () => {
      const mockReq = {
        params: { id: '2' },
        body: {
          firstName: 'UpdatedName',
          role: 'MATRIZADOR'
          // email and lastName not provided - should not be updated
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock existing user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'user@example.com',
        firstName: 'OldName',
        lastName: 'Unchanged',
        role: 'CAJA'
      });

      // Mock updated user
      mockPrisma.user.update.mockResolvedValue({
        id: 2,
        email: 'user@example.com',
        firstName: 'UpdatedName',
        lastName: 'Unchanged',
        role: 'MATRIZADOR',
        isActive: true,
        updatedAt: new Date()
      });

      await updateUser(mockReq, mockRes);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          firstName: 'UpdatedName',
          role: 'MATRIZADOR'
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          updatedAt: true
        })
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Usuario actualizado exitosamente'
        })
      );
    });

    it('should reject updates with no changes', async () => {
      const mockReq = {
        params: { id: '2' },
        body: {}, // No fields provided for update
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      // Mock existing user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'user@example.com',
        firstName: 'Name',
        lastName: 'Last',
        role: 'CAJA'
      });

      await updateUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No hay cambios para actualizar'
        })
      );
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace from names', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: '  John  ',
          lastName: '  Doe  ',
          role: 'CAJA'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue({
        id: 2,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CAJA',
        isActive: true,
        createdAt: new Date()
      });

      await createUser(mockReq, mockRes);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'John', // Trimmed
            lastName: 'Doe' // Trimmed
          })
        })
      );
    });

    it('should convert email to lowercase', async () => {
      const mockReq = {
        body: {
          email: 'TEST@EXAMPLE.COM',
          password: 'ValidPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CAJA'
        },
        user: { id: 1, email: 'admin@example.com' }
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 2,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CAJA',
        isActive: true,
        createdAt: new Date()
      });

      await createUser(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' } // Lowercase
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com' // Lowercase
          })
        })
      );
    });
  });
});

console.log('✅ Role System Unit Tests - Test structure is valid and ready to run with actual database');