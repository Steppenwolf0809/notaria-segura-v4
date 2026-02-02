import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw@gondola.proxy.rlwy.net:39316/railway'
    }
  }
});

async function check() {
  // Buscar el pago y sus allocations
  console.log('=== PAGO 001-2601000305 Y SUS ALLOCATIONS ===');
  const payment = await prisma.payment.findFirst({
    where: { receiptNumber: '001-2601000305' },
    include: {
      allocations: {
        include: { invoice: true }
      }
    }
  });

  if (payment) {
    console.log('Recibo:', payment.receiptNumber);
    console.log('Monto Total:', Number(payment.amount));
    console.log('Concepto:', payment.concept);
    console.log('Allocations:', payment.allocations.length);
    payment.allocations.forEach(a => {
      console.log('  ->', a.invoice.invoiceNumber, '| Allocated:', Number(a.allocatedAmount), '| Estado:', a.invoice.status);
    });
  } else {
    console.log('Pago no encontrado');
  }

  // Verificar factura 124370
  console.log('');
  console.log('=== FACTURA 124370 ===');
  const invoice370 = await prisma.invoice.findFirst({
    where: { invoiceNumber: { contains: '124370' } },
    include: {
      allocations: {
        include: { payment: true }
      }
    }
  });

  if (invoice370) {
    console.log('Numero:', invoice370.invoiceNumber);
    console.log('Cliente:', invoice370.clientName);
    console.log('Monto:', Number(invoice370.totalAmount));
    console.log('Estado:', invoice370.status);
    console.log('Allocations:', invoice370.allocations.length);
    const totalPaid = invoice370.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
    console.log('Total Pagado (via allocations):', totalPaid);
    invoice370.allocations.forEach(a => {
      console.log('  <- Pago:', a.payment.receiptNumber, '| Monto:', Number(a.allocatedAmount));
    });
  } else {
    console.log('Factura no encontrada');
  }

  // Verificar factura 124369 para comparar
  console.log('');
  console.log('=== FACTURA 124369 ===');
  const invoice369 = await prisma.invoice.findFirst({
    where: { invoiceNumber: { contains: '124369' } },
    include: {
      allocations: {
        include: { payment: true }
      }
    }
  });

  if (invoice369) {
    console.log('Numero:', invoice369.invoiceNumber);
    console.log('Cliente:', invoice369.clientName);
    console.log('Monto:', Number(invoice369.totalAmount));
    console.log('Estado:', invoice369.status);
    console.log('Allocations:', invoice369.allocations.length);
    const totalPaid = invoice369.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
    console.log('Total Pagado (via allocations):', totalPaid);
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
