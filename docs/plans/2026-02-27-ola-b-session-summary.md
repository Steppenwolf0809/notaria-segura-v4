# Resumen de Sesion: OLA B - notary_id + Backfill (Fase segura)

Fecha: 2026-02-27  
Rama: `feature/architecture-v2.1-restart`  
Estado: En progreso (estructura y backfill completados, RLS pendiente)

## 1) Objetivo de la sesion

Iniciar OLA B con cambios estructurales no disruptivos:
1. Agregar `notary_id` en tablas objetivo de billing/UAFE.
2. Backfill deterministico de datos historicos.
3. Dejar base lista para activar RLS en siguiente sub-fase.

## 2) Entregables implementados

1. Migracion SQL creada:
   - `backend/prisma/migrations/20260227060000_ola_b_add_notary_id_business_uafe_tables/migration.sql`
2. Prisma schema actualizado con `notaryId` + relaciones `Notary` en modelos OLA B.
3. Migraciones aplicadas en staging:
   - `20260227045500_add_cashier_comments_pending_receivables`
   - `20260227060000_ola_b_add_notary_id_business_uafe_tables`

## 3) Tablas cubiertas en OLA B (fase actual)

1. `invoices`
2. `payments`
3. `import_logs`
4. `pending_receivables`
5. `escrituras_qr`
6. `mensajes_internos`
7. `whatsapp_templates`
8. `protocolos_uafe`
9. `personas_protocolo`
10. `formulario_uafe_asignaciones`
11. `formulario_uafe_respuestas`
12. `sesiones_formulario_uafe`
13. `auditoria_personas`

## 4) Validacion en staging (post-migracion)

Resultado:
1. `notary_id` presente en 13/13 tablas objetivo.
2. `nullNotaryId = 0` en 13/13 tablas objetivo.
3. RLS aun no activado en estas tablas (`rowSecurity=false`, `forceRowSecurity=false`), segun plan.

## 5) Pendiente inmediato (siguiente sesion)

1. Endurecer servicios restantes para contexto tenant transaccional:
   - `alertas-service.js`
   - `bulk-status-service.js`
   - `import-mov-service.js`
   - `import-koinor-xml-service.js`
   - `matrizador-assignment-service.js`
2. Activar RLS (`ENABLE + FORCE`) en tablas OLA B.
3. Ejecutar validaciones A/B por endpoint con RLS activo.
