# ✅ CONFIGURACIÓN DOMINIO PERSONALIZADO QR - COMPLETADA

## 📋 RESUMEN DE CAMBIOS APLICADOS

### ✅ Cambios en Código

#### 1. **backend/src/services/qr-generator-service.js** ✅
**Función modificada:** `generateVerificationURL()`

**Cambio aplicado:**
```javascript
// ANTES: Todos los QR apuntaban a Railway
return `${baseURL}/verify/${token}`;

// DESPUÉS: En producción apuntan al dominio oficial
if (env === 'production') {
  const publicURL = process.env.PUBLIC_URL || 'https://www.notaria18quito.com.ec';
  return `${publicURL}/verificar/${token}`;
}
```

**Resultado:**
- ✅ En **producción**: QR apunta a `https://www.notaria18quito.com.ec/verificar/TOKEN`
- ✅ En **desarrollo**: QR apunta a `http://localhost:5173/verify/TOKEN` (sin cambios)

#### 2. **backend/server.js** ✅
**Sección modificada:** Configuración CORS (líneas 117-126)

**Cambio aplicado:**
```javascript
// Se agregaron estos dominios a la lista de orígenes permitidos:
const notariaOrigins = [
  'https://www.notaria18quito.com.ec',
  'https://notaria18quito.com.ec'
];
```

**Resultado:**
- ✅ API de Railway acepta peticiones desde `notaria18quito.com.ec`
- ✅ Funciona con y sin `www`
- ✅ No afecta configuración existente de Railway

---

## 🚀 PRÓXIMOS PASOS - DEPLOYMENT

### Paso 1: Commit y Push al Repositorio ✅

```bash
# Hacer commit de los cambios
git add backend/src/services/qr-generator-service.js backend/server.js
git commit -m "feat: configurar dominio personalizado notaria18quito.com.ec para sistema QR"

# Hacer push a la rama actual
git push origin fix/pdf-parse-startup-healthz
```

### Paso 2: Merge a Main (si estás listo)

```bash
# Cambiar a main
git checkout main

# Hacer merge
git merge fix/pdf-parse-startup-healthz

# Push a main (esto dispara el deploy automático en Railway)
git push origin main
```

### Paso 3: Configurar Variables de Entorno en Railway 🔴 CRÍTICO

