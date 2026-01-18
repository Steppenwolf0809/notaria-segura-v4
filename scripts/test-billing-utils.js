/**
 * Test script for billing utilities
 * Run: node scripts/test-billing-utils.js
 * 
 * Note: Uses dynamic import for ES modules
 */
const XLSX = require('xlsx');
const path = require('path');

async function runTests() {
    // Dynamic import for ES module
    const billingUtils = await import('../backend/src/utils/billing-utils.js');

    console.log('📋 Testing Billing Utilities...\n');

    // Test 1: Invoice number normalization
    console.log('=== Test 1: Invoice Number Normalization ===');
    const testCases = [
        { input: '001002-00123341', expected: '001-002-000123341' },
        { input: '001002-00119478', expected: '001-002-000119478' },
        { input: '001002-00000001', expected: '001-002-000000001' },
        { input: '001-002-000123341', expected: '001-002-000123341' }, // Already normalized
    ];

    testCases.forEach(({ input, expected }) => {
        const result = billingUtils.normalizeInvoiceNumber(input);
        const passed = result === expected;
        console.log(`  ${passed ? '✅' : '❌'} ${input} → ${result} (expected: ${expected})`);
    });

    // Test 2: Denormalization
    console.log('\n=== Test 2: Invoice Number Denormalization ===');
    const denormCases = [
        { input: '001-002-000123341', expected: '001002-00123341' },
    ];

    denormCases.forEach(({ input, expected }) => {
        const result = billingUtils.denormalizeInvoiceNumber(input);
        const passed = result === expected;
        console.log(`  ${passed ? '✅' : '❌'} ${input} → ${result} (expected: ${expected})`);
    });

    // Test 3: Excel date parsing
    console.log('\n=== Test 3: Excel Date Parsing ===');
    const dateTests = [
        { input: 45658, description: '01/12/2025' },
        { input: 46032, description: '11/12/2025' },
    ];

    dateTests.forEach(({ input, description }) => {
        const result = billingUtils.parseExcelDate(input);
        console.log(`  📅 Serial ${input} → ${result?.toISOString().split('T')[0] || 'null'} (should be near ${description})`);
    });

    // Test 4: Money parsing
    console.log('\n=== Test 4: Money Parsing ===');
    const moneyTests = [
        { input: 76.98, expected: 76.98 },
        { input: '$1,234.56', expected: 1234.56 },
        { input: '72.88', expected: 72.88 },
    ];

    moneyTests.forEach(({ input, expected }) => {
        const result = billingUtils.parseMoneyAmount(input);
        const passed = result === expected;
        console.log(`  ${passed ? '✅' : '❌'} "${input}" → ${result} (expected: ${expected})`);
    });

    // Test 5: File type detection
    console.log('\n=== Test 5: File Type Detection ===');
    const fileTests = [
        { input: 'POR COBRAR26 (1).xls', expected: 'POR_COBRAR' },
        { input: 'CXC 20260114 (2).xls', expected: 'CXC' },
        { input: 'random_file.xls', expected: 'UNKNOWN' },
    ];

    fileTests.forEach(({ input, expected }) => {
        const result = billingUtils.detectFileType(input);
        const passed = result === expected;
        console.log(`  ${passed ? '✅' : '❌'} "${input}" → ${result} (expected: ${expected})`);
    });

    // Test 6: Invoice status calculation
    console.log('\n=== Test 6: Invoice Status Calculation ===');
    const statusTests = [
        { total: 100, paid: 0, expected: 'PENDING' },
        { total: 100, paid: 50, expected: 'PARTIAL' },
        { total: 100, paid: 100, expected: 'PAID' },
        { total: 100, paid: 150, expected: 'PAID' },
    ];

    statusTests.forEach(({ total, paid, expected }) => {
        const result = billingUtils.calculateInvoiceStatus(total, paid);
        const passed = result === expected;
        console.log(`  ${passed ? '✅' : '❌'} Total: $${total}, Paid: $${paid} → ${result} (expected: ${expected})`);
    });

    // Test 7: Read Excel file (if available)
    console.log('\n=== Test 7: Reading Excel File ===');
    const excelPath = path.join(__dirname, '..', 'docs', 'POR COBRAR26 (1).xls');
    try {
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`  ✅ Successfully read Excel file`);
        console.log(`  📊 Sheet name: ${sheetName}`);
        console.log(`  📊 Total rows: ${data.length}`);
        console.log(`  📊 Columns: ${data[0]?.join(', ')}`);

        // Show first few data rows
        console.log('\n  📋 Sample data (first 3 rows):');
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        jsonData.slice(0, 3).forEach((row, i) => {
            console.log(`     Row ${i + 1}: numtra=${row.numtra}, tipdoc=${row.tipdoc}, valcob=${row.valcob}, codcli=${row.codcli}`);
        });

        // Count FC vs AB
        const fcCount = jsonData.filter(r => r.tipdoc === 'FC').length;
        const abCount = jsonData.filter(r => r.tipdoc === 'AB').length;
        console.log(`\n  📊 FC (Facturas): ${fcCount}`);
        console.log(`  📊 AB (Abonos/Pagos): ${abCount}`);

    } catch (error) {
        console.log(`  ⚠️ Could not read Excel file: ${error.message}`);
    }

    console.log('\n✅ Billing utilities tests completed!\n');
}

runTests().catch(console.error);
