# DEPLOY-RW.md — Notaría Segura (Railway + Prisma + Postgres)

Guía corta y práctica para desplegar sin romper migraciones ni enums. Úsala siempre que hagas cambios en modelos o estados de documentos.

---

## 🧭 Alcance
- Backend Node/Express, Prisma ORM, PostgreSQL en Railway.
- Evitar bucles de despliegue y errores `P3009` (migraciones) / `P2032` (conversión de tipos, típicamente ENUM ↔ String).

---

## 🔴 Archivos/áreas **críticas**
- `backend/prisma/schema.prisma`
- `backend/server.js` (escucha de puerto y health)
- `backend/src/controllers/*` (handlers de documentos)
- `package.json` (raíz y backend) — **no** debe existir `prestart` en producción

## 🟡 Archivos/áreas **importantes**
- `backend/scripts/*` (solo herramientas manuales: *nunca* en arranque)
- `frontend/src/services/auth-service.js`, `frontend/src/hooks/use-auth.js` (verificación de sesión)
- Config Railway (Branch de deploy, Start Command, Health Path)

## 🟢 Archivos/áreas **opcionales**
- `README`, este `DEPLOY-RW.md`, docs de equipo

---

## ✅ Principios de despliegue (resumen)
1) **Sin migraciones en arranque**: prohibido `prestart`/`start` que ejecute Prisma.
2) **Prisma = Postgres**: si en PG es **ENUM**, en Prisma debe ser **enum** con los mismos literales (mismo case).
3) **Start Command**: `node server.js` (o `node backend/server.js` si arrancas desde raíz).
4) **Health**: endpoint ligero (`/_health` o `/api/health`) que **no** toca la BD.
5) **Auth verify**: máximo **1** llamada al montar (evitar 429).

---

## 🛠️ Preparación del entorno en Railway
- **Branch**: confirmar que la rama configurada es la que estás usando.
- **Root Directory**: `backend` (recomendado) o vacío si usas `node backend/server.js`.
- **Start Command**: `node server.js` (o `node backend/server.js`).
- **Health Path**: `/_health` o `/api/health`.
- **Variables**: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_API_KEY` y demás necesarias.

> El servidor **debe** escuchar `process.env.PORT` (fallback opcional a 8080).

---

## 🧪 Cambios de esquema (enums) — Procedimiento seguro
> Aplica cuando agregues/edites **estados** o campos que sean ENUM en BD.

1) **Detectar el tipo real en BD**
   - Consulta los tipos/columnas sensibles (ej.: `documentType`, `status`, `deliveryStage`, `documentState`).
   - Si `data_type = USER-DEFINED`, es **ENUM** en Postgres; anota su `udt_name` y valores.
2) **Reflejar en Prisma**
   - Define el `enum` en `schema.prisma` con **los mismos literales**.
   - Cambia el campo del modelo a ese enum (no `String`).
3) **Normalizar datos (si hace falta)**
   - Si hay filas con valores fuera del enum, actualízalas a un literal válido.
4) **Commit & push** (rama actual) → el build de Railway regenerará Prisma Client.

> Regla de oro: **BD primero**, luego `schema.prisma`, luego front. Mantén un único catálogo de literales por enum.

---

## 🚫 Migraciones y arranque
- **Nunca** ejecutes `prisma migrate` en `prestart`/`start`.
- Migraciones **manuales** y explícitas (fuera del ciclo de arranque).
- Si una migración queda `failed` (P3009), resolver con `prisma migrate resolve --applied <nombre>` **apuntando a la BD remota**.

---

## 🧰 Comandos de referencia (desde `backend/`)
> Apuntando a la **BD remota** (sustituye la URL por la de Railway cuando corras localmente):

```bash
# Marcar como aplicada una migración fallida (P3009)
DATABASE_URL="postgresql://<user>:<pass>@<host>:<port>/<db>" \
  npx prisma migrate resolve --applied 20250117000000_fix_role_enum_conversion
```

> No es necesario correr `prisma generate` local para afectar el servidor remoto; el cliente se genera en el build de Railway con tu commit.

---

## 🩹 Patrón para errores P2032 (ENUM ↔ String)
1) Identificar columna y tipo real en BD (ENUM).
2) Convertir campo en Prisma a `enum` con literales idénticos.
3) Normalizar datos si hay valores fuera del enum.
4) Commit & push (rama actual) → redeploy → probar endpoints.

---

## 🔐 Auth y 429 (verify)
- Lado front: llamar `/api/auth/verify` **una vez al montar** (o con debounce). Manejar 401/403 sin loops.
- Lado back: si usas rate-limit, excluye `verify` o sube umbral.

---

## 🧩 Health check
- Implementar `/_health` o `/api/health` que responda **200** sin depender de la BD.
- Configurar el mismo path en Railway → Health Check.

---

## ✅ Checklist de release
- [ ] Rama de deploy correcta en Railway.
- [ ] `server.js` usa `process.env.PORT`.
- [ ] **Sin** `prestart` en `package.json` (raíz/backend).
- [ ] Health path configurado y responde 200.
- [ ] Enums en Prisma alineados con Postgres.
- [ ] (Si hubo migración fallida) resuelta con `migrate resolve` contra la BD remota.
- [ ] Endpoints clave responden 200 (`/api/documents/*`, `/api/archivo/*`, `/api/reception/*`).

---

## 🧯 Rollback rápido
- Volver al commit estable (git revert o redeploy de build previo en Railway).
- Si una migración quedó a medias: `migrate resolve` para marcar estado **consistente** y evitar bloqueos.

---

## 🧪 Guardrails (recomendado)
- **CI check** que falle si aparece `"prestart"` en cualquier `package.json`.
- Script de auditoría (solo lectura) que compare enums de BD vs Prisma y alerte en PR.
- Doc único con los **literales** permitidos por cada enum y su dueño.

---

## 🔄 Flujo de commit & push (obligatorio)
Siempre que hagas cambios en esquema, handlers o configuración:

```bash
git add -A
git commit -m "chore(deploy): align Prisma enums with PG; no prestart; health path; resolve failed migration if needed"
git push
```

> El push en la **rama actual** dispara el **deploy automático** en Railway (si la rama coincide con la configurada en el servicio).

