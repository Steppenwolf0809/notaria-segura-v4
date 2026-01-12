import { PrismaClient } from '@prisma/client';
import cache from './services/cache-service.js';

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
