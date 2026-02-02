import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw@gondola.proxy.rlwy.net:39316/railway'
    }
  }
});

async function check() {
  // Buscar el pago EXACTO 001-2601000305
  console.log('=== PAGO 001-2601000305 ===');
  const payment = await prisma.payment.findFirst({
    where: { receiptNumber: '001-2601000305' },
    include: { invoice: true }
  });

  if (payment) {
    console.log('Recibo:', payment.receiptNumber);
    console.log('Monto:', Number(payment.amount));
    console.log('Fecha:', payment.paymentDate);
    console.log('Concepto:', payment.concept);
    console.log('Invoice ID:', payment.invoiceId);
    console.log('Factura vinculada:', payment.invoice?.invoiceNumber || 'NINGUNA');
  } else {
    console.log('Pago NO EXISTE en la BD');
  }

  // Buscar la factura 124370
  console.log('');
  console.log('=== FACTURA 124370 ===');
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { contains: '124370' } },
    include: { payments: true }
  });

  if (invoice) {
    console.log('ID:', invoice.id);
    console.log('Numero:', invoice.invoiceNumber);
    console.log('Cliente:', invoice.clientName);
    console.log('Monto:', Number(invoice.totalAmount));
    console.log('Estado:', invoice.status);
    console.log('Pagos:', invoice.payments.length);
  }

  // Ver ultimos pagos importados
  console.log('');
  console.log('=== ULTIMOS 5 PAGOS IMPORTADOS ===');
  const recentPayments = await prisma.payment.findMany({
    orderBy: { importedAt: 'desc' },
    take: 5,
    select: { receiptNumber: true, amount: true, importedAt: true }
  });
  recentPayments.forEach(p => {
    console.log(p.receiptNumber, '|', Number(p.amount), '|', p.importedAt);
  });

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
