# 📊 Encuesta de Satisfacción - Página Pública

Este directorio contiene la página pública de encuestas de satisfacción para subir al cPanel de la notaría.

## 📍 URL de Despliegue

```
https://notaria18quito.com.ec/encuesta-satisfaccion.html?ref=TRAMITE_ID
```

## 🚀 Instrucciones de Despliegue

### 1. Subir archivo a cPanel

1. Acceder al Administrador de Archivos de cPanel
2. Navegar a `public_html/` 
3. Subir `encuesta-satisfaccion.html`
4. Verificar que sea accesible: https://notaria18quito.com.ec/encuesta-satisfaccion.html

### 2. Configurar URL del API (si es necesario)

Por defecto apunta a producción:
```javascript
const API_URL = 'https://notaria-segura-v4-production.up.railway.app';
```

Para staging:
```javascript
const API_URL = 'https://notaria-segura-v4-staging.up.railway.app';
```

## 📱 Características

- ✅ **Mobile First**: Diseño optimizado para móviles
- ✅ **5 Caritas Emoji**: Selección visual de calificación
- ✅ **Preguntas Sí/No**: Información clara y trato cordial
- ✅ **Sugerencias**: Campo opcional de texto
- ✅ **Estados visuales**: Carga, éxito, error
- ✅ **Sin dependencias**: HTML/CSS/JS puro

## 🔗 Uso con parámetro ref

Para vincular la encuesta a un trámite específico:

```
https://notaria18quito.com.ec/encuesta-satisfaccion.html?ref=PROT-2024-001234
```

El parámetro `ref` se guarda automáticamente como `tramiteId` en la base de datos.

## 🔒 CORS

El backend ya tiene configurado CORS para:
- `https://notaria18quito.com.ec`
- `https://www.notaria18quito.com.ec`

---
**Última actualización:** Enero 2026
