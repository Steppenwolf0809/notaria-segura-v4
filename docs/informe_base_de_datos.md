# Informe de Estructura de Base de Datos

Este informe resume la estructura actual de la base de datos del sistema de trazabilidad documental notarial, basada en el respaldo `prod_backup_20260117.sql` y migraciones en `prisma/migrations`. Se enfoca en las principales categorías del dominio, tablas clave y cómo se relacionan.

## Visión General

- Motor: PostgreSQL
- ORM: Prisma (tabla interna `_prisma_migrations`)
- Enum relevante: `UserRole` = {`ADMIN`, `CAJA`, `MATRIZADOR`, `RECEPCION`, `ARCHIVO`}
- Índices de desempeño (documentos):
  - `documents(clientPhone)`
  - `documents(clientName)`
  - Compuestos (lógicos usados por la app): `documents(assignedToId, status)`

> Nota: En enero 2026 se eliminó la funcionalidad de agrupación de documentos (migración `20260110040000_cleanup_remove_group_columns`).

---

## Categorías y Tablas Principales

### 1) Seguridad y Usuarios

- Tabla: `users`
  - Clave: `id` (serial)
  - Campos: `email`, `password`, `firstName`, `lastName`, `role (UserRole)`, `isActive`, `createdAt`, `updatedAt`, `lastLogin`
  - Uso: Fuente de identidad y permisos por rol.

- Tipo Enum: `UserRole`
  - Valores: `ADMIN`, `CAJA`, `MATRIZADOR`, `RECEPCION`, `ARCHIVO`.

Relaciones (lógicas, no siempre con FK explícita en dump):
- `documents.createdById` → `users.id`
- `documents.assignedToId` → `users.id`
- `documents.usuarioEntregaId` → `users.id`
- `document_events.userId` → `users.id`

---

### 2) Gestión Documental (core)

- Tabla: `documents`
  - Clave: `id` (text)
  - Identificación/cliente: `protocolNumber`, `clientName`, `clientPhone`, `clientEmail`, `clientId`
  - Información de trámite: `documentType`, `status` (p. ej. `PENDIENTE`, `LISTO`, `ENTREGADO`), `verificationCode`, `codigoRetiro`
  - Asignaciones y trazabilidad: `assignedToId`, `createdById`, `matrizadorName`, `usuarioEntregaId`
  - Facturación: `actoPrincipalDescripcion`, `actoPrincipalValor`, `itemsSecundarios`, `totalFactura`, `numeroFactura`, `fechaFactura`, `pagoConfirmado`
  - Estados/fechas clave: `createdAt`, `updatedAt`, `fechaListo`, `fechaEntrega`, `ultimoRecordatorio`
  - Entrega: `entregadoA`, `cedulaReceptor`, `relacionTitular`, `verificacionManual`, `facturaPresenta`, `observacionesEntrega`
  - Origen: `xmlOriginal`, `detalle_documento`, `comentarios_recepcion`
  - Operación interna: `alertaInterna`, `mensajeInterno`, `notaCreditoMotivo`, `notaCreditoEstadoPrevio`, `notaCreditoFecha`
  - Índices: `clientPhone`, `clientName`, compuestos por `assignedToId,status` (útiles para vistas por usuario/estado).

- Tabla: `document_events`
  - Clave: `id` (text)
  - Enlace: `documentId` (text, opcional), `userId` (int)
  - Evento: `eventType`, `description`, `details`
  - Entrega (si aplica): `personaRetiro`, `cedulaRetiro`, `metodoVerificacion`, `observacionesRetiro`
  - Auditoría: `ipAddress`, `userAgent`, `createdAt`

Relaciones (lógicas):
- `document_events.documentId` → `documents.id`
- `document_events.userId` → `users.id`

---

### 3) Notificaciones (WhatsApp)

- Tabla: `whatsapp_templates`
  - Clave: `id` (text)
  - Campos: `tipo`, `titulo`, `mensaje`, `activo`, `createdAt`, `updatedAt`
  - Uso: Plantillas configurables de mensajes.

- Tabla: `whatsapp_notifications`
  - Clave: `id` (text)
  - Enlace: `documentId` (text, opcional)
  - Datos envío: `clientName`, `clientPhone`, `messageType`, `messageBody`
  - Estado: `status` (`PENDING`, `SENT`, `FAILED`), `messageId`, `errorMessage`, `sentAt`, `createdAt`

Relaciones (lógicas):
- `whatsapp_notifications.documentId` → `documents.id`

---

### 4) Personas y UAFE (cumplimiento)

- Tabla: `personas_registradas`
  - Clave: `id` (text)
  - Identidad/acceso: `numeroIdentificacion`, `tipoPersona`, `pinHash`, flags de seguridad e intentos
  - Datos: `datosPersonaNatural (jsonb)`, `datosPersonaJuridica (jsonb)`
  - Trazabilidad: `createdAt`, `updatedAt`, accesos/intentos/bloqueos

