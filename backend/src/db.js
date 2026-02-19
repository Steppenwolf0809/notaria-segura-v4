import { PrismaClient } from '@prisma/client';
import cache from './services/cache-service.js';
import { getTenantRequestContext, runWithTenantRequestContext } from './utils/request-tenant-context.js';
import { applyTenantRlsContext } from './utils/apply-tenant-rls-context.js';

/**
 * Singleton PrismaClient instance.
 * Previene multiples conexiones a la base de datos.
 */
let prisma = null;

const TENANT_SCOPED_PRISMA_MODELS = new Set([
  'Document',
  'DocumentEvent',
  'WhatsAppNotification'
]);

const TENANT_SCOPED_PRISMA_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany'
]);

function toPrismaDelegateKey(modelName) {
  if (!modelName || typeof modelName !== 'string') {
    return null;
  }
  return `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;
}

function hasTenantScopedAction(params) {
  return TENANT_SCOPED_PRISMA_MODELS.has(params?.model)
    && TENANT_SCOPED_PRISMA_ACTIONS.has(params?.action);
}

function resolveActiveTenantContext() {
  return getTenantRequestContext() || {
    notaryId: null,
    isSuperAdmin: false,
    source: 'implicit-default'
  };
}

async function ensureExtensions(client) {
  try {
    // Intentar habilitar extension unaccent para busquedas acento-insensibles.
    await client.$executeRaw`CREATE EXTENSION IF NOT EXISTS unaccent`;
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Aviso: no se pudo habilitar extension unaccent:', e.message);
    }
  }
}

/**
 * Forzar codificacion UTF-8 para evitar problemas con caracteres especiales.
 */
async function ensureUTF8Encoding(client) {
  try {
    await client.$executeRaw`SET client_encoding = 'UTF8'`;
    console.log('Client encoding establecido a UTF8');
  } catch (e) {
    console.warn('No se pudo establecer client_encoding:', e.message);
  }
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty'
  });
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();

    const originalTransaction = prisma.$transaction.bind(prisma);
    prisma.$transaction = async (transactionArg, ...transactionOptions) => {
      if (typeof transactionArg !== 'function') {
        return originalTransaction(transactionArg, ...transactionOptions);
      }

      const tenantContext = resolveActiveTenantContext();
      return originalTransaction(async (tx) => {
        await applyTenantRlsContext(tx, tenantContext);
        return runWithTenantRequestContext(tenantContext, () => transactionArg(tx));
      }, ...transactionOptions);
    };

    // Aplica contexto tenant por query para modelos protegidos por RLS.
    prisma.$use(async (params, next) => {
      if (params?.runInTransaction || !hasTenantScopedAction(params)) {
        return next(params);
      }

      const tenantContext = resolveActiveTenantContext();

      const delegateKey = toPrismaDelegateKey(params.model);
      if (!delegateKey) {
        return next(params);
      }

      const args = params?.args || {};

      return prisma.$transaction(async (tx) => {
        const delegate = tx[delegateKey];
        if (!delegate || typeof delegate[params.action] !== 'function') {
          throw new Error(`Delegate Prisma no disponible para ${params.model}.${params.action}`);
        }

        return runWithTenantRequestContext(tenantContext, () => delegate[params.action](args));
      });
    });

    // Invalidador de cache: mutaciones de Document y relacionadas.
    prisma.$use(async (params, next) => {
      const result = await next(params);
      try {
        const action = params?.action;
        const model = (params?.model || '').toString();
        const isMutation = ['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'].includes(action);
        const modelsToWatch = new Set([
          'Document', 'document',
          'DocumentEvent', 'documentEvent',
          'WhatsAppNotification', 'whatsAppNotification'
        ]);
        if (isMutation && modelsToWatch.has(model)) {
          cache.invalidateByTag('documents').catch(() => { });
        }
      } catch (e) {
        // No romper el request si falla la invalidacion.
      }
      return result;
    });

    ensureExtensions(prisma).catch(() => { });
    ensureUTF8Encoding(prisma).catch(() => { });
  }
  return prisma;
}

export async function closePrismaClient() {
  if (prisma) {
    console.log('Cerrando conexion de base de datos...');
    await prisma.$disconnect();
    prisma = null;
    console.log('Prisma client desconectado correctamente');
  }
}

// Export directo de la instancia para compatibilidad
export const db = getPrismaClient();
export default getPrismaClient();
