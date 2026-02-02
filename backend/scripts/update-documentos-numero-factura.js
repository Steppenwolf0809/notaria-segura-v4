/**
 * Script para actualizar el campo numeroFactura en documentos existentes
 * Extrae el número de factura del xmlOriginal guardado en cada documento
 * 
 * Uso: node scripts/update-documentos-numero-factura.js
 */

import { db as prisma } from '../src/db.js';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

/**
 * Extrae el número de factura del XML (formato: estab-ptoEmi-secuencial)
 */
function extractNumeroFacturaFromXml(xmlContent) {
  try {
    // Buscar estab, ptoEmi y secuencial en el XML con regex
    const estabMatch = xmlContent.match(/<estab>(\d+)<\/estab>/);
    const ptoEmiMatch = xmlContent.match(/<ptoEmi>(\d+)<\/ptoEmi>/);
    const secuencialMatch = xmlContent.match(/<secuencial>(\d+)<\/secuencial>/);
    
    if (estabMatch && ptoEmiMatch && secuencialMatch) {
      const estab = estabMatch[1];
      const ptoEmi = ptoEmiMatch[1];
      const secuencial = secuencialMatch[1];
      return `${estab}-${ptoEmi}-${secuencial}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error extrayendo número de factura:', error);
    return null;
  }
}

async function updateDocumentosNumeroFactura() {
  console.log('🚀 Iniciando actualización de documentos...\n');
  
  try {
    // Buscar todos los documentos que no tienen numeroFactura pero sí tienen xmlOriginal
    const documentos = await prisma.document.findMany({
      where: {
        numeroFactura: null,
        xmlOriginal: {
          not: null
        }
      },
      select: {
        id: true,
        protocolNumber: true,
        xmlOriginal: true
      }
    });
    
    console.log(`📋 Encontrados ${documentos.length} documentos sin numeroFactura\n`);
    
    let actualizados = 0;
    let errores = 0;
    let sinNumero = 0;
    
    for (const doc of documentos) {
      try {
        // Extraer número de factura del XML
        const numeroFactura = extractNumeroFacturaFromXml(doc.xmlOriginal);
        
        if (numeroFactura) {
          // Actualizar el documento
          await prisma.document.update({
            where: { id: doc.id },
            data: { numeroFactura }
          });
          
          console.log(`✅ ${doc.protocolNumber} → ${numeroFactura}`);
          actualizados++;
        } else {
          console.log(`⚠️  ${doc.protocolNumber} → No se encontró número de factura en XML`);
          sinNumero++;
        }
      } catch (error) {
        console.error(`❌ Error en ${doc.protocolNumber}:`, error.message);
        errores++;
      }
    }
    
    console.log('\n📊 RESUMEN:');
    console.log(`   Actualizados: ${actualizados}`);
    console.log(`   Sin número en XML: ${sinNumero}`);
    console.log(`   Errores: ${errores}`);
    console.log(`   Total procesados: ${documentos.length}`);
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
updateDocumentosNumeroFactura();