- Tabla: `formulario_uafe_asignaciones`
  - Clave: `id` (text)
  - Enlace: `personaId`, `matrizadorId`, `respuestaId`
  - Contexto: `numeroMatriz`, `actoContrato`, `calidadPersona`, `actuaPor`, `token`, `estado`, `expiraEn`, `createdAt`, `completadoEn`

- Tabla: `formulario_uafe_respuestas`
  - Clave: `id` (text)
  - Enlace: `asignacionId`, `personaId`
  - Contenido: datos de identificación, socio-demográficos, formas de pago (campos por tipo), montos, IP/userAgent, `completadoEn`

- Tabla: `personas_protocolo`
  - Clave: `id` (text)
  - Enlace: `protocoloId`, `personaCedula`, `representadoId`
  - Estado: `completado`, `estadoCompletitud`, `porcentajeCompletitud`, `camposFaltantes`
  - Trazabilidad: `createdAt`, `updatedAt`, `orden`, flags de comparecencia/mandatos

- Tabla: `protocolos_uafe`
  - Clave: `id` (text)
  - Contexto: `numeroProtocolo`, `fecha`, `actoContrato`, `valorContrato`, `avaluoMunicipal`
  - Enlaces/autoría: `createdBy`
  - Contenido generado: `formasPago (jsonb)`, descripciones de bienes y textos generados
  - Trazabilidad: `createdAt`, `updatedAt`, `fechaUltimaGeneracion`

- (Relacionado) `sesiones_formulario_uafe` (gestión de sesiones por persona/flujo)

Relaciones (lógicas):
- `formulario_uafe_asignaciones.personaId` → `personas_registradas.id`
- `formulario_uafe_respuestas.asignacionId` → `formulario_uafe_asignaciones.id`
- `personas_protocolo.protocoloId` → `protocolos_uafe.id`
- `protocolos_uafe.createdBy` → `users.id`

---

### 5) Escrituración/QR

- Tabla: `escrituras_qr`
  - Clave: `id` (serial)
  - Identificador: `token`, `numeroEscritura`
  - Contenido: `datosCompletos`, `extractoTextoCompleto`, `archivoOriginal`, `pdfFileName`, metadatos PDF (tamaño, subido por, fechas, páginas ocultas)
  - Estado: `estado`, `activo`
  - Autoría/fechas: `createdBy`, `createdAt`, `updatedAt`

Relaciones (lógicas):
- `escrituras_qr.createdBy` → `users.id`

---

### 6) Satisfacción del Cliente

- Tabla: `encuestas_satisfaccion`
  - Clave: `id` (serial)
  - Enlace: `tramiteId` (text, opcional)
  - Datos: `calificacion`, banderas de experiencia (`infoClara`, `tratoCordial`), `sugerencia`
  - Trazabilidad: `createdAt`

---

### 7) Auditoría y Sistema

- Tabla: `_prisma_migrations`
  - Propósito: historial de migraciones aplicadas por Prisma (no funcional al dominio)

- Tabla: `auditoria_personas`
  - Registra eventos de actividad de personas (registro, login, actualización), con `matrizadorId`, IP, userAgent, `createdAt`.

---

## Mapa de Relaciones (Conceptual)

- `users (1) ── (N) documents` por `createdById`, `assignedToId`, `usuarioEntregaId`
- `documents (1) ── (N) document_events` por `documentId`
- `users (1) ── (N) document_events` por `userId`
- `documents (1) ── (N) whatsapp_notifications` por `documentId`
- `users (1) ── (N) protocolos_uafe` por `createdBy`
- `personas_registradas (1) ── (N) formulario_uafe_asignaciones` por `personaId`
- `formulario_uafe_asignaciones (1) ── (1) formulario_uafe_respuestas` por `asignacionId`
- `protocolos_uafe (1) ── (N) personas_protocolo` por `protocoloId`
- `users (1) ── (N) escrituras_qr` por `createdBy`

> En el respaldo no aparecen llaves foráneas declaradas para todas estas relaciones; sin embargo, la aplicación y Prisma las tratan como vínculos lógicos y se usan en consultas, filtros e índices.

---

## Consideraciones y Buenas Prácticas

- Estados de documento: validar transiciones (`PENDIENTE` → `LISTO` → `ENTREGADO`), y registrar siempre en `document_events`.
- Verificación/entrega: `verificationCode`/`codigoRetiro` + datos de receptor deben quedar en `documents` y el evento correspondiente.
- Índices: usar filtros que aprovechen `clientPhone`, `clientName`, y compuestos por `assignedToId,status`.
- Plantillas WhatsApp: administrar en `whatsapp_templates`; envíos registrados en `whatsapp_notifications`.
- Cambios de esquema: documentar en migraciones y mantener sincronizado el entorno (staging/producción).

---

## Anexos

- Migraciones relevantes observadas:
  - `20260110040000_cleanup_remove_group_columns` (remueve columnas de agrupación)
  - `20260109230000_add_fechalisto_to_documents`
  - `20251118000000_add_performance_indexes` (índices en `documents`)
  - Migraciones UAFE y QR (creación de tablas y campos adicionales)

Si necesitas un diagrama visual (Mermaid/DBML), puedo generarlo basado en este esquema y agregarlo a `docs/`.

