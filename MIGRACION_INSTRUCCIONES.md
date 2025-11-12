# 🚀 Cómo Aplicar la Migración en Railway

## ✅ OPCIÓN 1: Automática (Ya está configurada)

### Pasos:
1. **Haz push de esta rama a GitHub**
2. **En Railway, haz un nuevo deploy**
3. Railway ejecutará automáticamente:
   - `npm run build` → genera cliente Prisma y aplica schema
   - `npm start` → inicia el servidor

**Eso es todo!** Railway aplicará automáticamente los cambios de base de datos.

---

## 🔧 OPCIÓN 2: Manual desde Railway CLI

Si prefieres ejecutarlo manualmente:

### 1. Instala Railway CLI (si no lo tienes):
```bash
npm install -g @railway/cli
```

### 2. Logueate:
```bash
railway login
```

### 3. Vincula tu proyecto:
```bash
cd /home/user/notaria-segura-v4/backend
railway link
```

### 4. Ejecuta la migración:
```bash
railway run npx prisma db push --accept-data-loss
```

---

## 🖥️ OPCIÓN 3: Desde el Dashboard de Railway

### 1. Ve a tu proyecto en Railway
### 2. Click en "Settings" → "Deploy"
### 3. Asegúrate que:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start:prod`

### 4. Haz un nuevo deploy manualmente o espera al autodeploy

---

## 🔍 Verificar que Funcionó

Después del deploy, verifica en los logs de Railway que veas algo como:

```
✔ Generated Prisma Client
✔ Database synchronized with schema
```

O puedes probar los nuevos endpoints:
- POST /api/password-recovery/forgot-password
- GET /api/profile/security

---

## ⚠️ Notas Importantes

### ¿Qué hace `db push`?
- Sincroniza tu schema de Prisma con la base de datos
- Crea/modifica tablas automáticamente
- **Perfecto para desarrollo**
- En producción se recomienda usar `migrate deploy` (pero requiere archivos de migración)

### ¿Se perderán datos?
**NO.** El flag `--accept-data-loss` solo significa:
- "Acepto que SI hubiera conflictos irresolubles, permito perder esos datos"
- En este caso **solo estamos AGREGANDO** tablas nuevas
- No se elimina ni modifica ninguna tabla existente

### Tablas que se crearán:
- `password_reset_tokens` - Para recuperación de contraseña
- `email_verification_tokens` - Para verificación de email
- `refresh_tokens` - Para refresh tokens con rotación
- `password_history` - Para historial de contraseñas
- `security_alerts` - Para alertas de seguridad

### Campos que se agregarán a `users`:
- `emailVerified`, `emailVerifiedAt`
- `twoFactorEnabled`, `twoFactorSecret`
- `lastLoginIp`, `loginAttempts`, `lockedUntil`

**Todo esto es NUEVO, no afecta lo existente** ✅

---

## 🆘 Si algo sale mal

### Error: "Environment variable not found: DATABASE_URL"
**Solución:** Verifica que tienes `DATABASE_URL` en las variables de entorno de Railway

### Error: "Can't reach database server"
**Solución:** Espera 1-2 minutos y reintenta. Railway a veces tarda en conectar.

### Error: "Migration failed"
**Solución:** Conéctate a la base de datos y ejecuta manualmente las migraciones desde los archivos SQL que están en `prisma/migrations/`

---

## 🎯 Resumen Rápido

**Para aplicar los cambios:**
1. Push esta rama a GitHub
2. Railway hace autodeploy
3. ¡Listo! Las nuevas tablas se crean automáticamente

**No necesitas hacer nada manual si Railway está configurado con autodeploy** 🎉
