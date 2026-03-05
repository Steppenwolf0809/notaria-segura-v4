# Runbook Completo Multi-Tenant + Staging

Fecha: 2026-03-04  
Repo: `notaria-segura-v4`  
Documento de referencia operativa unica para continuidad tecnica.

## 1) Resumen ejecutivo

Estado actual:
1. OLA A: completada.
2. OLA B: completada en staging (RLS + `notary_id` en tablas objetivo).
3. OLA C: implementada y validada en staging (entitlements por modulos).
4. Deploy staging: quedo bloqueado por error runtime de import y se corrigio con commit `6a6223c2`.
5. UAFE: queda fuera del alcance inmediato para refactor completo posterior (UAFE v2).

Decision operativa:
1. Mantener main estable.
2. Validar multi-tenant en staging.
3. Promover a main por bloques controlados cuando staging este verde de forma sostenida.

## 2) Fuente de verdad por documento

Usar estos documentos como base, en este orden:
1. `docs/plans/2026-03-04-multi-tenant-staging-runbook-completo.md` (este documento, operacion diaria).
2. `docs/plans/2026-02-19-multi-tenant-clerk-design.md` (diseno y decisiones base).
3. `docs/plans/2026-02-27-multi-tenant-go-no-go-checklist.md` (gate por olas).
4. `docs/plans/2026-03-02-ola-c-staging-ab-validation.md` (validacion A/B de OLA C).

## 3) Estado de ramas y commits clave (2026-03-05)

`origin/main` (estable):
1. `f6a5f4c3` - `fix: auto-set isOnboarded=true when admin assigns a role`
2. Incluye Clerk auth, Spanish localization, CSP fixes.

`origin/staging` (multi-tenant + Clerk en prueba):
1. `250b9a4a` - `fix: merge legacy users by email on Clerk webhook instead of creating duplicates`
2. `52b1729b` - `feat: auto-assign notaryId when admin assigns role to user`
3. `6a6223c2` - `fix(deploy): restore billing-utils exports used by document controller`

`origin/feature/architecture-v2.1-restart`:
1. `a3e87abc` - `test(multitenant): validate ola c entitlements on staging`
2. `aeb8875a` - `feat(multitenant): implement ola c entitlements and module gating`

## 4) Incidente de deploy del 2026-03-04 (causa y solucion)

Sintoma:
1. Build finalizaba correctamente.
2. Healthcheck `/healthz` fallaba.
3. Railway mantenia como activo el ultimo deploy sano (commit de main).

Causa raiz:
1. Error runtime al iniciar el contenedor:
2. `document-controller.js` importaba `buildInvoiceNumberVariants`.
3. `backend/src/utils/billing-utils.js` en `staging` no exportaba esa funcion.
4. Error exacto: `SyntaxError: ... does not provide an export named 'buildInvoiceNumberVariants'`.

Fix aplicado:
1. Archivo: `backend/src/utils/billing-utils.js`
2. Se agregaron:
   - `buildInvoiceNumberVariants(value)`
   - `buildInvoiceWhereByNumber(value)`
3. Se agregaron al bloque `export { ... }`.
4. Commit: `6a6223c2` en `origin/staging`.

Leccion operativa:
1. Si build pasa y healthcheck falla, revisar primero logs de arranque de Node.
2. El problema era de modulo ESM, no de DB ni migraciones.

## 5) Checklist de despliegue staging (obligatorio)

Antes de redeploy:
1. Confirmar rama del servicio en Railway: `staging`.
2. Confirmar commit objetivo visible en deployment panel (`6a6223c2` o superior).
3. Confirmar variables minimas:
   - `NODE_ENV=staging`
   - `DATABASE_URL` (DB de staging, nunca produccion)
   - `JWT_SECRET` (>= 32 caracteres)
4. No hardcodear secretos en repo.

Durante deploy:
1. Verificar `Build` completo.
2. Verificar `Deploy` completo.
3. Verificar healthcheck exitoso.

Despues de deploy:
1. `GET /healthz` => `200`
2. `GET /api/health` => `200`
3. `POST /api/auth/login` con usuario valido => `200` o `401` controlado, nunca `500`.

