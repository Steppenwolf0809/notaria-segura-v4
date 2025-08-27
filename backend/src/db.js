import { PrismaClient } from '@prisma/client';

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

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty'
  });
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();
    // Intentar asegurar extensiones útiles en segundo plano (no bloquear)
    ensureExtensions(prisma).catch(() => {});
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
