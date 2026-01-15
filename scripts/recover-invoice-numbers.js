const { Client } = require('pg');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseXML = promisify(parseString);

/**
 * Script para recuperar números de factura de XMLs existentes
 * y actualizar la base de datos
 */

// Función para extraer número de factura del XML
function extractNumeroFactura(factura) {
    try {
        const infoTributaria = factura.infoTributaria?.[0];

        if (!infoTributaria) {
            return null;
        }

        const estab = infoTributaria.estab?.[0];
        const ptoEmi = infoTributaria.ptoEmi?.[0];
        const secuencial = infoTributaria.secuencial?.[0];

        if (!estab || !ptoEmi || !secuencial) {
            return null;
        }

        return `${estab}-${ptoEmi}-${secuencial}`;
    } catch (error) {
        return null;
    }
}

async function recoverInvoiceNumbers() {
    const connectionString = process.env.DATABASE_URL ||
        'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway';

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // Obtener todos los documentos que tienen XML pero no tienen número de factura
        const res = await client.query(`
      SELECT id, "protocolNumber", "xmlOriginal"
      FROM documents
      WHERE "xmlOriginal" IS NOT NULL 
        AND ("numeroFactura" IS NULL OR "numeroFactura" = '')
      ORDER BY "createdAt" DESC
    `);

        const total = res.rows.length;
        console.log(`📊 Documentos encontrados con XML: ${total}\n`);

        if (total === 0) {
            console.log('✅ No hay documentos que necesiten actualización');
            await client.end();
            return;
        }

        let processed = 0;
        let updated = 0;
        let errors = 0;
        const errorDetails = [];

        // Procesar en lotes de 10 para no sobrecargar
        const BATCH_SIZE = 10;

        for (let i = 0; i < res.rows.length; i += BATCH_SIZE) {
            const batch = res.rows.slice(i, i + BATCH_SIZE);

            for (const doc of batch) {
                processed++;

                try {
                    const parsed = await parseXML(doc.xmlOriginal);
                    const factura = parsed.factura;

                    if (!factura) {
                        errors++;
                        errorDetails.push({
                            id: doc.id,
                            protocolNumber: doc.protocolNumber,
                            error: 'XML no contiene elemento factura'
                        });
                        console.log(` ${processed}/${total} - ❌ ${doc.protocolNumber}: XML inválido`);
                        continue;
                    }

                    const numeroFactura = extractNumeroFactura(factura);

                    if (!numeroFactura) {
                        errors++;
                        errorDetails.push({
                            id: doc.id,
                            protocolNumber: doc.protocolNumber,
                            error: 'No se pudo extraer número de factura'
                        });
                        console.log(` ${processed}/${total} - ⚠️  ${doc.protocolNumber}: Sin número de factura`);
                        continue;
                    }

                    // Actualizar documento
                    await client.query(`
            UPDATE documents
            SET "numeroFactura" = $1
            WHERE id = $2
          `, [numeroFactura, doc.id]);

                    updated++;
                    console.log(`✅ ${processed}/${total} - ${doc.protocolNumber}: ${numeroFactura}`);

                } catch (error) {
                    errors++;
                    errorDetails.push({
                        id: doc.id,
                        protocolNumber: doc.protocolNumber,
                        error: error.message
                    });
                    console.log(`❌ ${processed}/${total} - ${doc.protocolNumber}: Error - ${error.message}`);
                }
            }

            // Pequeña pausa entre lotes
            if (i + BATCH_SIZE < res.rows.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Reporte final
        console.log('\n' + '='.repeat(80));
        console.log('📊 REPORTE FINAL');
        console.log('='.repeat(80));
        console.log(`Total de documentos procesados: ${processed}`);
        console.log(`✅ Actualizados exitosamente: ${updated} (${Math.round(updated / total * 100)}%)`);
        console.log(`❌ Errores encontrados: ${errors} (${Math.round(errors / total * 100)}%)`);
        console.log('='.repeat(80));

        if (errorDetails.length > 0) {
            console.log('\n📋 DETALLES DE ERRORES:');
            errorDetails.forEach((err, idx) => {
                console.log(`  ${idx + 1}. ${err.protocolNumber} (${err.id})`);
                console.log(`     Error: ${err.error}`);
            });
        }

        await client.end();
        console.log('\n✅ Proceso completado\n');

    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        await client.end();
        process.exit(1);
    }
}

// Ejecutar el script
recoverInvoiceNumbers();
