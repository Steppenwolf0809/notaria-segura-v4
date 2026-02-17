/**
 * Migration script: Create PAYMENT_REGISTERED events retroactively
 * for all existing payments linked to documents.
 *
 * Usage: node scripts/migrate-payment-events.mjs
 */
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Usage: node scripts/migrate-payment-events.mjs <DATABASE_URL>');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
});

const ADMIN_USER_ID = 1; // Will be overridden to "Sistema Koinor" in the UI
const BATCH_SIZE = 100;

async function migrate() {
  let created = 0;
  let skipped = 0;
  let offset = 0;

  console.log('Starting PAYMENT_REGISTERED migration...');

  while (true) {
    const payments = await prisma.payment.findMany({
      where: { invoice: { documentId: { not: null } } },
      include: {
        invoice: {
          select: { documentId: true, invoiceNumber: true, invoiceNumberRaw: true }
        }
      },
      orderBy: { paymentDate: 'asc' },
      skip: offset,
      take: BATCH_SIZE
    });

    if (payments.length === 0) break;

    console.log(`Processing batch at offset ${offset} (${payments.length} payments)...`);

    for (const payment of payments) {
      const documentId = payment.invoice?.documentId;
      if (!documentId) {
        skipped++;
        continue;
      }

      // Idempotency: check if event already exists for this receipt+document
      const existing = await prisma.documentEvent.findFirst({
        where: {
          documentId,
          eventType: 'PAYMENT_REGISTERED',
          details: { contains: payment.receiptNumber }
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      const invoiceNumber = payment.invoice.invoiceNumberRaw || payment.invoice.invoiceNumber || '';
      const amount = parseFloat(payment.amount) || 0;
      const paymentType = payment.paymentType || 'TRANSFER';
      const isCash = paymentType === 'CASH';

      await prisma.documentEvent.create({
        data: {
          documentId,
          userId: ADMIN_USER_ID,
          eventType: 'PAYMENT_REGISTERED',
          description: isCash
            ? `Pago en efectivo de $${amount.toFixed(2)} registrado desde Sistema Koinor`
            : `Pago de $${amount.toFixed(2)} registrado desde Sistema Koinor (Recibo: ${payment.receiptNumber || 'N/A'})`,
          details: JSON.stringify({
            amount,
            receiptNumber: payment.receiptNumber || '',
            invoiceNumber,
            paymentDate: payment.paymentDate,
            paymentType,
            concept: payment.concept || '',
            source: isCash ? 'KOINOR_MOV' : 'KOINOR_XML',
            sourceFile: payment.sourceFile || '',
            migratedAt: new Date().toISOString(),
            migrationNote: 'Evento retroactivo generado por migración'
          }),
          createdAt: payment.paymentDate // Use payment date, not current date
        }
      });
      created++;
    }

    offset += BATCH_SIZE;
  }

  console.log(`\nMigration complete: ${created} events created, ${skipped} skipped`);

  const totalEvents = await prisma.documentEvent.count({
    where: { eventType: 'PAYMENT_REGISTERED' }
  });
  console.log(`Total PAYMENT_REGISTERED events in DB: ${totalEvents}`);

  await prisma.$disconnect();
}

migrate().catch(async (e) => {
  console.error('Migration failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
