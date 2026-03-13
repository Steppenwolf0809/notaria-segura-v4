import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';
import prisma from '../../src/db.js';
import authRoutes from '../../src/routes/auth-routes.js';
import documentRoutes from '../../src/routes/document-routes.js';
import adminRoutes from '../../src/routes/admin-routes.js';
import {
  csrfCookieParser,
  csrfErrorHandler,
  csrfTokenGenerator
} from '../../src/middleware/csrf-protection.js';
import { withTenantContext } from '../../src/utils/tenant-context.js';

const TEST_PREFIX = 'e2e-sa';

const TEST_DATA = {
  tenantA: {
    code: 'E2E-SA-A',
    slug: 'e2e-sa-a',
    name: 'Notaria E2E A'
  },
  tenantB: {
    code: 'E2E-SA-B',
    slug: 'e2e-sa-b',
    name: 'Notaria E2E B'
  },
  credentials: {
    superAdmin: {
      email: 'e2e-sa-super-admin@example.com',
      password: 'SuperAdmin1!',
      firstName: 'Super',
      lastName: 'Admin'
    },
    tenantAUser: {
      email: 'e2e-sa-tenant-a-user@example.com',
      password: 'TenantAUser1!',
      firstName: 'Tenant',
      lastName: 'AUser'
    },
    tenantBDocCreator: {
      email: 'e2e-sa-tenant-b-doc-creator@example.com',
      password: 'TenantBDoc1!',
      firstName: 'Tenant',
      lastName: 'BDoc'
    }
  },
  documents: {
    tenantAProtocol: 'e2e-sa-protocol-a',
    tenantBProtocol: 'e2e-sa-protocol-b'
  }
};

let app;
let tenantA;
let tenantB;
let superAdminUser;
let tenantAUser;
let tenantBDocCreatorUser;

function createTestApp() {
  const testApp = express();

  testApp.set('trust proxy', false);
  testApp.use(express.json({ limit: '2mb' }));
  testApp.use(express.urlencoded({ extended: true }));
  testApp.use(csrfCookieParser);

  testApp.get('/api/csrf-token', csrfTokenGenerator, (req, res) => {
    res.json({
      success: true,
      csrfToken: req.csrfToken()
    });
  });

  testApp.use('/api/auth', authRoutes);
  testApp.use('/api/documents', documentRoutes);
  testApp.use('/api/admin', adminRoutes);

  testApp.use(csrfErrorHandler);

  testApp.use((error, _req, res, _next) => {
    res.status(500).json({
      success: false,
      message: error?.message || 'Error interno del servidor'
    });
  });

  return testApp;
}

