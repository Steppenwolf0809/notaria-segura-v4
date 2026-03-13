# INSTRUCCIÓN: Migrar de Clerk a Auth Propio (JWT + bcrypt) con Multitenancy

## CONTEXTO

El sistema usa Clerk para autenticación. Clerk tuvo una caída global y este sistema se va a vender como SaaS a ~20 notarías. No podemos depender de un servicio externo como single point of failure para auth de 12-50 usuarios con roles fijos.

Necesitamos reemplazar Clerk con auth propio usando JWT + bcrypt, manteniendo el soporte multitenant (RLS con tenant_id) que ya está implementado.

## ANTES DE HACER CUALQUIER CAMBIO

1. **Revisar el estado actual completo:**
   - Leer `backend/src/middleware/auth-middleware.js` — entender cómo se verifica el token hoy
   - Leer `backend/src/routes/auth-routes.js` — ver qué endpoints auth existen
   - Leer `backend/prisma/schema.prisma` — revisar modelo User y cualquier relación con Clerk
   - Buscar TODAS las referencias a `@clerk` en el proyecto: `grep -r "@clerk" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.json"`
   - Buscar referencias a Clerk en frontend: `grep -r "clerk" frontend/src/ --include="*.js" --include="*.jsx" -l`
   - Buscar `clerkId`, `clerkUserId`, `externalId` o campos similares en schema.prisma y controladores
   - Revisar `frontend/src/main.jsx` para ver cómo se monta ClerkProvider
   - Revisar `frontend/src/store/auth-store.js` para entender el state management actual

2. **Crear branch de seguridad:**
   ```
   git checkout -b backup/pre-auth-migration
   git push origin backup/pre-auth-migration
   git checkout -b feature/auth-propio
   ```

## FASE 0: BYPASS INMEDIATO (para desbloquear producción si Clerk está caído)

**Solo si Clerk está caído ahora mismo.** Si no, saltar a Fase 1.

En `auth-middleware.js`, agregar fallback: si la verificación de Clerk falla, intentar verificar como JWT propio firmado con JWT_SECRET. Esto permite que ambos sistemas coexistan temporalmente.

## FASE 1: BASE DE DATOS

### 1.1 Tabla tenants (si no existe)

Crear modelo en Prisma:

```
model Tenant {
  id          String   @id @default(uuid())
  name        String                          // "Notaría 18 de Quito"
  code        String   @unique                // "notaria-18-quito" (identificador corto)
  isActive    Boolean  @default(true)
  settings    Json?                           // Config específica por notaría (futuro)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
}
```

### 1.2 Modificar modelo User

Asegurarse que User tenga estos campos (agregar los que falten, NO borrar campos de Clerk todavía):

