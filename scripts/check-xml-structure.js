const { Client } = require('pg');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseXML = promisify(parseString);

async function analyzeInvoiceNumber() {
    const client = new Client({
        connectionString: 'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway'
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        const res = await client.query(`
      SELECT id, "protocolNumber", "xmlOriginal" 
      FROM documents 
      WHERE "xmlOriginal" IS NOT NULL 
      LIMIT 3
    `);

        console.log(`\n📊 Found ${res.rows.length} documents with XML\n`);

        for (const doc of res.rows) {
            console.log('='.repeat(80));
            console.log(`Document ID: ${doc.id}`);
            console.log(`Protocol Number: ${doc.protocolNumber.trim()}`);

            try {
                const parsed = await parseXML(doc.xmlOriginal);
                const factura = parsed.factura;

                if (factura && factura.infoTributaria) {
                    const infoTrib = factura.infoTributaria[0];
                    console.log('\n📄 INFORMACIÓN TRIBUTARIA:');
                    console.log(`  Establecimiento: ${infoTrib.estab?.[0]}`);
                    console.log(`  Punto Emisión: ${infoTrib.ptoEmi?.[0]}`);
                    console.log(`  Secuencial: ${infoTrib.secuencial?.[0]}`);

                    if (infoTrib.estab && infoTrib.ptoEmi && infoTrib.secuencial) {
                        const numeroFactura = `${infoTrib.estab[0]}-${infoTrib.ptoEmi[0]}-${infoTrib.secuencial[0]}`;
                        console.log(`  ✅ Número de Factura: ${numeroFactura}`);
                    }
                }

                if (factura && factura.infoFactura) {
                    const infoFact = factura.infoFactura[0];
                    console.log(`\n💰 INFORMACIÓN FACTURA:`);
                    console.log(`  Fecha Emisión: ${infoFact.fechaEmision?.[0]}`);
                    console.log(`  Total: $${infoFact.importeTotal?.[0]}`);
                }
            } catch (xmlError) {
                console.log(`  ❌ Error parsing XML: ${xmlError.message}`);
            }

            console.log('');
        }

        await client.end();
        console.log('✅ Connection closed\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        await client.end();
        process.exit(1);
    }
}

analyzeInvoiceNumber();
