import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Client } = pg;

function buildSslConfig(connectionString) {
  const forceSsl = process.env.DB_SSL === 'true' || /railway|supabase/i.test(connectionString);
  return forceSsl ? { rejectUnauthorized: false } : undefined;
}

function randomSuffix() {
  const now = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  return `${now}${rand}`.slice(-10);
}

function formatVisibility(label, row) {
  return {
    label,
    documents: { tenantA: Number(row.doc_a), tenantB: Number(row.doc_b) },
    documentEvents: { tenantA: Number(row.event_a), tenantB: Number(row.event_b) },
    whatsappNotifications: { tenantA: Number(row.notif_a), tenantB: Number(row.notif_b) }
  };
}

function assertVisibility(label, row, expected) {
  const normalized = {
    doc_a: Number(row.doc_a),
    doc_b: Number(row.doc_b),
    event_a: Number(row.event_a),
    event_b: Number(row.event_b),
    notif_a: Number(row.notif_a),
    notif_b: Number(row.notif_b)
  };

  const mismatches = Object.entries(expected)
    .filter(([key, value]) => normalized[key] !== value)
    .map(([key, value]) => `${key}: expected ${value}, got ${normalized[key]}`);

  if (mismatches.length > 0) {
    throw new Error(`A/B isolation failed for ${label} -> ${mismatches.join(' | ')}`);
  }
}

