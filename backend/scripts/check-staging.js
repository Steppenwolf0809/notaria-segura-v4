import { db as prisma } from '../src/db.js';

async function checkStaging() {
  try {
    console.log('🔍 Verificando conexión a Staging...');
    
    // Verificar tablas
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invoices', 'payments', 'users')
    `;
    console.log('✅ Tablas encontradas:', tables.map(t => t.table_name));
    
    // Verificar columnas en invoices
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      AND column_name IN ('assignedToId', 'matrizador', 'documentId')
    `;
    console.log('✅ Columnas en invoices:', columns);
    
    // Contar registros
    const invoiceCount = await prisma.invoice.count();
    console.log('✅ Total de facturas:', invoiceCount);
    
    // Intentar una consulta simple con relación
    const testInvoice = await prisma.invoice.findFirst({
      include: {
        document: true,
        assignedTo: true
      }
    });
    console.log('✅ Consulta con relaciones exitosa');
    
    await prisma.$disconnect();
    console.log('✅ Todo correcto!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkStaging();
