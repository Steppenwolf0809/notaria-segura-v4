import { db } from '../src/db.js';

async function checkInvoices() {
  console.log('Verificando facturas en Invoice...');
  
  try {
    const invoices = await db.invoice.findMany({
      take: 10,
      orderBy: { importedAt: 'desc' },
      select: {
        invoiceNumber: true,
        clientName: true,
        matrizador: true,
        status: true,
        totalAmount: true,
        paidAmount: true
      }
    });
    
    console.log('\n=== ÚLTIMAS 10 FACTURAS ===');
    invoices.forEach((inv, i) => {
      console.log(`${i+1}. ${inv.invoiceNumber} | ${inv.clientName?.substring(0,30)} | matrizador: "${inv.matrizador}" | status: ${inv.status}`);
    });
    
    // Contar por matrizador
    const byMatrizador = await db.invoice.groupBy({
      by: ['matrizador'],
      _count: true
    });
    
    console.log('\n=== FACTURAS POR MATRIZADOR ===');
    byMatrizador.forEach(g => {
      console.log(`  ${g.matrizador || '(null)'}: ${g._count} facturas`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkInvoices();
