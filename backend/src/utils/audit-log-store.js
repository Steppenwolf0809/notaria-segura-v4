import { withTenantContext } from './tenant-context.js';

const OPTIONAL_TABLE_MISSING_CODES = new Set(['42P01', '42703']);

function normalizeActorUserId(actorUserId) {
  const parsed = Number.parseInt(actorUserId, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeMetadata(metadata) {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }
  return {};
}

async function insertAuditLog(tx, {
  notaryId,
  actorUserId,
  actorRole,
  action,
  resourceType,
  resourceId,
  metadata,
  ipAddress,
  userAgent
}) {
  await tx.$executeRaw`
    INSERT INTO "audit_logs" (
      "notary_id",
      "actor_user_id",
      "actor_role",
      "action",
      "resource_type",
      "resource_id",
      "metadata",
      "ip_address",
      "user_agent"
    )
    VALUES (
      CAST(${notaryId || null} AS UUID),
      ${normalizeActorUserId(actorUserId)},
      ${actorRole || null},
      ${action},
      ${resourceType},
      ${resourceId || null},
      CAST(${JSON.stringify(normalizeMetadata(metadata))} AS JSONB),
      ${ipAddress || null},
      ${userAgent || null}
    )
  `;
}

/**
 * Persiste trazas de auditoria en la tabla inmutable audit_logs.
 * Usa contexto transaccional tenant para que aplique RLS correctamente.
 */
export async function persistAuditLog({
  prismaClient,
  tenantContext,
  notaryId = null,
  actorUserId = null,
  actorRole = null,
  action,
  resourceType,
  resourceId = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
  failOpen = true
}) {
  if (!prismaClient) {
    throw new Error('persistAuditLog requiere prismaClient');
  }

  if (!action || !resourceType) {
    throw new Error('persistAuditLog requiere action y resourceType');
  }

  const effectiveTenantContext = {
    notaryId: notaryId || tenantContext?.notaryId || null,
    isSuperAdmin: Boolean(tenantContext?.isSuperAdmin)
  };

  try {
    await withTenantContext(prismaClient, effectiveTenantContext, async (tx) => {
      await insertAuditLog(tx, {
        notaryId: effectiveTenantContext.notaryId,
        actorUserId,
        actorRole,
        action,
        resourceType,
        resourceId,
        metadata,
        ipAddress,
        userAgent
      });
    });

    return true;
  } catch (error) {
    if (failOpen && OPTIONAL_TABLE_MISSING_CODES.has(error?.code)) {
      console.warn('audit_logs no disponible temporalmente, se omite persistencia:', error.message);
      return false;
    }

    if (failOpen) {
      console.error('Error persistiendo audit_logs:', error);
      return false;
    }

    throw error;
  }
}
