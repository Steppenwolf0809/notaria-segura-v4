# Multi-Tenant + Clerk + UAFE Design (v1 Piloto N18)

Fecha: 2026-02-19  
Rama: `feature/architecture-v2.1-restart`  
Estado: Validado con usuario

## 0) Estado de Implementacion (Actualizado 2026-02-19)

Implementado en codigo (Fase 1 + avance Fase 2):
1. Fundacion multi-tenant en Prisma:
   - `notaries`
   - `users` con `notary_id`, `clerk_user_id`, `deleted_at`
   - rol `SUPER_ADMIN`
2. Middleware de resolucion tenant/superadmin en auth.
3. Login legacy ajustado con contexto transaccional.
4. Seed N18 actualizado para piloto Clerk.
5. Reglas fail-closed agregadas en este plan (deny-by-default + `FORCE ROW LEVEL SECURITY`).
6. Auditoria inmutable agregada por migracion (`audit_logs` append-only).
7. Migraciones aplicadas en staging (`20260219113000` y `20260219133000`) con hardening de compatibilidad legacy.
8. Flujos de `auth` y CRUD de usuarios admin ejecutan operaciones tenant-scoped con transaccion + `SET LOCAL`.
9. Auditoria persistente para `SUPER_ADMIN` en cambios de contexto tenant y CRUD cross-tenant de usuarios.

Migraciones nuevas creadas:
1. `backend/prisma/migrations/20260219113000_phase1_multi_tenant_foundation/migration.sql`
2. `backend/prisma/migrations/20260219133000_add_immutable_audit_logs/migration.sql`

Pendiente para continuar (siguiente conversacion):
1. Ejecutar Fase 2 completa: activar RLS por tabla core/UAFE con politicas fail-closed.
2. Terminar migracion de todos los controladores/servicios tenant-scoped a transaccion + `SET LOCAL`.
3. Pruebas de aislamiento A/B + casos `SUPER_ADMIN` cross-tenant auditados extremo a extremo.

## 1) Objetivo

Escalar Notaria Segura para operar con multiples notarias sin rehacer arquitectura por cliente.
El diseno debe garantizar aislamiento fuerte de datos (especialmente UAFE), soporte a venta directa
por modulos y operacion segura en una sola infraestructura.

## 2) Decisiones Cerradas

1. Modelo tenant: base de datos compartida + `notary_id` + RLS.
2. Auth staff: Clerk (no Auth0).
3. Login v1: solo correo + clave.
4. Piloto v1: solo notaria `N18` con usuarios legacy.
5. Migracion legacy: mantener clave antigua (bcrypt digest), sin forzar cambio de clave por ahora.
6. Super admin: acceso cross-tenant auditado, sin `BYPASSRLS` en el rol principal de la app.
7. UAFE: schema separado `uafe` dentro de la misma base PostgreSQL.
8. Monetizacion v1: habilitacion tecnica por modulos (sin cobro in-app).
9. Borrado: soft delete obligatorio en entidades criticas (`deleted_at`).

## 3) Alcance v1

Incluido:
1. Fundacion multi-tenant en `public`.
2. Integracion Clerk para staff + mapeo `org -> notary`.
3. Politicas RLS por tenant y bypass por contexto de sesion (`app.is_super_admin`).
4. UAFE inicial en schema `uafe` con aislamiento por tenant.
5. Modelo de planes/modulos normalizado para setup comercial manual.

No incluido:
1. Cobro dentro de la plataforma.
2. Wizard completo de onboarding multi-notaria.
3. Separacion fisica de UAFE en otra base (se evalua en fase futura).

## 4) Modelo de Datos (Base)

### 4.1 Entidades tenant en `public`

1. `notaries`
   - `id` (uuid pk)
   - `code` (unique)
   - `slug` (unique)
   - `clerk_org_id` (unique)
   - `is_active` (bool)
   - `deleted_at` (timestamp null)
   - metadatos operativos (nombre, ruc, contacto, etc.)

2. `users`
   - `id` (int pk)
   - `email` (unique activo)
   - `clerk_user_id` (unique)
   - `role`
   - `notary_id` (nullable solo para `SUPER_ADMIN`)
   - `is_active`
   - `deleted_at` (timestamp null)

