const { Client } = require('pg');

async function verifyInvoiceNumbers() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL no esta configurada.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const withInvoice = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM documents
      WHERE "numeroFactura" IS NOT NULL AND "numeroFactura" != ''
    `);

    const withXmlNoInvoice = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM documents
      WHERE "xmlOriginal" IS NOT NULL
        AND ("numeroFactura" IS NULL OR "numeroFactura" = '')
    `);

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

    console.log('RESULTADOS DE VERIFICACION');
    console.log(`Documentos con numero de factura: ${withInvoice.rows[0].count}`);
    console.log(`Documentos con XML sin numero de factura: ${withXmlNoInvoice.rows[0].count}`);

    for (const [index, doc] of examples.rows.entries()) {
      console.log(`${index + 1}. ${doc.protocolNumber}`);
      console.log(`   NumeroFactura: ${doc.numeroFactura}`);
      console.log(`   Tipo: ${doc.documentType}`);
      console.log(`   Total: ${doc.totalFactura}`);
      console.log(`   Fecha: ${doc.fechaFactura ? new Date(doc.fechaFactura).toISOString() : 'N/A'}`);
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifyInvoiceNumbers();