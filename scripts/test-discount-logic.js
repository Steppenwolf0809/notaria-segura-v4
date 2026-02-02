const XLSX = require('xlsx');

// Simular la nueva lógica
function processPaymentTest(row) {
    let receiptNumber = String(row.numdoc || '').trim();

    if (!receiptNumber) {
        const numtra = String(row.numtra || '').trim();
        const concept = String(row.concep || '').toUpperCase();

        if (concept.includes('DESCUENTO') || concept.includes('DSCTO') || concept.includes('AJUSTE')) {
            const amount = String(row.valcob || '0');
            const date = String(row.fecemi || '0');
            const hash = Buffer.from(amount + '-' + date).toString('base64').slice(0, 6);
            receiptNumber = 'DESC-' + numtra + '-' + hash;
            return { receiptNumber, isDiscount: true };
        } else {
            return { error: 'Missing receipt number (numdoc)' };
        }
    }
    return { receiptNumber, isDiscount: false };
}

// Leer el archivo y probar los 4 problematicos
const workbook = XLSX.readFile('C:/notaria-segura/docs/202601201050.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

const abonos = rows.filter(r => r.tipdoc === 'AB');
const sinNumdoc = abonos.filter(r => !r.numdoc || String(r.numdoc).trim() === '');

console.log('=== TEST DE LA NUEVA LOGICA ===');
console.log('Abonos sin numdoc:', sinNumdoc.length);

sinNumdoc.forEach((row, i) => {
    const result = processPaymentTest(row);
    console.log('');
    console.log(`Fila ${i+1}:`);
    console.log('  numtra:', row.numtra);
    console.log('  concep:', row.concep);
    console.log('  valcob:', row.valcob);
    console.log('  Resultado:', JSON.stringify(result));
});