**Ir a:** [Railway Dashboard](https://railway.app) → Tu Proyecto → Variables

**Agregar estas 3 variables:**

```env
PUBLIC_URL=https://www.notaria18quito.com.ec
FRONTEND_URL=https://www.notaria18quito.com.ec
ALLOWED_ORIGINS=https://www.notaria18quito.com.ec,https://notaria18quito.com.ec
```

**Importante:**
- ✅ Usa exactamente estos valores
- ✅ Railway hará redeploy automáticamente al guardar
- ✅ Espera 2-3 minutos para que se complete

### Paso 4: Validar Deployment

Una vez completado el redeploy de Railway:

**1. Probar generación de QR:**
```bash
# Probar endpoint de salud
curl https://notaria-segura-v4-production.up.railway.app/api/health

# Resultado esperado:
{
  "message": "API Notaría Segura v4 funcionando ✅",
  "timestamp": "...",
  "environment": "production"
}
```

**2. Generar un QR de prueba:**
- Login como matrizador en Railway
- Subir un PDF de escritura
- Verificar que la URL del QR sea: `https://www.notaria18quito.com.ec/verificar/XXXXXXXX`

**3. Probar endpoint de verificación directo:**
```bash
# Obtener un token existente y probar
curl https://notaria-segura-v4-production.up.railway.app/api/verify/TOKEN_EXISTENTE

# Debe retornar JSON con datos de la escritura
```

---

## 🌐 CONFIGURACIÓN EN cPANEL (Fuera de Cursor)

### Estructura de Archivos en cPanel

Crear esta estructura en `public_html/`:

```
public_html/
  ├── verificar/
  │   └── index.php
  └── [otros archivos existentes]
```

### Contenido de `index.php`

```php
<?php
// Capturar el token desde la URL
$pathParts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$token = end($pathParts);

// Validar formato del token (8 caracteres alfanuméricos)
if (!preg_match('/^[A-Za-z0-9]{8}$/', $token)) {
    $token = '';
}

// API de Railway donde está alojado el backend
$apiUrl = 'https://notaria-segura-v4-production.up.railway.app/api/verify/' . $token;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Escritura - Notaría 18 Quito</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1A5799 0%, #2E7BBF 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #1A5799;
        }
        
        .logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 20px;
            background: #1A5799;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 40px;
            font-weight: bold;
        }
        
        h1 {
            color: #1A5799;
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1A5799;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .info-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .info-row {
            display: flex;
            padding: 15px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            font-weight: 600;
            color: #1A5799;
            min-width: 180px;
            display: flex;
            align-items: center;
        }
        
        .info-label::before {
            content: '▪';
            margin-right: 10px;
            font-size: 20px;
        }
        
        .info-value {
            color: #333;
            flex: 1;
        }
        
        .success-badge {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .error {
            background: #fff3cd;
            border: 2px solid #ffc107;
            color: #856404;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .error-title {
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        
        @media (max-width: 600px) {
            .container {
                padding: 20px;
            }
            
            h1 {
                font-size: 22px;
            }
            
            .info-row {
                flex-direction: column;
            }
            
            .info-label {
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">N18</div>
            <h1>Verificación de Escritura Pública</h1>
            <p class="subtitle">Notaría Décimo Octava del Cantón Quito</p>
        </div>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Verificando escritura...</p>
        </div>
        
        <div id="content" style="display: none;"></div>
        
        <div class="footer">
            <p><strong>Notaría 18 Quito</strong></p>
            <p>Sistema de Verificación de Escrituras Públicas</p>
            <p>© 2025 - Todos los derechos reservados</p>
        </div>
    </div>

    <script>
        const token = '<?php echo htmlspecialchars($token); ?>';
        const apiUrl = '<?php echo htmlspecialchars($apiUrl); ?>';
        
        async function verificarEscritura() {
            try {
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                
                if (data.success && data.data) {
                    mostrarEscritura(data.data);
                } else {
                    mostrarError(data.message || 'No se pudo verificar la escritura');
                }
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                mostrarError('Error de conexión con el sistema de verificación');
            }
        }
        
        function mostrarEscritura(datos) {
            const html = `
                <div class="success-badge">✓ Escritura Verificada</div>
                
                <div class="info-section">
                    <div class="info-row">
                        <div class="info-label">Número de Escritura</div>
                        <div class="info-value"><strong>${datos.numeroEscritura || 'N/A'}</strong></div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Acto Notarial</div>
                        <div class="info-value">${datos.acto || 'No especificado'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Fecha de Otorgamiento</div>
                        <div class="info-value">${datos.fecha_otorgamiento || 'No especificada'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Notario</div>
                        <div class="info-value">${datos.notario || 'No especificado'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Notaría</div>
                        <div class="info-value">${datos.notaria || 'No especificada'}</div>
                    </div>
                    ${datos.ubicacion ? `
                    <div class="info-row">
                        <div class="info-label">Ubicación</div>
                        <div class="info-value">${datos.ubicacion}</div>
                    </div>
                    ` : ''}
                    ${datos.cuantia ? `
                    <div class="info-row">
                        <div class="info-label">Cuantía</div>
                        <div class="info-value">${datos.cuantia}</div>
                    </div>
                    ` : ''}
                    ${datos.otorgantes ? `
                    <div class="info-row">
                        <div class="info-label">Otorgantes</div>
                        <div class="info-value">${datos.otorgantes}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; color: #1976d2; font-size: 14px;">
                        <strong>Token de Verificación:</strong> ${datos.token}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
                        Verificado el: ${new Date(datos.verificadoEn).toLocaleString('es-EC')}
                    </p>
                </div>
            `;
            
            document.getElementById('content').innerHTML = html;
        }
        
        function mostrarError(mensaje) {
            const html = `
                <div class="error">
                    <div class="error-title">⚠️ No se pudo verificar</div>
                    <p>${mensaje}</p>
                    <p style="margin-top: 15px; font-size: 14px;">
                        Si cree que esto es un error, por favor contacte con la Notaría 18 Quito.
                    </p>
                </div>
            `;
            
            document.getElementById('content').innerHTML = html;
        }
        
        // Ejecutar verificación al cargar la página
        if (token) {
            verificarEscritura();
        } else {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
            mostrarError('Token de verificación no válido. Por favor escanee el código QR nuevamente.');
        }
    </script>
</body>
</html>
```

### Configuración de .htaccess (opcional)

Si necesitas reescribir URLs, crea `.htaccess` en `public_html/verificar/`:

```apache
RewriteEngine On
RewriteBase /verificar/

# Reescribir /verificar/TOKEN a /verificar/index.php
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([A-Za-z0-9]{8})$ index.php [L]
```

---

## 🧪 TESTING COMPLETO

### 1. Test Local (antes de deploy)

```bash
# Verificar sintaxis del código modificado
node backend/src/services/qr-generator-service.js

# Iniciar servidor local
npm run dev

# Probar en navegador
# Login → Upload PDF → Verificar URL del QR generado
```

### 2. Test en Staging (Railway)

```bash
# Después del deploy automático:
# 1. Login como matrizador
# 2. Subir PDF de prueba
# 3. Capturar URL del QR
# 4. Verificar que sea: https://www.notaria18quito.com.ec/verificar/XXXXXXXX
```

### 3. Test End-to-End (Producción)

**Flujo completo:**
1. ✅ Matrizador sube PDF en Railway
2. ✅ Sistema genera QR con URL: `https://www.notaria18quito.com.ec/verificar/ABC12345`
3. ✅ Usuario escanea QR con celular
4. ✅ Abre `notaria18quito.com.ec/verificar/ABC12345` (cPanel)
5. ✅ JavaScript hace fetch a: `railway.app/api/verify/ABC12345`
6. ✅ Railway retorna datos JSON
7. ✅ Página muestra información de la escritura
8. ✅ Usuario ve todo en dominio oficial

---

## 📊 DIAGRAMA DE FLUJO

```
┌─────────────────┐
│   MATRIZADOR    │
│   (Railway)     │
│                 │
│ Sube PDF        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  QR GENERATOR SERVICE   │
│  (qr-generator-service) │
│                         │
│ Genera URL:             │
│ notaria18quito.com.ec   │
│ /verificar/ABC12345     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│    CÓDIGO QR            │
│  (Impreso/Pantalla)     │
└────────┬────────────────┘
         │
         ▼ (usuario escanea)
         │
┌─────────────────────────┐
│  DOMINIO OFICIAL        │
│  notaria18quito.com.ec  │
│  /verificar/ABC12345    │
│                         │
│  (cPanel - index.php)   │
└────────┬────────────────┘
         │
         │ fetch()
         ▼
┌─────────────────────────┐
│    API RAILWAY          │
│  /api/verify/ABC12345   │
│                         │
│  (CORS configurado)     │
└────────┬────────────────┘
         │
         │ JSON response
         ▼
┌─────────────────────────┐
│   USUARIO VE DATOS      │
│   en notaria18quito.com │
└─────────────────────────┘
```

---

## 🔍 TROUBLESHOOTING

### Problema: QR sigue apuntando a Railway

**Solución:**
```bash
# Verificar variables de entorno en Railway
# Asegurarse de que PUBLIC_URL está configurado
# Hacer redeploy manualmente si es necesario
```

### Problema: Error CORS al escanear QR

**Síntomas:** 
- Console del navegador muestra error CORS
- Fetch desde cPanel falla

**Solución:**
1. Verificar que el dominio esté en la lista de orígenes permitidos
2. Verificar que Railway haya redeployado con los cambios nuevos
3. Probar endpoint directo: `curl https://railway.app/api/verify/TOKEN`

### Problema: cPanel no muestra los datos

**Diagnóstico:**
```javascript
// Agregar esto al código PHP temporalmente para debug
console.log('API URL:', apiUrl);
console.log('Token:', token);
```

**Soluciones:**
1. Verificar que el token sea válido (8 caracteres alfanuméricos)
2. Probar el endpoint directamente en Postman/curl
3. Revisar console del navegador para errores JavaScript

---

## ✅ CHECKLIST FINAL

- [x] Código modificado en `qr-generator-service.js`
- [x] CORS configurado en `server.js`
- [ ] Commit y push al repositorio
- [ ] Variables de entorno configuradas en Railway
- [ ] Deploy completado en Railway
- [ ] QR de prueba generado y validado
- [ ] Archivo PHP subido a cPanel
- [ ] Test end-to-end exitoso

---

## 📞 CONTACTO Y SOPORTE

**Si encuentras algún problema:**

1. **Verificar logs de Railway:** Dashboard → Logs
2. **Probar endpoint directo:** `curl https://railway.app/api/verify/TOKEN`
3. **Revisar console del navegador:** F12 → Console

**Documentación relacionada:**
- `docs/MODULO_QR_ESCRITURAS.md` - Documentación completa del módulo QR
- `backend/API_DOCUMENTATION.md` - Documentación de la API
- `CLAUDE.md` - Contexto general del proyecto

---

*Configuración aplicada el: 2 de Octubre de 2025*
*Versión del sistema: v4.0*
*Deploy target: Railway (Production)*


