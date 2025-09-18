#!/usr/bin/env node
/**
 * Verificar valores existentes de status en la BD
 * y detectar posibles conflictos con el enum DocumentStatus
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentStatus() {
  // Tomar DATABASE_URL de argumentos de línea de comandos o variable de entorno
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no configurada. Pasa la URL como primer argumento o configura la variable de entorno');
  }

  // Configurar Prisma con la URL proporcionada
  process.env.DATABASE_URL = databaseUrl;

  console.log('🔍 Verificando valores de status en la base de datos...\n');

  try {
    // Obtener todos los valores únicos de status
    const result = await prisma.$queryRaw`
      SELECT DISTINCT "status", COUNT(*) as count
      FROM documents
      GROUP BY "status"
      ORDER BY count DESC
    `;

    console.log('📊 Valores actuales de status en la BD:');
    console.log('='.repeat(50));

    // Valores esperados para el enum DocumentStatus
    const expectedValues = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    let totalDocuments = 0;
    let invalidDocuments = 0;

    result.forEach(row => {
      const status = row.status;
      const count = Number(row.count);
      totalDocuments += count;

      const isValid = expectedValues.includes(status);
      const statusIcon = isValid ? '✅' : '❌';

      console.log(`${statusIcon} ${status}: ${count} documentos`);

      if (!isValid) {
        invalidDocuments += count;
      }
    });

    console.log('='.repeat(50));
    console.log(`📈 Total documentos: ${totalDocuments}`);
    console.log(`❌ Documentos con status inválidos: ${invalidDocuments}`);

    if (invalidDocuments > 0) {
      console.log('\n⚠️  ALERTA: Hay documentos con status que no coinciden con el enum!');
      console.log('Esto causará errores P2032. Se recomienda normalizar estos valores.');

      // Mostrar documentos problemáticos
      console.log('\n🔧 Documentos con status inválidos (primeros 10):');
      const invalidDocs = await prisma.$queryRaw`
        SELECT id, "protocolNumber", "status", "clientName"
        FROM documents
        WHERE "status" NOT IN ('PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO')
        LIMIT 10
      `;

      invalidDocs.forEach(doc => {
        console.log(`  - ID: ${doc.id}, Protocolo: ${doc.protocolNumber}, Status: "${doc.status}", Cliente: ${doc.clientName}`);
      });
    } else {
      console.log('\n✅ Todos los status de documento son válidos.');
    }

    // Verificar si existe algún tipo enum para status
    console.log('\n🔍 Verificando si existe enum para status en PostgreSQL...');
    try {
      const enumCheck = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typname = 'DocumentStatus' AND n.nspname = 'public'
      `;

      if (enumCheck[0].count > 0) {
        console.log('✅ Enum DocumentStatus existe en la base de datos');
      } else {
        console.log('ℹ️  No existe enum DocumentStatus en la BD (status se maneja como String)');
      }
    } catch (error) {
      console.log('ℹ️  No se pudo verificar enum (posiblemente no existe)');
    }

  } catch (error) {
    console.error('❌ Error verificando status de documento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
checkDocumentStatus().catch(console.error);