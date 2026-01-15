const { Client } = require('pg');

// Verificar que el campo numeroFactura se está guardando correctamente
async function verifyInvoiceNumbers() {
    const connectionString = process.env.DATABASE_URL ||
        'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway';

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // Verificar documentos con número de factura
        const withInvoice = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM documents
      WHERE "numeroFactura" IS NOT NULL AND "numeroFactura" != ''
    `);

        // Verificar documentos con XML pero sin número de factura
        const withXmlNoInvoice = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM documents
      WHERE "xmlOriginal" IS NOT NULL 
        AND ("numeroFactura" IS NULL OR "numeroFactura" = '')
    `);

        // Obtener algunos ejemplos
        const examples = await client.query(`
      SELECT 
        "protocolNumber",
        "numeroFactura",
        "documentType",
        "totalFactura",
        "fechaFactura"
      FROM documents
      WHERE "numeroFactura" IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

        console.log('📊 RESULTADOS DE LA VERIFICACIÓN');
        console.log('='.repeat(80));
        console.log(`✅ Documentos con número de factura: ${withInvoice.rows[0].count}`);
        console.log(`⚠️  Documentos con XML pero sin número de factura: ${withXmlNoInvoice.rows[0].count}`);
        console.log('='.repeat(80));

        if (examples.rows.length > 0) {
            console.log('\n📋 EJEMPLOS DE DOCUMENTOS CON NÚMERO DE FACTURA:\n');
            examples.rows.forEach((doc, idx) => {
                console.log(`${idx + 1}. ${doc.protocolNumber}`);
                console.log(`   Número de Factura: ${doc.numeroFactura}`);
                console.log(`   Tipo: ${doc.documentType}`);
                console.log(`   Total: $${doc.totalFactura}`);
                console.log(`   Fecha: ${doc.fechaFactura ? new Date(doc.fechaFactura).toLocaleDateString('es-EC') : 'N/A'}`);
                console.log('');
            });
        }

        await client.end();
        console.log('✅ Verificación completada\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await client.end();
        process.exit(1);
    }
}

verifyInvoiceNumbers();