### 4.2 Entitlements por modulos (sin billing in-app)

1. `plans`
2. `modules`
3. `plan_modules`
4. `notary_subscriptions`
5. `notary_module_overrides`

Regla efectiva:
`plan_modules + overrides = modulos habilitados para la notaria`.

### 4.3 UAFE en schema separado

Schema: `uafe`  
Tablas iniciales criticas: `uafe.protocolos`, `uafe.personas_protocolo` (y relacionadas).  
Todas con:
1. `notary_id` obligatorio.
2. `deleted_at` para soft delete.
3. indices compuestos por tenant.
4. uniques por tenant (ej. `UNIQUE(notary_id, codigo_externo)`).

## 5) Seguridad: RLS + Prisma + Pool

## 5.1 Politica principal

No usar `BYPASSRLS` en el rol DB principal de la app.

Estado por defecto obligatorio (fail-closed):
1. El rol de conexion de la app debe quedar sin bypass (`rolbypassrls = false`).
2. Toda tabla tenant-protected debe tener `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.
3. Si falta contexto valido (`app.current_notary_id`) la consulta debe devolver `0` filas, no datos de otro tenant.
4. No se acepta seguridad basada solo en filtros manuales en controllers.

## 5.2 Contexto por request

Cada operacion tenant-scoped debe ejecutarse en transaccion y setear:
1. `SET LOCAL app.current_notary_id = ...`
2. `SET LOCAL app.is_super_admin = ...`

Esto evita contaminacion de conexiones recicladas por pool.

## 5.3 Politicas RLS

Patron:
1. Usuario normal: `notary_id = current_setting('app.current_notary_id', true)`.
2. Super admin: habilitado por `current_setting('app.is_super_admin', true) = 'true'`.
3. Sin contexto valido: no hay acceso.

Regla adicional:
1. Implementar helper SQL seguro para parsear tenant (`app.current_notary_uuid()`), de modo que valores vacios/invalidos resulten en `NULL` y la policy falle en cerrado.

## 6) Soft Delete y Unicidad

Regla de dominio notarial: no borrado fisico operativo.

1. Baja de notaria/usuario/registro sensible: `is_active = false` + `deleted_at = now()`.
2. Unicidad con soft delete: indices parciales SQL (`WHERE deleted_at IS NULL`) donde aplique.
3. Auditoria de cambios sensibles en `audit_logs`.
4. `audit_logs` debe ser append-only: prohibido `UPDATE`, `DELETE` y `TRUNCATE` via trigger DB.

## 7) Clerk (Piloto N18 Legacy)

1. Crear org Clerk para N18 y persistir `clerk_org_id` en `notaries`.
2. Migrar usuarios legacy con hash existente:
   - `passwordHasher = bcrypt`
   - `passwordDigest = hash legacy`
3. Login v1: correo + clave.
4. No forzar cambio de clave en esta fase.
5. `SUPER_ADMIN` con controles y auditoria de acceso cross-tenant.

## 8) Fases de Implementacion

### Fase 1: Fundacion tenant + Clerk mapping

1. Ajustes de schema `public` (`notaries`, `users`, claves Clerk).
2. Migraciones SQL y datos piloto N18.
3. Middleware de resolucion tenant y rol.

### Fase 2: RLS robusto

1. Politicas RLS para tablas core.
2. Contexto por transaccion con `SET LOCAL`.
3. Pruebas de aislamiento A/B y super admin.

### Fase 3: UAFE schema

1. Crear schema `uafe` por SQL.
2. Tablas con `notary_id`, soft delete, indices por tenant.
3. Politicas RLS equivalentes a core.

### Fase 4: Modulos/planes

1. Tablas normalizadas de plan y modulos.
2. Middleware `requireModule`.
3. Activacion manual por setup comercial.

## 9) Criterios de Aceptacion v1

1. Tenant A no puede leer/escribir datos de Tenant B.
2. UAFE no mezcla datos entre notarías.
3. Super admin puede operar cross-tenant con trazabilidad.
4. Usuarios N18 legacy inician sesion con su clave anterior.
5. Sistema opera con habilitacion por modulos sin cobro in-app.
6. Si no existe contexto tenant en sesion DB, consultas tenant-protected devuelven `0` filas.
7. `audit_logs` no permite `UPDATE/DELETE/TRUNCATE`.

## 10) Instruccion de Ejecucion para Agente IDE

Usar este markdown como especificacion base de implementacion.

Reglas:
1. Priorizar infraestructura (tenant + RLS + Clerk + UAFE base) antes de nuevas features.
2. No introducir `BYPASSRLS` en el rol principal de Prisma.
3. No depender de filtros manuales dispersos en controllers para seguridad.
4. Mantener trazabilidad con auditoria en operaciones cross-tenant y UAFE.
5. Ejecutar por fases y validar con pruebas de aislamiento en cada fase.
6. Toda operacion tenant-scoped debe ejecutarse dentro de transaccion con `SET LOCAL` de tenant/superadmin.
7. Antes de activar RLS en una tabla, confirmar que su flujo de lectura/escritura ya usa contexto transaccional; si no, bloquear release.
8. Validar caso de falla de middleware: sin `app.current_notary_id`, resultado esperado = `0` filas.
9. Prohibir mutaciones de `audit_logs` en DB (trigger inmutable) y registrar accesos cross-tenant de SUPER_ADMIN.

## 11) Estimacion de Capacidad (2026-02-19)

Objetivo seguro con infraestructura actual (1 backend + 1 PostgreSQL en Railway):

1. Capacidad recomendada hoy: `20 notarias activas` (rango operativo `18 a 22`).

Metodo de calculo usado:

1. Limite por request sync: `2000` registros (`backend/src/controllers/sync-billing-controller.js`, `MAX_RECORDS_PER_REQUEST`).
2. Frecuencia esperada sync agent: cada `15` minutos (`docs/SYNC_AGENT_PLAN.md`).
3. Carga base por notaria: `2000 / 900s = 2.22 registros/seg`.
4. Benchmark interno XML: `7000 registros < 2 min` (`backend/src/services/README-XML-IMPORT.md`), equivalente aproximado `58 registros/seg`.
5. Margen operativo del 75% para UI, UAFE y picos: `58 * 0.75 = 43.5 registros/seg`.
6. Capacidad estimada: `43.5 / 2.22 = 19.6`, redondeado a `20` notarias.

Ajustes de capacidad:

1. Si sync pasa a cada 30 min: objetivo aproximado `30 a 35` notarias.
2. Si hay alta concurrencia de PDF/UAFE: bajar objetivo a `15 a 18`.
3. Si se separan workers de sync/PDF del API principal: se puede subir por encima de `35` sin redisenar arquitectura.

Nota:

1. Esta estimacion es de planificacion. Debe validarse con prueba de carga por etapas.

## 12) Criterio de Upgrade Railway (Hobby -> Pro)

Estado de referencia (verificado 2026-02-19 en docs de Railway):

1. Hobby: uso incluido mensual `5 USD` y gasto minimo mensual `5 USD`.
2. Pro: uso incluido mensual `20 USD` y gasto minimo mensual `20 USD`.
3. El cobro sigue siendo por uso; cambia el minimo incluido y limites del plan.

Regla practica para este proyecto:

1. Mantener Hobby durante piloto N18 si el uso y limites siguen holgados.
2. Pasar a Pro justo antes del primer cliente externo en produccion o cuando aparezca un limite operativo.

Triggers claros para migrar a Pro:

1. Necesidad de mas de `2` dominios por servicio.
2. Necesidad de mas de `6` replicas por servicio.
3. Volumen PostgreSQL acercandose al limite de `5 GB` en Hobby (recomendado migrar al llegar a `4 GB`).
4. Operacion multi-cliente con exigencia de mayor gobernanza de equipo.

Fuentes:

1. Planes: https://docs.railway.com/reference/pricing/plans
2. Pricing general: https://railway.com/pricing
3. Volumes: https://docs.railway.com/reference/volumes
4. Dominios: https://docs.railway.com/guides/public-networking
