# 🔐 JWT Security Configuration

## Descripción

Este documento describe la configuración de seguridad JWT (JSON Web Tokens) implementada en el sistema de Notaría Segura.

## Variables de Entorno

### JWT_SECRET (CRÍTICO)

**Descripción**: Clave secreta para firmar tokens JWT.

**Requerimientos de Seguridad**:
- ✅ Mínimo 64 caracteres (128 caracteres recomendado en producción)
- ✅ Generado aleatoriamente con `crypto.randomBytes()`
- ✅ NUNCA compartir en repositorios públicos
- ✅ NUNCA hardcodear en el código
- ✅ Único por entorno (desarrollo, staging, producción)

**Generación**:
```bash
# Generar JWT_SECRET seguro (64 bytes = 128 caracteres hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Ejemplo de salida**:
```
351b1b875fd2158baba855555d700f06f668967c2bec8595cf265f0eae841ce8cf6820035095e337a0700dd96f3209ed8b4fd1a664386880e62526fbd908e5c7
```

### JWT_EXPIRES_IN

**Descripción**: Tiempo de expiración de los tokens JWT.

**Valores Recomendados**:
- **Desarrollo**: `24h` (24 horas)
- **Producción**: `8h` (8 horas) - Balance entre seguridad y UX
- **APIs internas**: `1h` (1 hora) - Mayor seguridad
- **Apps móviles**: `7d` (7 días) - con refresh token obligatorio

**Formato**:
- `60`, `"2 days"`, `"10h"`, `"7d"` (ver [ms](https://github.com/vercel/ms))
- Número en segundos: `3600` = 1 hora
- String con unidades: `"1h"`, `"30m"`, `"7d"`

**Configuración Actual**:
```env
JWT_EXPIRES_IN=24h
```

### CSRF_SECRET

**Descripción**: Clave secreta para tokens CSRF (Cross-Site Request Forgery).

**Requerimientos**:
- ✅ Mínimo 32 caracteres
- ✅ Generado aleatoriamente
- ✅ Diferente de JWT_SECRET

**Generación**:
```bash
# Generar CSRF_SECRET seguro (32 bytes = 64 caracteres hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configuración por Entorno

### Desarrollo (.env local)

```env
# JWT - Generado aleatoriamente, NO compartir
JWT_SECRET="351b1b875fd2158baba855555d700f06..."
JWT_EXPIRES_IN="24h"
CSRF_SECRET="7c1345e6477cda28d1699d2af2d741a6..."
```

### Staging/Production (Variables de Entorno)

**Railway.app** (o servicio de hosting):

1. Ir a Settings → Variables
2. Agregar variables:

```env
NODE_ENV=production
JWT_SECRET=<generar nuevo secreto único de 128 caracteres>
JWT_EXPIRES_IN=8h
CSRF_SECRET=<generar nuevo secreto único de 64 caracteres>
```

**Importante**:
- ⚠️ NUNCA reutilizar JWT_SECRET de desarrollo en producción
- ⚠️ NUNCA commitear .env con secretos reales
- ⚠️ Rotar secretos regularmente (cada 90 días recomendado)

## Validación de Seguridad

El sistema valida automáticamente la configuración JWT al iniciar:

```javascript
// backend/src/config/environment.js
const environmentSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad'),
  // ...
});
```

**Errores Comunes**:

```
❌ JWT_SECRET debe tener al menos 32 caracteres para seguridad
   → Solución: Generar un secreto más largo

❌ JWT_SECRET es obligatorio
   → Solución: Agregar JWT_SECRET al .env

❌ La aplicación no puede iniciar en producción con configuración inválida
   → Solución: Verificar todas las variables obligatorias
```

## Implementación JWT

### Generación de Token (Login)

```javascript
// backend/src/controllers/auth-controller.js
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}
```

**Payload Incluido**:
- `id` - ID del usuario en base de datos
- `email` - Email del usuario
- `role` - Rol del usuario (ADMIN, CAJA, MATRIZADOR, RECEPCION, ARCHIVO)
- `iat` - Issued at (timestamp de creación, automático)
- `exp` - Expiration (timestamp de expiración, automático)

### Verificación de Token (Middleware)

```javascript
// backend/src/middleware/auth-middleware.js
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token no proporcionado'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
}
```

## Mejores Prácticas

### ✅ DO (Hacer)

1. **Generar secretos únicos y aleatorios**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Usar variables de entorno**
   ```javascript
   const secret = process.env.JWT_SECRET; // ✅
   ```

3. **Validar tokens en cada request protegido**
   ```javascript
   router.get('/api/admin/users', authenticateToken, getAllUsers);
   ```

4. **Manejar errores de token apropiadamente**
   ```javascript
   try {
     jwt.verify(token, secret);
   } catch (error) {
     if (error.name === 'TokenExpiredError') {
       // Token expirado
     } else {
       // Token inválido
     }
   }
   ```

