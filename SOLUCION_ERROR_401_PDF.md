# Solución: Error 401 al Cargar PDFs en Modal de Páginas Ocultas

## 📋 Resumen del Problema

Cuando intentas cargar un PDF en el modal "Gestionar Páginas Ocultas", aparece el error:
```
Failed to load PDF file
Error 401 (Unauthorized)
```

## 🔍 Causa del Problema

El error **NO viene de tu backend**, sino del **servidor remoto** (www.notaria18quito.com.ec) que requiere autenticación HTTP Basic para acceder a los archivos PDF.

### Flujo de la petición:
1. Frontend → `/api/proxy-pdf?url=https://www.notaria18quito.com.ec/fotos-escrituras/archivo.pdf`
2. Backend (proxy) → Servidor remoto con credenciales FTP
3. Servidor remoto → Valida credenciales
4. **Si las credenciales faltan o son incorrectas → 401 Unauthorized**

## ✅ Solución: Configurar Variables FTP

### Paso 1: Agregar Variables al Archivo `.env`

En tu archivo `backend/.env`, agrega las siguientes variables:

```env
# --- Servidor FTP / cPanel ---
FTP_HOST=ftp.notaria18quito.com.ec
FTP_USER=tu_usuario_ftp_real
FTP_PASSWORD=tu_contraseña_ftp_real
FTP_PORT=21
FTP_BASE_PATH=/public_html/fotos-escrituras
FTP_PUBLIC_BASE_URL=https://www.notaria18quito.com.ec/fotos-escrituras
```

**IMPORTANTE**: Reemplaza `tu_usuario_ftp_real` y `tu_contraseña_ftp_real` con las credenciales reales de tu servidor cPanel.

### Paso 2: Verificar Credenciales

Asegúrate de que las credenciales son correctas:
- Usuario FTP de tu hosting (cPanel)
- Contraseña FTP correspondiente
- Las mismas credenciales que usas para subir archivos al servidor

### Paso 3: Reiniciar el Backend

Después de agregar las variables:

**Desarrollo:**
```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
npm run dev
```

**Producción (Railway):**
1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Agrega las variables FTP manualmente
4. Redeploy automático ocurrirá

## 🧪 Verificación

### Método 1: Endpoint de Diagnóstico

Abre en tu navegador (desarrollo o producción):
```
http://localhost:3001/api/proxy-pdf/health
```

**Respuesta esperada (configurado):**
```json
{
  "service": "PDF Proxy",
  "status": "ready",
  "timestamp": "2025-10-12T...",
  "configuration": {
    "ftpHost": "ftp.notaria18quito.com.ec",
    "ftpUser": "✓ Configured",
    "ftpPassword": "✓ Configured",
    "ftpPort": "21",
    "allowedDomain": "www.notaria18quito.com.ec"
  },
  "message": "PDF proxy is ready to serve authenticated requests"
}
```

**Respuesta (sin configurar):**
```json
{
  "service": "PDF Proxy",
  "status": "not_configured",
  "configuration": {
    "ftpUser": "✗ Missing",
    "ftpPassword": "✗ Missing"
  },
  "message": "FTP credentials not configured. Proxy may fail with 401 errors."
}
```

### Método 2: Script de Testing

Ejecuta el script de diagnóstico en tu terminal:
```bash
cd backend
node scripts/test-ftp-proxy.js
```

Este script te mostrará:
- ✅ Variables configuradas correctamente
- 🔐 Test de autenticación HTTP Basic
- 🔓 Comparación sin autenticación
- 📊 Resumen completo

### Método 3: Logs del Backend

### Logs Esperados (Con credenciales)
```
📄 PROXY-PDF: Solicitando https://www.notaria18quito.com.ec/fotos-escrituras/archivo.pdf
🔐 PROXY-PDF: Usando autenticación HTTP Basic (usuario: tu_usuario)
✅ PROXY-PDF: Streaming completado para /fotos-escrituras/archivo.pdf
```

### Logs de Error (Sin credenciales)
```
📄 PROXY-PDF: Solicitando https://www.notaria18quito.com.ec/fotos-escrituras/archivo.pdf
⚠️ PROXY-PDF: Variables FTP_USER/FTP_PASSWORD no configuradas
⚠️ PROXY-PDF: Si el servidor requiere autenticación, la petición fallará con 401
❌ PROXY-PDF: Error del servidor remoto: 401 Unauthorized
🚫 PROXY-PDF: Error 401 - Autenticación rechazada por el servidor remoto
```

## 🔧 Soluciones Alternativas

### Opción A: Hacer los PDFs Públicos (No Recomendado)

Si controlas el servidor web, podrías configurar `.htaccess` para permitir acceso público a la carpeta `/fotos-escrituras/`:

```apache
# En /public_html/fotos-escrituras/.htaccess
<Files "*.pdf">
    Satisfy Any
    Allow from all
</Files>
```

**Inconveniente**: Los PDFs serían accesibles sin autenticación, lo cual puede ser un riesgo de seguridad.

### Opción B: Usar Credenciales Específicas para HTTP

Algunos servidores cPanel permiten crear usuarios HTTP separados de FTP. Consulta con tu proveedor de hosting.

## 📝 Cambios Realizados en el Código

### 1. `backend/env.example`
- ✅ Agregadas variables FTP de ejemplo con documentación

### 2. `backend/src/routes/pdf-proxy-routes.js`
- ✅ Mejorados logs de advertencia cuando faltan credenciales
- ✅ Mensaje de error específico para error 401
- ✅ Instrucciones claras en los logs para debugging

## 🔒 Seguridad

### Buenas Prácticas:
- ✅ Las credenciales FTP nunca se exponen al frontend
- ✅ Solo el backend tiene acceso a las credenciales
- ✅ El proxy solo permite el dominio específico (www.notaria18quito.com.ec)
- ✅ Solo se permiten archivos PDF

### Variables Sensibles:
**NUNCA** subas el archivo `.env` al repositorio Git. Usa `.gitignore`:
```gitignore
.env
.env.local
.env.production
```

## 🚀 Testing

### Probar en Desarrollo:
1. Configura variables FTP en `backend/.env`
2. Reinicia el backend
3. Abre el modal "Gestionar Páginas Ocultas"
4. El PDF debería cargar correctamente

### Probar en Producción:
1. Configura variables en Railway
2. Espera el redeploy
3. Verifica los logs en Railway
4. Prueba desde la aplicación desplegada

## 📞 Soporte

Si después de configurar las variables FTP el error persiste:

1. **Verifica los logs del backend**: Busca los mensajes de PROXY-PDF
2. **Valida las credenciales**: Intenta conectarte por FTP con las mismas credenciales
3. **Prueba acceso directo**: Abre la URL del PDF en el navegador
4. **Revisa la configuración del servidor**: Consulta con tu proveedor de hosting

## ✨ Resultado Esperado

Después de aplicar la solución:
- ✅ El modal "Gestionar Páginas Ocultas" carga el PDF sin errores
- ✅ Los logs muestran autenticación exitosa
- ✅ Puedes seleccionar páginas para ocultar
- ✅ Los cambios se guardan correctamente

---

**Fecha**: Octubre 2025  
**Versión**: 1.0  
**Branch**: feature/qr-verification-improvements
