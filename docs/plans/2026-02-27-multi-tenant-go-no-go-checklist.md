# Checklist Go/No-Go por Olas: Multi-Tenant

Fecha: 2026-02-27  
Rama de trabajo: `feature/architecture-v2.1-restart`  
Documento base: `docs/plans/2026-02-19-multi-tenant-clerk-design.md`

## 1) Regla de decision

1. `GO`: todos los checks criticos de la ola estan en verde.
2. `NO-GO`: basta un check critico en rojo para bloquear avance.
3. Cada ola se libera en PR separado para reducir riesgo.
4. No activar RLS en tablas nuevas si el flujo de app aun no corre con contexto tenant transaccional.

## 2) Semaforo operativo

1. `Verde`: cumple criterio, evidencia adjunta.
2. `Amarillo`: riesgo controlado, requiere accion correctiva antes de promover.
3. `Rojo`: bloqueo inmediato de release.

## 3) Preflight global (antes de OLA A)

- [ ] Backup valido de staging y produccion.
- [ ] Confirmar `app_runtime_rls` sin bypass:
  - `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime_rls';`
- [ ] Confirmar helper de contexto tenant en uso:
  - `backend/src/utils/tenant-context.js`
  - `backend/src/utils/apply-tenant-rls-context.js`
- [ ] Congelar merges de features no relacionadas hasta cerrar OLA B.

## 4) OLA A: Endurecimiento de controladores

Objetivo: asegurar que endpoints tenant-protected usen `withRequestTenantContext` o `withTenantContext`.

### 4.1 GO de entrada (para iniciar OLA A)

- [x] Lista cerrada de controladores en alcance. (2026-02-26: 10 controladores auditados)
- [x] Mapa por controlador: que tablas toca y si son tenant-protected. (ver seccion 13 del plan principal)
- [ ] Baseline de tests backend ejecutado.

### 4.2 Checks criticos de salida (GO para pasar a OLA B)

- [x] Ningun endpoint tenant-protected ejecuta queries fuera de contexto transaccional tenant.
  - Estado 2026-02-27: 11/11 controladores endurecidos en codigo + `sync-billing-controller` endurecido con `withTenantContext`.
- [x] Prueba `SUPER_ADMIN` cross-tenant en endpoints reales.
  - Evidencia 2026-02-27: `backend/tests/e2e/super-admin-isolation.test.js` -> `PASS` (3/3 casos).
- [x] Validacion fail-closed en endpoints: sin contexto tenant -> sin datos.
  - Evidencia 2026-02-27: `backend/scripts/verify-tenant-isolation-ab.js` -> `without_tenant_context` devuelve `0` filas.
- [x] Sin regresion de flujos N18 (documentos, recepcion, archivo, admin).
  - Evidencia 2026-02-27: smoke manual por rol completado en staging; incidencia de cartera corregida (drift de schema en `pending_receivables`).

### 4.3 NO-GO inmediato

- [ ] Se detecta query directa a tabla tenant-protected fuera de `withRequestTenantContext`/`withTenantContext`.
  - Estado 2026-02-27: sin ocurrencias activas en controladores del alcance OLA A (solo casos aceptados: helper standalone y codigo comentado).
- [ ] Endpoint retorna datos de tenant incorrecto.
- [ ] Endpoint de tenant normal puede leer datos cross-tenant.

### 4.4 Evidencia minima requerida

1. Diff de controladores endurecidos.
   - Estado 2026-02-27: Commit `92849ce7` en rama `feature/architecture-v2.1-restart`.
2. Resultado de `backend/tests/e2e/super-admin-isolation.test.js`.
   - Estado 2026-02-27: `PASS` (3/3 casos).
3. Log de smoke tests manuales por rol (`ADMIN`, `CAJA`, `MATRIZADOR`, `RECEPCION`, `ARCHIVO`).
   - Estado 2026-02-27: completado.
   - Nota: error 500 en cartera (`/api/billing/my-portfolio` y reportes) resuelto con migracion de columnas `cashierComment*` en `pending_receivables`.

### 4.5 Estado operativo OLA A (2026-02-27)

1. Semaforo actual: `Verde`.
2. Decision: `GO` aprobado para iniciar OLA B.

## 5) OLA B: notary_id + Backfill + RLS (Grupo A y B)

Objetivo: completar tenant scoping estructural en tablas pendientes y activar RLS sin romper operacion.

### 5.1 GO de entrada (para iniciar OLA B)