async function queryVisibility(client, {
  notaryId,
  isSuperAdmin,
  docAId,
  docBId,
  eventAId,
  eventBId,
  notifAId,
  notifBId
}) {
  await client.query(`SELECT set_config('app.current_notary_id', $1, true)`, [notaryId || '']);
  await client.query(`SELECT set_config('app.is_super_admin', $1, true)`, [isSuperAdmin ? 'true' : 'false']);

  const { rows } = await client.query(
    `
      SELECT
        (SELECT COUNT(*) FROM "documents" WHERE "id" = $1) AS doc_a,
        (SELECT COUNT(*) FROM "documents" WHERE "id" = $2) AS doc_b,
        (SELECT COUNT(*) FROM "document_events" WHERE "id" = $3) AS event_a,
        (SELECT COUNT(*) FROM "document_events" WHERE "id" = $4) AS event_b,
        (SELECT COUNT(*) FROM "whatsapp_notifications" WHERE "id" = $5) AS notif_a,
        (SELECT COUNT(*) FROM "whatsapp_notifications" WHERE "id" = $6) AS notif_b
    `,
    [docAId, docBId, eventAId, eventBId, notifAId, notifBId]
  );

  return rows[0];
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString,
    ssl: buildSslConfig(connectionString)
  });

  const runId = randomSuffix();
  const tempNotaryCode = `TST_${runId}`;
  const tempNotarySlug = `tst-${runId}`;
  const protocolA = `RLSA_${runId}`;
  const protocolB = `RLSB_${runId}`;

  let inTransaction = false;

  try {
    await client.connect();
    await client.query('BEGIN');
    inTransaction = true;

    const { rows: tenantRows } = await client.query(`
      SELECT "id", "code"
      FROM "notaries"
      WHERE "is_active" = true
        AND "deleted_at" IS NULL
      ORDER BY "code" ASC
      LIMIT 1
    `);

    if (tenantRows.length === 0) {
      throw new Error('No active tenant found to use as tenant A');
    }

    const tenantA = tenantRows[0];

    const { rows: userRows } = await client.query(`
      SELECT "id"
      FROM "users"
      ORDER BY "id" ASC
      LIMIT 1
    `);

    if (userRows.length === 0) {
      throw new Error('No active user found to create temporary records');
    }

    const createdById = userRows[0].id;

    const { rows: tenantBRows } = await client.query(
      `
        INSERT INTO "notaries" (
          "code", "slug", "name", "is_active", "created_at", "updated_at"
        )
        VALUES ($1, $2, $3, true, NOW(), NOW())
        RETURNING "id", "code"
      `,
      [tempNotaryCode, tempNotarySlug, `Tenant Prueba ${runId}`]
    );

    const tenantB = tenantBRows[0];

    const docAId = randomUUID();
    const docBId = randomUUID();

    await client.query(
      `
        INSERT INTO "documents" (
          "id", "notary_id", "protocolNumber", "clientName", "documentType", "createdById",
          "actoPrincipalDescripcion", "actoPrincipalValor", "totalFactura", "matrizadorName", "status",
          "createdAt", "updatedAt"
        )
        VALUES ($1::uuid, $2::uuid, $3, 'Tenant A QA', 'TEST', $4, 'Test A', 1, 1, 'qa', 'PENDIENTE', NOW(), NOW())
      `,
      [docAId, tenantA.id, protocolA, createdById]
    );

    await client.query(
      `
        INSERT INTO "documents" (
          "id", "notary_id", "protocolNumber", "clientName", "documentType", "createdById",
          "actoPrincipalDescripcion", "actoPrincipalValor", "totalFactura", "matrizadorName", "status",
          "createdAt", "updatedAt"
        )
        VALUES ($1::uuid, $2::uuid, $3, 'Tenant B QA', 'TEST', $4, 'Test B', 1, 1, 'qa', 'PENDIENTE', NOW(), NOW())
      `,
      [docBId, tenantB.id, protocolB, createdById]
    );

    const eventAId = randomUUID();
    const eventBId = randomUUID();

    await client.query(
      `
        INSERT INTO "document_events" (
          "id", "notary_id", "documentId", "userId", "eventType", "description"
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'RLS_TEST', 'RLS A/B test event A')
      `,
      [eventAId, tenantA.id, docAId, createdById]
    );

    await client.query(
      `
        INSERT INTO "document_events" (
          "id", "notary_id", "documentId", "userId", "eventType", "description"
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'RLS_TEST', 'RLS A/B test event B')
      `,
      [eventBId, tenantB.id, docBId, createdById]
    );

    const notifAId = randomUUID();
    const notifBId = randomUUID();

    await client.query(
      `
        INSERT INTO "whatsapp_notifications" (
          "id", "notary_id", "documentId", "clientName", "clientPhone", "messageType", "messageBody", "status"
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, 'Tenant A QA', '+593000000001', 'RLS_TEST', 'A', 'PENDING')
      `,
      [notifAId, tenantA.id, docAId]
    );

    await client.query(
      `
        INSERT INTO "whatsapp_notifications" (
          "id", "notary_id", "documentId", "clientName", "clientPhone", "messageType", "messageBody", "status"
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, 'Tenant B QA', '+593000000002', 'RLS_TEST', 'B', 'PENDING')
      `,
      [notifBId, tenantB.id, docBId]
    );

    await client.query('SET LOCAL ROLE app_runtime_rls');

    const ctxNoTenant = await queryVisibility(client, {
      notaryId: '',
      isSuperAdmin: false,
      docAId,
      docBId,
      eventAId,
      eventBId,
      notifAId,
      notifBId
    });

    const ctxTenantA = await queryVisibility(client, {
      notaryId: tenantA.id,
      isSuperAdmin: false,
      docAId,
      docBId,
      eventAId,
      eventBId,
      notifAId,
      notifBId
    });

    const ctxTenantB = await queryVisibility(client, {
      notaryId: tenantB.id,
      isSuperAdmin: false,
      docAId,
      docBId,
      eventAId,
      eventBId,
      notifAId,
      notifBId
    });

    const ctxSuperAdmin = await queryVisibility(client, {
      notaryId: '',
      isSuperAdmin: true,
      docAId,
      docBId,
      eventAId,
      eventBId,
      notifAId,
      notifBId
    });

    assertVisibility('without_tenant_context', ctxNoTenant, {
      doc_a: 0,
      doc_b: 0,
      event_a: 0,
      event_b: 0,
      notif_a: 0,
      notif_b: 0
    });

    assertVisibility('tenant_a_context', ctxTenantA, {
      doc_a: 1,
      doc_b: 0,
      event_a: 1,
      event_b: 0,
      notif_a: 1,
      notif_b: 0
    });

    assertVisibility('tenant_b_context', ctxTenantB, {
      doc_a: 0,
      doc_b: 1,
      event_a: 0,
      event_b: 1,
      notif_a: 0,
      notif_b: 1
    });

    assertVisibility('super_admin_context', ctxSuperAdmin, {
      doc_a: 1,
      doc_b: 1,
      event_a: 1,
      event_b: 1,
      notif_a: 1,
      notif_b: 1
    });

    console.log('A/B isolation verification passed');
    console.log(JSON.stringify({
      tenantA,
      tenantB,
      visibility: [
        formatVisibility('without_tenant_context', ctxNoTenant),
        formatVisibility('tenant_a_context', ctxTenantA),
        formatVisibility('tenant_b_context', ctxTenantB),
        formatVisibility('super_admin_context', ctxSuperAdmin)
      ],
      note: 'Temporary records were created inside a transaction and rolled back.'
    }, null, 2));

    await client.query('ROLLBACK');
    inTransaction = false;
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
    }

    console.error('A/B isolation verification failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
