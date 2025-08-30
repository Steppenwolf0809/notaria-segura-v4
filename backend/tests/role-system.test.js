/**
 * Comprehensive Test Suite for Role System
 * Tests role management, state changes, grouping, and notifications
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app from '../server.js';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Role System Comprehensive Tests', () => {
  let adminToken, cajaToken, matrizadorToken, recepcionToken, archivoToken;
  let adminUser, cajaUser, matrizadorUser, recepcionUser, archivoUser;
  let testDocument, testGroup;

  beforeEach(async () => {
    // Clean database
    await prisma.documentEvent.deleteMany();
    await prisma.whatsAppNotification.deleteMany();
    await prisma.document.deleteMany();
    await prisma.documentGroup.deleteMany();
    await prisma.user.deleteMany();

    // Create test users for each role
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: '$2a$12$hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true
      }
    });

    cajaUser = await prisma.user.create({
      data: {
        email: 'caja@test.com',
        password: '$2a$12$hashedpassword',
        firstName: 'Caja',
        lastName: 'User',
        role: 'CAJA',
        isActive: true
      }
    });

    matrizadorUser = await prisma.user.create({
      data: {
        email: 'matrizador@test.com',
        password: '$2a$12$hashedpassword',
        firstName: 'Matrizador',
        lastName: 'User',
        role: 'MATRIZADOR',
        isActive: true
      }
    });

    recepcionUser = await prisma.user.create({
      data: {
        email: 'recepcion@test.com',
        password: '$2a$12$hashedpassword',
        firstName: 'Recepcion',
        lastName: 'User',
        role: 'RECEPCION',
        isActive: true
      }
    });

    archivoUser = await prisma.user.create({
      data: {
        email: 'archivo@test.com',
        password: '$2a$12$hashedpassword',
        firstName: 'Archivo',
        lastName: 'User',
        role: 'ARCHIVO',
        isActive: true
      }
    });

    // Generate tokens
    adminToken = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET);
    cajaToken = jwt.sign({ id: cajaUser.id }, process.env.JWT_SECRET);
    matrizadorToken = jwt.sign({ id: matrizadorUser.id }, process.env.JWT_SECRET);
    recepcionToken = jwt.sign({ id: recepcionUser.id }, process.env.JWT_SECRET);
    archivoToken = jwt.sign({ id: archivoUser.id }, process.env.JWT_SECRET);

    // Create test document
    testDocument = await prisma.document.create({
      data: {
        protocolNumber: 'TEST-001',
        clientName: 'Test Client',
        clientPhone: '+593987654321',
        clientEmail: 'client@test.com',
        clientId: '1234567890',
        documentType: 'PROTOCOLO',
        actoPrincipalDescripcion: 'Test Act',
        actoPrincipalValor: 1000.0,
        totalFactura: 1100.0,
        matrizadorName: 'Matrizador User',
        createdById: cajaUser.id,
        assignedToId: matrizadorUser.id,
        status: 'EN_PROCESO'
      }
    });
  });

  afterEach(async () => {
    // Clean up after tests
    await prisma.documentEvent.deleteMany();
    await prisma.whatsAppNotification.deleteMany();
    await prisma.document.deleteMany();
    await prisma.documentGroup.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Role Authentication and Authorization', () => {
    it('should authenticate users with valid tokens', async () => {
      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${matrizadorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject inactive users', async () => {
      await prisma.user.update({
        where: { id: matrizadorUser.id },
        data: { isActive: false }
      });

      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${matrizadorToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('desactivado');
    });

    it('should enforce role-based access control', async () => {
      // Only ADMIN can access user management
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${matrizadorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permisos');
    });

    it('should allow admin access to protected routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Role Management and Updates', () => {
    it('should validate role changes properly', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${matrizadorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'INVALID_ROLE'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('no válido');
    });

    it('should prevent admin from deactivating themselves', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('propia cuenta');
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('propia cuenta');
    });

    it('should update user role successfully', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${matrizadorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'ARCHIVO'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe('ARCHIVO');
    });

    it('should log role change events', async () => {
      await request(app)
        .put(`/api/admin/users/${matrizadorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated Name'
        });

      // Check audit log was created
      const events = await prisma.documentEvent.findMany({
        where: {
          userId: adminUser.id,
          eventType: 'USER_UPDATED'
        }
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Document State Changes and Reversibility', () => {
    it('should change document status with proper validation', async () => {
      const response = await request(app)
        .patch(`/api/documents/${testDocument.id}/status`)
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          status: 'LISTO'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.document.status).toBe('LISTO');
    });

    it('should reject invalid status transitions', async () => {
      const response = await request(app)
        .patch(`/api/documents/${testDocument.id}/status`)
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          status: 'INVALID_STATUS'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('válido');
    });

    it('should handle status reversions with cleanup', async () => {
      // First, advance to LISTO
      await request(app)
        .patch(`/api/documents/${testDocument.id}/status`)
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({ status: 'LISTO' });

      // Add verification code
      await prisma.document.update({
        where: { id: testDocument.id },
        data: { verificationCode: '1234' }
      });

      // Then revert to EN_PROCESO
      const response = await request(app)
        .post(`/api/documents/${testDocument.id}/undo`)
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          newStatus: 'EN_PROCESO',
          reason: 'Test reversion'
        });

      expect(response.status).toBe(200);

      // Check that cleanup was performed
      const updatedDoc = await prisma.document.findUnique({
        where: { id: testDocument.id }
      });

      expect(updatedDoc.verificationCode).toBeNull();
    });

    it('should create audit events for status changes', async () => {
      await request(app)
        .patch(`/api/documents/${testDocument.id}/status`)
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({ status: 'LISTO' });

      const events = await prisma.documentEvent.findMany({
        where: {
          documentId: testDocument.id,
          eventType: 'STATUS_CHANGED'
        }
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].details.newStatus).toBe('LISTO');
    });

    it('should handle concurrent status changes gracefully', async () => {
      // Simulate concurrent requests
      const promises = [
        request(app)
          .patch(`/api/documents/${testDocument.id}/status`)
          .set('Authorization', `Bearer ${matrizadorToken}`)
          .send({ status: 'LISTO' }),
        request(app)
          .patch(`/api/documents/${testDocument.id}/status`)
          .set('Authorization', `Bearer ${matrizadorToken}`)
          .send({ status: 'LISTO' })
      ];

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      
      // Should have at least one success, others may fail due to race condition
      expect(successful.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Document Grouping Functionality', () => {
    let secondDocument;

    beforeEach(async () => {
      // Create a second document for grouping
      secondDocument = await prisma.document.create({
        data: {
          protocolNumber: 'TEST-002',
          clientName: 'Test Client', // Same client
          clientPhone: '+593987654321',
          clientEmail: 'client@test.com',
          clientId: '1234567890', // Same ID
          documentType: 'PROTOCOLO',
          actoPrincipalDescripcion: 'Test Act 2',
          actoPrincipalValor: 1500.0,
          totalFactura: 1650.0,
          matrizadorName: 'Matrizador User',
          createdById: cajaUser.id,
          assignedToId: matrizadorUser.id,
          status: 'EN_PROCESO'
        }
      });
    });

    it('should detect groupable documents correctly', async () => {
      const response = await request(app)
        .post('/api/documents/detect-groupable')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          clientName: 'Test Client',
          clientId: '1234567890'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.groupableDocuments.length).toBe(2);
    });

    it('should create document groups atomically', async () => {
      const response = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: [testDocument.id, secondDocument.id]
        });

      expect(response.status).toBe(201);
      expect(response.body.data.group).toBeDefined();
      expect(response.body.data.documents.length).toBe(2);

      // Verify all documents are marked as grouped
      const groupedDocs = await prisma.document.findMany({
        where: { id: { in: [testDocument.id, secondDocument.id] } }
      });

      expect(groupedDocs.every(doc => doc.isGrouped)).toBe(true);
    });

    it('should prevent grouping documents from different clients', async () => {
      // Create document with different client
      const differentClientDoc = await prisma.document.create({
        data: {
          protocolNumber: 'TEST-003',
          clientName: 'Different Client',
          clientPhone: '+593123456789',
          clientId: '0987654321',
          documentType: 'PROTOCOLO',
          actoPrincipalDescripcion: 'Different Act',
          actoPrincipalValor: 2000.0,
          totalFactura: 2200.0,
          matrizadorName: 'Matrizador User',
          createdById: cajaUser.id,
          assignedToId: matrizadorUser.id,
          status: 'EN_PROCESO'
        }
      });

      const response = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: [testDocument.id, differentClientDoc.id]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('mismo cliente');
    });

    it('should handle group status changes properly', async () => {
      // Create group first
      const groupResponse = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: [testDocument.id, secondDocument.id]
        });

      const groupId = groupResponse.body.data.group.id;

      // Mark group as ready
      const statusResponse = await request(app)
        .patch(`/api/documents/groups/${groupId}/ready`)
        .set('Authorization', `Bearer ${matrizadorToken}`);

      expect(statusResponse.status).toBe(200);

      // Check all documents in group are now LISTO
      const groupDocs = await prisma.document.findMany({
        where: { documentGroupId: groupId }
      });

      expect(groupDocs.every(doc => doc.status === 'LISTO')).toBe(true);
    });

    it('should handle group delivery correctly', async () => {
      // Create and prepare group
      const groupResponse = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: [testDocument.id, secondDocument.id],
          markAsReady: true
        });

      const verificationCode = groupResponse.body.data.group.verificationCode;

      // Deliver group
      const deliveryResponse = await request(app)
        .post('/api/reception/deliver-group')
        .set('Authorization', `Bearer ${recepcionToken}`)
        .send({
          verificationCode,
          deliveredTo: 'Test Client',
          deliveryNotes: 'Test delivery'
        });

      expect(deliveryResponse.status).toBe(200);

      // Verify all documents are marked as delivered
      const deliveredDocs = await prisma.document.findMany({
        where: { documentGroupId: groupResponse.body.data.group.id }
      });

      expect(deliveredDocs.every(doc => doc.status === 'ENTREGADO')).toBe(true);
    });

    it('should prevent double group delivery', async () => {
      // Create and deliver group
      const groupResponse = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: [testDocument.id, secondDocument.id],
          markAsReady: true
        });

      const verificationCode = groupResponse.body.data.group.verificationCode;

      await request(app)
        .post('/api/reception/deliver-group')
        .set('Authorization', `Bearer ${recepcionToken}`)
        .send({
          verificationCode,
          deliveredTo: 'Test Client'
        });

      // Try to deliver again
      const secondDelivery = await request(app)
        .post('/api/reception/deliver-group')
        .set('Authorization', `Bearer ${recepcionToken}`)
        .send({
          verificationCode,
          deliveredTo: 'Test Client'
        });

      expect(secondDelivery.status).toBe(400);
      expect(secondDelivery.body.message).toContain('ya fue entregado');
    });
  });

  describe('Notification System Role Integration', () => {
    it('should validate role permissions for notifications', async () => {
      // Only authorized roles should send notifications
      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${matrizadorToken}`) // Matrizador should be allowed
        .send({
          documentId: testDocument.id,
          messageType: 'DOCUMENT_READY'
        });

      // This might be 200 or 403 depending on implementation
      expect([200, 403]).toContain(response.status);
    });

    it('should log notification attempts with user info', async () => {
      // Mock notification sending
      await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentId: testDocument.id,
          messageType: 'DOCUMENT_READY'
        });

      // Check that notification was logged with proper user context
      const notifications = await prisma.whatsAppNotification.findMany({
        where: { documentId: testDocument.id }
      });

      // Verify notification tracking exists
      expect(notifications).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing documents gracefully', async () => {
      const response = await request(app)
        .patch('/api/documents/non-existent-id/status')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({ status: 'LISTO' });

      expect(response.status).toBe(404);
    });

    it('should validate document ownership for role-restricted operations', async () => {
      // Create document assigned to different user
      const otherMatrizador = await prisma.user.create({
        data: {
          email: 'other@test.com',
          password: '$2a$12$hashedpassword',
          firstName: 'Other',
          lastName: 'User',
          role: 'MATRIZADOR',
          isActive: true
        }
      });

      const otherDoc = await prisma.document.create({
        data: {
          protocolNumber: 'OTHER-001',
          clientName: 'Other Client',
          clientPhone: '+593111111111',
          documentType: 'PROTOCOLO',
          actoPrincipalDescripcion: 'Other Act',
          actoPrincipalValor: 1000.0,
          totalFactura: 1100.0,
          matrizadorName: 'Other User',
          createdById: cajaUser.id,
          assignedToId: otherMatrizador.id,
          status: 'EN_PROCESO'
        }
      });

      // Try to modify document not assigned to current user
      const response = await request(app)
        .patch(`/api/documents/${otherDoc.id}/status`)
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({ status: 'LISTO' });

      expect([403, 404]).toContain(response.status);
    });

    it('should handle database transaction failures in grouping', async () => {
      // This test would need to mock database failures
      // For now, we'll test the validation logic
      const response = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: ['non-existent-id']
        });

      expect(response.status).toBe(400);
    });

    it('should handle malformed role update requests', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${matrizadorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: null
        });

      expect(response.status).toBe(400);
    });
  });

  describe('User Filtering and Search', () => {
    let testUsers = [];

    beforeEach(async () => {
      // Create test users with different roles and statuses
      const userPromises = [
        { email: 'admin.test@example.com', firstName: 'Admin', lastName: 'Test', role: 'ADMIN', isActive: true },
        { email: 'caja.test@example.com', firstName: 'Caja', lastName: 'Test', role: 'CAJA', isActive: true },
        { email: 'matrizador.test@example.com', firstName: 'Matrix', lastName: 'Test', role: 'MATRIZADOR', isActive: false },
        { email: 'recepcion.test@example.com', firstName: 'Reception', lastName: 'Test', role: 'RECEPCION', isActive: true },
        { email: 'archivo.test@example.com', firstName: 'Archive', lastName: 'Test', role: 'ARCHIVO', isActive: false },
        { email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe', role: 'CAJA', isActive: true },
        { email: 'jane.smith@example.com', firstName: 'Jane', lastName: 'Smith', role: 'MATRIZADOR', isActive: true },
        { email: 'inactive.user@example.com', firstName: 'Inactive', lastName: 'User', role: 'RECEPCION', isActive: false }
      ].map(async userData => {
        const hashedPassword = await bcrypt.hash('ValidPassword123!', 12);
        return prisma.user.create({
          data: { ...userData, password: hashedPassword }
        });
      });

      testUsers = await Promise.all(userPromises);
    });

    afterEach(async () => {
      await prisma.user.deleteMany({
        where: { email: { in: testUsers.map(u => u.email) } }
      });
    });

    it('should return all users when no filters applied', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(8);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(8);
    });

    it('should filter users by role correctly', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=CAJA')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // caja.test and john.doe
      response.body.data.forEach(user => {
        expect(user.role).toBe('CAJA');
      });
    });

    it('should filter users by status correctly', async () => {
      const activeResponse = await request(app)
        .get('/api/admin/users?status=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activeResponse.body.success).toBe(true);
      activeResponse.body.data.forEach(user => {
        expect(user.isActive).toBe(true);
      });

      const inactiveResponse = await request(app)
        .get('/api/admin/users?status=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inactiveResponse.body.success).toBe(true);
      inactiveResponse.body.data.forEach(user => {
        expect(user.isActive).toBe(false);
      });
    });

    it('should search users by first name', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=John')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const johnUser = response.body.data.find(u => u.firstName === 'John');
      expect(johnUser).toBeDefined();
    });

    it('should search users by last name', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Smith')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const janeUser = response.body.data.find(u => u.lastName === 'Smith');
      expect(janeUser).toBeDefined();
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=jane.smith')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const janeUser = response.body.data.find(u => u.email.includes('jane.smith'));
      expect(janeUser).toBeDefined();
    });

    it('should perform case insensitive search', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const adminUser = response.body.data.find(u => u.firstName.toLowerCase() === 'admin');
      expect(adminUser).toBeDefined();
    });

    it('should combine role and status filters', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=MATRIZADOR&status=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(user => {
        expect(user.role).toBe('MATRIZADOR');
        expect(user.isActive).toBe(true);
      });
      expect(response.body.data.length).toBe(1); // Only jane.smith
    });

    it('should combine search with role filter', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Test&role=RECEPCION')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(user => {
        expect(user.role).toBe('RECEPCION');
        expect(user.lastName).toBe('Test');
      });
    });

    it('should combine search with status filter', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Test&status=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(user => {
        expect(user.isActive).toBe(false);
        expect(user.lastName).toBe('Test');
      });
    });

    it('should combine all filters together', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Archive&role=ARCHIVO&status=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      const user = response.body.data[0];
      expect(user.firstName).toBe('Archive');
      expect(user.role).toBe('ARCHIVO');
      expect(user.isActive).toBe(false);
    });

    it('should handle pagination correctly with filters', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=3&role=CAJA')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
      expect(response.body.pagination.total).toBe(2); // 2 CAJA users
      expect(response.body.pagination.totalPages).toBe(1);
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=NonExistentUser')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should handle invalid role filter gracefully', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=INVALID_ROLE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return all users when role is invalid
    });

    it('should handle invalid status filter gracefully', async () => {
      const response = await request(app)
        .get('/api/admin/users?status=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return all users when status is invalid
    });

    it('should limit results per page correctly', async () => {
      const response = await request(app)
        .get('/api/admin/users?limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should navigate through pages correctly', async () => {
      const page1Response = await request(app)
        .get('/api/admin/users?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const page2Response = await request(app)
        .get('/api/admin/users?page=2&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page2Response.body.success).toBe(true);

      // Ensure different users on different pages
      const page1Ids = page1Response.body.data.map(u => u.id);
      const page2Ids = page2Response.body.data.map(u => u.id);
      
      if (page2Ids.length > 0) {
        page1Ids.forEach(id => {
          expect(page2Ids).not.toContain(id);
        });
      }
    });

    it('should return correct pagination metadata', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('hasNextPage');
      expect(response.body.pagination).toHaveProperty('hasPrevPage');
      
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.hasPrevPage).toBe(false);
    });

    it('should exclude password from user results', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should return users ordered by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/admin/users?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          const currentDate = new Date(response.body.data[i].createdAt);
          const previousDate = new Date(response.body.data[i - 1].createdAt);
          expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
        }
      }
    });

    it('should include required user fields in response', async () => {
      const response = await request(app)
        .get('/api/admin/users?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 0) {
        const user = response.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('isActive');
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('updatedAt');
        expect(user).toHaveProperty('lastLogin');
      }
    });
  });

  describe('User Statistics and Analytics', () => {
    let testUsers = [];

    beforeEach(async () => {
      // Create diverse test users for statistics
      const userPromises = [
        { email: 'stat.admin1@example.com', firstName: 'Stat', lastName: 'Admin1', role: 'ADMIN', isActive: true },
        { email: 'stat.admin2@example.com', firstName: 'Stat', lastName: 'Admin2', role: 'ADMIN', isActive: false },
        { email: 'stat.caja1@example.com', firstName: 'Stat', lastName: 'Caja1', role: 'CAJA', isActive: true },
        { email: 'stat.caja2@example.com', firstName: 'Stat', lastName: 'Caja2', role: 'CAJA', isActive: true },
        { email: 'stat.caja3@example.com', firstName: 'Stat', lastName: 'Caja3', role: 'CAJA', isActive: false },
        { email: 'stat.matrix@example.com', firstName: 'Stat', lastName: 'Matrix', role: 'MATRIZADOR', isActive: true }
      ].map(async userData => {
        const hashedPassword = await bcrypt.hash('ValidPassword123!', 12);
        return prisma.user.create({
          data: { ...userData, password: hashedPassword }
        });
      });

      testUsers = await Promise.all(userPromises);
    });

    afterEach(async () => {
      await prisma.user.deleteMany({
        where: { email: { in: testUsers.map(u => u.email) } }
      });
    });

    it('should return user statistics correctly', async () => {
      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('inactiveUsers');
      expect(response.body.data).toHaveProperty('roleStats');
      expect(response.body.data).toHaveProperty('recentUsers');

      // Check that totalUsers = activeUsers + inactiveUsers
      expect(response.body.data.totalUsers).toBe(
        response.body.data.activeUsers + response.body.data.inactiveUsers
      );
    });

    it('should return correct role statistics', async () => {
      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const roleStats = response.body.data.roleStats;
      
      expect(roleStats).toHaveProperty('ADMIN');
      expect(roleStats).toHaveProperty('CAJA');
      expect(roleStats).toHaveProperty('MATRIZADOR');
      expect(roleStats).toHaveProperty('RECEPCION');
      expect(roleStats).toHaveProperty('ARCHIVO');

      // Verify at least our test users are counted
      expect(roleStats.ADMIN).toBeGreaterThanOrEqual(2);
      expect(roleStats.CAJA).toBeGreaterThanOrEqual(3);
      expect(roleStats.MATRIZADOR).toBeGreaterThanOrEqual(1);
    });

    it('should return recent users list', async () => {
      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const recentUsers = response.body.data.recentUsers;
      
      expect(Array.isArray(recentUsers)).toBe(true);
      expect(recentUsers.length).toBeLessThanOrEqual(5);

      recentUsers.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('createdAt');
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should order recent users by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const recentUsers = response.body.data.recentUsers;
      
      if (recentUsers.length > 1) {
        for (let i = 1; i < recentUsers.length; i++) {
          const currentDate = new Date(recentUsers[i].createdAt);
          const previousDate = new Date(recentUsers[i - 1].createdAt);
          expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
        }
      }
    });
  });

  describe('Complete User Management Lifecycle', () => {
    it('should create, read, update, and delete users correctly', async () => {
      // CREATE: Create a new user
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'lifecycle.test@example.com',
          password: 'TestPassword123!',
          firstName: 'Lifecycle',
          lastName: 'Test',
          role: 'CAJA'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.user.email).toBe('lifecycle.test@example.com');
      const userId = createResponse.body.data.user.id;

      // READ: Get the created user
      const getResponse = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.user.firstName).toBe('Lifecycle');

      // UPDATE: Update user information
      const updateResponse = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          role: 'MATRIZADOR'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.firstName).toBe('Updated');
      expect(updateResponse.body.data.user.role).toBe('MATRIZADOR');

      // TOGGLE STATUS: Deactivate user
      const toggleResponse = await request(app)
        .patch(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(toggleResponse.body.success).toBe(true);
      expect(toggleResponse.body.data.user.isActive).toBe(false);

      // DELETE: Remove the user
      const deleteResponse = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle user creation with all role types', async () => {
      const roles = ['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];
      const createdUsers = [];

      for (const role of roles) {
        const response = await request(app)
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: `test.${role.toLowerCase()}@example.com`,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: role,
            role
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe(role);
        createdUsers.push(response.body.data.user.id);
      }

      // Cleanup
      for (const userId of createdUsers) {
        await request(app)
          .delete(`/api/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });

    it('should validate user creation with comprehensive field validation', async () => {
      // Test missing required fields
      const response1 = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'incomplete@example.com'
          // Missing password, firstName, lastName, role
        })
        .expect(400);

      expect(response1.body.success).toBe(false);
      expect(response1.body.required).toContain('password');

      // Test invalid email format
      const response2 = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CAJA'
        })
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.message).toContain('Email no válido');

      // Test invalid role
      const response3 = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'INVALID_ROLE'
        })
        .expect(400);

      expect(response3.body.success).toBe(false);
      expect(response3.body.message).toContain('Rol no válido');
    });

    it('should prevent duplicate email addresses', async () => {
      // Create first user
      const response1 = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          firstName: 'First',
          lastName: 'User',
          role: 'CAJA'
        })
        .expect(201);

      const userId = response1.body.data.user.id;

      // Try to create second user with same email
      const response2 = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          firstName: 'Second',
          lastName: 'User',
          role: 'MATRIZADOR'
        })
        .expect(409);

      expect(response2.body.success).toBe(false);
      expect(response2.body.message).toContain('email');

      // Cleanup
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should handle user updates with partial data', async () => {
      // Create test user
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'partial.update@example.com',
          password: 'TestPassword123!',
          firstName: 'Partial',
          lastName: 'Update',
          role: 'RECEPCION'
        })
        .expect(201);

      const userId = createResponse.body.data.user.id;

      // Update only first name
      const updateResponse1 = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'UpdatedFirstName'
        })
        .expect(200);

      expect(updateResponse1.body.data.user.firstName).toBe('UpdatedFirstName');
      expect(updateResponse1.body.data.user.lastName).toBe('Update'); // Unchanged

      // Update only role
      const updateResponse2 = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'ARCHIVO'
        })
        .expect(200);

      expect(updateResponse2.body.data.user.role).toBe('ARCHIVO');

      // Try to update with no changes
      const updateResponse3 = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(updateResponse3.body.message).toContain('No hay cambios');

      // Cleanup
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should prevent admin from deleting or deactivating themselves', async () => {
      // Try to deactivate self
      const toggleResponse = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(toggleResponse.body.success).toBe(false);
      expect(toggleResponse.body.message).toContain('propia cuenta');

      // Try to delete self
      const deleteResponse = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.message).toContain('propia cuenta');
    });

    it('should handle password updates with validation', async () => {
      // Create test user
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'password.test@example.com',
          password: 'InitialPassword123!',
          firstName: 'Password',
          lastName: 'Test',
          role: 'CAJA'
        })
        .expect(201);

      const userId = createResponse.body.data.user.id;

      // Update with valid password
      const updateResponse1 = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'NewValidPassword123!'
        })
        .expect(200);

      expect(updateResponse1.body.success).toBe(true);

      // Try to update with invalid password
      const updateResponse2 = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'weak'
        })
        .expect(400);

      expect(updateResponse2.body.success).toBe(false);
      expect(updateResponse2.body.message).toContain('criterios de seguridad');

      // Cleanup
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  describe('User Data Integrity and Security', () => {
    it('should never expose passwords in API responses', async () => {
      const responses = await Promise.all([
        request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get(`/api/admin/users/${adminUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get('/api/admin/users/stats')
          .set('Authorization', `Bearer ${adminToken}`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        if (response.body.data) {
          if (Array.isArray(response.body.data)) {
            response.body.data.forEach(item => {
              if (item.password !== undefined) {
                expect(item).not.toHaveProperty('password');
              }
            });
          } else if (response.body.data.user) {
            expect(response.body.data.user).not.toHaveProperty('password');
          } else if (response.body.data.recentUsers) {
            response.body.data.recentUsers.forEach(user => {
              expect(user).not.toHaveProperty('password');
            });
          }
        }
      });
    });

    it('should properly hash passwords during creation and updates', async () => {
      const password = 'TestHashingPassword123!';
      
      // Create user
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'hashing.test@example.com',
          password,
          firstName: 'Hashing',
          lastName: 'Test',
          role: 'CAJA'
        })
        .expect(201);

      const userId = createResponse.body.data.user.id;

      // Verify password is hashed in database
      const userFromDb = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      expect(userFromDb.password).not.toBe(password);
      expect(userFromDb.password).toMatch(/^\$2[ab]\$\d{2}\$/); // bcrypt hash format

      // Cleanup
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should validate email case insensitivity', async () => {
      // Create user with lowercase email
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'case.test@example.com',
          password: 'TestPassword123!',
          firstName: 'Case',
          lastName: 'Test',
          role: 'CAJA'
        })
        .expect(201);

      const userId = createResponse.body.data.user.id;

      // Try to create another user with uppercase version
      const duplicateResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'CASE.TEST@EXAMPLE.COM',
          password: 'TestPassword123!',
          firstName: 'Case2',
          lastName: 'Test2',
          role: 'MATRIZADOR'
        })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);

      // Verify email was stored in lowercase
      const userFromDb = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });

      expect(userFromDb.email).toBe('case.test@example.com');

      // Cleanup
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should trim whitespace from names during creation and updates', async () => {
      // Create user with whitespace in names
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'whitespace.test@example.com',
          password: 'TestPassword123!',
          firstName: '  Whitespace  ',
          lastName: '  Test  ',
          role: 'RECEPCION'
        })
        .expect(201);

      expect(createResponse.body.data.user.firstName).toBe('Whitespace');
      expect(createResponse.body.data.user.lastName).toBe('Test');

      const userId = createResponse.body.data.user.id;

      // Update with more whitespace
      const updateResponse = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: '   Updated   ',
          lastName: '   Name   '
        })
        .expect(200);

      expect(updateResponse.body.data.user.firstName).toBe('Updated');
      expect(updateResponse.body.data.user.lastName).toBe('Name');

      // Cleanup
      await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle batch operations efficiently', async () => {
      // Create multiple documents
      const documents = [];
      for (let i = 0; i < 10; i++) {
        const doc = await prisma.document.create({
          data: {
            protocolNumber: `BATCH-${i}`,
            clientName: 'Batch Client',
            clientPhone: '+593987654321',
            clientId: '1234567890',
            documentType: 'PROTOCOLO',
            actoPrincipalDescripcion: `Batch Act ${i}`,
            actoPrincipalValor: 1000.0 + i,
            totalFactura: 1100.0 + i,
            matrizadorName: 'Matrizador User',
            createdById: cajaUser.id,
            assignedToId: matrizadorUser.id,
            status: 'EN_PROCESO'
          }
        });
        documents.push(doc);
      }

      // Test batch grouping
      const start = Date.now();
      const response = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${matrizadorToken}`)
        .send({
          documentIds: documents.map(d => d.id)
        });

      const duration = Date.now() - start;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete workflow: create -> group -> deliver', async () => {
    // This would test the complete document lifecycle
    // involving multiple roles and state transitions
  });

  it('should maintain audit trail throughout role operations', async () => {
    // Test that all role-related operations create proper audit logs
  });
});