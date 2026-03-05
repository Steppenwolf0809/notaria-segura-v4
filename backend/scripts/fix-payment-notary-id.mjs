/**
 * Fix: Agregar notary_id a tabla payments + backfill + RLS
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Fix: Agregar notary_id a payments ===\n');

  // 1. Agregar columna
  console.log('--- Paso 1: Agregar columna notary_id ---');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS notary_id INT NOT NULL DEFAULT 1 REFERENCES notaries(id)
  `);
  console.log('  columna notary_id agregada (NOT NULL DEFAULT 1)\n');

  // 2. Indice
  console.log('--- Paso 2: Indice ---');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_payments_notary_id ON payments(notary_id)
  `);
  console.log('  idx_payments_notary_id OK\n');

  // 3. Backfill (por si hay rows sin default)
  console.log('--- Paso 3: Backfill ---');
  const updated = await prisma.$executeRawUnsafe(`UPDATE payments SET notary_id = 1 WHERE notary_id IS NULL`);
  console.log(`  ${updated} rows actualizados\n`);

  // 4. RLS
  console.log('--- Paso 4: Activar RLS ---');
  await prisma.$executeRawUnsafe(`ALTER TABLE payments ENABLE ROW LEVEL SECURITY`);
  await prisma.$executeRawUnsafe(`ALTER TABLE payments FORCE ROW LEVEL SECURITY`);
  await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON payments`);
  await prisma.$executeRawUnsafe(`
    CREATE POLICY tenant_isolation ON payments
      FOR ALL
      USING (
        current_setting('app.current_notary_id', true) IS NULL
        OR current_setting('app.current_notary_id', true) = ''
        OR notary_id = current_setting('app.current_notary_id', true)::INT
      )
      WITH CHECK (
        current_setting('app.current_notary_id', true) IS NULL
        OR current_setting('app.current_notary_id', true) = ''
        OR notary_id = current_setting('app.current_notary_id', true)::INT
      )
  `);
  console.log('  RLS ENABLED + FORCED + policy tenant_isolation OK\n');

  // 5. Grants para app_runtime_rls (por si la tabla es nueva post-grants)
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO app_runtime_rls`);

  // 6. Verificar
  console.log('--- Paso 5: Verificacion ---');
  const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM payments`);
  console.log(`  Total payments: ${count[0].count}`);
  const nulls = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM payments WHERE notary_id IS NULL`);
  console.log(`  NULLs: ${nulls[0].count}`);
  const rls = await prisma.$queryRawUnsafe(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='payments'`);
  console.log(`  RLS: enabled=${rls[0].relrowsecurity} forced=${rls[0].relforcerowsecurity}`);

  console.log('\n=== Completado ===');
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
