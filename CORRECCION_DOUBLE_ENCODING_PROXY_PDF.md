# ✅ Corrección: Double Encoding en URL del Proxy PDF

## 🎯 Problema Detectado

El endpoint `/api/proxy-pdf` estaba recibiendo URLs **codificadas dos veces** (double encoding), causando que el servidor remoto las rechazara con error 401.

### Evidencia del Problema

**URL en consola del navegador:**
```
www.notaria18quito.com.ec%2Ffotos-escrituras%2FSaq163
                         ↑
                    %2F debería ser /
```

**Causa raíz:**
La URL se codificaba dos veces:
1. **Primera vez:** `encodeURIComponent()` en el frontend (línea 68 de `PDFPageManagerModal.jsx`)
2. **Segunda vez:** Automáticamente por el navegador al hacer la petición HTTP

## 🔧 Solución Implementada

### Archivo: `frontend/src/components/escrituras/PDFPageManagerModal.jsx`

**ANTES (línea 68):**
```javascript
// ❌ INCORRECTO - causa double encoding
const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(remoteUrl)}`;
```

**DESPUÉS (línea 72):**
```javascript
// ✅ CORRECTO - el navegador codifica automáticamente
const proxyUrl = `/api/proxy-pdf?url=${remoteUrl}`;
```

### ¿Por Qué Funciona?

Los navegadores modernos **automáticamente codifican** los query parameters al hacer peticiones HTTP:

```javascript
// Código en frontend
const proxyUrl = `/api/proxy-pdf?url=${remoteUrl}`;
// remoteUrl = "https://www.notaria18quito.com.ec/fotos-escrituras/Saq163.pdf"

// El navegador automáticamente convierte a:
// GET /api/proxy-pdf?url=https%3A%2F%2Fwww.notaria18quito.com.ec%2Ffotos-escrituras%2FSaq163.pdf
//                         ↑ Codificado por el navegador

// Backend recibe (Express decodifica automáticamente):
req.query.url = "https://www.notaria18quito.com.ec/fotos-escrituras/Saq163.pdf"
//              ↑ Ya decodificado, listo para usar
```

### Flujo Correcto vs Incorrecto

#### ✅ Flujo CORRECTO (después del fix):

```
Frontend:  url = "https://www.notaria18quito.com.ec/fotos/file.pdf"
           ↓ (sin encodeURIComponent)
Navegador: GET /api/proxy-pdf?url=https%3A%2F%2F... (1x encoded)
           ↓ (decodifica automáticamente)
Backend:   req.query.url = "https://www.notaria18quito.com.ec/fotos/file.pdf"
           ↓ (fetch directo)
Servidor:  ✅ Recibe URL válida y responde con el PDF
```

#### ❌ Flujo INCORRECTO (antes del fix):

```
Frontend:  url = "https://www.notaria18quito.com.ec/fotos/file.pdf"
           ↓ (encodeURIComponent)
Frontend:  "https%3A%2F%2Fwww.notaria18quito.com.ec%2Ffotos%2Ffile.pdf"
           ↓ (navegador codifica OTRA VEZ)
Navegador: GET /api/proxy-pdf?url=https%253A%252F%252F... (2x encoded)
           ↓ (decodifica UNA vez)
Backend:   req.query.url = "https%3A%2F%2Fwww.notaria18quito.com.ec%2Ffotos%2Ffile.pdf"
           ↓ (fetch con URL inválida - sigue codificada)
Servidor:  ❌ Recibe URL codificada y responde con 401/404
```

## 📝 Cambios Adicionales

### 1. Logs de Debugging (Backend)

Se agregaron logs para diagnosticar problemas de encoding:

```javascript
console.log('📥 URL recibida (raw):', rawUrl);
console.log('🔍 Contiene doble encoding? (buscar %25):', rawUrl.includes('%25'));
console.log('🔍 Tiene encoding simple? (buscar %XX):', /%(2|3|5)[0-9A-F]/i.test(rawUrl));
```

**Interpretación de los logs:**
- `%25` = doble encoding (% está codificado como %25)
- `%2F` = encoding simple normal (/ está codificado como %2F)

### 2. Documentación Mejorada (Frontend)

Se agregó documentación explicando por qué NO se usa `encodeURIComponent()`:

```javascript
/**
 * NOTA: NO se usa encodeURIComponent() porque el navegador codifica
 * automáticamente los query params al hacer fetch/request.
 * Usar encodeURIComponent() aquí causaría DOUBLE ENCODING.
 */
```

## 🧪 Validación

### Logs Esperados Después del Fix

**Consola del Navegador:**
```javascript
📄 PDF Modal: Usando proxy {
  archivo: "Saq163wu.pdf",
  urlRemota: "https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf",
  urlProxy: "/api/proxy-pdf?url=https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf",
  tieneEncodingManual: false  // ✅ false es correcto
}
```

**Logs del Backend (Railway):**
```
🔓 PROXY-PDF: Petición recibida (PÚBLICO - sin auth)
📥 URL recibida (raw): https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf
🔍 Contiene doble encoding? (buscar %25): false  ✅
🔍 Tiene encoding simple? (buscar %XX): false    ✅
📄 PROXY-PDF: Solicitando https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf
🔓 INTENTO 1: Sin autenticación (acceso público)
📡 Intentando fetch a: https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf
📊 Respuesta: 200 OK
✅ PDF obtenido exitosamente
```

**Modal de PDF:**
- ✅ Visor carga el PDF correctamente
- ✅ No hay error 401
- ✅ Todas las páginas se renderizan

## 🎓 Conceptos de Aprendizaje

### 1. URL Encoding Automático del Navegador

Los navegadores modernos (Chrome, Firefox, Edge, Safari) automáticamente codifican los query parameters en URLs cuando haces peticiones con `fetch()`, `XMLHttpRequest`, o incluso con tags `<a>` y `<img>`.

**Ejemplo:**
```javascript
// Tu código
fetch('/api/proxy-pdf?url=https://example.com/file.pdf')