- [x] OLA A aprobada en verde.
- [x] Definido mapping de backfill por tabla (source of truth por fila).
  - Evidencia 2026-02-27: migracion `20260227060000_ola_b_add_notary_id_business_uafe_tables`.
- [x] Query de filas no mapeables definida por tabla.
  - Evidencia 2026-02-27: validacion post-backfill en staging con `nullNotaryId = 0` en 13 tablas objetivo.

### 5.2 Secuencia obligatoria de ejecucion

1. Agregar `notary_id` como nullable.
2. Backfill por lotes con trazabilidad.
3. Corregir filas no mapeables.
4. Crear trigger auto-assign para nuevas filas.
5. Agregar FK e indices.
6. Validar `COUNT(*) WHERE notary_id IS NULL = 0`.
7. Reci en ese punto: `NOT NULL`.
8. Activar `ENABLE + FORCE ROW LEVEL SECURITY`.
9. Crear politicas tenant isolation.
10. Validar grants de tablas, secuencias y funciones para `app_runtime_rls`.

### 5.3 Checks criticos de salida (GO para pasar a OLA C)

- [x] `notary_id` sin nulos en todas las tablas objetivo.
  - Evidencia 2026-02-27: `nullNotaryId = 0` en `invoices`, `payments`, `import_logs`, `pending_receivables`, `escrituras_qr`, `mensajes_internos`, `whatsapp_templates`, `protocolos_uafe`, `personas_protocolo`, `formulario_uafe_asignaciones`, `formulario_uafe_respuestas`, `sesiones_formulario_uafe`, `auditoria_personas`.
- [x] Endurecimiento de servicios/rutas OLA B cerrado antes de activar RLS.
  - Evidencia 2026-02-27: `alertas-service`, `bulk-status-service`, `import-mov-service`, `import-koinor-xml-service`, `matrizador-assignment-service` migrados a `dbClient` tenant-scoped y conectados desde controladores/rutas con `withRequestTenantContext`/`withTenantContext`.
- [x] Todas las tablas objetivo con `FORCE ROW LEVEL SECURITY`.
  - Evidencia 2026-02-27: migracion `20260227113000_enable_rls_ola_b_business_uafe_tables` aplicada; `rowsecurity=true` y `force_rowsecurity=true` en 13/13 tablas.
- [x] Sin contexto tenant, consultas retornan `0` filas.
  - Evidencia 2026-02-27: validacion SQL con `SET LOCAL ROLE app_runtime_rls` + `app.current_notary_id=''` retorna `0` en 13/13 tablas.
- [x] Tenant A no puede leer/escribir tenant B.
  - Evidencia 2026-02-27: validacion SQL A/B (`tenantA` con datos vs `tenantB` UUID distinto con `0` filas) en 13/13 tablas.
- [ ] `SUPER_ADMIN` funciona cross-tenant con auditoria.
  - Estado 2026-02-27: validacion SQL de lectura cross-tenant en verde; falta evidencia de endpoint + auditoria funcional.

### 5.4 NO-GO inmediato

- [ ] Existe cualquier fila con `notary_id IS NULL` tras backfill final.
- [ ] Se activa RLS sin haber cerrado hardening de endpoints.
- [ ] Falla insercion por permisos incompletos de secuencias/funciones.
- [ ] Se detecta degradacion severa de performance (>30% p95) sin plan de mitigacion.

### 5.5 SQL minima de verificacion

```sql
-- Estado RLS por tabla
SELECT schemaname, tablename, rowsecurity, force_rowsecurity
FROM pg_tables
WHERE schemaname IN ('public', 'uafe')
  AND tablename IN (
    'invoices', 'payments', 'import_logs', 'pending_receivables',
    'escrituras_qr', 'mensajes_internos', 'whatsapp_templates',
    'protocolos_uafe', 'personas_protocolo',
    'formulario_uafe_asignaciones', 'formulario_uafe_respuestas',
    'sesiones_formulario_uafe', 'auditoria_personas'
  )
ORDER BY schemaname, tablename;
```

