# Multi-Tenant + Clerk + UAFE Design (v1 Piloto N18)

Fecha: 2026-02-19  
Rama: `feature/architecture-v2.1-restart`  
Estado: Validado con usuario

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

## 6) Soft Delete y Unicidad

Regla de dominio notarial: no borrado fisico operativo.

1. Baja de notaria/usuario/registro sensible: `is_active = false` + `deleted_at = now()`.
2. Unicidad con soft delete: indices parciales SQL (`WHERE deleted_at IS NULL`) donde aplique.
3. Auditoria de cambios sensibles en `audit_logs`.

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

## 10) Instruccion de Ejecucion para Agente IDE

Usar este markdown como especificacion base de implementacion.

Reglas:
1. Priorizar infraestructura (tenant + RLS + Clerk + UAFE base) antes de nuevas features.
2. No introducir `BYPASSRLS` en el rol principal de Prisma.
3. No depender de filtros manuales dispersos en controllers para seguridad.
4. Mantener trazabilidad con auditoria en operaciones cross-tenant y UAFE.
5. Ejecutar por fases y validar con pruebas de aislamiento en cada fase.
