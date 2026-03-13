# Multi-Tenant: Flujo de Trabajo y Siguientes Pasos (2026-03-03)

## 1) Estado Confirmado

- `feature/architecture-v2.1-restart` contiene avances de arquitectura (incluye OLA C).
- `staging` ya recibió esos cambios clave para pruebas y está desplegable en Railway.
- `main` debe mantenerse estable y solo recibir cambios validados desde `staging`.

Conclusión: sí, ya estabas en entorno de prueba, pero conviene normalizar el flujo para evitar desalineaciones.

## 2) Flujo Recomendado de Ramas (Estándar)

Siempre trabajar así:

1. Desarrollo en `feature/architecture-v2.1-restart`
2. Promoción controlada a `staging`
3. Validación funcional/técnica en Railway Staging
4. Paso final a `main` cuando staging esté aprobado

Comandos sugeridos:

```bash
# 1) Trabajar en feature
git checkout feature/architecture-v2.1-restart
git pull origin feature/architecture-v2.1-restart

# ... cambios ...
git add <archivos>
git commit -m "feat(multitenant): ..."
git push origin feature/architecture-v2.1-restart

# 2) Promover a staging (por PR o cherry-pick)
git checkout staging
git pull origin staging
git cherry-pick <sha1> <sha2>
git push origin staging

# 3) Cuando staging esté validado, promover a main
git checkout main
git pull origin main
git merge --no-ff staging
git push origin main
```

Regla operativa:
- Railway Staging debe apuntar a rama `staging` (no directo a `feature`), salvo pruebas puntuales muy controladas.

## 3) Qué Hacer Ahora (Sin Cuenta Clerk Aún)

No tener Clerk todavía NO bloquea cerrar la parte técnica base de arquitectura.
La refactorización de UAFE queda fuera de este plan y se manejará como iniciativa separada `UAFE_V2`.

### Prioridad inmediata

1. Cerrar verificación funcional de OLA C en staging (roles + módulos).
2. Dejar documentación de estado al día (qué está cerrado y qué queda pendiente).
3. Congelar baseline estable de `staging` con tag o commit de referencia.

### Trabajo que sí puede avanzar sin Clerk

1. Endurecimiento de aislamiento tenant en endpoints restantes.
2. Pruebas E2E de aislamiento (tenant A vs tenant B + SUPER_ADMIN).
3. Limpieza de scripts temporales y controles de secretos.
4. Ajustes de módulo/planes por notaría (sin depender del proveedor auth).

### Trabajo que depende de Clerk

1. Alta de tenant/organización real en Clerk.
2. Integración de JWT de Clerk en middleware de auth.
3. Migración de usuarios legacy a modelo Clerk (manteniendo correo/clave inicial en piloto según política definida).

## 4) Superusuario (Mientras Clerk no exista)

Para staging/piloto, usa el flujo actual de seed multi-tenant ya existente:

- Archivo: `backend/prisma/seed-multi-tenant.js`
- Este seed crea/verifica:
  - Notaría base (`N18`)
  - Usuario `SUPER_ADMIN`
  - Usuario admin de notaría

Ejecución (solo en ambiente controlado):

```bash
cd backend
node prisma/seed-multi-tenant.js
```

## 5) Control de Seguridad Antes de Push

Checklist mínimo:

1. Nunca commitear credenciales (`DATABASE_URL`, llaves API, tokens).
2. Eliminar scripts temporales sensibles o moverlos a `.gitignore` si son locales.
3. Verificar cambios antes de push:

```bash
git status
git diff --name-only
```

4. Hacer revisión rápida de secretos en texto:

```bash
rg -n "postgresql://|JWT_SECRET|CLERK_SECRET_KEY|sk_live|-----BEGIN" .
```

---

Si seguimos este flujo, la rama de arquitectura avanza sin bloquear operación diaria y `main` se mantiene limpio hasta el cierre formal de la arquitectura.
