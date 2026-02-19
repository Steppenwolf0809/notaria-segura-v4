const DEFAULT_DB_RLS_RUNTIME_ROLE = 'app_runtime_rls';
const SAFE_DB_ROLE_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function normalizeRuntimeRole() {
  const configuredRole = typeof process.env.DB_RLS_RUNTIME_ROLE === 'string'
    ? process.env.DB_RLS_RUNTIME_ROLE.trim()
    : '';

  if (!configuredRole) {
    return DEFAULT_DB_RLS_RUNTIME_ROLE;
  }

  if (configuredRole.toLowerCase() === 'disabled') {
    return null;
  }

  if (!SAFE_DB_ROLE_PATTERN.test(configuredRole)) {
    throw new Error('DB_RLS_RUNTIME_ROLE contiene caracteres invalidos');
  }

  return configuredRole;
}

/**
 * Aplica el contexto de tenant para que RLS sea evaluado en modo fail-closed.
 * Debe ejecutarse al inicio de cada transaccion request-scoped.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ notaryId?: string | null, isSuperAdmin?: boolean }} tenantContext
 */
export async function applyTenantRlsContext(tx, tenantContext = {}) {
  const runtimeRole = normalizeRuntimeRole();

  if (runtimeRole) {
    if (typeof tx.$executeRawUnsafe === 'function') {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${runtimeRole}`);
    }
  }

  const notaryId = tenantContext?.notaryId || '';
  const isSuperAdmin = tenantContext?.isSuperAdmin ? 'true' : 'false';

  await tx.$executeRaw`SELECT set_config('app.current_notary_id', ${notaryId}, true)`;
  await tx.$executeRaw`SELECT set_config('app.is_super_admin', ${isSuperAdmin}, true)`;
}
