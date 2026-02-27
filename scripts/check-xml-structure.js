const { Client } = require('pg');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseXML = promisify(parseString);

async function analyzeInvoiceNumber() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('ERROR: DATABASE_URL no esta configurada.');
        process.exit(1);
    }

    const client = new Client({
        connectionString
    });

    try {
        await client.connect();
        console.log('âœ… Connected to database');

        const res = await client.query(`
      SELECT id, "protocolNumber", "xmlOriginal" 
      FROM documents 
      WHERE "xmlOriginal" IS NOT NULL 
      LIMIT 3
    `);

        console.log(`\nðŸ“Š Found ${res.rows.length} documents with XML\n`);

        for (const doc of res.rows) {
            console.log('='.repeat(80));
            console.log(`Document ID: ${doc.id}`);
            console.log(`Protocol Number: ${doc.protocolNumber.trim()}`);

            try {
                const parsed = await parseXML(doc.xmlOriginal);
                const factura = parsed.factura;

                if (factura && factura.infoTributaria) {
                    const infoTrib = factura.infoTributaria[0];
                    console.log('\nðŸ“„ INFORMACIÃ“N TRIBUTARIA:');
                    console.log(`  Establecimiento: ${infoTrib.estab?.[0]}`);
                    console.log(`  Punto EmisiÃ³n: ${infoTrib.ptoEmi?.[0]}`);
                    console.log(`  Secuencial: ${infoTrib.secuencial?.[0]}`);

                    if (infoTrib.estab && infoTrib.ptoEmi && infoTrib.secuencial) {
                        const numeroFactura = `${infoTrib.estab[0]}-${infoTrib.ptoEmi[0]}-${infoTrib.secuencial[0]}`;
                        console.log(`  âœ… NÃºmero de Factura: ${numeroFactura}`);
                    }
                }

                if (factura && factura.infoFactura) {
                    const infoFact = factura.infoFactura[0];
                    console.log(`\nðŸ’° INFORMACIÃ“N FACTURA:`);
                    console.log(`  Fecha EmisiÃ³n: ${infoFact.fechaEmision?.[0]}`);
                    console.log(`  Total: $${infoFact.importeTotal?.[0]}`);
                }
            } catch (xmlError) {
                console.log(`  âŒ Error parsing XML: ${xmlError.message}`);
            }

            console.log('');
        }

        await client.end();
        console.log('âœ… Connection closed\n');
    } catch (error) {
        console.error('âŒ Error:', error.message);
        await client.end();
        process.exit(1);
    }
}

analyzeInvoiceNumber();`r`n