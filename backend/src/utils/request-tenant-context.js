import { AsyncLocalStorage } from 'node:async_hooks';

const requestTenantContextStorage = new AsyncLocalStorage();

function normalizeTenantContext(context = {}) {
  return {
    notaryId: context?.notaryId || null,
    isSuperAdmin: Boolean(context?.isSuperAdmin),
    source: context?.source || null
  };
}

/**
 * Ejecuta una funcion con contexto tenant asociado al request actual.
 * El contexto se propaga a operaciones async dentro de la misma cadena.
 */
export function runWithTenantRequestContext(context, operation) {
  const normalized = normalizeTenantContext(context);
  return requestTenantContextStorage.run(normalized, operation);
}

/**
 * Obtiene el contexto tenant activo en la ejecucion actual.
 */
export function getTenantRequestContext() {
  return requestTenantContextStorage.getStore() || null;
}
