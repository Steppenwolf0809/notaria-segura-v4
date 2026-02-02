# Integración con Koinhor (MySQL) – Acceso de Solo Lectura

Este documento te ayuda a reunirte con el programador de Koinhor para solicitar acceso de solo lectura a su base MySQL y sincronizar datos en nuestro sistema sin alterar nada del de ellos.

## Objetivo
- Conseguir acceso de solo lectura a MySQL de Koinhor para sincronizar nuestros documentos sin impacto ni cambios en su sistema.

## Estrategia de Integración (orden preferente)
- Read replica: acceso a un replicado de solo lectura para evitar carga en producción.
- Usuario read-only sobre vistas: Koinhor expone `VIEW` con columnas acordadas; nos dan `SELECT` sobre esa vista.
- Export incremental: CSV/JSON diarios a S3/FTP con `updated_at` para incrementales.
- API oficial: si existiera, usarla; si no, mantener opción DB por vistas.

## Requisitos Técnicos a Confirmar
- Conexión: host, puerto, base de datos, usuario/contraseña, TLS (CA/SSL).
- Versión MySQL: confirmar (8.x recomendado), `sql_mode`, `time_zone`, `collation` (`utf8mb4`).
- IPs/allowlist: nuestras IPs salientes para whitelisting.
- Ventana de consulta: franjas horarias off-peak para importaciones.

## Seguridad y Permisos
- Usuario de solo lectura: mínimo privilegio (solo `SELECT`, `SHOW VIEW`).
- Vistas dedicadas: exponen solo campos necesarios; aíslan cambios internos.
- Restricción por host/TLS: `REQUIRE SSL` y whitelisting de IP.
- Auditoría: Koinhor registra accesos; rotación de credenciales.

## SQL de Ejemplo (lado Koinhor)

```sql
-- Vista con columnas pactadas (ajustar nombres reales)
CREATE VIEW vw_notaria_documentos AS
SELECT
  d.id,
  d.protocol_number,
  d.client_name,
  d.client_phone,
  d.client_email,
  d.document_type,
  d.status,
  d.total_factura,
  d.numero_factura,
  d.fecha_factura,
  d.fecha_listo,
  d.updated_at
FROM documentos d;

-- Usuario de solo lectura restringido por IP y con SSL
CREATE USER 'notaria_ro'@'X.X.X.X' IDENTIFIED BY 'PASSWORD_SEGURA' REQUIRE SSL;
GRANT SELECT, SHOW VIEW ON koinhor_db.vw_notaria_documentos TO 'notaria_ro'@'X.X.X.X';
FLUSH PRIVILEGES;

-- Recomendación de índices en tablas base
CREATE INDEX idx_documentos_updated_at ON documentos(updated_at);
CREATE INDEX idx_documentos_protocol ON documentos(protocol_number);
```

## Mapeo de Datos Necesarios (mínimo útil)
- Identificación: `protocol_number`, `document_type`.
- Cliente: `client_name`, `client_phone`, `client_email` (opcional).
- Estado/fechas: `status`, `fecha_listo`, `updated_at`.
- Facturación: `numero_factura`, `fecha_factura`, `total_factura`, `acto_principal_descripcion`, `acto_principal_valor`.
- Asignación (si disponible): `matrizador_nombre` o `assigned_user`.
- Origen: `xml_original` o referencia al XML para trazabilidad.

Correspondencia con nuestro sistema:
- `protocol_number` → `documents.protocolNumber`
- `client_name` → `documents.clientName`
- `client_phone` → `documents.clientPhone`
- `document_type` → `documents.documentType`
- `status` → `documents.status` (definir tabla de equivalencias)
- `fecha_listo` → `documents.fechaListo`
- `numero_factura`/`fecha_factura`/`total_factura` → campos homólogos en `documents`
- `updated_at` → clave para sync incremental

## Consultas de Ejemplo (incrementales y paginadas)

