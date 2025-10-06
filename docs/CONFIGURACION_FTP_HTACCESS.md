# Configuración de .htaccess en cPanel para PDFs y Fotos

## 📋 Descripción

Este documento explica cómo configurar correctamente el archivo `.htaccess` en la carpeta `fotos-escrituras` del dominio de la notaría para permitir el acceso público a los PDFs y fotos subidos desde el sistema.

---

## 🎯 Objetivo

El archivo `.htaccess` configura:
- ✅ Headers CORS para permitir acceso desde Railway
- ✅ Permisos de lectura pública
- ✅ Tipos MIME correctos para PDFs e imágenes
- ✅ Caché para mejorar rendimiento
- ✅ Seguridad básica

**NOTA IMPORTANTE:** Si la carpeta `/fotos-escrituras/` tiene protección HTTP Basic (autenticación con usuario y contraseña), el sistema backend utilizará automáticamente las credenciales FTP (`FTP_USER` y `FTP_PASSWORD`) para autenticarse. Esto es típico en configuraciones de cPanel.

---

## 📁 Ubicación del Archivo

El archivo `.htaccess` debe estar en:
```
/public_html/fotos-escrituras/.htaccess
```

---

## 🚀 Pasos para Subir el .htaccess al cPanel

### Opción 1: Subir manualmente vía cPanel File Manager (RECOMENDADO)

1. **Acceder a cPanel**
   - Ir a: https://cpanel.tudominio.com
   - Iniciar sesión con tus credenciales

2. **Abrir File Manager**
   - En cPanel, buscar "Administrador de archivos" o "File Manager"
   - Click para abrir

3. **Navegar a la carpeta fotos-escrituras**
   ```
   public_html → fotos-escrituras
   ```

4. **Habilitar visualización de archivos ocultos**
   - En la esquina superior derecha, click en "Settings" (Configuración)
   - Marcar la opción "Show Hidden Files (dotfiles)"
   - Click en "Save"

5. **Subir el archivo .htaccess**
   - Click en el botón "Upload" en la barra superior
   - Arrastrar o seleccionar el archivo `.htaccess` desde tu computadora
   - Esperar a que se complete la subida
   - Click en "Go Back to..." para volver al File Manager

6. **Verificar permisos del archivo**
   - Seleccionar el archivo `.htaccess`
   - Click derecho → "Permissions" o "Change Permissions"
   - Establecer permisos: **644** (owner: read+write, group: read, world: read)
   - Click en "Change Permissions"

### Opción 2: Subir vía FTP (Avanzado)

Si prefieres usar un cliente FTP como FileZilla:

1. **Conectar al servidor FTP**
   - Host: ftp.notaria18quito.com.ec
   - Usuario: [tu usuario FTP]
   - Contraseña: [tu contraseña FTP]
   - Puerto: 21

2. **Navegar a la carpeta**
   ```
   /public_html/fotos-escrituras/
   ```

3. **Subir el archivo .htaccess**
   - Arrastrar el archivo desde tu computadora a la carpeta remota
   - Asegurarse de que se suba en modo "ASCII" o "AUTO"

4. **Establecer permisos**
   - Click derecho sobre `.htaccess` → "File Permissions"
   - Establecer: **644**
   - Aplicar cambios

---

## 🔍 Verificación de Configuración

### 1. Verificar que el .htaccess se subió correctamente

Acceder a:
```
https://notaria18quito.com.ec/fotos-escrituras/.htaccess
```

**Resultado esperado:** Error 403 Forbidden (esto es correcto, significa que el .htaccess está protegiendo el archivo)

### 2. Verificar que los PDFs son accesibles

Si ya hay un PDF subido (ejemplo: `huHzlD70.pdf`):
```
https://notaria18quito.com.ec/fotos-escrituras/huHzlD70.pdf
```

**Resultado esperado:** El PDF se descarga o se muestra en el navegador

### 3. Verificar headers CORS (desde consola del navegador)

Abrir consola de desarrollador (F12) y ejecutar:
```javascript
fetch('https://notaria18quito.com.ec/fotos-escrituras/huHzlD70.pdf', { method: 'HEAD' })
  .then(response => {
    console.log('Status:', response.status);
    console.log('CORS:', response.headers.get('Access-Control-Allow-Origin'));
  })
  .catch(error => console.error('Error:', error));
```

**Resultado esperado:** 
- Status: 200
- CORS: *

---

## ⚠️ Solución de Problemas

### Problema 1: Error 500 después de subir .htaccess

**Causa:** Alguna directiva del .htaccess no es compatible con el servidor

**Solución:**
1. Renombrar temporalmente el .htaccess a `.htaccess.bak`
2. Crear un nuevo .htaccess con solo lo esencial:
```apache
# Headers CORS básicos
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
</IfModule>

# Prevenir listado de directorios
Options -Indexes
```
3. Si funciona, agregar las otras directivas una por una

