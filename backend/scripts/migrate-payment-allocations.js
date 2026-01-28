/**
 * Migration Script: Create PaymentAllocations from existing Payments
 *
 * This script:
 * 1. Creates PaymentAllocation records for existing payments (one-to-one initially)
 * 2. Analyzes payment concepts to find multi-invoice payments (e.g., "PAGO FACTS. 124369-70")
 * 3. Creates additional allocations for those cases
 *
 * Run with: node scripts/migrate-payment-allocations.js
 */

import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://postgres:vzdzHHIVerdjgzWlmfARWiSsbTBSJfvw@gondola.proxy.rlwy.net:39316/railway';

const prisma = new PrismaClient({
    datasources: {
        db: { url: DATABASE_URL }
    }
});

/**
 * Normalize invoice number to standard format: 001-002-000XXXXXX
 */
function normalizeInvoiceNumber(raw) {
    if (!raw) return null;
    const clean = raw.replace(/[^0-9]/g, '');
    if (clean.length < 9) return null;

    const serie = clean.slice(0, 3);
    const punto = clean.slice(3, 6);
    const numero = clean.slice(6).padStart(9, '0');

    return `${serie}-${punto}-${numero}`;
}

/**
 * Extract invoice numbers from payment concept
 */
function extractInvoiceNumbersFromConcept(concept) {
    const results = [];
    const text = (concept || '').toUpperCase();

    // Pattern 1: "FACTS. 124369-70" or "FACTS 124369-70" (range)
    const rangeMatch = text.match(/FACTS?\.?\s*(\d+)-(\d+)/);
    if (rangeMatch) {
        const baseNum = rangeMatch[1];
        const endSuffix = rangeMatch[2];

        const startNum = parseInt(baseNum);
        const endNum = parseInt(baseNum.slice(0, -endSuffix.length) + endSuffix);

        for (let i = startNum; i <= endNum; i++) {
            results.push(normalizeInvoiceNumber(`001002-00${i}`));
        }

        return results.filter(Boolean);
    }

    // Pattern 2: "FACT 119478" (single)
    const singleMatch = text.match(/FACT\.?\s*(\d{5,})/);
    if (singleMatch) {
        const normalized = normalizeInvoiceNumber(`001002-00${singleMatch[1]}`);
        if (normalized) results.push(normalized);
        return results;
    }

    return results;
}

async function migrate() {
    console.log('=== MIGRATION: Payment Allocations ===\n');

    // Stats
    const stats = {
        paymentsProcessed: 0,
        allocationsCreated: 0,
        multiInvoicePayments: 0,
        errors: []
    };

    // 1. Get all existing payments
    const payments = await prisma.payment.findMany({
        include: {
            invoice: true,
            allocations: true
        }
    });

    console.log(`Found ${payments.length} payments to process\n`);

    for (const payment of payments) {
        try {
            // Skip if already has allocations
            if (payment.allocations && payment.allocations.length > 0) {
                console.log(`[SKIP] Payment ${payment.receiptNumber} already has ${payment.allocations.length} allocations`);
                continue;
            }

            // Get all invoice numbers this payment should be allocated to
            const invoiceNumbers = [];

            // Primary invoice (from legacy relation)
            if (payment.invoice) {
                invoiceNumbers.push(payment.invoice.invoiceNumber);
            }

            // Additional invoices from concept
            const conceptInvoices = extractInvoiceNumbersFromConcept(payment.concept);
            for (const invNum of conceptInvoices) {
                if (!invoiceNumbers.includes(invNum)) {
                    invoiceNumbers.push(invNum);
                }
            }

            if (invoiceNumbers.length === 0) {
                console.log(`[WARN] Payment ${payment.receiptNumber} has no invoice`);
                continue;
            }

            // Find all invoices
            const invoices = await prisma.invoice.findMany({
                where: {
                    invoiceNumber: { in: invoiceNumbers }
                }
            });

            if (invoices.length === 0) {
                console.log(`[WARN] No invoices found for payment ${payment.receiptNumber}`);
                continue;
            }

            // Calculate allocated amount per invoice
            const allocatedAmountPerInvoice = Number(payment.amount) / invoices.length;

            // Create allocations
            for (const invoice of invoices) {
                await prisma.paymentAllocation.create({
                    data: {
                        paymentId: payment.id,
                        invoiceId: invoice.id,
                        allocatedAmount: allocatedAmountPerInvoice
                    }
                });
                stats.allocationsCreated++;
            }

            stats.paymentsProcessed++;

            if (invoices.length > 1) {
                stats.multiInvoicePayments++;
                console.log(`[MULTI] Payment ${payment.receiptNumber} -> ${invoices.length} invoices: ${invoices.map(i => i.invoiceNumber).join(', ')}`);
            } else {
                console.log(`[OK] Payment ${payment.receiptNumber} -> ${invoices[0].invoiceNumber}`);
            }

        } catch (error) {
            stats.errors.push({
                paymentId: payment.id,
                receiptNumber: payment.receiptNumber,
                error: error.message
            });
            console.error(`[ERROR] Payment ${payment.receiptNumber}: ${error.message}`);
        }
    }

    // 2. Update invoice statuses
    console.log('\nUpdating invoice statuses...');

    const invoicesWithAllocations = await prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { allocations: true }
    });

    let statusUpdates = 0;
    for (const invoice of invoicesWithAllocations) {
        const totalPaid = invoice.allocations.reduce(
            (sum, a) => sum + Number(a.allocatedAmount),
            0
        );

        const totalAmount = Number(invoice.totalAmount);
        let newStatus;

        if (totalPaid >= totalAmount) {
            newStatus = 'PAID';
        } else if (totalPaid > 0) {
            newStatus = 'PARTIAL';
        } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
            newStatus = 'OVERDUE';
        } else {
            newStatus = 'PENDING';
        }

        if (invoice.status !== newStatus) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: newStatus }
            });
            statusUpdates++;
            console.log(`[STATUS] ${invoice.invoiceNumber}: ${invoice.status} -> ${newStatus}`);
        }
    }

    // Summary
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Payments processed: ${stats.paymentsProcessed}`);
    console.log(`Allocations created: ${stats.allocationsCreated}`);
    console.log(`Multi-invoice payments: ${stats.multiInvoicePayments}`);
    console.log(`Status updates: ${statusUpdates}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
        console.log('\nErrors:');
        stats.errors.forEach(e => console.log(`  - ${e.receiptNumber}: ${e.error}`));
    }

    await prisma.$disconnect();
}

migrate().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
