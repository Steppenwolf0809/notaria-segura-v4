# 🔧 Login Issues - Problemas y Soluciones

## ❌ Problemas Identificados

### 1. **Content Security Policy muy restrictiva**
```
Refused to load stylesheet 'https://fonts.googleapis.com/css2...'
Refused to connect to 'http://localhost:3001/api/auth/login'
```

### 2. **API URL incorrecta en producción**
- Frontend intentando conectar a `localhost:3001`
- Variable `VITE_API_URL` no aplicándose correctamente

### 3. **Posible falta de usuarios en base de datos**
- Login puede fallar si no hay usuarios poblados

## ✅ Soluciones Aplicadas

### **1. CSP relajado para funcionalidad web**
```javascript
// backend/server.js - Helmet CSP actualizado
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], 
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "'unsafe-inline'"],                    // ✅ PERMITE APIS
      fontSrc: ["'self'", "https://fonts.gstatic.com"],             // ✅ GOOGLE FONTS
    },
  },
}));
```

### **2. API URL configurada para producción**
```env
# frontend/.env.production
VITE_API_URL=/api                                                  # ✅ RUTAS RELATIVAS
```

### **3. Población automática de usuarios**
```javascript
// backend/package.json - Start script actualizado
"start": "npx prisma db push && node prisma/seed.js && node server.js"
```

### **4. Script de verificación de usuarios**
```javascript
// Nuevo script: backend/scripts/verify-users.js
npm run verify:users  // Verificar usuarios en BD
```

## 🚀 Para Resolver Completamente

### **Opción 1: Nuevo Deploy (Recomendado)**
```bash
# Nuevo deploy forzará rebuild con configuración correcta
railway up --detach
```

### **Opción 2: Verificar usuarios manualmente** 
Si el login sigue fallando después del deploy:
```bash
# En Railway CLI o logs
npm run verify:users    # Ver si existen usuarios
npm run db:seed         # Crear usuarios si faltan
```

## 👥 Usuarios del Sistema

Una vez poblados correctamente:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@notaria.com | Notaria123. | ADMIN |
| cindy.pazmino@notaria.com | Notaria123. | CAJA |
| mayra.corella@notaria.com | Notaria123. | MATRIZADOR |
| karolrecepcion@notaria.com | Notaria123. | RECEPCION |
| maria.diaz@notaria.com | Notaria123. | ARCHIVO |

## 🔍 Verificación Post-Deploy

1. **Google Fonts**: Deberían cargar sin errores CSP
2. **API Conexión**: Frontend debería usar `/api/auth/login` 
3. **Login**: Debería funcionar con cualquier email de la tabla
4. **Console**: Sin errores de CORS o CSP

## 🎯 Próximos Pasos

1. **Deploy nuevo** para aplicar cambios
2. **Probar login** con `admin@notaria.com / Notaria123.`
3. **Verificar consola** para confirmar que no hay errores
4. **Acceso dashboard** después del login exitoso

**Con estos cambios el login debería funcionar completamente.**