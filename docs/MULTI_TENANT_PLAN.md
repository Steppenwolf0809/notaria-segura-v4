# 🏢 Plan Multi-Tenant — Notaria Segura

> **Inicio**: 2026-02-14  
> **Estrategia**: Columna discriminadora `notaryId` + Auth0 Organizations + RLS + AWS S3  
> **Estado Global**: 🟡 En planificación

---

## Decisiones Arquitectónicas

| Decisión | Valor |
|----------|-------|
| Aislamiento | Columna `notaryId` por fila |
| Auth Staff | Auth0 Organizations (reemplaza JWT homemade) |
| Auth Clientes | PIN + Session (se mantiene, cross-tenant) |
| Seguridad DB | Auth0 MFA + Prisma Middleware + PostgreSQL RLS |
| Storage | AWS S3 (reemplaza FTP) |
| Frontend | Subdominio por notaría (`n18.notariasegura.com`) |
| Super Admin | Rol `SUPER_ADMIN` — cross-tenant |
| PersonaRegistrada | Cross-tenant (compartida entre notarías) |

---

## Clasificación de Modelos

| Grupo | Modelos | Tratamiento |
|-------|---------|-------------|
| 🔴 Tenant-scoped | User, Document, DocumentEvent, Invoice, Payment, EscrituraQR, ProtocoloUAFE, PersonaProtocolo, WhatsAppNotification, WhatsAppTemplate, PendingReceivable, ImportLog, MensajeInterno, EncuestaSatisfaccion, FormularioUAFEAsignacion | Agregar `notaryId` + RLS |
| 🔵 Cross-tenant | PersonaRegistrada, FormularioUAFERespuesta, SesionPersonal, SesionFormularioUAFE, AuditoriaPersona | Compartidas — relación con notaría via ProtocoloUAFE |
| 🟢 Global | Notary, SystemSetting, SyncLog, TestConnection | Sin filtro tenant |

---

## Fase 1: Infraestructura DB — ✅ Completada

> Preparar la base de datos para multi-tenant sin romper funcionalidad existente.

- [x] Crear modelo `Notary` en `schema.prisma`
  ```prisma
  model Notary {
    id        String  @id @default(uuid())
    name      String
    code      String  @unique
    slug      String  @unique
    ruc       String? @unique
    address   String?
    city      String? @default("Quito")
    province  String? @default("Pichincha")
    phone     String?
    email     String?
    logoUrl   String?
    isActive  Boolean @default(true)
    config    Json?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    @@map("notaries")
  }
  ```
- [x] Agregar `SUPER_ADMIN` a enum `UserRole`
- [x] Ejecutar migración: `npx prisma migrate dev --name add-notary-model`
- [x] Crear seed: registro de Notaría 18 con datos reales
- [x] Agregar campo `notaryId` (nullable) a modelo `User`
- [x] Ejecutar migración: `npx prisma migrate dev --name add-notary-to-user`
- [x] Script de migración de datos: asignar todos los users existentes a Notaría 18 (Automático por reset de DB)
- [x] Hacer `notaryId` NOT NULL en `User` (Mantenido opcional por diseño SUPER_ADMIN)
- [x] Ejecutar migración final: `npx prisma migrate dev --name user-notary-required`
- [x] Verificar que el sistema sigue funcionando sin cambios en controllers

**Archivos afectados:**
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js` (crear o actualizar)

---

## Fase 2: Auth0 (Staff Auth) — 🔲 Pendiente

> Reemplazar el sistema JWT homemade por Auth0 Organizations.

- [ ] Crear cuenta Auth0 y configurar tenant
- [ ] Crear aplicación SPA en Auth0
- [ ] Crear API en Auth0 (`https://api.notariasegura.com`)
- [ ] Crear Organization "Notaría 18" en Auth0
- [ ] Definir roles en Auth0: ADMIN, CAJA, MATRIZADOR, RECEPCION, ARCHIVO, SUPER_ADMIN
- [ ] **Configurar Lazy Migration (para usuarios existentes)**
  - [ ] Habilitar "Custom Database" en Auth0
  - [ ] Implementar endpoint `POST /api/auth/login-migration` (seguro, solo para Auth0)
  - [ ] Configurar script `Login` en Auth0 para validar contra nuestro backend
  - [ ] Test: Login con usuario legacy → Migración automática a Auth0
- [ ] Instalar `express-oauth2-jwt-bearer` en backend
- [ ] Crear nuevo middleware `auth0-middleware.js`
  - [ ] Validación de token con JWKS
  - [ ] Extracción de `org_id` → mapeo a `notaryId`
  - [ ] Role extraction desde custom claims
- [ ] Actualizar `auth-middleware.js` para usar Auth0 en lugar de JWT propio
- [ ] Crear middleware `resolveTenant.js` (subdominio → notaryId)
- [ ] Actualizar frontend: integrar Auth0 SDK (`@auth0/auth0-react`)
- [ ] Configurar Auth0 Universal Login (branding por notaría)
- [ ] Habilitar MFA para todos los usuarios
- [ ] Actualizar `.env` con variables Auth0
- [ ] Tests: verificar login, roles, tenant isolation
- [ ] Mantener sistema PIN para PersonaRegistrada (sin cambios)