## 6) Variables de entorno recomendadas en staging

Minimas:
1. `NODE_ENV=staging`
2. `DATABASE_URL=postgresql://...` (staging)
3. `JWT_SECRET=...` (>=32)

Recomendadas:
1. `FRONTEND_URL=https://<tu-dominio-staging>.up.railway.app`
2. `ALLOWED_ORIGINS=https://<tu-dominio-staging>.up.railway.app,https://www.notaria18quito.com.ec,https://notaria18quito.com.ec`
3. `DB_RLS_RUNTIME_ROLE=app_runtime_rls`

Notas:
1. No guardar credenciales en markdown ni en `.env` trackeado.
2. Rotar cualquier secreto expuesto historicamente.

## 7) Estado multi-tenant actual (2026-03-05)

Implementado y validado:
1. `notary_id` y RLS en tablas core y tablas OLA B.
2. Politica fail-closed (sin contexto tenant => 0 filas).
3. Entitlements OLA C (`plans`, `modules`, `plan_modules`, `notary_subscriptions`, `notary_module_overrides`).
4. Pruebas A/B de aislamiento y de modulo en staging (documentadas en planes previos).
5. **Clerk auth integrado** en staging (login, registro, webhook).
6. **Webhook corregido** para merge de usuarios legacy por email (commit `250b9a4a`).

Validacion RLS automatizada (2026-03-05):
1. Datos de prueba: N18 (2,576 docs) + N99 ficticia (3 docs).
2. 11/11 pruebas de aislamiento pasaron:
   - SELECT: cada tenant solo ve sus datos.
   - INSERT: bloqueado por RLS al intentar inyectar notary_id ajeno.
   - UPDATE/DELETE: 0 filas afectadas en datos de otro tenant.
   - SUPER_ADMIN: ve todos los datos cross-tenant.
   - Sin contexto: 0 filas (fail-closed).
   - Tablas secundarias (document_events, whatsapp_notifications, audit_logs): aislamiento correcto.

Pendiente:
1. Migracion de usuarios legacy a Clerk (requiere emails reales del equipo N18).
2. Definir ola de promocion a main por PR acotado.

## 8) SUPER_ADMIN: operacion actual y restriccion conocida

Situacion:
1. En DB existe rol `SUPER_ADMIN` y puede iniciar sesion.
2. En `backend/src/controllers/auth-controller.js` de staging, `validRoles` no incluye `SUPER_ADMIN`.
3. Impacto: no se puede crear `SUPER_ADMIN` por flujo normal de registro; se debe provisionar por DB.

Provision DB (fallback operativo):
1. Crear o actualizar usuario `SUPER_ADMIN` por SQL.
2. Mantener `notary_id = NULL`.
3. Validar login API despues de crear.

Recomendacion tecnica:
1. Llevar el auth controller de arquitectura (que ya contempla `SUPER_ADMIN`) o aplicar un parche equivalente en staging/main cuando corresponda.

## 9) Validaciones SQL de control (sin secretos)

## 9.1 Tablas con `notary_id`
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'notary_id'
ORDER BY table_name;
```

## 9.2 Nulos por tabla tenant-protected
```sql
SELECT 'documents' AS table_name, COUNT(*) AS nulls FROM documents WHERE notary_id IS NULL
UNION ALL
SELECT 'document_events', COUNT(*) FROM document_events WHERE notary_id IS NULL
UNION ALL
SELECT 'whatsapp_notifications', COUNT(*) FROM whatsapp_notifications WHERE notary_id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE notary_id IS NULL
UNION ALL
SELECT 'payments', COUNT(*) FROM payments WHERE notary_id IS NULL
UNION ALL
SELECT 'import_logs', COUNT(*) FROM import_logs WHERE notary_id IS NULL
UNION ALL
SELECT 'pending_receivables', COUNT(*) FROM pending_receivables WHERE notary_id IS NULL;
```

## 9.3 Estado RLS
```sql
SELECT schemaname, tablename, rowsecurity, force_rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'documents','document_events','whatsapp_notifications',
    'invoices','payments','import_logs','pending_receivables'
  )