### Problema 2: Los PDFs no se pueden acceder (404)

**Verificar:**
1. ✅ El archivo PDF existe en la carpeta
2. ✅ El nombre del archivo es correcto (case-sensitive)
3. ✅ Los permisos del PDF son 644
4. ✅ Los permisos de la carpeta son 755

**Solución:**
```bash
# Establecer permisos de la carpeta (desde SSH o terminal de cPanel)
chmod 755 /home/usuario/public_html/fotos-escrituras
chmod 644 /home/usuario/public_html/fotos-escrituras/*.pdf
```

### Problema 3: Error de CORS en el navegador

**Síntoma:** 
```
Access to fetch at 'https://notaria18quito.com.ec/...' from origin 'https://notaria-segura...railway.app' has been blocked by CORS policy
```

**Solución:**
1. Verificar que el módulo `mod_headers` esté habilitado en Apache (contactar soporte de hosting)
2. Asegurarse de que las líneas de CORS estén al inicio del .htaccess
3. Limpiar caché del navegador (Ctrl+Shift+Delete)

### Problema 4: Error al primer intento, éxito al segundo

**Causa:** La carpeta no existe y se crea en el primer intento

**Solución automática:** El código ya está configurado para crear la carpeta si no existe. Este error solo debería ocurrir la primera vez.

**Solución manual:**
1. Crear la carpeta `fotos-escrituras` manualmente en cPanel
2. Establecer permisos 755
3. Subir el .htaccess

### Problema 5: Error 401 (Unauthorized) al visualizar PDFs

**Síntoma:**
```
GET /api/proxy-pdf?url=... 401 (Unauthorized)
Error loading PDF: Unexpected server response (401)
```

**Causa:** La carpeta `/fotos-escrituras/` está protegida con autenticación HTTP Basic en el servidor web.

**Solución Automática (ya implementada):**
- ✅ El proxy del backend usa automáticamente las credenciales FTP (`FTP_USER` y `FTP_PASSWORD`) para autenticarse
- ✅ Esto funciona en la mayoría de configuraciones de cPanel donde las credenciales FTP también sirven para HTTP

**Solución Permanente (Recomendado):**
1. **Remover la protección HTTP Basic de la carpeta:**
   - Acceder a cPanel
   - Ir a "Directory Privacy" o "Privacidad de Directorios"
   - Buscar la carpeta `public_html/fotos-escrituras`
   - Desmarcar "Password protect this directory"
   - Guardar cambios

2. **O configurar un .htaccess que permita acceso público:**
   ```apache
   # Permitir acceso público (remover autenticación HTTP Basic)
   Satisfy Any
   
   # Headers CORS
   <IfModule mod_headers.c>
       Header set Access-Control-Allow-Origin "*"
   </IfModule>
   
   # Prevenir listado de directorios
   Options -Indexes
   ```

**Verificación:**
```bash
# Probar acceso sin autenticación
curl -I https://www.notaria18quito.com.ec/fotos-escrituras/archivo.pdf

# Resultado esperado: HTTP/2 200
# Si dice 401, aún tiene protección HTTP Basic
```

---

## 📝 Archivo .htaccess Completo

El archivo `.htaccess` completo está en:
```
backend/fotos-escrituras/.htaccess
```

---

## 🔐 Permisos Recomendados

| Elemento | Permisos | Descripción |
|----------|----------|-------------|
| Carpeta `fotos-escrituras/` | **755** | Lectura y ejecución para todos |
| Archivo `.htaccess` | **644** | Lectura para todos, escritura solo owner |
| PDFs (`*.pdf`) | **644** | Lectura para todos, escritura solo owner |
| Fotos (`*.jpg`, `*.png`) | **644** | Lectura para todos, escritura solo owner |

---

## 🔄 Actualización del Sistema

Después de configurar el .htaccess:

1. **No es necesario reiniciar nada** - Apache lee el .htaccess en cada request
2. **Limpiar caché del navegador** para ver los cambios
3. **Esperar 1-2 minutos** si usas un CDN o proxy

---

## 📞 Contacto Soporte

Si necesitas ayuda:
- **Soporte Hosting:** Contactar a tu proveedor de cPanel
- **Soporte Sistema:** [Desarrollador del sistema]

---

## 🧪 Test de Configuración

Después de configurar, ejecutar estos tests:

1. ✅ Acceder a un PDF directamente: `https://notaria18quito.com.ec/fotos-escrituras/TOKEN.pdf`
2. ✅ Verificar que el QR funciona y muestra el PDF
3. ✅ Verificar que la página de verificación carga el PDF
4. ✅ Subir un nuevo PDF y verificar que funciona al primer intento

---

**Última actualización:** Octubre 2025
**Versión:** 1.0

