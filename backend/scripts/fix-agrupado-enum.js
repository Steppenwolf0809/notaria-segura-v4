import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para agregar el valor AGRUPADO al enum DocumentStatus
 * Este script se puede ejecutar manualmente para sincronizar la base de datos
 */
async function fixAgrupadoEnum() {
  try {
    console.log('🔧 Iniciando corrección del enum DocumentStatus...');
    
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');
    
    // Intentar agregar el valor AGRUPADO al enum
    // Nota: En PostgreSQL, necesitamos usar SQL directo para modificar enums
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'AGRUPADO' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'DocumentStatus'
          )
        ) THEN
          ALTER TYPE "DocumentStatus" ADD VALUE 'AGRUPADO';
          RAISE NOTICE 'Valor AGRUPADO agregado al enum DocumentStatus';
        ELSE
          RAISE NOTICE 'Valor AGRUPADO ya existe en el enum DocumentStatus';
        END IF;
      END $$;
    `;
    
    console.log('✅ Enum DocumentStatus actualizado correctamente');
    
    // Verificar que el enum tiene todos los valores esperados
    const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'DocumentStatus'
      ORDER BY e.enumsortorder;
    `;
    
    console.log('📋 Valores actuales en DocumentStatus enum:', 
      result.map(r => r.enumlabel).join(', ')
    );
    
    // Verificar que podemos crear un documento con estado AGRUPADO
    console.log('🧪 Testando funcionalidad del nuevo enum...');
    
    // Solo hacer una verificación, no crear documentos reales
    const count = await prisma.document.count({
      where: { status: 'AGRUPADO' }
    });
    
    console.log(`✅ Documentos en estado AGRUPADO: ${count}`);
    console.log('🎉 Corrección completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al corregir el enum DocumentStatus:', error);
    
    if (error.message.includes('invalid input value for enum')) {
      console.log('\n💡 SOLUCIÓN:');
      console.log('El problema es que la base de datos no tiene el valor AGRUPADO en el enum.');
      console.log('Ejecute este comando en producción:');
      console.log('npx prisma db push --accept-data-loss');
      console.log('\nO use este script SQL directamente en la base de datos:');
      console.log('ALTER TYPE "DocumentStatus" ADD VALUE \'AGRUPADO\';');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAgrupadoEnum()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falló:', error);
      process.exit(1);
    });
}

export default fixAgrupadoEnum;