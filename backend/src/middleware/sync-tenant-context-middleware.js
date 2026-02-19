import prisma from '../db.js';
import { runWithTenantRequestContext } from '../utils/request-tenant-context.js';

const DEFAULT_SYNC_NOTARY_CODE = process.env.SYNC_DEFAULT_NOTARY_CODE || 'N18';
const DEFAULT_SYNC_NOTARY_ID = process.env.SYNC_DEFAULT_NOTARY_ID || null;

function readRequestedNotaryId(req) {
  const fromHeader = typeof req.headers['x-notary-id'] === 'string'
    ? req.headers['x-notary-id'].trim()
    : '';
  const fromQuery = typeof req.query?.notaryId === 'string'
    ? req.query.notaryId.trim()
    : '';
  const fromBody = typeof req.body?.notaryId === 'string'
    ? req.body.notaryId.trim()
    : '';

  return fromHeader || fromQuery || fromBody || null;
}

async function resolveSyncNotary(req) {
  const requestedNotaryId = readRequestedNotaryId(req);

  if (requestedNotaryId) {
    return prisma.notary.findFirst({
      where: {
        id: requestedNotaryId,
        isActive: true,
        deletedAt: null
      },
      select: { id: true, code: true, slug: true }
    });
  }

  if (DEFAULT_SYNC_NOTARY_ID) {
    const notaryById = await prisma.notary.findFirst({
      where: {
        id: DEFAULT_SYNC_NOTARY_ID,
        isActive: true,
        deletedAt: null
      },
      select: { id: true, code: true, slug: true }
    });

    if (notaryById) {
      return notaryById;
    }
  }

  return prisma.notary.findFirst({
    where: {
      code: DEFAULT_SYNC_NOTARY_CODE,
      isActive: true,
      deletedAt: null
    },
    select: { id: true, code: true, slug: true }
  });
}

export async function applySyncTenantContext(req, res, next) {
  try {
    const notary = await resolveSyncNotary(req);

    if (!notary) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo resolver la notaria para el contexto de sync'
      });
    }

    const tenantContext = {
      notaryId: notary.id,
      isSuperAdmin: false,
      source: 'sync-api-key'
    };

    req.tenantContext = tenantContext;
    req.syncTenantContext = {
      notaryId: notary.id,
      notaryCode: notary.code,
      notarySlug: notary.slug
    };

    return runWithTenantRequestContext(tenantContext, () => next());
  } catch (error) {
    console.error('[sync-tenant-context] Error resolviendo tenant de sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno resolviendo tenant de sync'
    });
  }
}

export default applySyncTenantContext;
