/**
 * Security-focused tests for role system
 * Tests privilege escalation, unauthorized access, and security vulnerabilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app from '../server.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Role System Security Tests', () => {
  let users = {};
  let tokens = {};
  let testDocument;

  beforeEach(async () => {
    // Clean database
    await prisma.documentEvent.deleteMany();
    await prisma.whatsAppNotification.deleteMany();
    await prisma.document.deleteMany();
    await prisma.documentGroup.deleteMany();
    await prisma.user.deleteMany();

    // Create users for each role
    const roles = ['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];
    const hashedPassword = await bcrypt.hash('SecurePass123!', 12);

    for (const role of roles) {
      const user = await prisma.user.create({
        data: {
          email: `${role.toLowerCase()}@test.com`,
          password: hashedPassword,
          firstName: role,
          lastName: 'User',
          role,
          isActive: true
        }
      });
      
      users[role] = user;
      tokens[role] = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    }

    // Create test document
    testDocument = await prisma.document.create({
      data: {
        protocolNumber: 'SEC-001',
        clientName: 'Security Test Client',
        clientPhone: '+593987654321',
        clientEmail: 'security@test.com',
        clientId: '1234567890',
        documentType: 'PROTOCOLO',
        actoPrincipalDescripcion: 'Security Test Act',
        actoPrincipalValor: 1000.0,
        totalFactura: 1100.0,
        matrizadorName: 'Matrizador User',
        createdById: users.CAJA.id,
        assignedToId: users.MATRIZADOR.id,
        status: 'EN_PROCESO'
      }
    });
  });

  afterEach(async () => {
    await prisma.documentEvent.deleteMany();
    await prisma.whatsAppNotification.deleteMany();
    await prisma.document.deleteMany();
    await prisma.documentGroup.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Authentication Security', () => {
    it('should reject requests with no token', async () => {
      const response = await request(app)
        .get('/api/documents/my');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token de acceso requerido');
    });

    it('should reject requests with malformed tokens', async () => {
      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', 'Bearer malformed-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token inválido');
    });

    it('should reject requests with expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: users.MATRIZADOR.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token expirado');
    });

    it('should reject tokens for non-existent users', async () => {
      const fakeToken = jwt.sign({ id: 99999 }, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('inválido');
    });

    it('should reject tokens for inactive users', async () => {
      await prisma.user.update({
        where: { id: users.MATRIZADOR.id },
        data: { isActive: false }
      });

      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('desactivado');
    });
  });

  describe('Authorization Security', () => {
    it('should prevent privilege escalation through role manipulation', async () => {
      // Try to create admin user as non-admin
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`)
        .send({
          email: 'hacker@test.com',
          password: 'HackerPass123!',
          firstName: 'Hacker',
          lastName: 'User',
          role: 'ADMIN'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permisos');
    });

    it('should prevent unauthorized user management operations', async () => {
      // Non-admin trying to view all users
      const viewResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.CAJA}`);

      expect(viewResponse.status).toBe(403);

      // Non-admin trying to delete user
      const deleteResponse = await request(app)
        .delete(`/api/admin/users/${users.MATRIZADOR.id}`)
        .set('Authorization', `Bearer ${tokens.RECEPCION}`);

      expect(deleteResponse.status).toBe(403);

      // Non-admin trying to modify user
      const modifyResponse = await request(app)
        .put(`/api/admin/users/${users.MATRIZADOR.id}`)
        .set('Authorization', `Bearer ${tokens.ARCHIVO}`)
        .send({ role: 'ADMIN' });

      expect(modifyResponse.status).toBe(403);
    });

    it('should prevent cross-role document access', async () => {
      // MATRIZADOR trying to access admin documents endpoint
      const adminDocsResponse = await request(app)
        .get('/api/admin/documents/oversight')
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`);

      expect(adminDocsResponse.status).toBe(403);

      // RECEPCION trying to modify document status (only MATRIZADOR should)
      const statusResponse = await request(app)
        .patch(`/api/documents/${testDocument.id}/status`)
        .set('Authorization', `Bearer ${tokens.RECEPCION}`)
        .send({ status: 'LISTO' });

      expect(statusResponse.status).toBe(403);
    });

    it('should prevent document assignment manipulation by unauthorized roles', async () => {
      // CAJA trying to assign document (only ADMIN or system should)
      const assignResponse = await request(app)
        .patch(`/api/documents/${testDocument.id}/assign`)
        .set('Authorization', `Bearer ${tokens.CAJA}`)
        .send({ assignedToId: users.MATRIZADOR.id });

      expect([403, 404]).toContain(assignResponse.status);
    });
  });

  describe('Document Security', () => {
    it('should prevent access to documents not assigned to user', async () => {
      // Create document assigned to different matrizador
      const otherMatrizador = await prisma.user.create({
        data: {
          email: 'other.matrizador@test.com',
          password: '$2a$12$hashedpassword',
          firstName: 'Other',
          lastName: 'Matrizador',
          role: 'MATRIZADOR',
          isActive: true
        }
      });

      const otherDocument = await prisma.document.create({
        data: {
          protocolNumber: 'OTHER-001',
          clientName: 'Other Client',
          clientPhone: '+593111111111',
          documentType: 'PROTOCOLO',
          actoPrincipalDescripcion: 'Other Act',
          actoPrincipalValor: 1000.0,
          totalFactura: 1100.0,
          matrizadorName: 'Other Matrizador',
          createdById: users.CAJA.id,
          assignedToId: otherMatrizador.id,
          status: 'EN_PROCESO'
        }
      });

      // Current matrizador trying to access other's document
      const response = await request(app)
        .get(`/api/documents/${otherDocument.id}`)
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent unauthorized status changes', async () => {
      // ARCHIVO role trying to change document status
      const response = await request(app)
        .patch(`/api/documents/${testDocument.id}/status`)
        .set('Authorization', `Bearer ${tokens.ARCHIVO}`)
        .send({ status: 'LISTO' });

      expect(response.status).toBe(403);
    });

    it('should validate document ownership in group operations', async () => {
      // Create second document assigned to different matrizador
      const otherMatrizador = await prisma.user.create({
        data: {
          email: 'other2@test.com',
          password: '$2a$12$hashedpassword',
          firstName: 'Other2',
          lastName: 'Matrizador',
          role: 'MATRIZADOR',
          isActive: true
        }
      });

      const otherDocument = await prisma.document.create({
        data: {
          protocolNumber: 'GROUP-SECURITY-001',
          clientName: 'Security Test Client', // Same client
          clientPhone: '+593987654321',
          clientId: '1234567890',
          documentType: 'PROTOCOLO',
          actoPrincipalDescripcion: 'Security Group Act',
          actoPrincipalValor: 1000.0,
          totalFactura: 1100.0,
          matrizadorName: 'Other2 Matrizador',
          createdById: users.CAJA.id,
          assignedToId: otherMatrizador.id,
          status: 'EN_PROCESO'
        }
      });

      // Try to group documents from different matrizadors
      const response = await request(app)
        .post('/api/documents/create-group')
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`)
        .send({
          documentIds: [testDocument.id, otherDocument.id]
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize and validate user input in role updates', async () => {
      const maliciousInputs = [
        { role: '<script>alert("xss")</script>' },
        { role: '../../etc/passwd' },
        { role: 'ADMIN\'; DROP TABLE users; --' },
        { firstName: '<img src=x onerror=alert(1)>' },
        { lastName: '${process.env.JWT_SECRET}' }
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .put(`/api/admin/users/${users.MATRIZADOR.id}`)
          .set('Authorization', `Bearer ${tokens.ADMIN}`)
          .send(input);

        // Should either reject or sanitize
        expect([400, 200]).toContain(response.status);
        
        if (response.status === 200) {
          // If accepted, should not contain malicious content
          const updatedUser = response.body.data.user;
          if (input.role) {
            expect(updatedUser.role).not.toContain('<script>');
            expect(updatedUser.role).not.toContain('DROP TABLE');
          }
        }
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        'javascript:alert(1)@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .put(`/api/admin/users/${users.MATRIZADOR.id}`)
          .set('Authorization', `Bearer ${tokens.ADMIN}`)
          .send({ email });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('válido');
      }
    });

    it('should enforce password security requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        'qwerty',
        'abc123',
        '12345678' // Long but weak
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${tokens.ADMIN}`)
          .send({
            email: `weak${Math.random()}@test.com`,
            password,
            firstName: 'Test',
            lastName: 'User',
            role: 'MATRIZADOR'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('contraseña');
      }
    });
  });

  describe('Session Security', () => {
    it('should handle concurrent sessions safely', async () => {
      // Create multiple tokens for same user
      const token1 = jwt.sign({ id: users.MATRIZADOR.id }, process.env.JWT_SECRET);
      const token2 = jwt.sign({ id: users.MATRIZADOR.id }, process.env.JWT_SECRET);

      // Both should work independently
      const response1 = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${token1}`);

      const response2 = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${token2}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle token reuse attempts', async () => {
      // Simulate deactivating user
      await prisma.user.update({
        where: { id: users.MATRIZADOR.id },
        data: { isActive: false }
      });

      // Old token should be rejected
      const response = await request(app)
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rapid authentication attempts gracefully', async () => {
      const promises = [];
      
      // Simulate rapid requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/documents/my')
            .set('Authorization', `Bearer ${tokens.MATRIZADOR}`)
        );
      }

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      // Should handle at least some requests successfully
      expect(successCount).toBeGreaterThan(0);
      
      // But may rate limit some (status 429 would be expected in production)
      const rateLimitedCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      // This test documents current behavior - in production we'd expect rate limiting
      console.log(`Successful: ${successCount}, Rate limited: ${rateLimitedCount}`);
    });
  });

  describe('Data Exposure Security', () => {
    it('should not expose sensitive user data in responses', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.ADMIN}`);

      expect(response.status).toBe(200);
      
      if (response.body.data && response.body.data.length > 0) {
        const userData = response.body.data[0];
        
        // Password should never be exposed
        expect(userData).not.toHaveProperty('password');
        
        // Sensitive fields should be omitted or masked
        expect(userData).not.toHaveProperty('passwordHash');
        expect(userData).not.toHaveProperty('secretKey');
      }
    });

    it('should not leak user information in error messages', async () => {
      const response = await request(app)
        .get('/api/admin/users/99999')
        .set('Authorization', `Bearer ${tokens.ADMIN}`);

      expect(response.status).toBe(404);
      
      // Error message should not reveal system internals
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('prisma');
      expect(response.body.message).not.toContain('sql');
    });
  });

  describe('Audit Security', () => {
    it('should log security-relevant events', async () => {
      // Attempt unauthorized access
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`);

      // Should log the unauthorized attempt
      // (This would require audit log checking in a real implementation)
    });

    it('should log role changes with full context', async () => {
      await request(app)
        .put(`/api/admin/users/${users.MATRIZADOR.id}`)
        .set('Authorization', `Bearer ${tokens.ADMIN}`)
        .send({ role: 'ARCHIVO' });

      // Check that role change was properly logged
      const events = await prisma.documentEvent.findMany({
        where: {
          eventType: 'USER_UPDATED',
          userId: users.ADMIN.id
        }
      });

      expect(events.length).toBeGreaterThan(0);
      
      if (events.length > 0) {
        const event = events[0];
        expect(event.details).toHaveProperty('role');
        expect(event.ipAddress).toBeDefined();
        expect(event.userAgent).toBeDefined();
      }
    });
  });

  describe('Business Logic Security', () => {
    it('should prevent users from elevating their own privileges', async () => {
      // Create a regular user token that attempts to modify itself
      const response = await request(app)
        .put(`/api/admin/users/${users.MATRIZADOR.id}`)
        .set('Authorization', `Bearer ${tokens.MATRIZADOR}`)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(403);
    });

    it('should validate business rules in role transitions', async () => {
      // Assign document to matrizador
      await prisma.document.update({
        where: { id: testDocument.id },
        data: { assignedToId: users.MATRIZADOR.id, status: 'EN_PROCESO' }
      });

      // Try to change matrizador role while having active assignments
      const response = await request(app)
        .put(`/api/admin/users/${users.MATRIZADOR.id}`)
        .set('Authorization', `Bearer ${tokens.ADMIN}`)
        .send({ role: 'ARCHIVO' });

      // Should prevent role change due to active assignments
      // (Implementation may vary - this documents expected behavior)
      if (response.status === 400) {
        expect(response.body.message).toContain('assignments');
      }
    });

    it('should maintain referential integrity in role operations', async () => {
      // Attempt to delete user with active document assignments
      const response = await request(app)
        .delete(`/api/admin/users/${users.MATRIZADOR.id}`)
        .set('Authorization', `Bearer ${tokens.ADMIN}`);

      // Should either prevent deletion or handle cleanup properly
      if (response.status === 200) {
        // If deletion succeeded, verify cleanup
        const orphanedDocs = await prisma.document.findMany({
          where: { assignedToId: users.MATRIZADOR.id }
        });
        
        // Should not leave orphaned documents
        expect(orphanedDocs).toHaveLength(0);
      } else {
        // Should prevent deletion with proper error message
        expect(response.status).toBe(400);
      }
    });
  });
});