const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:/notaria-segura/docs', '202601201050.xls');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log('=== ANALISIS DEL ARCHIVO ===');
console.log('Total filas:', rows.length);
console.log('Columnas:', Object.keys(rows[0]).join(', '));

const facturas = rows.filter(r => r.tipdoc === 'FC');
const abonos = rows.filter(r => r.tipdoc === 'AB');

console.log('FC (Facturas):', facturas.length);
console.log('AB (Abonos/Pagos):', abonos.length);

// Buscar abonos sin numdoc
const problematicos = abonos.filter(r => {
  const numdoc = r.numdoc;
  return numdoc === undefined || numdoc === null || String(numdoc).trim() === '';
});

console.log('\n=== ABONOS SIN numdoc ===');
console.log('Cantidad:', problematicos.length);

if (problematicos.length > 0) {
  console.log('\nDetalle de los problematicos:');
  problematicos.slice(0, 10).forEach((row, i) => {
    console.log(`\nFila ${i+1}:`);
    console.log('  numtra:', row.numtra);
    console.log('  numdoc:', row.numdoc);
    console.log('  tipdoc:', row.tipdoc);
    console.log('  codcli:', row.codcli);
    console.log('  nomcli:', row.nomcli);
    console.log('  valcob:', row.valcob);
    console.log('  fecemi:', row.fecemi);
    console.log('  concep:', row.concep);
  });
}

// Ejemplo de AB normal para comparar
const abNormal = abonos.find(r => r.numdoc && String(r.numdoc).trim() !== '');
if (abNormal) {
  console.log('\n=== EJEMPLO DE AB NORMAL (para comparar) ===');
  console.log('  numtra:', abNormal.numtra);
  console.log('  numdoc:', abNormal.numdoc);
  console.log('  tipdoc:', abNormal.tipdoc);
  console.log('  valcob:', abNormal.valcob);
  console.log('  concep:', abNormal.concep);
}

// Estadisticas adicionales
console.log('\n=== ESTADISTICAS ===');
const totalValorFC = facturas.reduce((sum, r) => sum + (parseFloat(r.valcob) || 0), 0);
const totalValorAB = abonos.reduce((sum, r) => sum + (parseFloat(r.valcob) || 0), 0);
console.log('Valor total FC:', totalValorFC.toFixed(2));
console.log('Valor total AB:', totalValorAB.toFixed(2));
