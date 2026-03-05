/**
 * OLA B - Fase 5: Activar RLS (Row Level Security)
 * Opcion C: FORCE RLS + fallback (si app.current_notary_id no esta seteado, permite acceso)
 *
 * Ejecutar: DATABASE_URL="..." node scripts/fase5-rls.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_TABLES = [
  'documents',
  'document_events',
  'invoices',
  'whatsapp_notifications',
  'pending_receivables',
  'whatsapp_templates',
  'escrituras_qr',
  'protocolos_uafe',
  'formulario_uafe_asignaciones',
  'import_logs',
  'mensajes_internos',
  'encuestas_satisfaccion',
  'consultas_lista_control',
];

async function main() {
  console.log('=== OLA B - Fase 5: Activar RLS ===\n');

  // 0. Verificar que todas las tablas tienen notary_id
  console.log('--- Paso 0: Verificar notary_id en tablas ---');
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name='notary_id'
    ORDER BY table_name
  `);
  console.log('Tablas con notary_id:', cols.length);
  for (const c of cols) {
    console.log(`  ${c.table_name}: notary_id (nullable=${c.is_nullable})`);
  }

  const tablesWithNotaryId = new Set(cols.map(c => c.table_name));
  const missing = TENANT_TABLES.filter(t => !tablesWithNotaryId.has(t));
  if (missing.length > 0) {
    console.error('FALTA notary_id en:', missing);
    process.exit(1);
  }
  console.log('Todas las tablas tienen notary_id.\n');

  // 1. Crear rol app_runtime_rls (si no existe)
  console.log('--- Paso 1: Crear rol app_runtime_rls ---');
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime_rls') THEN
        CREATE ROLE app_runtime_rls NOLOGIN NOBYPASSRLS;
      END IF;
    END $$
  `);
  console.log('Rol app_runtime_rls OK.\n');

  // 2. Grants
  console.log('--- Paso 2: Grants para app_runtime_rls ---');
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO app_runtime_rls`);
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime_rls`);
  await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime_rls`);
  // Grants para tablas/secuencias futuras
  await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime_rls`);
  await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime_rls`);
  console.log('Grants OK.\n');

  // 3. Habilitar RLS + FORCE en cada tabla
  console.log('--- Paso 3: ENABLE + FORCE ROW LEVEL SECURITY ---');
  for (const table of TENANT_TABLES) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
    console.log(`  ${table}: RLS ENABLED + FORCED`);
  }
  console.log('');

  // 4. Crear politicas con fallback (Opcion C)
  // Si app.current_notary_id NO esta seteado -> permite todo (fallback)
  // Si app.current_notary_id ESTA seteado -> filtra por tenant
  // SUPER_ADMIN bypass via app.is_super_admin
  console.log('--- Paso 4: Crear politicas tenant_isolation ---');
  for (const table of TENANT_TABLES) {
    // Drop existing policy if any (idempotent)
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "${table}"`);

    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "${table}"
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
    console.log(`  ${table}: policy tenant_isolation CREATED`);
  }
  console.log('');

  // 5. Verificar
  console.log('--- Paso 5: Verificacion ---');
  const rlsStatus = await prisma.$queryRawUnsafe(`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname = ANY($1)
    ORDER BY relname
  `, TENANT_TABLES);

  for (const r of rlsStatus) {
    const ok = r.relrowsecurity && r.relforcerowsecurity;
    console.log(`  ${r.relname}: rls=${r.relrowsecurity} force=${r.relforcerowsecurity} ${ok ? 'OK' : 'PROBLEMA'}`);
  }

  const policies = await prisma.$queryRawUnsafe(`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public' AND policyname='tenant_isolation'
    ORDER BY tablename
  `);
  console.log(`\nPoliticas tenant_isolation: ${policies.length}/${TENANT_TABLES.length}`);
  for (const p of policies) {
    console.log(`  ${p.tablename}: ${p.policyname}`);
  }

  // 6. Test funcional: verificar que sin SET, las queries siguen funcionando (fallback)
  console.log('\n--- Paso 6: Test funcional (fallback sin SET) ---');
  const docCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM documents`);
  console.log(`  SELECT COUNT(*) FROM documents (sin SET): ${docCount[0].count} registros`);

  if (docCount[0].count > 0) {
    console.log('  Fallback funciona correctamente: acceso sin restriccion cuando no hay tenant seteado.');
  } else {
    console.error('  PROBLEMA: No se ven registros. RLS puede estar bloqueando.');
  }

  // 7. Test funcional: verificar que CON SET, filtra correctamente
  console.log('\n--- Paso 7: Test funcional (con SET notary_id=1) ---');
  const filteredCount = await prisma.$queryRawUnsafe(`
    SELECT set_config('app.current_notary_id', '1', true) as cfg
  `);
  const docCountFiltered = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM documents`);
  console.log(`  SELECT COUNT(*) FROM documents (con SET notary_id=1): ${docCountFiltered[0].count} registros`);

  // Test con notary_id inexistente
  await prisma.$queryRawUnsafe(`SELECT set_config('app.current_notary_id', '999', true)`);
  const docCountEmpty = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM documents`);
  console.log(`  SELECT COUNT(*) FROM documents (con SET notary_id=999): ${docCountEmpty[0].count} registros`);

  if (docCountEmpty[0].count === 0) {
    console.log('  Aislamiento funciona: notary_id=999 no ve ningun documento.');
  } else {
    console.error(`  PROBLEMA: notary_id=999 ve ${docCountEmpty[0].count} registros.`);
  }

  // Limpiar setting
  await prisma.$queryRawUnsafe(`SELECT set_config('app.current_notary_id', '', true)`);

  console.log('\n=== Fase 5 COMPLETADA ===');
  console.log('RLS activado con fallback (Opcion C).');
  console.log('Siguiente paso: agregar SET LOCAL app.current_notary_id en db.js para activar filtrado.');
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