```
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  password    String                          // NUEVO: hash bcrypt
  firstName   String
  lastName    String
  role        String                          // ADMIN, MATRIZADOR, RECEPCION, CAJA, ARCHIVO
  isActive    Boolean  @default(true)
  tenantId    String                          // FK a Tenant
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  // Campos de Clerk (mantener temporalmente, marcar como opcionales)
  // clerkId    String?  @unique              // Hacer opcional, no borrar aún
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 1.3 Migración

```
npx prisma migrate dev --name add-tenant-and-auth-fields
```

**IMPORTANTE:** Si ya hay usuarios en producción vinculados a Clerk, necesitamos migrar sus datos. Crear un script de seed que:
- Cree el Tenant para Notaría 18
- Asigne tenantId a usuarios existentes
- Genere passwords temporales hasheados con bcrypt (que luego se cambiarán)

## FASE 2: BACKEND - Endpoints de Auth

### 2.1 Instalar dependencias

```
npm install bcryptjs jsonwebtoken
```

(bcryptjs, no bcrypt — es JS puro, sin compilación nativa, más portable)

### 2.2 Crear/modificar endpoints en auth-routes.js

**POST /api/auth/login**
- Recibe: `{ email, password }`
- Busca usuario por email (incluir tenantId en la búsqueda)
- Verifica password con bcrypt.compare
- Si válido, genera JWT con payload: `{ userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email }`
- JWT firmado con `process.env.JWT_SECRET`
- Expira en 24h (configurable)
- Retorna: `{ token, user: { id, email, firstName, lastName, role, tenantId } }`
- Rate limiting: máximo 5 intentos por IP en 15 minutos (usar el rate-limiter existente)

**POST /api/auth/register** (solo ADMIN puede crear usuarios)
- Requiere autenticación (middleware)
- Solo rol ADMIN puede acceder
- El tenantId viene del JWT del admin que crea (NO del body — un admin solo crea usuarios en su propia notaría)
- Hashea password con bcrypt (salt rounds: 12)
- Valida email único dentro del tenant
- Retorna usuario creado (sin password)

**PUT /api/auth/change-password**
- Requiere autenticación
- Recibe: `{ currentPassword, newPassword }`
- Verifica currentPassword contra hash almacenado
- Hashea newPassword y actualiza
- Rate limiting estricto

**POST /api/auth/reset-password** (solo ADMIN)
- Admin puede resetear password de cualquier usuario de su tenant
- Genera password temporal
- Retorna password temporal (el admin se lo comunica al usuario en persona)
- No enviar por email/WhatsApp — en contexto notarial, reset presencial es más seguro

### 2.3 Rol SUPERADMIN

Crear un rol adicional `SUPERADMIN` que:
- No pertenece a ningún tenant específico (o pertenece a un tenant especial "platform")
- Puede listar todos los tenants
- Puede crear nuevos tenants
- Puede crear el primer ADMIN de un tenant nuevo
- Puede desactivar tenants

Endpoints adicionales (protegidos con SUPERADMIN):
- `GET /api/admin/tenants` — listar todos los tenants
- `POST /api/admin/tenants` — crear tenant
- `PUT /api/admin/tenants/:id` — activar/desactivar tenant
- `POST /api/admin/tenants/:id/admin` — crear admin inicial de un tenant

### 2.4 Modificar auth-middleware.js

El middleware debe:
1. Extraer token del header `Authorization: Bearer <token>`
2. Verificar con `jwt.verify(token, process.env.JWT_SECRET)`
3. Extraer `userId`, `tenantId`, `role` del payload
4. Buscar usuario en DB para confirmar que existe y está activo
5. Confirmar que el tenant está activo
6. Setear en `req.user`: `{ id, email, role, firstName, lastName, tenantId }`
7. **ELIMINAR** toda referencia a SDK de Clerk, webhooks de Clerk, o verificación de tokens de Clerk

### 2.5 Asegurar que RLS use tenantId del JWT

En cada query de Prisma que filtre por tenant, el `tenantId` DEBE venir de `req.user.tenantId` (del JWT verificado), NUNCA de un parámetro del request body o query string. Esto ya debería estar así con RLS, pero verificar.

## FASE 3: FRONTEND

### 3.1 Remover Clerk del frontend

- Desinstalar `@clerk/clerk-react` y cualquier paquete de Clerk
- Eliminar `ClerkProvider` de `main.jsx`
- Eliminar componentes de Clerk: `<SignIn>`, `<SignUp>`, `<UserButton>`, etc.
- Eliminar hooks de Clerk: `useUser()`, `useAuth()`, `useClerk()`
- Eliminar cualquier referencia a `VITE_CLERK_PUBLISHABLE_KEY`

### 3.2 Crear página de Login simple

Componente React con:
- Campo email
- Campo password
- Botón de login
- Manejo de errores (credenciales inválidas, cuenta desactivada)
- Sin diseño excesivo — funcional y limpio con Material UI

### 3.3 Modificar auth-store.js (Zustand)

El store debe manejar:
- `token` — JWT almacenado
- `user` — datos del usuario logueado (id, email, firstName, lastName, role, tenantId)
- `login(email, password)` — llama a POST /api/auth/login, guarda token y user
- `logout()` — limpia token y user, redirige a /login
- `isAuthenticated` — computed basado en existencia de token válido

### 3.4 Modificar interceptor de Axios

En el servicio de API (o donde se configure Axios):
- Tomar token de Zustand store (no de Clerk)
- Setear header `Authorization: Bearer ${token}`
- En interceptor de response: si recibe 401, hacer logout automático

### 3.5 Proteger rutas

Crear un componente `ProtectedRoute` que:
- Verifica si hay token válido
- Si no, redirige a /login
- Si sí, renderiza el children
- Opcionalmente verifica rol requerido

## FASE 4: LIMPIEZA

Solo después de que todo funcione en producción por al menos 1 semana:

1. Eliminar campos de Clerk del schema (clerkId, etc.)
2. Eliminar webhooks de Clerk del backend
3. Eliminar variables de entorno de Clerk (CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET)
4. Ejecutar migración final para limpiar schema
5. Desinstalar paquetes de Clerk del backend

## FASE 5: SEGURIDAD (no saltar)

Verificar que estén implementados:

- [ ] Bcrypt con salt rounds >= 12
- [ ] Rate limiting en login (5 intentos / 15 min por IP)
- [ ] Rate limiting en cambio de password
- [ ] JWT con expiración (24h recomendado)
- [ ] Validación de password mínima (8 caracteres, al menos 1 número)
- [ ] CORS configurado correctamente
- [ ] JWT_SECRET como variable de entorno, nunca hardcodeado
- [ ] Búsqueda de usuario en cada request (no confiar solo en el JWT — el usuario puede ser desactivado)
- [ ] Tenant activo verificado en cada request
- [ ] Passwords nunca retornados en responses de API
- [ ] Logs de intentos de login fallidos

## PRUEBAS MÍNIMAS REQUERIDAS

1. Login con credenciales correctas → recibe JWT y datos de usuario
2. Login con password incorrecto → error 401
3. Login con usuario desactivado → error 403
4. Login con tenant desactivado → error 403
5. Acceso a ruta protegida sin token → error 401
6. Acceso a ruta protegida con token expirado → error 401
7. Admin crea usuario → usuario puede hacer login
8. Admin de Notaría 18 NO puede ver datos de Notaría 25
9. Cambio de password funciona
10. SUPERADMIN puede crear tenant y su admin inicial
11. Rate limiting bloquea después de 5 intentos fallidos

## VARIABLES DE ENTORNO NECESARIAS

```
JWT_SECRET=<generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRATION=24h
BCRYPT_SALT_ROUNDS=12
```

## ORDEN DE EJECUCIÓN

1. Branch de seguridad
2. Fase 1 (DB) — migración y seed
3. Fase 2 (Backend) — endpoints y middleware
4. Fase 3 (Frontend) — login y limpieza de Clerk
5. Probar todo localmente
6. Deploy a staging/producción
7. Fase 4 (Limpieza) — después de 1 semana estable
8. Fase 5 (Verificación de seguridad)

## NOTAS IMPORTANTES

- **No borrar campos de Clerk inmediatamente.** Hacerlos opcionales primero. Limpiar después.
- **El tenantId siempre viene del JWT**, nunca del cliente. Esto es la base de la seguridad multitenant.
- **Cada admin solo gestiona usuarios de su propio tenant.** Solo SUPERADMIN cruza tenants.
- **No implementar refresh tokens en la primera iteración.** JWT de 24h es suficiente para el caso de uso. Se puede agregar después si es necesario.
- **No implementar "forgot password" por email.** En contexto notarial ecuatoriano, el reset presencial (admin resetea y entrega en persona) es más seguro y más práctico.
