const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw@gondola.proxy.rlwy.net:39316/railway'
    }
  }
});

async function check() {
  // 1. Buscar la factura 001002-00124410
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [
        { invoiceNumber: '001-002-000124410' },
        { invoiceNumber: { contains: '124410' } }
      ]
    },
    include: { payments: true }
  });

  console.log('=== FACTURA ===');
  if (invoice) {
    console.log('ID:', invoice.id);
    console.log('Numero:', invoice.invoiceNumber);
    console.log('NumeroRaw:', invoice.invoiceNumberRaw);
    console.log('Cliente:', invoice.clientName);
    console.log('Monto:', Number(invoice.totalAmount));
    console.log('Estado:', invoice.status);
    console.log('DocumentId:', invoice.documentId);
    console.log('Pagos:', invoice.payments.length);
    invoice.payments.forEach(p => {
      console.log('  -', p.receiptNumber, ':', Number(p.amount));
    });
  } else {
    console.log('No encontrada');
  }

  // 2. Buscar documentos del cliente DELGADO SOLANO
  const docs = await prisma.document.findMany({
    where: {
      clientName: { contains: 'DELGADO', mode: 'insensitive' }
    },
    select: {
      id: true,
      protocolNumber: true,
      numeroFactura: true,
      clientName: true,
      clientTaxId: true
    },
    take: 10
  });

  console.log('\n=== DOCUMENTOS DELGADO ===');
  docs.forEach(d => {
    console.log(d.protocolNumber, '| TaxId:', d.clientTaxId, '| Factura:', d.numeroFactura || 'NULL');
  });

  // 3. Buscar facturas vinculadas a documentos
  const linkedInvoices = await prisma.invoice.count({
    where: { documentId: { not: null } }
  });
  const totalInvoices = await prisma.invoice.count();

  console.log('\n=== ESTADISTICAS DE VINCULACION ===');
  console.log('Facturas vinculadas a documentos:', linkedInvoices, '/', totalInvoices);

  // 4. Ver como se ve el numeroFactura en documentos
  const docsWithFactura = await prisma.document.findMany({
    where: { numeroFactura: { not: null } },
    select: { protocolNumber: true, numeroFactura: true },
    take: 5
  });

  console.log('\n=== EJEMPLOS DE numeroFactura EN DOCUMENTOS ===');
  docsWithFactura.forEach(d => {
    console.log(d.protocolNumber, '-> numeroFactura:', d.numeroFactura);
  });

  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
