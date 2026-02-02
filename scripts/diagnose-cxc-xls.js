/**
 * Script de diagnóstico para archivos CXC XLS
 * Muestra las columnas y primeras filas del archivo para debugging
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'C:\\notaria-segura\\docs\\CXC 20260114 (2).xls';

console.log('📊 Diagnóstico de archivo CXC XLS');
console.log(`📁 Archivo: ${filePath}\n`);

try {
    if (!fs.existsSync(filePath)) {
        console.error('❌ El archivo no existe:', filePath);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ Archivo leído: ${fileBuffer.length} bytes\n`);

    const workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
    });

    console.log(`📄 Hojas encontradas: ${workbook.SheetNames.length}`);
    workbook.SheetNames.forEach((name, idx) => {
        console.log(`   ${idx + 1}. ${name}`);
    });
    console.log('');

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    console.log(`📋 Procesando hoja: "${firstSheetName}"\n`);

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ''
    });

    console.log(`📊 Total de filas: ${jsonData.length}\n`);

    // Mostrar primeras 10 filas
    console.log('🔍 Primeras 10 filas:\n');
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        console.log(`Fila ${i + 1}:`, row);
    }

    // Buscar fila de encabezados
    console.log('\n🔎 Buscando fila de encabezados...\n');
    let headerRowIndex = -1;
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        
        if (!Array.isArray(row) || row.length === 0) {
            continue;
        }

        const rowStr = row.join('|').toUpperCase();
        
        if (rowStr.includes('CODCLI') || 
            rowStr.includes('NOMCLI') || 
            rowStr.includes('NUMTRA') ||
            rowStr.includes('SALDO') ||
            rowStr.includes('CLIENTE')) {
            headerRowIndex = i;
            console.log(`✅ Encabezados encontrados en fila ${i + 1}:`);
            console.log(row);
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.log('❌ No se encontraron encabezados estándar (CODCLI, NOMCLI, NUMTRA, SALDO)');
        console.log('\n💡 Sugerencia: Verifica que el archivo tenga una fila de encabezados con columnas como:');
        console.log('   - CODCLI (cédula/RUC)');
        console.log('   - NOMCLI (nombre cliente)');
        console.log('   - NUMTRA (número factura)');
        console.log('   - SALDO o CSALDO (saldo pendiente)');
    } else {
        console.log('\n📋 Columnas detectadas:');
        const headers = jsonData[headerRowIndex];
        headers.forEach((header, idx) => {
            if (header && header.trim()) {
                console.log(`   ${idx}: ${header}`);
            }
        });

        console.log('\n📄 Primeras 3 filas de datos:');
        for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 4, jsonData.length); i++) {
            console.log(`\nFila ${i + 1}:`);
            const row = jsonData[i];
            headers.forEach((header, idx) => {
                if (header && header.trim() && row[idx]) {
                    console.log(`   ${header}: ${row[idx]}`);
                }
            });
        }
    }

} catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
}
