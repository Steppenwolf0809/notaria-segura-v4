/**
 * Script para poblar numeroFactura desde xmlOriginal
 * y vincular facturas existentes a documentos
 * 
 * Ejecutar: node scripts/fix-numerofactura-from-xml.js
 */

const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function extractNumeroFacturaFromXml(xmlOriginal) {
  if (!xmlOriginal) return null;
  
  const estabMatch = xmlOriginal.match(/<estab>(\d+)<\/estab>/);
  const ptoEmiMatch = xmlOriginal.match(/<ptoEmi>(\d+)<\/ptoEmi>/);
  const secuencialMatch = xmlOriginal.match(/<secuencial>(\d+)<\/secuencial>/);
  
  if (estabMatch && ptoEmiMatch && secuencialMatch) {
    return `${estabMatch[1]}-${ptoEmiMatch[1]}-${secuencialMatch[1]}`;
  }
  return null;
}

async function main() {
  console.log('🔧 Iniciando corrección de numeroFactura desde xmlOriginal...\n');
  
  // 1. Obtener documentos sin numeroFactura pero con xmlOriginal
  const docsWithoutNumero = await prisma.document.findMany({
    where: {
      numeroFactura: null,
      xmlOriginal: { not: null }
    },
    select: {
      id: true,
      protocolNumber: true,
      xmlOriginal: true,
      totalFactura: true
    }
  });
  
  console.log(`📄 Documentos sin numeroFactura pero con xmlOriginal: ${docsWithoutNumero.length}`);
  
  let updated = 0;
  let linked = 0;
  let errors = [];
  
  for (const doc of docsWithoutNumero) {
    const numeroFactura = await extractNumeroFacturaFromXml(doc.xmlOriginal);
    
    if (numeroFactura) {
      try {
        // Actualizar documento con numeroFactura
        await prisma.document.update({
          where: { id: doc.id },
          data: { numeroFactura }
        });
        updated++;
        
        // Intentar vincular factura existente
        // Buscar por múltiples formatos del número de factura
        const secuencial = numeroFactura.split('-')[2];
        const invoice = await prisma.invoice.findFirst({
          where: {
            documentId: null,
            OR: [
              { invoiceNumber: numeroFactura },
              { invoiceNumber: { contains: secuencial } },
              { invoiceNumberRaw: { contains: secuencial } }
            ]
          }
        });
        
        if (invoice) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { documentId: doc.id }
          });
          linked++;
          console.log(`  ✅ ${doc.protocolNumber}: ${numeroFactura} → Factura vinculada (${invoice.invoiceNumber})`);
        } else {
          console.log(`  📝 ${doc.protocolNumber}: ${numeroFactura} → Sin factura para vincular`);
        }
      } catch (err) {
        errors.push({ doc: doc.protocolNumber, error: err.message });
        console.log(`  ❌ ${doc.protocolNumber}: Error - ${err.message}`);
      }
    }
  }
  
  console.log('\n📊 RESUMEN:');
  console.log(`   Documentos procesados: ${docsWithoutNumero.length}`);
  console.log(`   numeroFactura actualizado: ${updated}`);
  console.log(`   Facturas vinculadas: ${linked}`);
  console.log(`   Errores: ${errors.length}`);
  
  // 2. Vincular facturas huérfanas a documentos que ya tienen numeroFactura
  console.log('\n🔗 Vinculando facturas huérfanas a documentos existentes...');
  
  const orphanInvoices = await prisma.invoice.findMany({
    where: { documentId: null },
    select: { id: true, invoiceNumber: true, invoiceNumberRaw: true }
  });
  
  console.log(`   Facturas sin documento: ${orphanInvoices.length}`);
  
  let linkedOrphans = 0;
  for (const inv of orphanInvoices) {
    // Extraer secuencial del número de factura
    const parts = (inv.invoiceNumber || '').split('-');
    const secuencial = parts.length === 3 ? parts[2] : null;
    
    if (secuencial) {
      const doc = await prisma.document.findFirst({
        where: {
          OR: [
            { numeroFactura: inv.invoiceNumber },
            { numeroFactura: { contains: secuencial } }
          ]
        },
        select: { id: true, protocolNumber: true }
      });
      
      if (doc) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { documentId: doc.id }
        });
        linkedOrphans++;
        console.log(`   ✅ Factura ${inv.invoiceNumber} → Doc ${doc.protocolNumber}`);
      }
    }
  }
  
  console.log(`\n   Facturas huérfanas vinculadas: ${linkedOrphans}`);
  console.log('\n✅ Proceso completado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
