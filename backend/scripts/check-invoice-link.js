import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL no esta configurada.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function check() {
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
    invoice.payments.forEach(function(p) {
      console.log('  -', p.receiptNumber, ':', Number(p.amount));
    });
  } else {
    console.log('No encontrada');
  }

  const docs = await prisma.document.findMany({
    where: {
      clientName: { contains: 'DELGADO', mode: 'insensitive' }
    },
    select: {
      id: true,
      protocolNumber: true,
      numeroFactura: true,
      clientName: true
    },
    take: 10
  });

  console.log('');
  console.log('=== DOCUMENTOS DELGADO ===');
  docs.forEach(function(d) {
    console.log(d.protocolNumber, '| TaxId:', d.clientTaxId, '| Factura:', d.numeroFactura || 'NULL');
  });

  const linkedInvoices = await prisma.invoice.count({
    where: { documentId: { not: null } }
  });
  const totalInvoices = await prisma.invoice.count();

  console.log('');
  console.log('=== ESTADISTICAS ===');
  console.log('Facturas vinculadas:', linkedInvoices, '/', totalInvoices);

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });`r`n