```sql
-- Nulos de tenant (debe dar 0 por tabla antes de NOT NULL)
SELECT 'invoices' AS tabla, COUNT(*) AS nulls FROM invoices WHERE notary_id IS NULL
UNION ALL
SELECT 'payments', COUNT(*) FROM payments WHERE notary_id IS NULL
UNION ALL
SELECT 'import_logs', COUNT(*) FROM import_logs WHERE notary_id IS NULL
UNION ALL
SELECT 'pending_receivables', COUNT(*) FROM pending_receivables WHERE notary_id IS NULL
UNION ALL
SELECT 'escrituras_qr', COUNT(*) FROM escrituras_qr WHERE notary_id IS NULL
UNION ALL
SELECT 'mensajes_internos', COUNT(*) FROM mensajes_internos WHERE notary_id IS NULL
UNION ALL
SELECT 'whatsapp_templates', COUNT(*) FROM whatsapp_templates WHERE notary_id IS NULL
UNION ALL
SELECT 'protocolos_uafe', COUNT(*) FROM protocolos_uafe WHERE notary_id IS NULL
UNION ALL
SELECT 'personas_protocolo', COUNT(*) FROM personas_protocolo WHERE notary_id IS NULL
UNION ALL
SELECT 'formulario_uafe_asignaciones', COUNT(*) FROM formulario_uafe_asignaciones WHERE notary_id IS NULL
UNION ALL
SELECT 'formulario_uafe_respuestas', COUNT(*) FROM formulario_uafe_respuestas WHERE notary_id IS NULL
UNION ALL
SELECT 'sesiones_formulario_uafe', COUNT(*) FROM sesiones_formulario_uafe WHERE notary_id IS NULL
UNION ALL
SELECT 'auditoria_personas', COUNT(*) FROM auditoria_personas WHERE notary_id IS NULL;
```

## 6) OLA C: Modulos y planes (entitlements)

Objetivo: habilitacion tecnica por notaria sin cobro in-app.

### 6.1 GO de entrada (para iniciar OLA C)

- [x] OLA B aprobada.
- [x] Tablas de entitlements creadas y migradas en staging.
  - Evidencia 2026-03-02:
    - SQL aplicada en staging: `npx prisma db execute --file prisma/migrations/20260227173000_ola_c_entitlements_modules_plans/migration.sql`
    - Tablas verificadas: `plans`, `modules`, `plan_modules`, `notary_subscriptions`, `notary_module_overrides`.
- [x] Seed inicial de modulos definido.

### 6.2 Checks criticos de salida (GO de release funcional)

- [x] `getEnabledModules(notaryId)` resuelve plan + overrides correctamente.
- [x] `requireModule(moduleCode)` bloquea con `403` cuando modulo no habilitado.
- [x] Notaria sin suscripcion activa queda fail-closed para modulos protegidos.
- [x] Endpoints Facturacion/QR/Mensajes respetan gating por modulo.
- [ ] Integrar UAFE al gating por modulo cuando inicie `UAFE_V2`.

### 6.3 NO-GO inmediato

- [ ] Notaria sin modulo activo puede entrar a endpoint protegido.
- [ ] Cache de entitlements entrega permisos stale sin invalidacion.
- [ ] Error de resolucion de plan deja acceso permitido por defecto.

### 6.4 Evidencia minima requerida

1. [x] Tests de servicio `entitlement-service` (`backend/tests/entitlement-service.test.js`).
2. [x] Tests de middleware `require-module` (`backend/tests/require-module-middleware.test.js`).
3. [x] E2E tecnico A/B con notaria A habilitada y notaria B bloqueada por modulo.
   - Evidencia 2026-03-02: `backend/scripts/verify-entitlements-ab.js` (PASS en staging).

## 7) Checklist E2E final de aislamiento (gate de cierre)

- [ ] Crear tenants A/B de prueba en entorno de validacion.
- [ ] Validar aislamiento en tablas core y tablas nuevas.
- [ ] Validar UAFE sin mezcla entre notarias.
- [ ] Validar `SUPER_ADMIN` cross-tenant auditado.
- [ ] Validar `requireModule` en rutas reales.
- [ ] Validar fail-closed sin contexto tenant.

Comandos de referencia:

```bash
cd backend
npm run test:e2e -- --testPathPatterns=tests/e2e
node scripts/verify-tenant-isolation-ab.js
```

## 8) Cadencia de control y criterio de release

1. Actualizar este checklist al cierre de cada sesion tecnica.
2. No promover a produccion sin evidencia de OLA B y OLA C en verde.
3. Mantener plan de rollback por ola:
   - OLA A: revert de PR de controladores.
   - OLA B: rollback de migracion solo si no se promovio `NOT NULL`; si ya se promovio, usar migracion correctiva forward-only.
   - OLA C: feature flag o bypass controlado por configuracion mientras se corrige.
4. Registrar decision final en el checklist vivo del documento principal.
