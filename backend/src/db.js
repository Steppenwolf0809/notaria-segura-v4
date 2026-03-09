import { PrismaClient } from '@prisma/client';
import cache from './services/cache-service.js';
import { getCurrentNotaryId, getCurrentIsSuperAdmin } from './middleware/tenant-context.js';

/**
 * Singleton PrismaClient instance
 * Previene múltiples conexiones a la base de datos
 */

let prisma = null;

async function ensureExtensions(client) {
  try {
    // Intentar habilitar extensión unaccent para búsquedas acento-insensibles
    // No falla si ya existe o si no hay permisos
    await client.$executeRaw`CREATE EXTENSION IF NOT EXISTS unaccent`;
  } catch (e) {
    // Silencioso: en algunos entornos no se permite CREATE EXTENSION
    if (process.env.NODE_ENV === 'development') {
      console.warn('Aviso: no se pudo habilitar extensión unaccent:', e.message);
    }
  }
}

/**
 * Forzar codificación UTF-8 para evitar problemas con emojis y caracteres especiales
 * Este es un fix crítico para Railway donde la conexión puede no usar UTF-8 por defecto
 */
async function ensureUTF8Encoding(client) {
  try {
    await client.$executeRaw`SET client_encoding = 'UTF8'`;
    console.log('✅ Client encoding establecido a UTF8');
  } catch (e) {
    console.warn('⚠️ No se pudo establecer client_encoding:', e.message);
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
    // Auto-inject notaryId en creates para tablas tenant-scoped
    const TENANT_MODELS = new Set([
      'Document', 'DocumentEvent', 'Invoice', 'Payment',
      'WhatsAppNotification', 'WhatsAppTemplate',
      'EscrituraQR', 'ProtocoloUAFE', 'FormularioUAFEAsignacion',
      'ImportLog', 'MensajeInterno', 'EncuestaSatisfaccion',
      'ConsultaListaControl', 'PendingReceivable', 'User',
      'ReporteUAFE'
    ]);

    // Modelos tenant-scoped que NO se filtran en reads (acceso cross-tenant necesario)
    const SKIP_READ_FILTER = new Set(['User']);

    const READ_ACTIONS = new Set([
      'findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'
    ]);
    const MUTATION_ACTIONS_WITH_WHERE = new Set([
      'update', 'updateMany', 'delete', 'deleteMany'
    ]);

    prisma.$use(async (params, next) => {
      const model = params?.model;
      if (model && TENANT_MODELS.has(model)) {
        const notaryId = getCurrentNotaryId();
        const isSuperAdmin = getCurrentIsSuperAdmin();

        // SUPER_ADMIN ve todo cross-tenant
        if (notaryId != null && !isSuperAdmin) {
          const action = params.action;

          // --- WRITES: auto-inject notaryId en data ---
          if (action === 'create' && params.args?.data) {
            if (params.args.data.notaryId === undefined) {
              params.args.data.notaryId = notaryId;
            }
          } else if (action === 'createMany' && params.args?.data) {
            const rows = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
            for (const row of rows) {
              if (row.notaryId === undefined) {
                row.notaryId = notaryId;
              }
            }
          } else if (action === 'upsert' && params.args?.create) {
            if (params.args.create.notaryId === undefined) {
              params.args.create.notaryId = notaryId;
            }

          // --- READS: auto-inject notaryId en where ---
          } else if (READ_ACTIONS.has(action) && !SKIP_READ_FILTER.has(model)) {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            if (params.args.where.notaryId === undefined) {
              params.args.where.notaryId = notaryId;
            }

          // --- findUnique: agregar notaryId al where (Prisma lo soporta si hay indice) ---
          } else if (action === 'findUnique' && !SKIP_READ_FILTER.has(model)) {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            if (params.args.where.notaryId === undefined) {
              // Convertir a findFirst para poder filtrar por notaryId
              params.action = 'findFirst';
              params.args.where.notaryId = notaryId;
            }

          // --- MUTATIONS con where: agregar notaryId al filtro ---
          } else if (MUTATION_ACTIONS_WITH_WHERE.has(action) && !SKIP_READ_FILTER.has(model)) {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            if (params.args.where.notaryId === undefined) {
              params.args.where.notaryId = notaryId;
            }
          }
        } else if (notaryId != null && isSuperAdmin) {
          // SUPER_ADMIN: solo auto-inject en creates (no filtra reads)
          const action = params.action;
          if (action === 'create' && params.args?.data) {
            if (params.args.data.notaryId === undefined) {
              params.args.data.notaryId = notaryId;
            }
          } else if (action === 'createMany' && params.args?.data) {
            const rows = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
            for (const row of rows) {
              if (row.notaryId === undefined) {
                row.notaryId = notaryId;
              }
            }
          } else if (action === 'upsert' && params.args?.create) {
            if (params.args.create.notaryId === undefined) {
              params.args.create.notaryId = notaryId;
            }
          }
        }
      }
      return next(params);
    });

    // Invalidador de caché: cualquier mutación de Document y tablas relacionadas.
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
          // Invalidar todas las búsquedas de documentos
          cache.invalidateByTag('documents').catch(() => { });
        }
      } catch (e) {
        // No romper la request si falla la invalidación
      }
      return result;
    });
    // Intentar asegurar extensiones útiles en segundo plano (no bloquear)
    ensureExtensions(prisma).catch(() => { });
    // Forzar UTF-8 para emojis y caracteres especiales
    ensureUTF8Encoding(prisma).catch(() => { });
  }
  return prisma;
}

/**
 * Ejecuta un callback dentro de una transaccion con RLS activo.
 * Usa SET LOCAL ROLE app_runtime_rls + SET LOCAL app.current_notary_id.
 * Si no hay notaryId en el contexto, ejecuta sin RLS (fallback).
 *
 * @param {Function} fn - Recibe el transaction client (tx)
 * @param {Object} opts - Opciones adicionales
 * @param {number} opts.notaryId - Override del notaryId (opcional)
 * @returns {Promise<*>} Resultado del callback
 */
export async function withTenantTransaction(fn, opts = {}) {
  const notaryId = opts.notaryId ?? getCurrentNotaryId();
  const isSuperAdmin = getCurrentIsSuperAdmin();
  const client = getPrismaClient();

  if (notaryId == null) {
    // Sin tenant context: ejecutar sin RLS (superuser bypass)
    return client.$transaction(fn);
  }

  return client.$transaction(async (tx) => {
    // 🔒 SECURITY FIX: Use $executeRaw with tagged template literals instead of $executeRawUnsafe
    await tx.$executeRaw`SET LOCAL ROLE app_runtime_rls`;
    const safeNotaryId = String(parseInt(notaryId, 10));
    await tx.$executeRaw`SET LOCAL app.current_notary_id = ${safeNotaryId}`;
    return fn(tx);
  });
}

export async function closePrismaClient() {
  if (prisma) {
    console.log('🔌 Cerrando conexión de base de datos...');
    await prisma.$disconnect();
    prisma = null;
    console.log('📊 Prisma client desconectado correctamente');
  }
}

// Export directo de la instancia para compatibilidad
export const db = getPrismaClient();
export default getPrismaClient();
