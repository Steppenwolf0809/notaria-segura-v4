/**
 * Backfill Script: Populate subtotalAmount for invoices with NULL values
 * 
 * This script:
 * 1. Finds all invoices where subtotalAmount IS NULL
 * 2. For each, looks up the linked document's xmlOriginal (SRI XML)
 * 3. If no linked doc, searches by invoice number match (numeroFactura)
 * 4. Extracts totalSinImpuestos from the XML
 * 5. Updates the invoice's subtotalAmount
 * 
 * Run: node scripts/backfill-subtotal-amount.js [--dry-run] [--month YYYY-MM]
 */
const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function extractSecuencial(invoiceNumber) {
    if (!invoiceNumber) return '';
    const parts = String(invoiceNumber).split('-');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/^0+/, '') || '0';
}

async function main() {
    const client = new Client({ connectionString: DB_URL, ssl: false });
    await client.connect();

    console.log(`\n🔧 Backfill subtotalAmount from SRI XML`);
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE UPDATE'}\n`);

    try {
        // 1. Find invoices with NULL subtotalAmount
        const nullInvoices = await client.query(`
            SELECT 
                i.id as invoice_id,
                i."invoiceNumber",
                i."invoiceNumberRaw",
                i."totalAmount",
                i."subtotalAmount",
                i."documentId",
                i."issueDate"
            FROM invoices i
            WHERE i."subtotalAmount" IS NULL
            ORDER BY i."issueDate" DESC
        `);

        console.log(`📊 Found ${nullInvoices.rows.length} invoices with NULL subtotalAmount\n`);

        let updatedFromXml = 0;
        let updatedBySearch = 0;
        let fallbackUsed = 0;
        let skippedNoDoc = 0;
        const errors = [];

        for (const row of nullInvoices.rows) {
            let xml = null;
            let source = '';

            // Strategy 1: Use linked documentId
            if (row.documentId) {
                const docResult = await client.query(
                    `SELECT "xmlOriginal", "protocolNumber" FROM documents WHERE id = $1`,
                    [row.documentId]
                );
                xml = docResult.rows[0]?.xmlOriginal;
                source = `linked (${docResult.rows[0]?.protocolNumber || 'unknown'})`;
            }

            // Strategy 2: Search by invoice number if no linked doc or no XML
            if (!xml) {
                const secuencial = extractSecuencial(row.invoiceNumberRaw || row.invoiceNumber);
                if (secuencial && secuencial.length >= 5) {
                    const docSearch = await client.query(`
                        SELECT "xmlOriginal", "protocolNumber", "numeroFactura"
                        FROM documents
                        WHERE "xmlOriginal" IS NOT NULL
                          AND "numeroFactura" IS NOT NULL
                          AND "numeroFactura" LIKE $1
                        LIMIT 1
                    `, [`%${secuencial}`]);

                    if (docSearch.rows.length > 0) {
                        // Verify secuencial matches exactly
                        const docSeq = extractSecuencial(docSearch.rows[0].numeroFactura);
                        if (docSeq === secuencial) {
                            xml = docSearch.rows[0].xmlOriginal;
                            source = `search (${docSearch.rows[0].protocolNumber})`;

                            // Also link the document to the invoice if not linked
                            if (!row.documentId) {
                                const docId = await client.query(
                                    `SELECT id FROM documents WHERE "protocolNumber" = $1`,
                                    [docSearch.rows[0].protocolNumber]
                                );
                                if (docId.rows[0] && !DRY_RUN) {
                                    await client.query(
                                        `UPDATE invoices SET "documentId" = $1 WHERE id = $2`,
                                        [docId.rows[0].id, row.invoice_id]
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // Extract subtotal from XML
            if (xml) {
                const match = xml.match(/totalSinImpuestos>([0-9.]+)</);
                if (match) {
                    const subtotal = parseFloat(match[1]);
                    const totalAmt = parseFloat(row.totalAmount);

                    // Sanity check
                    if (subtotal > totalAmt * 1.01) {
                        errors.push(`${row.invoiceNumber}: XML subtotal ($${subtotal}) > totalAmount ($${totalAmt})`);
                        continue;
                    }

                    if (!DRY_RUN) {
                        await client.query(
                            `UPDATE invoices SET "subtotalAmount" = $1 WHERE id = $2`,
                            [subtotal, row.invoice_id]
                        );
                    }

                    if (source.startsWith('linked')) updatedFromXml++;
                    else updatedBySearch++;

                    // Log first few
                    if ((updatedFromXml + updatedBySearch) <= 5) {
                        const ivaCalc = (totalAmt - subtotal).toFixed(2);
                        console.log(`  ✅ ${row.invoiceNumber}: $${totalAmt} → subtotal: $${subtotal} (IVA: $${ivaCalc}) [${source}]`);
                    }
                    continue;
                }
            }

            // No XML found — use fallback ÷1.15
            const totalAmt = parseFloat(row.totalAmount);
            const fallbackSubtotal = Math.round((totalAmt / 1.15) * 100) / 100;
            if (!DRY_RUN) {
                await client.query(
                    `UPDATE invoices SET "subtotalAmount" = $1 WHERE id = $2`,
                    [fallbackSubtotal, row.invoice_id]
                );
            }
            fallbackUsed++;
            skippedNoDoc++;
        }

        // Summary
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 BACKFILL RESULTS ${DRY_RUN ? '(DRY RUN)' : ''}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`  Total NULL subtotals:        ${nullInvoices.rows.length}`);
        console.log(`  ✅ From linked doc XML:       ${updatedFromXml}`);
        console.log(`  ✅ From searched doc XML:      ${updatedBySearch}`);
        console.log(`  🔄 Fallback (÷1.15):          ${fallbackUsed}`);
        if (errors.length > 0) {
            console.log(`  ⚠️  Errors: ${errors.length}`);
            errors.slice(0, 5).forEach(e => console.log(`     ${e}`));
        }

        // Verification
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 VERIFICATION — February 2026 ${DRY_RUN ? '(unchanged in dry-run)' : '(AFTER UPDATE)'}`);
        console.log(`${'='.repeat(60)}`);

        const v = (await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN "subtotalAmount" IS NULL THEN 1 END) as still_null,
                ROUND(SUM(CASE WHEN status != 'CANCELLED' THEN "totalAmount" ELSE 0 END)::numeric, 2) as active_total,
                ROUND(SUM(CASE WHEN status != 'CANCELLED' THEN COALESCE("subtotalAmount", 0) ELSE 0 END)::numeric, 2) as active_subtotal,
                ROUND(SUM(CASE WHEN status != 'CANCELLED' THEN "totalAmount" - COALESCE("subtotalAmount", 0) ELSE 0 END)::numeric, 2) as active_iva
            FROM invoices
            WHERE "issueDate" >= '2026-02-01' AND "issueDate" < '2026-03-01'
        `)).rows[0];

        console.log(`  Total invoices:     ${v.total}`);
        console.log(`  Still NULL:         ${v.still_null}`);
        console.log(`  Active con IVA:     $${v.active_total}`);
        console.log(`  Active sin IVA:     $${v.active_subtotal}`);
        console.log(`  Active IVA:         $${v.active_iva}`);
        console.log(`\n  👉 Caja: $58,839.35 sin IVA + $8,801.89 IVA = $67,641.24`);
        console.log(`  👉 Diff total: $${(parseFloat(v.active_total) - 67641.24).toFixed(2)}`);
        console.log(`  👉 Diff base:  $${(parseFloat(v.active_subtotal) - 58839.35).toFixed(2)}`);

    } finally {
        await client.end();
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