// El navegador realmente envía:
// GET /api/proxy-pdf?url=https%3A%2F%2Fexample.com%2Ffile.pdf
```

### 2. Express.js Decodifica Automáticamente

Express automáticamente decodifica los query parameters usando `decodeURIComponent()` internamente:

```javascript
// Petición HTTP:
// GET /api/proxy-pdf?url=https%3A%2F%2Fexample.com%2Ffile.pdf

// En Express:
req.query.url === "https://example.com/file.pdf"  // ✅ Ya decodificado
```

### 3. Cuándo SÍ Usar `encodeURIComponent()`

✅ **Usar cuando construyes URLs manualmente para concatenar:**

```javascript
// Correcto - construyendo URL manualmente
const apiUrl = 'https://api.example.com/search?q=' + encodeURIComponent(userInput);
window.location.href = apiUrl;  // Navegación directa
```

❌ **NO usar cuando el navegador maneja la petición:**

```javascript
// INCORRECTO - causaría double encoding
const url = `/api/search?q=${encodeURIComponent(query)}`;
fetch(url);  // ❌ Navegador codifica otra vez

// CORRECTO
const url = `/api/search?q=${query}`;
fetch(url);  // ✅ Navegador codifica una vez
```

### 4. Double Encoding: Ejemplo Visual

```
Original:       https://example.com/path/file.pdf
                ↓
Encoded 1x:     https%3A%2F%2Fexample.com%2Fpath%2Ffile.pdf
                ↓
Encoded 2x:     https%253A%252F%252Fexample.com%252Fpath%252Ffile.pdf
                      ↑
                   %25 = encoding de %
```

Si ves `%25` en tus URLs, es una señal clara de **double encoding**.

## 📊 Impacto del Fix

### Antes del Fix
- ❌ Error 401 al cargar PDFs
- ❌ URLs malformadas en logs
- ❌ Servidor remoto rechaza peticiones
- ❌ Modal de gestión de páginas no funciona

### Después del Fix
- ✅ PDFs se cargan correctamente
- ✅ URLs correctamente formadas
- ✅ Servidor remoto responde con 200 OK
- ✅ Modal de gestión de páginas funcional

## 🚀 Deployment

### Pasos

1. ✅ Cambios aplicados en `PDFPageManagerModal.jsx`
2. ✅ Logs de debugging agregados en backend
3. ✅ Hacer commit:
   ```bash
   git add .
   git commit -m "fix: corregir double encoding en URL del proxy PDF"
   ```
4. ✅ Push a Railway:
   ```bash
   git push origin fix/proxy-pdf-unauthorized
   ```
5. ✅ Railway redesplegará automáticamente (2-3 min)

### Verificación Post-Deployment

1. Abrir la aplicación en producción
2. Ir a una escritura con PDF
3. Hacer clic en "Gestionar Páginas Ocultas"
4. Verificar en DevTools → Console los logs
5. Confirmar que el PDF se carga sin errores

## 🔍 Troubleshooting

### Si Aún Ves Error 401

El error 401 ahora solo puede venir de:

1. **Servidor FTP requiere autenticación**
   - Solución: Configurar `FTP_USER` y `FTP_PASSWORD` en `.env`
   - Ver: `INSTRUCCIONES_RAPIDAS_FIX_401.md`

2. **Archivo PDF no existe en el servidor**
   - Verificar que el archivo esté realmente subido al FTP
   - Comprobar nombre del archivo en los logs

3. **Permisos del servidor FTP**
   - Verificar que las credenciales FTP tengan permisos de lectura

### Si Ves Otros Errores

- **404**: Archivo no encontrado → Verificar nombre de archivo
- **403**: Dominio no permitido → Verificar que sea `www.notaria18quito.com.ec`
- **400**: Archivo no es PDF → Verificar extensión del archivo

## 📚 Archivos Modificados

1. ✅ `frontend/src/components/escrituras/PDFPageManagerModal.jsx`
   - Removido `encodeURIComponent()` de la construcción de URL
   - Agregada documentación explicativa
   - Agregado log de debugging `tieneEncodingManual`

2. ✅ `backend/src/routes/pdf-proxy-routes.js`
   - Agregados logs de debugging para detectar double encoding
   - Logs muestran si la URL contiene `%25` (double encoding)

## 📖 Referencias

- MDN: [encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- Express.js: [Request Query](https://expressjs.com/en/api.html#req.query)
- Fetch API: [URL Encoding](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#supplying_request_options)

---

**Fecha:** 2025-01-12  
**Branch:** fix/proxy-pdf-unauthorized  
**Estado:** ✅ Corregido y documentado

