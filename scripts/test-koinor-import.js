/**
 * Test script for Koinor import service
 * Run: node scripts/test-koinor-import.js
 * 
 * Tests the import service directly without going through the API
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runImportTest() {
    console.log('🧪 Testing Koinor Import Service...\n');

    // Import the service
    const { importKoinorFile, getImportStats } = await import('../backend/src/services/import-koinor-service.js');

    // Read the test file
    const excelPath = path.join(__dirname, '..', 'docs', 'POR COBRAR26 (1).xls');

    if (!fs.existsSync(excelPath)) {
        console.error('❌ Test file not found:', excelPath);
        process.exit(1);
    }

    console.log('📂 Reading file:', excelPath);
    const fileBuffer = fs.readFileSync(excelPath);
    console.log(`📊 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);

    // Run import
    console.log('🚀 Starting import...\n');
    const startTime = Date.now();

    try {
        const result = await importKoinorFile(
            fileBuffer,
            'POR COBRAR26 (1).xls',
            null // No user ID for test
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n✅ Import completed in', duration, 'seconds');
        console.log('\n📊 Results:');
        console.log('   Import Log ID:', result.importLogId);
        console.log('   Total Rows:', result.stats.totalRows);
        console.log('   Invoices Created:', result.stats.invoicesCreated);
        console.log('   Invoices Updated:', result.stats.invoicesUpdated);
        console.log('   Payments Created:', result.stats.paymentsCreated);
        console.log('   Payments Skipped:', result.stats.paymentsSkipped);
        console.log('   Legacy Invoices:', result.stats.legacyInvoicesCreated);
        console.log('   Documents Linked:', result.stats.documentsLinked);
        console.log('   Errors:', result.stats.errors);

        if (result.stats.errors > 0) {
            console.log('\n⚠️ Error Details:');
            result.stats.errorDetails.slice(0, 5).forEach((e, i) => {
                console.log(`   ${i + 1}. [${e.type}] ${e.numtra || e.numdoc}: ${e.error}`);
            });
        }

        // Get overall stats
        console.log('\n📈 Database Stats:');
        const stats = await getImportStats();
        console.log('   Total Invoices:', stats.totalInvoices);
        console.log('   Total Payments:', stats.totalPayments);
        console.log('   Legacy Invoices:', stats.legacyInvoices);
        console.log('   Linked to Documents:', stats.linkedToDocuments);
        console.log('   By Status:', stats.byStatus);

        // Test idempotency
        console.log('\n🔄 Testing idempotency (re-running import)...');
        const result2 = await importKoinorFile(
            fileBuffer,
            'POR COBRAR26 (1).xls',
            null
        );

        console.log('   Second run - Invoices Created:', result2.stats.invoicesCreated);
        console.log('   Second run - Payments Created:', result2.stats.paymentsCreated);
        console.log('   Second run - Payments Skipped:', result2.stats.paymentsSkipped);

        if (result2.stats.invoicesCreated === 0 && result2.stats.paymentsCreated === 0) {
            console.log('\n✅ IDEMPOTENCY TEST PASSED - No duplicates created on second run');
        } else {
            console.log('\n⚠️ IDEMPOTENCY TEST WARNING - Some new records created on second run');
        }

    } catch (error) {
        console.error('\n❌ Import failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }

    console.log('\n✅ All tests completed!\n');
    process.exit(0);
}

runImportTest().catch(console.error);
