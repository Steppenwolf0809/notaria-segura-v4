import { db } from '../src/db.js';

async function checkVinculacion() {
  console.log('Verificando vinculación de facturas con documentos...\n');
  
  try {
    // 1. Facturas con documentId (vinculadas)
    const facturasVinculadas = await db.invoice.count({
      where: { documentId: { not: null } }
    });
    
    // 2. Facturas sin documentId
    const facturasSinVincular = await db.invoice.count({
      where: { documentId: null }
    });
    
    // 3. Documentos con facturas
    const docsConFacturas = await db.document.count({
      where: { invoices: { some: {} } }
    });
    
    // 4. Documentos sin facturas
    const docsSinFacturas = await db.document.count({
      where: { invoices: { none: {} } }
    });
    
    // 5. Total documentos
    const totalDocs = await db.document.count();
    
    // 6. Total facturas
    const totalFacturas = await db.invoice.count();
    
    console.log('=== RESUMEN DE VINCULACIÓN ===');
    console.log(`Total facturas: ${totalFacturas}`);
    console.log(`  - Vinculadas a documento: ${facturasVinculadas}`);
    console.log(`  - Sin vincular: ${facturasSinVincular}`);
    console.log('');
    console.log(`Total documentos: ${totalDocs}`);
    console.log(`  - Con facturas: ${docsConFacturas}`);
    console.log(`  - Sin facturas: ${docsSinFacturas}`);
    
    // 7. Muestra de facturas sin vincular
    console.log('\n=== MUESTRA DE FACTURAS SIN VINCULAR (10) ===');
    const muestraSinVincular = await db.invoice.findMany({
      where: { documentId: null },
      take: 10,
      select: {
        invoiceNumber: true,
        invoiceNumberRaw: true,
        clientName: true,
        matrizador: true,
        status: true
      }
    });
    
    muestraSinVincular.forEach((f, i) => {
      console.log(`${i+1}. ${f.invoiceNumber} | ${f.clientName?.substring(0,30)} | ${f.matrizador} | ${f.status}`);
    });
    
    // 8. Muestra de documentos sin facturas
    console.log('\n=== MUESTRA DE DOCUMENTOS SIN FACTURAS (10) ===');
    const muestraDocsSinFacturas = await db.document.findMany({
      where: { invoices: { none: {} } },
      take: 10,
      select: {
        protocolNumber: true,
        clientName: true,
        numeroFactura: true,
        totalFactura: true
      }
    });
    
    muestraDocsSinFacturas.forEach((d, i) => {
      console.log(`${i+1}. ${d.protocolNumber} | ${d.clientName?.substring(0,30)} | factura: ${d.numeroFactura || 'N/A'} | $${d.totalFactura || 0}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkVinculacion();
