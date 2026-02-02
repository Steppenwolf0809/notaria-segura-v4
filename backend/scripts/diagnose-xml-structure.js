/**
 * Diagnose XML Structure
 * Script para analizar la estructura de un archivo XML antes de importarlo
 * 
 * Uso: node backend/scripts/diagnose-xml-structure.js <ruta-al-archivo.xml>
 */

import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

function diagnoseXMLFile(filePath) {
    console.log('🔍 DIAGNÓSTICO DE ESTRUCTURA XML');
    console.log('='.repeat(60));
    console.log(`📁 Archivo: ${filePath}\n`);

    // 1. Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
        console.error('❌ Error: El archivo no existe');
        process.exit(1);
    }

    // 2. Leer el archivo como buffer
    const buffer = fs.readFileSync(filePath);
    console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024).toFixed(2)} KB`);

    // 3. Detectar encoding
    let xmlString;
    let detectedEncoding = 'unknown';

    try {
        // Intentar UTF-16LE (formato típico de Koinor)
        xmlString = iconv.decode(buffer, 'utf-16le');
        if (xmlString.includes('<?xml') || xmlString.includes('<d_vc')) {
            detectedEncoding = 'UTF-16LE';
        } else {
            // Intentar UTF-8
            xmlString = buffer.toString('utf8');
            if (xmlString.includes('<?xml') || xmlString.includes('<d_vc')) {
                detectedEncoding = 'UTF-8';
            } else {
                // Intentar Latin1
                xmlString = buffer.toString('latin1');
                if (xmlString.includes('<?xml') || xmlString.includes('<d_vc')) {
                    detectedEncoding = 'Latin1';
                }
            }
        }

        // Limpiar BOM
        xmlString = xmlString.replace(/^\uFEFF/, '');
    } catch (error) {
        console.error('❌ Error detectando encoding:', error.message);
        process.exit(1);
    }

    console.log(`🔤 Encoding detectado: ${detectedEncoding}\n`);

    // 4. Analizar primeros 1000 caracteres
    console.log('📄 Primeros 1000 caracteres del XML:');
    console.log('-'.repeat(60));
    console.log(xmlString.substring(0, 1000));
    console.log('-'.repeat(60));
    console.log('');

    // 5. Buscar tags específicos
    console.log('🔎 Análisis de estructura:');
    console.log('-'.repeat(60));

    const checks = [
        { name: 'Declaración XML', pattern: '<?xml', found: xmlString.includes('<?xml') },
        { name: 'Tag raíz d_vc_i_estado_cuenta_row', pattern: '<d_vc_i_estado_cuenta_row', found: xmlString.includes('<d_vc_i_estado_cuenta_row') },
        { name: 'Tag grupo d_vc_i_estado_cuenta_group1', pattern: '<d_vc_i_estado_cuenta_group1', found: xmlString.includes('<d_vc_i_estado_cuenta_group1') },
        { name: 'Tag cierre group1', pattern: '</d_vc_i_estado_cuenta_group1>', found: xmlString.includes('</d_vc_i_estado_cuenta_group1>') },
        { name: 'Campo tipdoc', pattern: '<tipdoc>', found: xmlString.includes('<tipdoc>') },
        { name: 'Campo numdoc', pattern: '<numdoc>', found: xmlString.includes('<numdoc>') },
        { name: 'Campo numtra', pattern: '<numtra>', found: xmlString.includes('<numtra>') },
        { name: 'Campo valcob', pattern: '<valcob>', found: xmlString.includes('<valcob>') },
        { name: 'Campo fecemi', pattern: '<fecemi>', found: xmlString.includes('<fecemi>') },
        { name: 'Campo nomcli', pattern: '<nomcli>', found: xmlString.includes('<nomcli>') }
    ];

    checks.forEach(check => {
        const status = check.found ? '✅' : '❌';
        console.log(`${status} ${check.name.padEnd(40)} ${check.pattern}`);
    });

    console.log('');

    // 6. Contar elementos
    const group1Count = (xmlString.match(/<d_vc_i_estado_cuenta_group1/g) || []).length;
    const tipdocAB = (xmlString.match(/<tipdoc>AB<\/tipdoc>/g) || []).length;
    const tipdocNC = (xmlString.match(/<tipdoc>NC<\/tipdoc>/g) || []).length;
    const tipdocFC = (xmlString.match(/<tipdoc>FC<\/tipdoc>/g) || []).length;

    console.log('📊 Estadísticas del contenido:');
    console.log('-'.repeat(60));
    console.log(`   Grupos encontrados (group1): ${group1Count}`);
    console.log(`   Tipo AB (Pagos): ${tipdocAB}`);
    console.log(`   Tipo NC (Notas de Crédito): ${tipdocNC}`);
    console.log(`   Tipo FC (Facturas): ${tipdocFC}`);
    console.log('');

    // 7. Extraer primer grupo completo como ejemplo
    const firstGroupMatch = xmlString.match(/<d_vc_i_estado_cuenta_group1>([\s\S]*?)<\/d_vc_i_estado_cuenta_group1>/);
    if (firstGroupMatch) {
        console.log('📋 Primer grupo completo (ejemplo):');
        console.log('-'.repeat(60));
        console.log(firstGroupMatch[0].substring(0, 800));
        console.log('');
    }

    // 8. Verificar si el parser puede validarlo
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('='.repeat(60));
    
    // Diagnóstico final
    const hasRequiredStructure = checks.find(c => c.name.includes('group1')).found;
    const hasRequiredFields = checks.filter(c => ['numdoc', 'numtra', 'valcob'].includes(c.pattern.replace(/<|>/g, ''))).every(c => c.found);

    if (hasRequiredStructure && hasRequiredFields) {
        console.log('✅ El archivo parece tener la estructura XML de Koinor correcta');
        console.log('   Puede proceder con la importación.');
    } else {
        console.log('⚠️ PROBLEMA DETECTADO:');
        if (!hasRequiredStructure) {
            console.log('   ❌ No se encontró la estructura esperada (d_vc_i_estado_cuenta_group1)');
        }
        if (!hasRequiredFields) {
            console.log('   ❌ Faltan campos requeridos (numdoc, numtra, valcob)');
        }
        console.log('');
        console.log('💡 Posibles soluciones:');
        console.log('   1. Verifique que el archivo XML sea del sistema Koinor');
        console.log('   2. Asegúrese de exportar el "Estado de Cuenta" desde Koinor');
        console.log('   3. Verifique que el archivo no esté corrupto');
        console.log('   4. Contacte a soporte si el problema persiste');
    }

    console.log('');
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Uso: node backend/scripts/diagnose-xml-structure.js <ruta-al-archivo.xml>');
    console.log('');
    console.log('Ejemplo:');
    console.log('  node backend/scripts/diagnose-xml-structure.js C:/Users/Usuario/Desktop/koinor_export.xml');
    process.exit(1);
}

const filePath = args[0];
diagnoseXMLFile(filePath);