**Archivos afectados:**
- `backend/src/middleware/auth-middleware.js` (reescribir)
- `backend/src/middleware/resolveTenant.js` (nuevo)
- `backend/src/controllers/auth-controller.js` (simplificar)
- `backend/src/routes/auth-routes.js` (actualizar)
- `frontend/src/` (integrar Auth0 SDK)
- `backend/.env` (nuevas variables Auth0)

---

## Fase 3: Document Core Multi-Tenant — 🔲 Pendiente

> Agregar `notaryId` a las tablas core del negocio.

- [ ] Agregar `notaryId` (nullable) a `Document`
- [ ] Agregar `notaryId` (nullable) a `DocumentEvent`
- [ ] Agregar `notaryId` (nullable) a `Invoice`
- [ ] Agregar `notaryId` (nullable) a `Payment`
- [ ] Ejecutar migración
- [ ] Script de datos: asignar registros existentes a Notaría 18
- [ ] Hacer `notaryId` NOT NULL en las 4 tablas
- [ ] Agregar índices compuestos: `@@index([notaryId, status])`, etc.
- [ ] Crear Prisma Middleware para filtrado automático por tenant
  ```javascript
  // tenant-prisma-middleware.js
  prisma.$use(async (params, next) => {
    if (tenantModels.has(params.model)) {
      const notaryId = getCurrentTenantId();
      // Inyectar filtro en reads y creates
    }
    return next(params);
  });
  ```
- [ ] Tests: crear documento en Notaría A, verificar invisible desde Notaría B
- [ ] Tests: query sin tenant context no retorna datos

**Archivos afectados:**
- `backend/prisma/schema.prisma`
- `backend/src/db.js` (agregar tenant middleware)
- Todos los controllers (verificar compatibilidad con middleware automático)

---

## Fase 4: Seguridad + Storage — 🔲 Pendiente

> RLS en PostgreSQL como safety net + migración de FTP a AWS S3.

### RLS
- [ ] Habilitar RLS en tablas: documents, users, invoices, payments
- [ ] Crear políticas RLS con variable de sesión `app.current_notary_id`
- [ ] Crear política bypass para SUPER_ADMIN
- [ ] Configurar Prisma para ejecutar `SET LOCAL app.current_notary_id` antes de cada query
- [ ] Tests: intentar acceso directo con rol sin bypass → debe fallar
- [ ] Documentar políticas RLS

### AWS S3
- [ ] Crear cuenta AWS + bucket `notaria-segura-files`
- [ ] Configurar estructura de prefijos por notaría
- [ ] Crear IAM policy por notaría (aislamiento S3)
- [ ] Instalar `@aws-sdk/client-s3` en backend
- [ ] Crear `S3StorageService` para reemplazar FTP
- [ ] Implementar presigned URLs para acceso temporal
- [ ] Migrar archivos existentes de FTP a S3 (prefix `n18/`)
- [ ] Actualizar `escrituras-qr-controller.js` para usar S3
- [ ] Depreciación: desactivar servicio FTP
- [ ] Tests: upload/download via S3

**Archivos afectados:**
- SQL migrations para RLS policies
- `backend/src/services/s3-storage-service.js` (nuevo)
- `backend/src/controllers/escrituras-qr-controller.js`
- `backend/.env` (AWS credentials)

---

## Fase 5: Tablas Restantes + Onboarding — 🔲 Pendiente

> Completar multi-tenant en todas las tablas y crear sistema de onboarding.

### Tablas Restantes
- [ ] Agregar `notaryId` a: EscrituraQR, ProtocoloUAFE, PersonaProtocolo
- [ ] Agregar `notaryId` a: WhatsAppNotification, WhatsAppTemplate
- [ ] Agregar `notaryId` a: PendingReceivable, ImportLog
- [ ] Agregar `notaryId` a: MensajeInterno, EncuestaSatisfaccion
- [ ] Agregar `notaryId` a: FormularioUAFEAsignacion
- [ ] Migración de datos → Notaría 18
- [ ] RLS en todas las tablas nuevas
- [ ] Config JSON por notaría en modelo `Notary`

### Panel Super Admin
- [ ] CRUD de notarías
- [ ] Dashboard cross-tenant (estadísticas globales)
- [ ] Creación de Organization en Auth0 al crear notaría
- [ ] Selector de notaría para impersonar

### Onboarding Nueva Notaría
- [ ] Wizard: nombre, RUC, dirección, logo
- [ ] Setup automático: S3 prefix, Auth0 org, usuarios iniciales
- [ ] Configuración DNS de subdominio
- [ ] Template de WhatsApp por notaría
- [ ] Onboarding de primera notaría externa 🎉

---

## Notas Técnicas

### Auth0 Config necesaria
```
AUTH0_DOMAIN=notariasegura.us.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_AUDIENCE=https://api.notariasegura.com
AUTH0_MANAGEMENT_CLIENT_ID=xxx
AUTH0_MANAGEMENT_CLIENT_SECRET=xxx
```

### S3 Config necesaria
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET=notaria-segura-files
```

### Estructura S3
```
notaria-segura-files/
├── n18/                    ← Notaría 18
│   ├── escrituras/
│   ├── fotos/
│   └── facturas/
├── notaria-x/              ← Otra notaría
│   ├── escrituras/
│   └── ...
└── shared/                 ← Assets compartidos
```
