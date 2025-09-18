#!/usr/bin/env node
/**
 * Verificar valores existentes de documentType en la BD
 * y detectar posibles conflictos con el nuevo enum
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentTypes() {
  // Tomar DATABASE_URL de argumentos de línea de comandos o variable de entorno
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no configurada. Pasa la URL como primer argumento o configura la variable de entorno');
  }

  // Configurar Prisma con la URL proporcionada
  process.env.DATABASE_URL = databaseUrl;

  console.log('🔍 Verificando valores de documentType en la base de datos...\n');

  try {
    // Obtener todos los valores únicos de documentType
    const result = await prisma.$queryRaw`
      SELECT DISTINCT "documentType", COUNT(*) as count
      FROM documents
      GROUP BY "documentType"
      ORDER BY count DESC
    `;

    console.log('📊 Valores actuales de documentType en la BD:');
    console.log('='.repeat(50));

    const validTypes = ['PROTOCOLO', 'DILIGENCIA', 'ARRENDAMIENTO', 'CERTIFICACION', 'OTROS'];
    let totalDocuments = 0;
    let invalidDocuments = 0;

    result.forEach(row => {
      const type = row.documentType;
      const count = Number(row.count);
      totalDocuments += count;

      const isValid = validTypes.includes(type);
      const status = isValid ? '✅' : '❌';

      console.log(`${status} ${type}: ${count} documentos`);

      if (!isValid) {
        invalidDocuments += count;
      }
    });

    console.log('='.repeat(50));
    console.log(`📈 Total documentos: ${totalDocuments}`);
    console.log(`❌ Documentos con tipos inválidos: ${invalidDocuments}`);

    if (invalidDocuments > 0) {
      console.log('\n⚠️  ALERTA: Hay documentos con tipos que no coinciden con el enum!');
      console.log('Esto causará errores P2032. Se recomienda normalizar estos valores.');

      // Mostrar documentos problemáticos
      console.log('\n🔧 Documentos con tipos inválidos (primeros 10):');
      const invalidDocs = await prisma.$queryRaw`
        SELECT id, "protocolNumber", "documentType", "clientName"
        FROM documents
        WHERE "documentType" NOT IN ('PROTOCOLO', 'DILIGENCIA', 'ARRENDAMIENTO', 'CERTIFICACION', 'OTROS')
        LIMIT 10
      `;

      invalidDocs.forEach(doc => {
        console.log(`  - ID: ${doc.id}, Protocolo: ${doc.protocolNumber}, Tipo: "${doc.documentType}", Cliente: ${doc.clientName}`);
      });
    } else {
      console.log('\n✅ Todos los tipos de documento son válidos para el enum.');
    }

    // Verificar si el enum existe en la BD
    console.log('\n🔍 Verificando enum DocumentType en PostgreSQL...');
    const enumCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'DocumentType' AND n.nspname = 'public'
    `;

    if (enumCheck[0].count > 0) {
      console.log('✅ Enum DocumentType existe en la base de datos');

      // Mostrar valores del enum
      const enumValues = await prisma.$queryRaw`
        SELECT enumtypid, enumlabel
        FROM pg_enum
        WHERE enumtypid = (
          SELECT oid FROM pg_type t
          JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'DocumentType' AND n.nspname = 'public'
        )
        ORDER BY enumsortorder
      `;

      console.log('📋 Valores del enum en BD:');
      enumValues.forEach(val => {
        console.log(`  - ${val.enumlabel}`);
      });
    } else {
      console.log('❌ Enum DocumentType NO existe en la base de datos');
      console.log('Esto causará errores P2032. Se necesita crear el enum.');
    }

  } catch (error) {
    console.error('❌ Error verificando tipos de documento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
checkDocumentTypes().catch(console.error);