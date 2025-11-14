# 📋 Formulario UAFE - Página Pública

Este directorio contiene la página pública del formulario UAFE que debe ser desplegada en el servidor web de la notaría.

## 📍 URL de Despliegue

La página debe estar accesible en:
```
https://notaria18quito.com.ec/formulario-uafe/{token}
```

Donde `{token}` es el token único generado por el matrizador para cada asignación.

## 🚀 Instrucciones de Despliegue

### Opción 1: Despliegue Directo (Recomendado)

1. **Subir el archivo al servidor web**
   ```bash
   # Copiar el archivo al directorio del servidor
   # El servidor debe estar configurado para capturar rutas con parámetros
   ```

2. **Configurar el servidor web** (Apache o Nginx):

   **Para Apache (.htaccess):**
   ```apache
   RewriteEngine On
   RewriteRule ^formulario-uafe/([a-z0-9]+)$ /formulario-uafe.html [L]
   ```

   **Para Nginx:**
   ```nginx
   location ~ ^/formulario-uafe/([a-z0-9]+)$ {
       rewrite ^/formulario-uafe/([a-z0-9]+)$ /formulario-uafe.html last;
   }
   ```

3. **Verificar acceso:**
   - Abrir: `https://notaria18quito.com.ec/formulario-uafe/test123`
   - Debe cargar la página del formulario

### Opción 2: Estructura de Carpetas

Si el servidor no soporta rewrites, crear esta estructura:

```
/var/www/notaria18quito.com.ec/
└── formulario-uafe/
    └── index.html  (copiar contenido de formulario-uafe.html)
```

El servidor servirá automáticamente `index.html` para cualquier ruta como:
```
https://notaria18quito.com.ec/formulario-uafe/abc123
```

## 🔧 Configuración

### API URL

El archivo ya está configurado para apuntar al backend en Railway:
```javascript
const API_URL = 'https://notaria-segura-v4-staging.up.railway.app/api';
```

Si necesitas cambiar la URL del API, edita esta línea en el archivo HTML.

### CORS

El backend ya está configurado para permitir requests desde:
- `https://notaria18quito.com.ec`
- `https://www.notaria18quito.com.ec`

## ✅ Características Implementadas

- ✅ **Login con PIN**: Sistema de autenticación personal
- ✅ **6 Secciones del Formulario**:
  1. Información del Trámite (con forma de pago)
  2. Persona que Realiza el Acto
  3. Información Laboral
  4. Datos del Cónyuge (condicional)
  5. Beneficiario Final/Apoderado (opcional)
  6. Personas Expuestas Políticamente (PEP)
- ✅ **Navegación con Progreso**: Barra de progreso visual
- ✅ **Validaciones**: Campos obligatorios y formatos
- ✅ **Responsive**: Funciona en móviles y desktop
- ✅ **Confirmación**: Pantalla de éxito al completar

## 🧪 Testing

### 1. Crear Asignación de Prueba

Desde el dashboard del matrizador:
1. Login en el sistema Notaría Segura
2. Ir a "Formularios UAFE"
3. Crear nueva asignación con una cédula de prueba
4. Copiar el link generado

### 2. Probar el Formulario

1. Abrir el link copiado
2. Iniciar sesión con cédula y PIN
3. Completar las 6 secciones
4. Enviar formulario
5. Verificar pantalla de confirmación

### 3. Verificar en Dashboard

1. Volver al dashboard del matrizador
2. Verificar que el estado cambió a "COMPLETADO"
3. Ver respuesta completa

## 📱 Compatibilidad

- ✅ Chrome/Edge (últimas 2 versiones)
- ✅ Firefox (últimas 2 versiones)
- ✅ Safari (iOS/macOS)
- ✅ Móviles (Android/iOS)

## 🔒 Seguridad

- ✅ Autenticación con PIN obligatoria
- ✅ Sesión temporal con expiración
- ✅ Validación de pertenencia del formulario
- ✅ HTTPS obligatorio (configurado en CORS)
- ✅ Sin almacenamiento local de datos sensibles

## 📞 Soporte

Para problemas o dudas:
- Revisar logs en Railway: https://railway.app
- Verificar que el backend esté activo
- Confirmar configuración de CORS

## 🔄 Actualizaciones

Cada vez que se actualice el formulario:
1. Editar `formulario-uafe.html`
2. Commit y push a Git
3. Desplegar nueva versión en el servidor web
4. Limpiar caché del navegador si es necesario

---

**Última actualización:** Enero 2025
**Versión:** 1.0.0
