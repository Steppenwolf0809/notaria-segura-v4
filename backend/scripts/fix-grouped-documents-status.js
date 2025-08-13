import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para corregir documentos que quedaron en estado AGRUPADO
 * Los devuelve a su estado lógico correcto (EN_PROCESO o LISTO)
 */
async function fixGroupedDocumentsStatus() {
  try {
    console.log('🔧 Iniciando corrección de documentos con estado AGRUPADO...');
    
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');
    
    // Buscar todos los documentos que están en estado AGRUPADO
    const groupedDocuments = await prisma.document.findMany({
      where: {
        status: 'AGRUPADO',
        isGrouped: true
      },
      include: {
        documentGroup: true
      }
    });
    
    console.log(`📋 Encontrados ${groupedDocuments.length} documentos con estado AGRUPADO`);
    
    if (groupedDocuments.length === 0) {
      console.log('✅ No hay documentos para corregir');
      return;
    }
    
    let correctedCount = 0;
    let errors = [];
    
    for (const doc of groupedDocuments) {
      try {
        // Determinar el estado correcto basado en el estado del grupo
        let newStatus;
        
        if (doc.documentGroup) {
          // Si el grupo está READY, los documentos deben estar LISTO
          if (doc.documentGroup.status === 'READY') {
            newStatus = 'LISTO';
          } 
          // Si el grupo está IN_PROCESS, los documentos deben estar EN_PROCESO
          else if (doc.documentGroup.status === 'IN_PROCESS') {
            newStatus = 'EN_PROCESO';
          }
          // Si el grupo está DELIVERED, los documentos deben estar ENTREGADO
          else if (doc.documentGroup.status === 'DELIVERED') {
            newStatus = 'ENTREGADO';
          }
          else {
            // Estado desconocido del grupo, asumir EN_PROCESO por seguridad
            newStatus = 'EN_PROCESO';
          }
        } else {
          // Sin grupo asociado, asumir EN_PROCESO
          newStatus = 'EN_PROCESO';
        }
        
        // Actualizar el documento
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: newStatus }
        });
        
        correctedCount++;
        console.log(`✅ Documento ${doc.protocolNumber}: AGRUPADO → ${newStatus}`);
        
      } catch (error) {
        const errorMsg = `Error corrigiendo documento ${doc.protocolNumber}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log('\n📊 RESUMEN DE CORRECCIÓN:');
    console.log(`✅ Documentos corregidos: ${correctedCount}`);
    console.log(`❌ Errores: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrores encontrados:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Verificación final
    const remainingGrouped = await prisma.document.count({
      where: { status: 'AGRUPADO' }
    });
    
    console.log(`\n🔍 Verificación final: ${remainingGrouped} documentos quedan con estado AGRUPADO`);
    
    if (remainingGrouped === 0) {
      console.log('🎉 ¡Todos los documentos AGRUPADO han sido corregidos!');
    }
    
  } catch (error) {
    console.error('❌ Error general en la corrección:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Función alternativa para casos específicos
 * Permite corregir documentos agrupados a un estado específico
 */
async function fixGroupedDocumentsToSpecificStatus(targetStatus = 'EN_PROCESO') {
  try {
    console.log(`🔧 Corrigiendo documentos AGRUPADO a estado: ${targetStatus}`);
    
    await prisma.$connect();
    
    const result = await prisma.document.updateMany({
      where: {
        status: 'AGRUPADO',
        isGrouped: true
      },
      data: {
        status: targetStatus
      }
    });
    
    console.log(`✅ ${result.count} documentos actualizados de AGRUPADO a ${targetStatus}`);
    
  } catch (error) {
    console.error('❌ Error en corrección específica:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'smart';
  const targetStatus = process.argv[3] || 'EN_PROCESO';
  
  if (mode === 'smart') {
    console.log('🤖 Modo inteligente: analizando estado de grupos...');
    fixGroupedDocumentsStatus()
      .then(() => {
        console.log('✅ Corrección inteligente completada');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Corrección inteligente falló:', error);
        process.exit(1);
      });
  } else if (mode === 'force') {
    console.log(`🔨 Modo forzado: estableciendo todos a ${targetStatus}...`);
    fixGroupedDocumentsToSpecificStatus(targetStatus)
      .then(() => {
        console.log('✅ Corrección forzada completada');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Corrección forzada falló:', error);
        process.exit(1);
      });
  } else {
    console.log('❌ Modo inválido. Uso:');
    console.log('  node fix-grouped-documents-status.js smart');
    console.log('  node fix-grouped-documents-status.js force [EN_PROCESO|LISTO]');
    process.exit(1);
  }
}

export { fixGroupedDocumentsStatus, fixGroupedDocumentsToSpecificStatus };