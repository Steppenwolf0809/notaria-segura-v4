# ⚡ Prueba Rápida del Fix

## 🚀 Pasos para Validar (5 minutos)

### 1️⃣ Deploy a Railway

```bash
git add .
git commit -m "fix: endpoint proxy PDF con rutas completas y logging mejorado"
git push origin fix/proxy-pdf-unauthorized
```

⏱️ **Espera 2-3 minutos** para que Railway despliegue.

---

### 2️⃣ Verificar Logs de Inicio

En el dashboard de Railway, busca en los logs:

```
✅ PDF Proxy routes registradas en /api/proxy-pdf
```

✅ **Si ves este mensaje:** El fix se aplicó correctamente.  
❌ **Si NO lo ves:** Hay un problema en el registro del router.

---

### 3️⃣ Probar Health Check

Abre en tu navegador o usa curl:

```
https://notaria-segura-v4-production.up.railway.app/api/proxy-pdf/health
```

**Respuesta esperada:**
```json
{
  "service": "PDF Proxy",
  "status": "ready",
  "timestamp": "2025-01-...",
  "configuration": {
    "ftpHost": "www.notaria18quito.com.ec",
    "ftpUser": "✓ Configured",
    "ftpPassword": "✓ Configured",
    "allowedDomain": "www.notaria18quito.com.ec"
  }
}
```

✅ **Si retorna 200 OK:** El endpoint está accesible.  
❌ **Si retorna 401 o 404:** El endpoint no se registró correctamente.

---

### 4️⃣ Probar Proxy de PDF

Abre en tu navegador:

```
https://notaria-segura-v4-production.up.railway.app/api/proxy-pdf?url=https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf
```

**Resultado esperado:**
- ✅ El PDF se descarga o muestra en el navegador
- ✅ No hay error 401

---

### 5️⃣ Probar desde el Frontend

1. Login en la aplicación
2. Ve a "Escrituras" (rol MATRIZADOR o ADMIN)
3. Haz clic en el botón de "Gestionar páginas" de un documento con PDF
4. Verifica que el PDF se carga en el visor

**Resultado esperado:**
- ✅ El PDF se muestra en el modal
- ✅ No hay errores en la consola del navegador
- ✅ Puedes navegar por las páginas

---

### 6️⃣ Verificar Logs del Endpoint

En Railway, al hacer la petición del paso 4️⃣, deberías ver:

```
🔓 PROXY-PDF: Petición recibida (PÚBLICO - sin auth)
📍 IP: XXX.XXX.XXX.XXX
📥 URL recibida (raw): https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf
🔓 INTENTO 1: Sin autenticación (acceso público)
📊 Respuesta: 200 OK
✅ PDF obtenido exitosamente
```

✅ **Si ves estos logs:** Todo funciona correctamente.  
❌ **Si NO ves logs:** El endpoint no se está ejecutando.

---

## ⚡ Prueba Automática (Opcional)

Si tienes Node.js instalado localmente:

```bash
API_URL=https://notaria-segura-v4-production.up.railway.app node backend/scripts/test-proxy-pdf-endpoint.js
```

Esto ejecutará 5 pruebas automáticas:
1. ✅ Health check
2. ✅ Proxy con PDF válido
3. ✅ Validación de dominio
4. ✅ Validación de extensión
5. ✅ Validación de URL faltante

---

## 🎯 Resultado Esperado

Si todo funciona, deberías ver:

```
📊 RESUMEN DE PRUEBAS
==================================================
✅ Test 1: Health Check
✅ Test 2: Proxy PDF válido
✅ Test 3: Validación de dominio
✅ Test 4: Validación de extensión
✅ Test 5: URL faltante

📊 Total: 5/5 pruebas pasadas
✅ TODAS LAS PRUEBAS PASARON
==================================================
```

---

## 🚨 Si Algo Falla

### ❌ Problema: Health check retorna 404
**Causa:** Las rutas no se registraron correctamente.  
**Solución:** Revisar que los cambios se aplicaron correctamente en `server.js` y `pdf-proxy-routes.js`.

### ❌ Problema: Health check retorna 401
**Causa:** Hay middleware de autenticación bloqueando.  
**Solución:** Verificar el orden de registro en `server.js`. El `pdfProxyRoutes` debe estar ANTES de cualquier middleware de auth global.

### ❌ Problema: No aparecen logs del endpoint
**Causa:** El handler no se está ejecutando.  
**Solución:** Usar la solución de emergencia (endpoint directo en `server.js`).

---

## 📱 Contacto

Si algo no funciona después de seguir estos pasos:

1. **Revisa los logs de Railway** para ver mensajes de error
2. **Verifica que los cambios se aplicaron** correctamente
3. **Consulta** `RESUMEN_FIX_PROXY_PDF_COMPLETO.md` para más detalles
4. **Usa la solución de emergencia** si es necesario

---

**Tiempo estimado:** 5-10 minutos  
**Dificultad:** Fácil ⭐  
**Resultado:** Endpoint proxy PDF funcionando 100%

---

*Fix aplicado con éxito. Happy coding! 🚀*