5. **Rotar secretos regularmente**
   - Programar rotación cada 90 días
   - Documentar proceso de rotación
   - Notificar a usuarios (relogin necesario)

### ❌ DON'T (No Hacer)

1. **NO hardcodear secretos**
   ```javascript
   const secret = 'mi-secreto-123'; // ❌ NUNCA
   ```

2. **NO compartir secretos en código**
   ```javascript
   // ❌ NUNCA commitear esto
   JWT_SECRET=abc123
   ```

3. **NO usar secretos débiles**
   ```javascript
   JWT_SECRET=secret // ❌ Muy corto
   JWT_SECRET=12345678901234567890123456789012 // ❌ Predecible
   ```

4. **NO reutilizar secretos entre entornos**
   ```env
   # ❌ NUNCA hacer esto
   # Dev y Prod con mismo secreto
   ```

5. **NO almacenar tokens en localStorage sin sanitizar**
   ```javascript
   localStorage.setItem('token', '<script>...'); // ❌ XSS risk
   ```

## Rotación de Secretos

### Cuándo Rotar

- ✅ Cada 90 días (recomendado)
- ✅ Después de una brecha de seguridad
- ✅ Cuando un desarrollador con acceso deja la empresa
- ✅ Si el secreto fue expuesto accidentalmente

### Proceso de Rotación

1. **Generar nuevo secreto**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Actualizar en producción**
   - Railway: Settings → Variables → JWT_SECRET → Update
   - Guardar y redeploy

3. **Invalidar tokens antiguos**
   - Todos los usuarios deberán hacer login nuevamente
   - Enviar notificación por email (opcional)

4. **Verificar funcionamiento**
   - Hacer login de prueba
   - Verificar que tokens anteriores son rechazados

5. **Documentar rotación**
   - Fecha de rotación
   - Razón de rotación
   - Persona responsable

## Testing de Seguridad

### Verificar Fortaleza del Secreto

```javascript
// tests/jwt-security.test.js
describe('JWT Security', () => {
  test('JWT_SECRET debe tener al menos 64 caracteres', () => {
    expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(64);
  });

  test('JWT_SECRET debe ser aleatorio (alta entropía)', () => {
    const secret = process.env.JWT_SECRET;
    // No debe contener palabras comunes
    expect(secret.toLowerCase()).not.toMatch(/password|secret|admin|test/);
  });

  test('JWT_EXPIRES_IN debe estar configurado', () => {
    expect(process.env.JWT_EXPIRES_IN).toBeDefined();
  });
});
```

### Verificar Expiración de Tokens

```javascript
describe('Token Expiration', () => {
  test('Token debe expirar después del tiempo configurado', async () => {
    // Crear token con expiración de 1 segundo
    const token = jwt.sign({ id: 1 }, secret, { expiresIn: '1s' });

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar que el token está expirado
    expect(() => jwt.verify(token, secret)).toThrow('jwt expired');
  });
});
```

## Troubleshooting

### "JWT must be provided"

**Causa**: No se envió el token en el header Authorization.

**Solución**:
```javascript
// Frontend
headers: {
  'Authorization': `Bearer ${token}`
}
```

### "jwt expired"

**Causa**: El token superó el tiempo de expiración.

**Solución**:
- Usuario debe hacer login nuevamente
- Implementar refresh tokens (futuro)

### "invalid signature"

**Causa**: El JWT_SECRET usado para verificar es diferente al usado para firmar.

**Solución**:
- Verificar que JWT_SECRET es el mismo en todos los servidores
- Verificar que no se cambió JWT_SECRET sin redeploy

### "jwt malformed"

**Causa**: El token tiene formato inválido.

**Solución**:
- Verificar que se envía `Bearer <token>` correctamente
- Verificar que no hay espacios extra
- Regenerar token con login

## Recursos

- [JWT.io](https://jwt.io/) - Decodificador y debugger de tokens
- [RFC 7519 - JWT Specification](https://tools.ietf.org/html/rfc7519)
- [OWASP JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)

## Checklist de Seguridad

Antes de desplegar a producción, verificar:

- [ ] JWT_SECRET tiene al menos 64 caracteres
- [ ] JWT_SECRET es único y aleatorio (generado con crypto)
- [ ] JWT_SECRET es diferente en dev, staging y prod
- [ ] JWT_EXPIRES_IN está configurado (recomendado: 8h)
- [ ] CSRF_SECRET está configurado y es diferente de JWT_SECRET
- [ ] Secretos están en variables de entorno, NO en código
- [ ] .env está en .gitignore
- [ ] Documentación de rotación está actualizada
- [ ] Equipo conoce el proceso de rotación de emergencia