```sql
-- Incremental por marca de tiempo
SELECT *
FROM vw_notaria_documentos
WHERE updated_at > ?
ORDER BY updated_at ASC
LIMIT 1000;

-- Conteo para planeación
SELECT COUNT(*)
FROM vw_notaria_documentos
WHERE updated_at > ?;
```

## Plan de Sincronización sin Impacto
- Full import inicial: ventana no pico, paginación por `updated_at`.
- Incrementales: cada 5–15 min con última marca de agua (watermark).
- Idempotencia: upsert por `protocol_number` o `id` externo.
- Backoff: reintentos exponenciales ante errores; no bloquear tablas (solo `SELECT`).
- Tiempos y TZ: trabajar en UTC en ambos lados; acordar política de zona horaria.

## Preguntas Concretas para la Reunión
- Versión MySQL, `time_zone` y `collation` usados.
- Tablas/campos fuente para protocolo, cliente, estado, facturación.
- Campo confiable para incrementales (`updated_at` o equivalente).
- ¿Pueden exponer una `VIEW` estable con esos campos?
- ¿Hay read replica disponible? Si no, ¿limitamos a `SELECT` sobre la vista?
- Restricciones de seguridad: TLS, IPs autorizadas, rotación de credenciales.
- Frecuencia máxima de consultas aceptable y ventana de mantenimiento.
- Política de cambios de esquema: aviso previo y pruebas en staging.
- Datos sensibles: ¿requieren anonimizar/ocultar algo (p. ej., cédulas)?

## Alternativas si No Dan Acceso Directo
- Export programado: CSV/JSON en S3/FTP con `updated_at`.
- Webhooks o cola (si la tienen) para eventos de cambios.
- Endpoints REST de lectura con filtros por `updated_at`.

## Compromisos de Nuestra Parte
- Solo lectura: no haremos `INSERT/UPDATE/DELETE`.
- Carga controlada: consultas paginadas y fuera de horas pico.
- Cache y dedupe: minimizamos hit recurrente sobre filas no cambiadas.
- Reportes de errores: canal para notificar anomalías de datos.
- Auditoría: guardaremos logs de nuestras consultas y accesos.

## Checklist de Implementación
- Credenciales y CA SSL entregadas.
- IPs autorizadas confirmadas.
- Vista `vw_notaria_documentos` (u otra) creada y documentada.
- Índices en `updated_at` y `protocol_number` creados en tablas base.
- Ambiente de pruebas/staging con datos sanitizados.
- Documento de mapeo de estados Koinhor → nuestros `documents.status`.

## Config en Nuestro Sistema (ejemplo)

```bash
# .env
KOINHOR_MYSQL_URI="mysqls://notaria_ro:****@host:3306/koinhor_db?sslmode=REQUIRED"
KOINHOR_SYNC_INTERVAL_CRON="*/5 * * * *"
KOINHOR_SYNC_START_CURSOR="2025-01-01T00:00:00Z"
```

## Borrador de Correo/Solicitud

Asunto: Solicitud de acceso de solo lectura a MySQL (Koinhor) para sincronización

Hola [Nombre],

Para automatizar la actualización de nuestro sistema notarial sin modificar nada de Koinhor, solicitamos acceso de solo lectura a una vista o réplica MySQL con estos campos mínimos: protocolo, cliente (nombre/teléfono), tipo de documento, estado, fechas (listo/factura), facturación (número/total), y `updated_at` para incrementales.

Preferencias de seguridad: usuario `SELECT`+`SHOW VIEW`, `REQUIRE SSL`, restricción por IP, y de ser posible una read replica. Frecuencia de lectura: cada 5–15 minutos en ventana fuera de horas pico, con paginación e incremental por `updated_at`. No realizaremos escrituras ni cambios de esquema.

Si es viable, podrían crear la vista `vw_notaria_documentos` y un usuario `notaria_ro` restringido por IP. Adjuntamos SQL de referencia en el documento. También podemos adaptarnos a exportaciones diarias o una API si la tienen disponible.

Quedo atento para coordinar pruebas en un entorno de staging y definir el mapeo de estados.

Gracias y saludos,
[Tu Nombre]

