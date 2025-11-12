# Mejoras de Seguridad - Notaría Segura v4

## 📋 Resumen de Implementación

### ✅ COMPLETADO

#### 1. **Winston Logger Profesional**
- **Archivo:** `src/utils/logger.js`
- **Características:**
  - Logging estructurado con niveles (debug, info, warn, error)
  - Rotación diaria de logs con `winston-daily-rotate-file`
  - Logs separados: error (14 días), combined (7 días), security (30 días), audit (90 días)
  - En desarrollo: solo console, en producción: archivos + console
  - Helper functions: `log`, `logSecurity`, `logAudit`, `logRequest`

#### 2. **Rate Limiting Inteligente**
- **Archivo:** `src/middleware/rate-limiter.js`
- **Mejora:** Límites dinámicos según entorno
  - **Desarrollo:** Límites muy permisivos (10,000 requests para testing sin bloqueos)
  - **Producción:** Límites estrictos (50 login, 3 password change, etc.)
- **Tipos:**
  - Login: 10,000 dev / 50 prod
  - Password change: 1,000 dev / 3 prod
  - Auth general: 10,000 dev / 100 prod
  - Register: 1,000 dev / 10 prod
  - Admin: 10,000 dev / 100 prod

#### 3. **Servicio de Email (Nodemailer)**
- **Archivo:** `src/services/email-service.js`
- **Funciones:**
  - `sendPasswordResetEmail()` - Recuperación de contraseña
  - `sendEmailVerification()` - Verificación de email
  - `sendPasswordChangedEmail()` - Notificación de cambio
  - `sendSecurityAlert()` - Alertas de seguridad
- **Modo desarrollo:** Emails se loggean en consola (no se envían)
- **Modo producción:** Envío real vía SMTP

#### 4. **Servicio de Tokens Seguros**
- **Archivo:** `src/services/token-service.js`
- **Funcionalidades:**
  - Password reset tokens (1 hora de expiración)
  - Email verification tokens (24 horas)
  - Refresh tokens con rotación automática (7 días)
  - Invalidación automática de tokens antiguos
  - Limpieza de tokens expirados

#### 5. **Servicio de Seguridad Avanzado**
- **Archivo:** `src/services/security-service.js`
- **Características:**
  - Detección de intentos de fuerza bruta (5 intentos → bloqueo 15 min)
  - Historial de contraseñas (5 últimas, evita reutilización)
  - Alertas de seguridad automáticas
  - Detección de IPs sospechosas
  - Sistema de bloqueo temporal de cuentas

#### 6. **Schema de Base de Datos**
- **Archivo:** `prisma/schema.prisma`
- **Nuevas tablas:**
  - `PasswordResetToken` - Tokens de recuperación
  - `EmailVerificationToken` - Tokens de verificación
  - `RefreshToken` - Tokens con rotación
  - `PasswordHistory` - Historial de contraseñas
  - `SecurityAlert` - Alertas de seguridad
- **Campos nuevos en User:**
  - `emailVerified`, `emailVerifiedAt`
  - `twoFactorEnabled`, `twoFactorSecret`
  - `lastLoginIp`, `loginAttempts`, `lockedUntil`

---

### 🚧 PENDIENTE DE IMPLEMENTAR

#### 7. **Controladores de Recuperación de Contraseña**
- `POST /api/auth/forgot-password` - Solicitar recuperación
- `POST /api/auth/reset-password` - Resetear con token
- `POST /api/auth/verify-email` - Verificar email
- `POST /api/auth/resend-verification` - Reenviar verificación

#### 8. **Endpoints de Auto-gestión de Perfil**
- `PUT /api/auth/update-email` - Cambiar email (con verificación)
- `GET /api/auth/profile/security` - Ver actividad de seguridad
- `GET /api/auth/profile/sessions` - Ver sesiones activas
- `POST /api/auth/revoke-sessions` - Cerrar todas las sesiones

#### 9. **Refresh Token Implementation**
- `POST /api/auth/refresh-token` - Obtener nuevo access token
- Integrar en auth-controller.js

#### 10. **Middleware de Sanitización**
- express-mongo-sanitize (NoSQL injection)
- xss-clean (XSS attacks) [DEPRECATED - usar alternativa]
- hpp (HTTP Parameter Pollution)
- express-validator en todos los endpoints