async function cleanupSeededData() {
  await withTenantContext(prisma, { notaryId: null, isSuperAdmin: true }, async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "document_events"
      WHERE "documentId" IN (
        SELECT "id"
        FROM "documents"
        WHERE "protocolNumber" LIKE ${`${TEST_PREFIX}-%`}
      )
    `;

    await tx.$executeRaw`
      DELETE FROM "whatsapp_notifications"
      WHERE "documentId" IN (
        SELECT "id"
        FROM "documents"
        WHERE "protocolNumber" LIKE ${`${TEST_PREFIX}-%`}
      )
    `;

    await tx.$executeRaw`
      DELETE FROM "documents"
      WHERE "protocolNumber" LIKE ${`${TEST_PREFIX}-%`}
    `;

    await tx.user.deleteMany({
      where: {
        email: {
          startsWith: `${TEST_PREFIX}-cross-tenant-`
        }
      }
    });
  });
}

async function seedBaseData() {
  const [
    hashedSuperAdminPassword,
    hashedTenantAUserPassword,
    hashedTenantBDocCreatorPassword
  ] = await Promise.all([
    bcrypt.hash(TEST_DATA.credentials.superAdmin.password, 12),
    bcrypt.hash(TEST_DATA.credentials.tenantAUser.password, 12),
    bcrypt.hash(TEST_DATA.credentials.tenantBDocCreator.password, 12)
  ]);

  tenantA = await prisma.notary.upsert({
    where: { code: TEST_DATA.tenantA.code },
    update: {
      slug: TEST_DATA.tenantA.slug,
      name: TEST_DATA.tenantA.name,
      isActive: true,
      deletedAt: null
    },
    create: {
      code: TEST_DATA.tenantA.code,
      slug: TEST_DATA.tenantA.slug,
      name: TEST_DATA.tenantA.name,
      isActive: true
    }
  });

  tenantB = await prisma.notary.upsert({
    where: { code: TEST_DATA.tenantB.code },
    update: {
      slug: TEST_DATA.tenantB.slug,
      name: TEST_DATA.tenantB.name,
      isActive: true,
      deletedAt: null
    },
    create: {
      code: TEST_DATA.tenantB.code,
      slug: TEST_DATA.tenantB.slug,
      name: TEST_DATA.tenantB.name,
      isActive: true
    }
  });

  superAdminUser = await prisma.user.upsert({
    where: { email: TEST_DATA.credentials.superAdmin.email },
    update: {
      password: hashedSuperAdminPassword,
      firstName: TEST_DATA.credentials.superAdmin.firstName,
      lastName: TEST_DATA.credentials.superAdmin.lastName,
      role: 'SUPER_ADMIN',
      notaryId: null,
      isActive: true,
      deletedAt: null
    },
    create: {
      email: TEST_DATA.credentials.superAdmin.email,
      password: hashedSuperAdminPassword,
      firstName: TEST_DATA.credentials.superAdmin.firstName,
      lastName: TEST_DATA.credentials.superAdmin.lastName,
      role: 'SUPER_ADMIN',
      notaryId: null,
      isActive: true
    }
  });

  tenantAUser = await prisma.user.upsert({
    where: { email: TEST_DATA.credentials.tenantAUser.email },
    update: {
      password: hashedTenantAUserPassword,
      firstName: TEST_DATA.credentials.tenantAUser.firstName,
      lastName: TEST_DATA.credentials.tenantAUser.lastName,
      role: 'CAJA',
      notaryId: tenantA.id,
      isActive: true,
      deletedAt: null
    },
    create: {
      email: TEST_DATA.credentials.tenantAUser.email,
      password: hashedTenantAUserPassword,
      firstName: TEST_DATA.credentials.tenantAUser.firstName,
      lastName: TEST_DATA.credentials.tenantAUser.lastName,
      role: 'CAJA',
      notaryId: tenantA.id,
      isActive: true
    }
  });

  tenantBDocCreatorUser = await prisma.user.upsert({
    where: { email: TEST_DATA.credentials.tenantBDocCreator.email },
    update: {
      password: hashedTenantBDocCreatorPassword,
      firstName: TEST_DATA.credentials.tenantBDocCreator.firstName,
      lastName: TEST_DATA.credentials.tenantBDocCreator.lastName,
      role: 'CAJA',
      notaryId: tenantB.id,
      isActive: true,
      deletedAt: null
    },
    create: {
      email: TEST_DATA.credentials.tenantBDocCreator.email,
      password: hashedTenantBDocCreatorPassword,
      firstName: TEST_DATA.credentials.tenantBDocCreator.firstName,
      lastName: TEST_DATA.credentials.tenantBDocCreator.lastName,
      role: 'CAJA',
      notaryId: tenantB.id,
      isActive: true
    }
  });

  await withTenantContext(prisma, { notaryId: tenantA.id, isSuperAdmin: false }, async (tx) => {
    await tx.document.upsert({
      where: { protocolNumber: TEST_DATA.documents.tenantAProtocol },
      update: {
        notaryId: tenantA.id,
        clientName: 'Cliente E2E Tenant A',
        documentType: 'TEST_E2E',
        status: 'EN_PROCESO',
        createdById: tenantAUser.id,
        actoPrincipalDescripcion: 'Documento de prueba tenant A',
        actoPrincipalValor: 100,
        totalFactura: 112,
        matrizadorName: 'E2E Matrizador A'
      },
      create: {
        protocolNumber: TEST_DATA.documents.tenantAProtocol,
        notaryId: tenantA.id,
        clientName: 'Cliente E2E Tenant A',
        documentType: 'TEST_E2E',
        status: 'EN_PROCESO',
        createdById: tenantAUser.id,
        actoPrincipalDescripcion: 'Documento de prueba tenant A',
        actoPrincipalValor: 100,
        totalFactura: 112,
        matrizadorName: 'E2E Matrizador A'
      }
    });
  });

  await withTenantContext(prisma, { notaryId: tenantB.id, isSuperAdmin: false }, async (tx) => {
    await tx.document.upsert({
      where: { protocolNumber: TEST_DATA.documents.tenantBProtocol },
      update: {
        notaryId: tenantB.id,
        clientName: 'Cliente E2E Tenant B',
        documentType: 'TEST_E2E',
        status: 'EN_PROCESO',
        createdById: tenantBDocCreatorUser.id,
        actoPrincipalDescripcion: 'Documento de prueba tenant B',
        actoPrincipalValor: 200,
        totalFactura: 224,
        matrizadorName: 'E2E Matrizador B'
      },
      create: {
        protocolNumber: TEST_DATA.documents.tenantBProtocol,
        notaryId: tenantB.id,
        clientName: 'Cliente E2E Tenant B',
        documentType: 'TEST_E2E',
        status: 'EN_PROCESO',
        createdById: tenantBDocCreatorUser.id,
        actoPrincipalDescripcion: 'Documento de prueba tenant B',
        actoPrincipalValor: 200,
        totalFactura: 224,
        matrizadorName: 'E2E Matrizador B'
      }
    });
  });
}

async function loginAndGetToken(email, password) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  expect(response.status).toBe(200);
  expect(response.body?.success).toBe(true);

  const token = response.body?.data?.token;
  expect(typeof token).toBe('string');

  return token;
}

async function getCsrfToken(agent) {
  const csrfResponse = await agent.get('/api/csrf-token');
  expect(csrfResponse.status).toBe(200);
  expect(csrfResponse.body?.success).toBe(true);
  expect(typeof csrfResponse.body?.csrfToken).toBe('string');
  return csrfResponse.body.csrfToken;
}

function getUnifiedDocumentsQuery(protocolNumber) {
  return {
    tab: 'ACTIVOS',
    query: protocolNumber,
    page: 1,
    pageSize: 25
  };
}

describe('E2E Multi-tenant SUPER_ADMIN isolation', () => {
  beforeAll(async () => {
    app = createTestApp();
    await cleanupSeededData();
    await seedBaseData();
  });

  afterAll(async () => {
    await cleanupSeededData();
    await prisma.$disconnect();
  });

  it('Caso 1: permite lectura cross-tenant autorizada para SUPER_ADMIN', async () => {
    const superAdminToken = await loginAndGetToken(
      TEST_DATA.credentials.superAdmin.email,
      TEST_DATA.credentials.superAdmin.password
    );

    const response = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-notary-id', tenantA.id)
      .query(getUnifiedDocumentsQuery(TEST_DATA.documents.tenantAProtocol));

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);

    const items = response.body?.data?.items || [];
    const codes = items.map((item) => item.code);

    expect(codes).toContain(TEST_DATA.documents.tenantAProtocol);
    expect(codes).not.toContain(TEST_DATA.documents.tenantBProtocol);
  });

  it('Caso 2: permite mutacion cross-tenant y registra auditoria inmutable', async () => {
    const superAdminAgent = request.agent(app);

    const loginResponse = await superAdminAgent
      .post('/api/auth/login')
      .send({
        email: TEST_DATA.credentials.superAdmin.email,
        password: TEST_DATA.credentials.superAdmin.password
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body?.success).toBe(true);

    const superAdminToken = loginResponse.body?.data?.token;
    const csrfToken = await getCsrfToken(superAdminAgent);

    const crossTenantEmail = `${TEST_PREFIX}-cross-tenant-${Date.now()}@example.com`;

    const createUserResponse = await superAdminAgent
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-notary-id', tenantB.id)
      .set('x-csrf-token', csrfToken)
      .send({
        email: crossTenantEmail,
        password: 'CrossTenant1!',
        firstName: 'Cross',
        lastName: 'TenantUser',
        role: 'CAJA'
      });

    expect(createUserResponse.status).toBe(201);
    expect(createUserResponse.body?.success).toBe(true);

    const createdUser = createUserResponse.body?.data?.user;
    expect(createdUser).toBeDefined();
    expect(createdUser?.notaryId).toBe(tenantB.id);

    const auditRows = await withTenantContext(
      prisma,
      { notaryId: tenantB.id, isSuperAdmin: true },
      async (tx) => {
        return tx.$queryRaw`
          SELECT "id", "actor_user_id", "action", "resource_type", "resource_id", "metadata"
          FROM "audit_logs"
          WHERE "actor_user_id" = ${superAdminUser.id}
            AND "action" = 'SUPER_ADMIN_USER_CREATED'
            AND "resource_type" = 'user'
            AND "resource_id" = ${String(createdUser.id)}
          ORDER BY "created_at" DESC
          LIMIT 1
        `;
      }
    );

    expect(Array.isArray(auditRows)).toBe(true);
    expect(auditRows.length).toBe(1);

    const [auditEntry] = auditRows;
    expect(auditEntry.actor_user_id).toBe(superAdminUser.id);
    expect(auditEntry.action).toBe('SUPER_ADMIN_USER_CREATED');
    expect(auditEntry.resource_type).toBe('user');
    expect(auditEntry.resource_id).toBe(String(createdUser.id));
    expect(auditEntry.metadata?.targetUserEmail).toBe(crossTenantEmail);

    await expect(
      withTenantContext(
        prisma,
        { notaryId: tenantB.id, isSuperAdmin: true },
        async (tx) => {
          return tx.$executeRaw`
            UPDATE "audit_logs"
            SET "action" = 'E2E_MUTATION_ATTEMPT'
            WHERE "id" = ${auditEntry.id}
          `;
        }
      )
    ).rejects.toThrow(/inmutable|solo INSERT/i);
  });

  it('Caso 3: mantiene aislamiento de pool tras request SUPER_ADMIN', async () => {
    const superAdminToken = await loginAndGetToken(
      TEST_DATA.credentials.superAdmin.email,
      TEST_DATA.credentials.superAdmin.password
    );

    const tenantAUserToken = await loginAndGetToken(
      TEST_DATA.credentials.tenantAUser.email,
      TEST_DATA.credentials.tenantAUser.password
    );

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const superAdminRequest = request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-notary-id', tenantA.id)
        .query(getUnifiedDocumentsQuery(TEST_DATA.documents.tenantAProtocol));

      const tenantAUserCrossTenantAttempt = request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${tenantAUserToken}`)
        .set('x-notary-id', tenantB.id)
        .query(getUnifiedDocumentsQuery(TEST_DATA.documents.tenantBProtocol));

      const [superAdminResponse, tenantAUserResponse] = await Promise.all([
        superAdminRequest,
        tenantAUserCrossTenantAttempt
      ]);

      expect(superAdminResponse.status).toBe(200);
      expect(superAdminResponse.body?.success).toBe(true);

      expect([200, 403]).toContain(tenantAUserResponse.status);
      if (tenantAUserResponse.status === 200) {
        expect(tenantAUserResponse.body?.success).toBe(true);
        expect(tenantAUserResponse.body?.data?.total).toBe(0);
        const tenantAUserCodes = (tenantAUserResponse.body?.data?.items || []).map((item) => item.code);
        expect(tenantAUserCodes).not.toContain(TEST_DATA.documents.tenantBProtocol);
      }
    }
  });
});
