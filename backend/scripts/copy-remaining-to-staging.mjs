import { PrismaClient } from '@prisma/client';

const PROD_URL = 'postgresql://postgres:ncIoHAWdqVZpyiqvxBxypTQJfGLyGLlI@switchback.proxy.rlwy.net:25513/railway';
const STG_URL = 'postgresql://postgres:mqQTCFwvCqaCgmSHlsJVlektuROOgAcq@hopper.proxy.rlwy.net:52434/railway';

const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } });
const stg = new PrismaClient({ datasources: { db: { url: STG_URL } } });

async function copyGeneric(tableName) {
  const rows = await prod.$queryRawUnsafe(`SELECT * FROM ${tableName}`);
  let ok = 0;
  for (const r of rows) {
    const cols = Object.keys(r);
    const colStr = cols.map(c => `"${c}"`).join(',');
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    try {
      await stg.$executeRawUnsafe(
        `INSERT INTO ${tableName} (${colStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        ...Object.values(r)
      );
      ok++;
    } catch (e) {
      // skip FK errors, duplicates
    }
  }
  console.log(`${tableName}: ${ok}/${rows.length}`);
}

async function main() {
  console.log('=== Copying remaining tables to staging ===\n');

  // UAFE tables
  await copyGeneric('protocolos_uafe');
  await copyGeneric('personas_protocolo');
  await copyGeneric('formulario_uafe_asignaciones');
  await copyGeneric('sesiones_formulario_uafe');

  // Other missing tables
  await copyGeneric('import_logs');
  await copyGeneric('mensajes_internos');
  await copyGeneric('encuestas_satisfaccion');

  // Payments (already partially done, but check)
  const stgPayCount = await stg.$queryRawUnsafe("SELECT count(*)::int as c FROM payments");
  const prodPayCount = await prod.$queryRawUnsafe("SELECT count(*)::int as c FROM payments");
  if (stgPayCount[0].c < prodPayCount[0].c) {
    await copyGeneric('payments');
  } else {
    console.log(`payments: already OK (${stgPayCount[0].c})`);
  }

  console.log('\n=== Final verification ===');
  const tables = [
    'users', 'documents', 'document_events', 'invoices', 'payments',
    'whatsapp_notifications', 'whatsapp_templates', 'escrituras_qr',
    'protocolos_uafe', 'personas_protocolo', 'personas_registradas',
    'pending_receivables', 'formulario_uafe_asignaciones',
    'sesiones_formulario_uafe', 'import_logs', 'mensajes_internos',
    'encuestas_satisfaccion'
  ];

  for (const t of tables) {
    const pc = await prod.$queryRawUnsafe(`SELECT count(*)::int as c FROM ${t}`);
    const sc = await stg.$queryRawUnsafe(`SELECT count(*)::int as c FROM ${t}`);
    const status = sc[0].c >= pc[0].c ? 'OK' : `DIFF (-${pc[0].c - sc[0].c})`;
    console.log(`  ${t}: prod=${pc[0].c} stg=${sc[0].c} ${status}`);
  }

  await prod.$disconnect();
  await stg.$disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  prod.$disconnect();
  stg.$disconnect();
  process.exit(1);
});
