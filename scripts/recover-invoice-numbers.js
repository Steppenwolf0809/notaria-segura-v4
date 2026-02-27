const { Client } = require('pg');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseXML = promisify(parseString);

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
  } catch (_error) {
    return null;
  }
}

async function recoverInvoiceNumbers() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL no esta configurada.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Conectado a la base de datos.');

    const res = await client.query(`
      SELECT id, "protocolNumber", "xmlOriginal"
      FROM documents
      WHERE "xmlOriginal" IS NOT NULL
        AND ("numeroFactura" IS NULL OR "numeroFactura" = '')
      ORDER BY "createdAt" DESC
    `);

    const total = res.rows.length;
    console.log(`Documentos encontrados con XML: ${total}`);

    if (total === 0) {
      await client.end();
      return;
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;

    const batchSize = 10;

    for (let i = 0; i < res.rows.length; i += batchSize) {
      const batch = res.rows.slice(i, i + batchSize);

      for (const doc of batch) {
        processed += 1;

        try {
          const parsed = await parseXML(doc.xmlOriginal);
          const factura = parsed.factura;

          if (!factura) {
            errors += 1;
            continue;
          }

          const numeroFactura = extractNumeroFactura(factura);
          if (!numeroFactura) {
            errors += 1;
            continue;
          }

          await client.query(
            `UPDATE documents
             SET "numeroFactura" = $1
             WHERE id = $2`,
            [numeroFactura, doc.id]
          );

          updated += 1;
        } catch (_error) {
          errors += 1;
        }
      }

      if (i + batchSize < res.rows.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`Procesados: ${processed}`);
    console.log(`Actualizados: ${updated}`);
    console.log(`Errores: ${errors}`);

    await client.end();
  } catch (error) {
    console.error('Error fatal:', error.message);
    await client.end();
    process.exit(1);
  }
}

recoverInvoiceNumbers();