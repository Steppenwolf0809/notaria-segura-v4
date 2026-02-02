/**
 * Script para actualizar documentos recientes con numeroFactura y fechaFactura
 * Extrae la información del xmlOriginal guardado en cada documento
 * 
 * Uso: node scripts/fix-documentos-recientes.js
 */

import { db as prisma } from '../src/db.js';

/**
 * Extrae el número de factura del XML
 */
function extractNumeroFacturaFromXml(xmlContent) {
  try {
    const estabMatch = xmlContent.match(/<estab>(\d+)<\/estab>/);
    const ptoEmiMatch = xmlContent.match(/<ptoEmi>(\d+)<\/ptoEmi>/);
    const secuencialMatch = xmlContent.match(/<secuencial>(\d+)<\/secuencial>/);
    
    if (estabMatch && ptoEmiMatch && secuencialMatch) {
      return `${estabMatch[1]}-${ptoEmiMatch[1]}-${secuencialMatch[1]}`;
    }
    return null;
  } catch (error) {
    console.error('Error extrayendo número de factura:', error);
    return null;
  }
}

/**
 * Extrae la fecha de emisión del XML
 */
function extractFechaEmisionFromXml(xmlContent) {
  try {
    const fechaMatch = xmlContent.match(/<fechaEmision>(\d{2})\/(\d{2})\/(\d{4})<\/fechaEmision>/);
    if (fechaMatch) {
      const day = parseInt(fechaMatch[1], 10);
      const month = parseInt(fechaMatch[2], 10) - 1;
      const year = parseInt(fechaMatch[3], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    return null;
  } catch (error) {
    console.error('Error extrayendo fecha:', error);
    return null;
  }
}

async function fixDocumentosRecientes() {
  console.log('🚀 Iniciando corrección de documentos recientes...\n');
  
  try {
    // Buscar documentos de las últimas 24 horas sin numeroFactura
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const documentos = await prisma.document.findMany({
      where: {
        createdAt: {
          gte: hace24Horas
        },
        xmlOriginal: {
          not: null
        }
      },
      select: {
        id: true,
        protocolNumber: true,
        xmlOriginal: true,
        numeroFactura: true,
        fechaFactura: true
      }
    });
    
    console.log(`📋 Encontrados ${documentos.length} documentos recientes\n`);
    
    let actualizados = 0;
    let sinCambios = 0;
    
    for (const doc of documentos) {
      try {
        const numeroFactura = extractNumeroFacturaFromXml(doc.xmlOriginal);
        const fechaFactura = extractFechaEmisionFromXml(doc.xmlOriginal);
        
        // Solo actualizar si hay cambios
        const necesitaUpdate = (!doc.numeroFactura && numeroFactura) || 
                               (!doc.fechaFactura && fechaFactura);
        
        if (necesitaUpdate) {
          const updateData = {};
          if (!doc.numeroFactura && numeroFactura) updateData.numeroFactura = numeroFactura;
          if (!doc.fechaFactura && fechaFactura) updateData.fechaFactura = fechaFactura;
          
          await prisma.document.update({
            where: { id: doc.id },
            data: updateData
          });
          
          console.log(`✅ ${doc.protocolNumber}:`);
          if (updateData.numeroFactura) console.log(`   N° Factura: ${updateData.numeroFactura}`);
          if (updateData.fechaFactura) console.log(`   Fecha: ${updateData.fechaFactura.toISOString()}`);
          actualizados++;
        } else {
          console.log(`⏭️  ${doc.protocolNumber} - Sin cambios necesarios`);
          sinCambios++;
        }
      } catch (error) {
        console.error(`❌ Error en ${doc.protocolNumber}:`, error.message);
      }
    }
    
    console.log('\n📊 RESUMEN:');
    console.log(`   Actualizados: ${actualizados}`);
    console.log(`   Sin cambios: ${sinCambios}`);
    console.log(`   Total: ${documentos.length}`);
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
fixDocumentosRecientes();
