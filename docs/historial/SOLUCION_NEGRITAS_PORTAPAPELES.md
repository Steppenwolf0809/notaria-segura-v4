# Problema: Copiado de Texto sin Negritas

## Descripción del Problema
Al copiar el texto de comparecencia generado, las negritas (fecha, notaria, nombres) no se preservan al pegar en Word u otras aplicaciones.

---

## Soluciones Intentadas

### 1. Cambio de etiqueta HTML
**Archivo**: `comparecencia-generator-service.js`
**Cambio**: Función `negrita()` de `<b style="font-weight:bold">` a `<strong>`
**Resultado**: ❌ No solucionó el problema

### 2. Clipboard API con ClipboardItem
**Archivo**: `TextosNotarialesPanel.jsx`
**Método**: 
```javascript
new ClipboardItem({
    "text/html": blobHtml,
    "text/plain": blobText,
})
await navigator.clipboard.write(data);
```
**Resultado**: ❌ No funciona en todos los navegadores/contextos

### 3. Fallback con execCommand
**Archivo**: `TextosNotarialesPanel.jsx`
**Método**: Crear div temporal, seleccionar contenido, `document.execCommand('copy')`
**Resultado**: ❌ No preservó el formato

### 4. HTML completo con DOCTYPE
**Método**: Envolver el HTML en estructura completa con `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>` y estilos CSS inline
**Resultado**: ❌ No solucionó el problema

---

## Posibles Causas Pendientes de Investigar

1. **Navegador**: El navegador puede estar limitando el acceso al portapapeles HTML
2. **Contexto de seguridad**: HTTPS requerido para algunas APIs de clipboard
3. **Permisos**: El usuario puede necesitar aceptar permisos de clipboard
4. **Word online vs Desktop**: Diferente comportamiento entre versiones
5. **Configuración de Windows**: El portapapeles de Windows puede tener limitaciones

---

## Próximos Pasos Sugeridos

1. **Probar en diferentes navegadores** (Chrome, Edge, Firefox)
2. **Verificar HTTPS** - Clipboard API requiere contexto seguro
3. **Usar librería especializada** como `clipboard.js` o similar
4. **Implementar botón "Seleccionar Todo"** para que el usuario copie manualmente
5. **Generar archivo .docx** directamente con formato usando librería como `docx`

---

## Archivos Modificados
- `backend/src/services/comparecencia-generator-service.js` - Función negrita()
- `frontend/src/components/TextosNotarialesPanel.jsx` - Estilos y función de copiado
- `backend/src/controllers/formulario-uafe-controller.js` - Limpieza de tags HTML
