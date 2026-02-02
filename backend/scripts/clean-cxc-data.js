import { db } from '../src/db.js';

async function cleanCxcData() {
  console.log('Limpiando datos de cartera CXC y matrizador...');
  
  try {
    // Eliminar pagos primero (FK constraint)
    const payments = await db.payment.deleteMany({});
    console.log('Payments eliminados:', payments.count);
    
    // Eliminar facturas
    const invoices = await db.invoice.deleteMany({});
    console.log('Invoices eliminados:', invoices.count);
    
    // Eliminar PendingReceivable (tabla legacy de cartera)
    const pendingReceivables = await db.pendingReceivable.deleteMany({});
    console.log('PendingReceivables eliminados:', pendingReceivables.count);
    
    // Eliminar logs de importación CXC
    const logs = await db.importLog.deleteMany({
      where: { fileType: { contains: 'CXC' } }
    });
    console.log('ImportLogs CXC eliminados:', logs.count);
    
    // Limpiar también logs de POR_COBRAR
    const logsPorCobrar = await db.importLog.deleteMany({
      where: { fileType: 'POR_COBRAR' }
    });
    console.log('ImportLogs POR_COBRAR eliminados:', logsPorCobrar.count);
    
    console.log('✅ Limpieza completada - Sistema listo para importar CXC como fuente única');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

cleanCxcData();
