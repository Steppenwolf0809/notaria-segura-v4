/**
 * Ejecuta una operacion dentro de una transaccion con contexto tenant local.
 * Esto prepara el camino para RLS (SET LOCAL app.current_notary_id / app.is_super_admin).
 *
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {{ notaryId?: string|null, isSuperAdmin?: boolean }} tenantContext
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<any>} operation
 * @returns {Promise<any>}
 */
export async function withTenantContext(prismaClient, tenantContext, operation) {
  const notaryId = tenantContext?.notaryId || '';
  const isSuperAdmin = tenantContext?.isSuperAdmin ? 'true' : 'false';

  return prismaClient.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_notary_id', ${notaryId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_super_admin', ${isSuperAdmin}, true)`;

    return operation(tx);
  });
}

function createTenantContextError(message = 'No existe contexto de notaria para esta sesion') {
  const error = new Error(message);
  error.status = 403;
  return error;
}

/**
 * Resuelve contexto tenant a partir del usuario autenticado en request.
 *
 * @param {{ user?: { isSuperAdmin?: boolean, role?: string, activeNotaryId?: string|null, notaryId?: string|null } }} req
 * @param {{ requireNotaryForNonSuperAdmin?: boolean, missingNotaryMessage?: string }} [options]
 * @returns {{ notaryId: string|null, isSuperAdmin: boolean }}
 */
export function resolveRequestTenantContext(req, options = {}) {
  const {
    requireNotaryForNonSuperAdmin = true,
    missingNotaryMessage = 'No existe contexto de notaria para esta sesion'
  } = options;

  const user = req?.user || {};
  const isSuperAdmin = Boolean(user.isSuperAdmin || user.role === 'SUPER_ADMIN');
  const notaryId = user.activeNotaryId || user.notaryId || null;

  if (requireNotaryForNonSuperAdmin && !isSuperAdmin && !notaryId) {
    throw createTenantContextError(missingNotaryMessage);
  }

  return {
    notaryId,
    isSuperAdmin
  };
}

/**
 * Ejecuta una operacion Prisma con contexto tenant derivado del request actual.
 *
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {object} req
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient, tenantContext: { notaryId: string|null, isSuperAdmin: boolean }) => Promise<any>} operation
 * @param {{ requireNotaryForNonSuperAdmin?: boolean, missingNotaryMessage?: string }} [options]
 * @returns {Promise<any>}
 */
export async function withRequestTenantContext(prismaClient, req, operation, options = {}) {
  const tenantContext = resolveRequestTenantContext(req, options);
  return withTenantContext(prismaClient, tenantContext, (tx) => operation(tx, tenantContext));
}

/**
 * Contexto transaccional minimo para login por email cuando RLS esta activo.
 * Permite politicas de lectura controlada por email sin abrir acceso global.
 *
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {string} email
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<any>} operation
 * @returns {Promise<any>}
 */
export async function withLoginEmailContext(prismaClient, email, operation) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  return prismaClient.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.auth_login_email', ${normalizedEmail}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_notary_id', '', true)`;
    await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'false', true)`;

    return operation(tx);
  });
}

/**
 * Construye where base por tenant para queries no-RLS (fase de transicion).
 *
 * @param {{ user?: { activeNotaryId?: string|null, notaryId?: string|null, isSuperAdmin?: boolean } }} req
 * @param {object} [extraWhere={}]
 * @returns {{ where: object, requiresTenantContext: boolean }}
 */
export function buildTenantScopedWhere(req, extraWhere = {}) {
  const where = { ...extraWhere };
  const isSuperAdmin = Boolean(req?.user?.isSuperAdmin);

  if (!isSuperAdmin) {
    const notaryId = req?.user?.activeNotaryId || req?.user?.notaryId || null;
    if (!notaryId) {
      return {
        where,
        requiresTenantContext: true
      };
    }
    where.notaryId = notaryId;
  }

  return {
    where,
    requiresTenantContext: false
  };
}
