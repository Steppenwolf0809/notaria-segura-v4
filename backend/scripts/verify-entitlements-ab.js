import pg from 'pg';
import { randomUUID } from 'node:crypto';

import { requireModule } from '../src/middleware/require-module.js';
import { closePrismaClient } from '../src/db.js';

const { Client } = pg;

function resolveSsl(connectionString) {
  const explicit = (process.env.DB_SSL || '').trim().toLowerCase();
  if (explicit === 'true') {
    return { rejectUnauthorized: false };
  }
  if (explicit === 'false') {
    return undefined;
  }

  // Railway proxy suele funcionar sin SSL en este entorno.
  return undefined;
}

function runMiddleware(middleware, req) {
  const result = {
    statusCode: null,
    body: null,
    nextCalled: false
  };

  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    }
  };

  return middleware(req, res, () => {
    result.nextCalled = true;
  }).then(() => result);
}

function assertEquals(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertCondition(label, condition) {
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

async function queryEntitlementVisibility(client, context, ids) {
  await client.query('BEGIN');
  try {
    await client.query('SET LOCAL ROLE app_runtime_rls');
    await client.query(`SELECT set_config('app.current_notary_id', $1, true)`, [context.notaryId || '']);
    await client.query(`SELECT set_config('app.is_super_admin', $1, true)`, [context.isSuperAdmin ? 'true' : 'false']);

    const { rows } = await client.query(
      `
        SELECT
          (SELECT COUNT(*) FROM "notary_subscriptions" WHERE "notary_id" = $1::uuid) AS sub_a,
          (SELECT COUNT(*) FROM "notary_subscriptions" WHERE "notary_id" = $2::uuid) AS sub_b,
          (SELECT COUNT(*) FROM "notary_subscriptions" WHERE "notary_id" = $3::uuid) AS sub_c,
          (SELECT COUNT(*) FROM "notary_module_overrides" WHERE "notary_id" = $2::uuid) AS ov_b
      `,
      [ids.notaryAId, ids.notaryBId, ids.notaryCId]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString,
    ssl: resolveSsl(connectionString)
  });

  const suffix = Date.now().toString(36).slice(-6);
  const codes = {
    a: `ENTA_${suffix}`,
    b: `ENTB_${suffix}`,
    c: `ENTC_${suffix}`
  };

  let ids = null;

  try {
    await client.connect();

    const { rows: planRows } = await client.query(
      `SELECT "id" FROM "plans" WHERE "name" = 'PLAN_BASE_PILOTO' LIMIT 1`
    );
    if (planRows.length === 0) {
      throw new Error('PLAN_BASE_PILOTO no existe. Ejecuta primero la migracion OLA C.');
    }
    const planId = planRows[0].id;

    const { rows: createdNotaries } = await client.query(
      `
        INSERT INTO "notaries" ("code", "slug", "name", "is_active", "created_at", "updated_at")
        VALUES
          ($1, $2, $3, true, NOW(), NOW()),
          ($4, $5, $6, true, NOW(), NOW()),
          ($7, $8, $9, true, NOW(), NOW())
        RETURNING "id", "code"
      `,
      [
        codes.a, `enta-${suffix}`, `Entitlements Tenant A ${suffix}`,
        codes.b, `entb-${suffix}`, `Entitlements Tenant B ${suffix}`,
        codes.c, `entc-${suffix}`, `Entitlements Tenant C ${suffix}`
      ]
    );

    const notaryMap = new Map(createdNotaries.map((row) => [row.code, row.id]));
    const notaryAId = notaryMap.get(codes.a);
    const notaryBId = notaryMap.get(codes.b);
    const notaryCId = notaryMap.get(codes.c);
    ids = { notaryAId, notaryBId, notaryCId };

    await client.query(
      `
        INSERT INTO "notary_subscriptions" ("notary_id", "plan_id", "started_at", "is_active", "created_at", "updated_at")
        VALUES
          ($1::uuid, $3::uuid, NOW(), true, NOW(), NOW()),
          ($2::uuid, $3::uuid, NOW(), true, NOW(), NOW())
      `,
      [notaryAId, notaryBId, planId]
    );

    await client.query(
      `
        INSERT INTO "notary_module_overrides" ("notary_id", "module_id", "enabled", "reason", "created_at", "updated_at")
        SELECT $1::uuid, m."id", false, 'AB test disable FACTURACION', NOW(), NOW()
        FROM "modules" m
        WHERE m."code" = 'FACTURACION'
      `,
      [notaryBId]
    );

    const noTenant = await queryEntitlementVisibility(client, { notaryId: '', isSuperAdmin: false }, ids);
    const tenantA = await queryEntitlementVisibility(client, { notaryId: notaryAId, isSuperAdmin: false }, ids);
    const tenantB = await queryEntitlementVisibility(client, { notaryId: notaryBId, isSuperAdmin: false }, ids);
    const superAdmin = await queryEntitlementVisibility(client, { notaryId: '', isSuperAdmin: true }, ids);

    assertEquals('noTenant.sub_a', Number(noTenant.sub_a), 0);
    assertEquals('noTenant.sub_b', Number(noTenant.sub_b), 0);
    assertEquals('noTenant.sub_c', Number(noTenant.sub_c), 0);
    assertEquals('noTenant.ov_b', Number(noTenant.ov_b), 0);

    assertEquals('tenantA.sub_a', Number(tenantA.sub_a), 1);
    assertEquals('tenantA.sub_b', Number(tenantA.sub_b), 0);
    assertEquals('tenantA.sub_c', Number(tenantA.sub_c), 0);
    assertEquals('tenantA.ov_b', Number(tenantA.ov_b), 0);

    assertEquals('tenantB.sub_a', Number(tenantB.sub_a), 0);
    assertEquals('tenantB.sub_b', Number(tenantB.sub_b), 1);
    assertEquals('tenantB.sub_c', Number(tenantB.sub_c), 0);
    assertEquals('tenantB.ov_b', Number(tenantB.ov_b), 1);

    assertEquals('superAdmin.sub_a', Number(superAdmin.sub_a), 1);
    assertEquals('superAdmin.sub_b', Number(superAdmin.sub_b), 1);
    assertEquals('superAdmin.sub_c', Number(superAdmin.sub_c), 0);
    assertEquals('superAdmin.ov_b', Number(superAdmin.ov_b), 1);

    const billingModuleGuard = requireModule('FACTURACION');

    const allowedA = await runMiddleware(billingModuleGuard, {
      user: {
        id: 1,
        role: 'ADMIN',
        isSuperAdmin: false,
        activeNotaryId: notaryAId,
        notaryId: notaryAId
      }
    });
    assertCondition('tenant A billing module should pass', allowedA.nextCalled === true && allowedA.statusCode === null);

    const blockedB = await runMiddleware(billingModuleGuard, {
      user: {
        id: 1,
        role: 'ADMIN',
        isSuperAdmin: false,
        activeNotaryId: notaryBId,
        notaryId: notaryBId
      }
    });
    assertEquals('tenant B billing module should be blocked', blockedB.statusCode, 403);

    const blockedC = await runMiddleware(billingModuleGuard, {
      user: {
        id: 1,
        role: 'ADMIN',
        isSuperAdmin: false,
        activeNotaryId: notaryCId,
        notaryId: notaryCId
      }
    });
    assertEquals('tenant C no-subscription should be blocked', blockedC.statusCode, 403);

    console.log('Entitlements A/B verification passed');
    console.log(JSON.stringify({
      tenants: {
        notaryAId,
        notaryBId,
        notaryCId
      },
      rlsVisibility: {
        withoutTenantContext: noTenant,
        tenantAContext: tenantA,
        tenantBContext: tenantB,
        superAdminContext: superAdmin
      },
      moduleGate: {
        tenantA: allowedA,
        tenantB: blockedB,
        tenantCNoSubscription: blockedC
      }
    }, null, 2));
  } finally {
    try {
      if (ids) {
        await client.query(`DELETE FROM "notary_module_overrides" WHERE "notary_id" = ANY($1::uuid[])`, [[ids.notaryAId, ids.notaryBId, ids.notaryCId]]);
        await client.query(`DELETE FROM "notary_subscriptions" WHERE "notary_id" = ANY($1::uuid[])`, [[ids.notaryAId, ids.notaryBId, ids.notaryCId]]);
        await client.query(`DELETE FROM "notaries" WHERE "id" = ANY($1::uuid[])`, [[ids.notaryAId, ids.notaryBId, ids.notaryCId]]);
      }
    } finally {
      await closePrismaClient();
      await client.end();
    }
  }
}

main().catch((error) => {
  console.error('Entitlements A/B verification failed');
  console.error(error);
  process.exitCode = 1;
});