#### 11. **Mejora de Headers de Seguridad en server.js**
- Content Security Policy más estricto
- Permissions-Policy
- Cross-Origin-Embedder-Policy
- Cross-Origin-Resource-Policy

#### 12. **Panel de Administración de Seguridad**
- `GET /api/admin/security/alerts` - Ver alertas
- `PUT /api/admin/security/alerts/:id/resolve` - Resolver alerta
- `GET /api/admin/security/stats` - Estadísticas de seguridad
- `POST /api/admin/security/unlock-user/:id` - Desbloquear cuenta

#### 13. **Documentación Completa**
- README de configuración
- Guía de variables de entorno
- Mejores prácticas de seguridad
- Guía de testing

---

## 🔧 CONFIGURACIÓN NECESARIA

### Variables de Entorno (`.env`)

```bash
# Existentes
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secret-super-seguro-minimo-32-caracteres
JWT_EXPIRES_IN=24h

# NUEVAS - Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
EMAIL_FROM_NAME=Notaría Segura
EMAIL_FROM_ADDRESS=noreply@notaria.com

# NUEVAS - Security
PASSWORD_HISTORY_COUNT=5
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_TIME=900000

# NUEVAS - Logging
LOG_LEVEL=info
LOG_TO_FILE=true
SLOW_REQUEST_MS=1000

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Comandos de Migración

```bash
# Generar cliente de Prisma
npx prisma generate

# Crear migración
npx prisma migrate dev --name add_security_features

# Aplicar en producción
npx prisma migrate deploy
```

---

## 📊 MÉTRICAS DE SEGURIDAD

### Rate Limiting (Desarrollo vs Producción)

| Endpoint | Desarrollo | Producción | Ventana |
|----------|-----------|------------|---------|
| Login | 10,000 | 50 | 15 min |
| Password Change | 1,000 | 3 | 15 min |
| Auth General | 10,000 | 100 | 15 min |
| Register | 1,000 | 10 | 1 hora |
| Admin Operations | 10,000 | 100 | 1 hora |

### Tokens & Expiración

| Token Type | Expiración | Uso Único | Rotación |
|-----------|-----------|----------|----------|
| Access Token (JWT) | 24h | No | No |
| Refresh Token | 7 días | No | Sí |
| Password Reset | 1 hora | Sí | N/A |
| Email Verification | 24 horas | Sí | N/A |

### Protecciones Implementadas

- ✅ Bcrypt con 12 salt rounds
- ✅ Rate limiting multinivel
- ✅ Bloqueo temporal de cuentas (5 intentos)
- ✅ Historial de contraseñas (5 últimas)
- ✅ Validación de contraseñas robusta
- ✅ Detección de IPs sospechosas
- ✅ Logging estructurado de auditoría
- ✅ Tokens de un solo uso
- ✅ Refresh token rotation
- ✅ CORS configurado
- ✅ Helmet headers

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Ejecutar migración de BD:** `npx prisma migrate dev`
2. **Implementar controladores pendientes** (forgot/reset password)
3. **Actualizar frontend** para nuevas funcionalidades
4. **Configurar SMTP** para emails en desarrollo
5. **Testing exhaustivo** en modo desarrollo
6. **Documentación de API** con Swagger/OpenAPI

---

## 🔒 MEJORES PRÁCTICAS

### Para Desarrollo
- Usa `NODE_ENV=development` para límites permisivos
- Los emails se loggean en consola, no se envían
- Rate limiting es muy alto para permitir pruebas

### Para Producción
- Usa `NODE_ENV=production` para límites estrictos
- Configura SMTP real para emails
- Habilita logging a archivos con `LOG_TO_FILE=true`
- Usa JWT_SECRET fuerte (mínimo 32 caracteres)
- Configura FRONTEND_URL correcto para emails

### Seguridad General
- Nunca commites `.env` al repositorio
- Rota JWT_SECRET periódicamente en producción
- Monitorea alertas de seguridad regularmente
- Ejecuta `cleanupExpiredTokens()` periódicamente (cron job)
- Revisa logs de security diariamente

---

## 📞 SOPORTE

Si encuentras issues o necesitas ayuda:
1. Revisa logs en `backend/logs/`
2. Verifica variables de entorno
3. Comprueba conexión a BD
4. Revisa la documentación de cada servicio

---

**Última actualización:** 2025-11-12
**Versión:** v4.1.0-security-enhanced
