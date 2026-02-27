/**
 * Script: fix-nc-feb2026.js
 * Objetivo: Cancelar las 3 facturas que tienen NC emitidas pero no procesadas en Feb 2026
 *
 * NC-2121 ($116.40) -> Factura 125170 (ESPIN MINANGO)
 * NC-2122 ($900.60) -> Factura 125107 (CARRERA POZO) - la más antigua de las 2 con mismo monto
 * NC-2124 ($805.27) -> Factura 125202 (PASPUEL CHIRIBOGA)
 */

import pg from 'pg';
const { Client } = pg;

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway';

async function main() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    // Step 1: Identify which CARRERA POZO invoice to cancel
    console.log('=== Step 1: Identifying CARRERA POZO invoice ===');
    const carrera = await client.query(`
        SELECT "invoiceNumberRaw", "totalAmount", "status", "issueDate"
        FROM invoices
        WHERE "invoiceNumberRaw" IN ('001002-00125107', '001002-00125262')
        ORDER BY "issueDate"
    `);
    carrera.rows.forEach(r => console.log(
        `  ${r.invoiceNumberRaw} | fecha: ${r.issueDate.toISOString().split('T')[0]} | status: ${r.status}`
    ));

    // NC-2122 was issued on Feb 23. The older invoice (125107, Feb 12) is the one being credited.
    // Invoice 125262 (Feb 23) is the corrected replacement.
    const targetInvoice = carrera.rows[0]?.invoiceNumberRaw; // oldest = 125107
    console.log(`  -> Target: ${targetInvoice} (la factura original que la NC anula)`);

    // Step 2: Show current state of all 3 target invoices
    const targets = ['001002-00125170', '001002-00125107', '001002-00125202'];
    console.log('\n=== Step 2: Estado actual de facturas a cancelar ===');
    const before = await client.query(`
        SELECT "invoiceNumberRaw", "totalAmount", "subtotalAmount", "status", "clientName"
        FROM invoices
        WHERE "invoiceNumberRaw" = ANY($1)
        ORDER BY "invoiceNumberRaw"
    `, [targets]);
    before.rows.forEach(r => console.log(
        `  ${r.invoiceNumberRaw} | $${r.totalAmount} | ${r.status} | ${r.clientName}`
    ));

    // Step 3: Cancel them
    console.log('\n=== Step 3: Cancelando facturas ===');
    const result = await client.query(`
        UPDATE invoices
        SET status = 'CANCELLED', "lastSyncAt" = NOW()
        WHERE "invoiceNumberRaw" = ANY($1)
        AND status != 'CANCELLED'
        RETURNING "invoiceNumberRaw", "totalAmount", status
    `, [targets]);
    console.log(`  ${result.rowCount} facturas actualizadas a CANCELLED:`);
    result.rows.forEach(r => console.log(`  ✓ ${r.invoiceNumberRaw} ($${r.totalAmount})`));

    // Step 4: Verify totals
    console.log('\n=== Step 4: Verificación post-corrección ===');
    const totals = await client.query(`
        SELECT
            COUNT(*) as count,
            SUM("totalAmount"::numeric) as total,
            SUM("subtotalAmount"::numeric) as subtotal
        FROM invoices
        WHERE "issueDate" >= '2026-02-01' AND "issueDate" < '2026-03-01'
        AND status != 'CANCELLED'
    `);
    const t = totals.rows[0];
    console.log(`  Facturas activas: ${t.count}`);
    console.log(`  Total con IVA: $${Number(t.total).toFixed(2)}`);
    console.log(`  Subtotal (Base Imponible): $${Number(t.subtotal).toFixed(2)}`);
    console.log(`  Caja neto (referencia): $67,695.24 total / $58,893.35 subtotal`);

    await client.end();
    console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
