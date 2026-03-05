import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * AsyncLocalStorage para el contexto del tenant actual.
 * Permite que el Prisma middleware acceda al notaryId
 * sin necesidad de pasarlo explícitamente en cada create().
 */
const tenantStorage = new AsyncLocalStorage();

/**
 * Express middleware: extrae notaryId de req.user y lo almacena
 * en AsyncLocalStorage para que esté disponible en toda la request.
 *
 * Debe montarse DESPUÉS del auth middleware (que setea req.user).
 */
export function tenantContextMiddleware(req, res, next) {
  const notaryId = req.user?.notaryId || null;
  tenantStorage.run({ notaryId }, next);
}

/**
 * Obtener el notaryId del contexto actual.
 * Retorna null si no hay contexto (ej: webhooks, tareas del sistema).
 */
export function getCurrentNotaryId() {
  const store = tenantStorage.getStore();
  return store?.notaryId || null;
}

/**
 * Ejecutar un callback con un notaryId específico.
 * Útil para servicios que no tienen req.user pero conocen el notaryId.
 */
export function withNotaryId(notaryId, fn) {
  return tenantStorage.run({ notaryId }, fn);
}

export default tenantStorage;
