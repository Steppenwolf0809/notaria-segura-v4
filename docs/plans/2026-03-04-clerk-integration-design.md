# Diseño: Integración Clerk como Auth Provider

> **Fecha**: 2026-03-04
> **Estado**: Aprobado
> **Ambiente**: Staging primero, luego producción
> **Keys**: Development (`pk_test_` / `sk_test_`) para staging

---

## 1. Decisiones de Diseño

| Decisión | Valor |
|----------|-------|
| Auth provider | Clerk (reemplaza JWT homemade) |
| Login UI | Componentes embebidos de Clerk (`<SignIn />`, `<SignUp />`) |
| Branding login | Genérico "Notaría Segura" — dashboard personalizado por notaría después |
| Registro | Abierto — usuario se registra solo con email real |
| Asignación de rol | Admin de notaría aprueba y asigna notaría + rol manualmente |
| SUPER_ADMIN | Se crea en Clerk dashboard, se vincula manualmente en DB |
| Auth legacy | Se elimina directo (sin coexistencia) |
| Migración usuarios N18 | Crean cuentas nuevas en Clerk con correos reales |

---

## 2. Flujo de Autenticación

```
Usuario → Clerk (SignIn/SignUp) → JWT de Clerk
  → Frontend envía Bearer token en cada request
  → Backend: @clerk/express valida JWT → extrae clerkUserId
  → Busca en tabla users por clerkId
  → Si no tiene rol → 403 "Pendiente de aprobación"
  → Si tiene rol → req.user = { id, email, role, notaryId, ... }
  → Controllers siguen funcionando exactamente igual
```

## 3. Flujo de Registro de Nuevo Usuario

1. Usuario se registra en Clerk (email + contraseña)
2. Clerk envía webhook `user.created` al backend
3. Backend crea registro en `users`:
   - `clerkId` = ID de Clerk
   - `email` = email del usuario
   - `firstName`, `lastName` = datos de Clerk
   - `role` = null
   - `notaryId` = null
   - `isOnboarded` = false
4. Usuario intenta entrar al sistema → ve pantalla "Pendiente de aprobación"
5. Admin de la notaría ve usuario pendiente en panel → asigna notaría + rol
6. Usuario refresca → acceso completo al sistema

## 4. SUPER_ADMIN

- Se crea manualmente en dashboard de Clerk
- En tabla `users`: `role = 'SUPER_ADMIN'`, `notaryId = null`
- Se vincula por `clerkId` (seed o manual)
- Protecciones existentes aplican: no visible ni editable por admin de notaría
- Mismo flujo de auth que cualquier usuario (Clerk JWT → lookup por clerkId)

## 5. Cambios en Base de Datos

### Tabla `users` — modificaciones:
```
+ clerkId      String?  @unique   -- ID de Clerk (ej: "user_2x4k...")
+ isOnboarded  Boolean  @default(false)  -- true cuando admin asigna rol
~ password     String?  -- nullable (ya no se usa, Clerk maneja passwords)
~ role         String?  -- nullable hasta que admin asigne
```

### Sin cambios en:
- Todas las demás tablas
- RLS policies
- Tenant context

## 6. Cambios en Backend

### `auth-middleware.js` — reescritura:
- `authenticateToken`: usa `@clerk/express` para validar JWT de Clerk
- Busca usuario por `clerkId` en vez de `decoded.id`
- Verifica `isOnboarded` — si false, retorna 403
- `req.user` mantiene misma estructura: `{ id, email, role, firstName, lastName, notaryId }`
- `requireAdmin`, `requireRoles`, etc. — NO CAMBIAN

### Nuevo: `clerk-webhook-controller.js`
- `POST /api/webhooks/clerk`
- Recibe eventos `user.created`, `user.updated`, `user.deleted`
- Verifica firma del webhook (seguridad via svix)
- **Logica de merge en `user.created`** (commit `250b9a4a`, 2026-03-05):
  1. Busca por `clerkId` -> si ya existe, ignora (idempotencia).
  2. Busca por `email` -> si existe usuario legacy, le vincula el `clerkId` (migracion).
  3. Si no existe por ninguno -> crea usuario nuevo con `role=null`, `isOnboarded=false`.
- `user.updated`: actualiza email/nombre.
- `user.deleted`: soft delete (`isActive=false`).

### Eliminados:
- `auth-controller.js`: funciones `login()`, `register()`, `generateToken()`
- `auth-routes.js`: rutas `POST /login`, `POST /register`

### Sin cambios:
- Todos los controllers de negocio
- Todas las rutas de negocio
- admin-controller.js (ya protegido contra SUPER_ADMIN)
- Tenant context, RLS, audit logs

## 7. Cambios en Frontend

### `App.jsx`
- Envolver con `<ClerkProvider publishableKey={...}>`

### `LoginForm.jsx` → reemplazado
- Usar `<SignIn />` y `<SignUp />` de `@clerk/clerk-react`

### `ProtectedRoute.jsx`
- Usar `useAuth()` de Clerk para verificar autenticación
- Verificar perfil del backend (rol asignado)

### `auth-store.js` / `use-auth.js`
- Simplificar: ya no maneja tokens manualmente
- Consulta backend por perfil (rol, notaría) después de login en Clerk

### Axios interceptor
- Usar `useAuth().getToken()` para obtener token de Clerk
- Agregar Bearer token en cada request automáticamente

### Nueva vista: `PendingApproval.jsx`
- Pantalla para usuarios autenticados en Clerk pero sin rol asignado
- Mensaje: "Tu cuenta está pendiente de aprobación por el administrador"

### Eliminados:
- `ChangePassword.jsx` (Clerk lo maneja)
- Lógica de JWT en localStorage

## 8. Variables de Entorno

### Backend `.env`
```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  (se obtiene al configurar webhook en Clerk)
```

### Frontend `.env`
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Eliminadas:
```
- JWT_SECRET
- JWT_EXPIRES_IN
```

## 9. Plan de Ejecución

| Paso | Qué | Archivos |
|------|-----|----------|
| 1 | Migración DB: clerkId + password nullable | schema.prisma |
| 2 | Reescribir auth-middleware.js | 1 archivo |
| 3 | Crear webhook /api/webhooks/clerk | 1 archivo nuevo |
| 4 | Limpiar rutas auth legacy | auth-routes.js, auth-controller.js |
| 5 | Frontend: ClerkProvider en App.jsx | 1 archivo |
| 6 | Frontend: reemplazar LoginForm | 1 archivo |
| 7 | Frontend: ProtectedRoute + auth-store + axios | 3 archivos |
| 8 | Frontend: vista PendingApproval | 1 archivo nuevo |
| 9 | Test flujo completo en staging | — |
| 10 | Validar y promover a main | — |

## 10. Riesgos y Mitigación

| Riesgo | Mitigación |
|--------|------------|
| Login deja de funcionar en staging | Main no se afecta. Rollback = revertir commit |
| Webhook de Clerk no llega | Crear usuario manual en DB como fallback |
| Usuarios N18 no crean cuenta | Admin puede crear usuarios desde Clerk dashboard |
| SUPER_ADMIN sin acceso | Se crea manualmente por seed con clerkId conocido |