ORDER BY tablename;
```

## 10) Pruebas funcionales minimas post-deploy

Smoke por rol:
1. ADMIN: dashboard + gestion usuarios + documentos.
2. CAJA: cartera + reportes + importacion facturacion.
3. MATRIZADOR: cola de documentos + cambios de estado.
4. RECEPCION: entrega + consulta documentos.
5. ARCHIVO: consultas historicas.

Smoke de seguridad:
1. Login invalido devuelve `401` (no `500`).
2. Endpoint protegido sin token devuelve `401`.
3. Tenant sin modulo habilitado recibe `403` con `requireModule`.

## 11) Estrategia de promotion a main (recomendada)

Regla:
1. No mezclar refactors grandes con fixes urgentes.
2. PR por bloque funcional:
   - Bloque 1: deploy/runtime fixes.
   - Bloque 2: schema y migraciones.
   - Bloque 3: RLS/politicas.
   - Bloque 4: entitlements.

Criterio para merge:
1. Deploy staging verde.
2. Smoke por rol verde.
3. Verificacion SQL de aislamiento verde.
4. Sin secretos nuevos en diff.

## 12) Alcance ajustado UAFE (decision vigente)

Decision:
1. UAFE actual se considera inestable para evolucion incremental.
2. Se planifica refactor/rewrite posterior (UAFE v2).
3. La arquitectura multi-tenant puede cerrarse sin bloquearse por UAFE legado.

Implicacion:
1. No frenar cierre de arquitectura por cambios de modelo UAFE aun en definicion.
2. Mantener interfaces limpias para integrar UAFE v2 luego.

## 13) Troubleshooting rapido

Caso A: Build OK, healthcheck FAIL
1. Revisar logs de runtime.
2. Buscar `SyntaxError` / `ERR_MODULE_*` / `Cannot find module`.
3. Corregir import/export roto.

Caso B: `POST /api/auth/login` da `500`
1. Revisar logs backend de auth.
2. Validar schema real de `users` y constraint de rol.
3. Validar hash de password compatible con `bcryptjs`.

Caso C: Staging parece correr main
1. Verificar deployment activo en Railway (commit mostrado).
2. Si staging fallo healthcheck, Railway mantiene el ultimo release sano.
3. Corregir fallo runtime y redeploy.

## 14) Proximos pasos concretos (ordenados, actualizado 2026-03-05)

### Fase 1: Migracion de usuarios a Clerk (bloqueante)
1. Obtener emails reales del equipo N18 (pendiente de Jose Luis).
2. Actualizar emails en DB de produccion (`UPDATE users SET email = '...' WHERE id = N`).
3. Desplegar webhook corregido a main (merge de staging o cherry-pick de `250b9a4a`).
4. Crear cuentas de cada usuario en Clerk con sus emails reales.
5. Verificar que el webhook vincule automaticamente (clerkId asignado al usuario existente).
6. Smoke test por rol: cada usuario entra y ve sus documentos.

### Fase 2: Promocion multi-tenant a main (por bloques)
7. PR Bloque 1: deploy/runtime fixes + webhook Clerk corregido.
8. PR Bloque 2: schema y migraciones (notary_id en tablas OLA B).
9. PR Bloque 3: RLS/politicas + tenant context hardening.
10. PR Bloque 4: entitlements OLA C.
11. Verificacion SQL de aislamiento en produccion post-merge.

### Fase 3: Funcionalidades nuevas
12. Formulario UAFE / Informe UAFE (puede desarrollarse en staging en paralelo).
13. Iniciar documento de arranque UAFE v2 con alcance nuevo.

### Criterio de completitud
- Deploy staging verde con healthcheck OK.
- Smoke por rol verde (ADMIN, CAJA, MATRIZADOR, RECEPCION, ARCHIVO).
- Verificacion SQL de aislamiento verde (11/11 pruebas).
- Sin secretos en diff de PR.
- Usuarios legacy vinculados a Clerk correctamente.

