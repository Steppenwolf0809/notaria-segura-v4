import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient instance
 * Previene múltiples conexiones a la base de datos
 */

let prisma = null;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty'
  });
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();
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