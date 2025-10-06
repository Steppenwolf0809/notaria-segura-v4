# Guía de Uso: Sistema de Censura de Páginas PDF

## 📋 Resumen

Sistema completo para gestionar qué páginas de los PDFs de escrituras son visibles al público. Permite ocultar páginas con información sensible (por ejemplo, datos de menores de edad) sin necesidad de re-subir el PDF.

## 🎯 Funcionalidades Implementadas

### Backend

1. **Nuevo Endpoint PUT `/api/escrituras/:id/pdf-hidden-pages`**
   - Actualiza las páginas ocultas sin re-subir el PDF
   - Validación de permisos (ADMIN y MATRIZADOR)
   - Validación de datos (array de números positivos)

2. **Endpoint GET `/api/verify/:token` Mejorado**
   - Ahora devuelve `pdfFileName`, `pdfFileSize`, `pdfHiddenPages` y `pdfPublicUrl`
   - Compatible con verificadores públicos existentes

### Frontend

1. **Componente `PDFPageManagerModal`**
   - Vista previa grande de la página actual
   - Panel lateral con miniaturas de todas las páginas
   - Selección visual de páginas a ocultar
   - Indicadores de páginas ocultas con overlay naranja
   - Zoom in/out del PDF
   - Navegación página por página

2. **Integración en `GeneradorQR`**
   - Nuevo botón "Gestionar páginas ocultas" (ícono de ojo tachado)
   - Solo visible cuando el PDF ya está subido
   - Actualización automática de la lista después de guardar

## 🚀 Cómo Usar

### Para Matrizadores

1. **Subir una escritura con PDF**
   - Ir a "Generador QR de Escrituras"
   - Crear o seleccionar una escritura
   - Subir el PDF completo usando el botón "Subir PDF"

2. **Gestionar páginas ocultas**
   - En la columna "PDF" de la tabla, hacer clic en el ícono naranja de ojo tachado
   - Se abrirá el modal de gestión de páginas
   - Navegar por las páginas usando los controles o haciendo clic en las miniaturas
   - Hacer clic en "Ocultar Esta Página" para cada página que quieras censurar
   - Las páginas ocultas se marcarán con un overlay naranja y el chip "PÁGINA OCULTA"
   - Hacer clic en "Guardar Cambios" cuando termines

3. **Verificar**
   - Las páginas ocultas NO serán visibles en la verificación pública
   - El público verá un mensaje: "Página oculta por privacidad"

### Para el Público

Cuando alguien escanee el código QR y acceda a `/verify/:token`, verá:
- Todas las páginas del PDF excepto las marcadas como ocultas
- Un mensaje informativo en las páginas censuradas

## 🔧 Endpoints API

### Actualizar Páginas Ocultas (Protegido)
```http
PUT /api/escrituras/:id/pdf-hidden-pages
Authorization: Bearer <token>
Content-Type: application/json

{
  "hiddenPages": [2, 3, 5]  // Array de números de página (1-indexed)
}
```

### Obtener Datos de Verificación (Público)
```http
GET /api/verify/:token

Respuesta incluye:
{
  "success": true,
  "data": {
    "numeroEscritura": "...",
    "acto": "...",
    "pdfFileName": "TOKEN.pdf",
    "pdfHiddenPages": [2, 3, 5],
    "pdfPublicUrl": "https://notaria18quito.com.ec/fotos-escrituras/TOKEN.pdf"
  }
}
```

## 🧪 Testing Manual

### Test 1: Subir PDF y Configurar Páginas Ocultas

1. **Login** como matrizador en Railway:
   ```
   https://notaria-segura-v4-production.up.railway.app
   ```

2. **Crear escritura:**
   - Ir a "Generador QR"
   - Clic en "Nueva Escritura"
   - Subir extracto PDF o crear manualmente

3. **Subir PDF completo:**
   - En la tabla, clic en el ícono de "Subir PDF" (nube con flecha)
   - Seleccionar un PDF de prueba
   - Marcar algunas páginas como ocultas en el modal
   - Subir

4. **Verificar en sistema:**
   - Clic en el ícono de ojo naranja (gestionar páginas)
   - Confirmar que las páginas ocultas están marcadas correctamente

### Test 2: Actualizar Páginas Ocultas

1. **Abrir gestor:**
   - En una escritura con PDF subido, clic en ícono naranja

2. **Modificar configuración:**
   - Ocultar página 2 y 3
   - Guardar cambios
   - Confirmar toast de éxito

3. **Reabrir gestor:**
   - Verificar que los cambios se guardaron correctamente

### Test 3: Verificación Pública

1. **Obtener token:**
   - En la tabla de escrituras, copiar el token

2. **Acceder a verificación pública:**
   ```
   https://www.notaria18quito.com.ec/verificar.html?token=TOKEN
   ```

3. **Verificar PDF:**
   - El PDF debe cargar correctamente
   - Las páginas ocultas deben mostrar mensaje de "Página oculta por privacidad"
   - Las demás páginas deben verse normalmente

### Test 4: API Endpoint (Opcional)

```bash
# Obtener datos de verificación
curl https://notaria-segura-v4-production.up.railway.app/api/verify/TOKEN

# Verificar que la respuesta incluye:
# - pdfFileName
# - pdfHiddenPages (array)
# - pdfPublicUrl
```

## 📊 Base de Datos

El campo `pdfHiddenPages` en la tabla `escrituras_qr`:
- Tipo: `String` (JSON serializado)
- Ejemplo: `"[2,3,5]"` (páginas 2, 3 y 5 ocultas)
- `null` significa todas las páginas visibles

## 🔒 Seguridad

- ✅ Solo ADMIN y MATRIZADOR pueden actualizar páginas ocultas
- ✅ El PDF privado (sistema admin) muestra todas las páginas
- ✅ El PDF público respeta las páginas ocultas
- ✅ Las páginas ocultas se validan en el backend

## 🎨 UX/UI

### Indicadores Visuales

- **Ícono naranja** (ojo tachado): Botón para gestionar páginas ocultas
- **Overlay naranja** en preview: Indica que la página está oculta
- **Chip "PÁGINA OCULTA"**: Marcador visual en páginas censuradas
- **Miniaturas**: Panel lateral muestra todas las páginas con indicadores

### Estados

- **Sin cambios**: Botón "Guardar" deshabilitado
- **Con cambios**: Chip rojo "Sin guardar" + botón habilitado
- **Guardando**: Spinner en botón + deshabilitar controles
- **Guardado**: Toast de éxito + cierre automático

## 🐛 Troubleshooting

### El PDF no carga en el gestor
- Verificar que el PDF fue subido correctamente
- Verificar que tienes permisos (MATRIZADOR o ADMIN)
- Verificar conexión FTP en logs del backend

### Las páginas ocultas no se guardan
- Verificar que haces clic en "Guardar Cambios"
- Verificar en logs del backend: `[updatePDFHiddenPages]`
- Verificar que el array de páginas sea válido (números positivos)

### Las páginas no se ocultan en verificación pública
- Verificar que el endpoint `/api/verify/:token` devuelve `pdfHiddenPages`
- Verificar que el verificador público (verificar.html) está actualizado
- Limpiar caché del navegador

## 🎯 Casos de Uso

### 1. Escritura con Menor de Edad
- Subir PDF completo de la escritura
- Ocultar páginas con datos del menor (foto, cédula, etc.)
- El público verá la escritura excepto esas páginas

### 2. Datos Sensibles de Empresa
- Ocultar páginas con información financiera confidencial
- Mostrar solo lo esencial al público

### 3. Revisión Interna
- Matrizadores pueden ver TODAS las páginas
- Sistema admin siempre muestra PDF completo

## ✅ Checklist de Deployment

- [x] Endpoint PUT `/api/escrituras/:id/pdf-hidden-pages` creado
- [x] Endpoint GET `/api/verify/:token` actualizado
- [x] Componente `PDFPageManagerModal` creado
- [x] Integración en `GeneradorQR` completa
- [x] Servicios de API actualizados
- [x] Testing manual en desarrollo
- [ ] Testing en staging (Railway)
- [ ] Testing de verificación pública con dominio real
- [ ] Documentación actualizada
- [ ] Deploy a producción

## 📝 Notas de Desarrollo

### Conservador Antes que Innovador
- ✅ Cambios totalmente compatibles hacia atrás
- ✅ Sistema existente sigue funcionando igual
- ✅ Nuevas funciones son opcionales
- ✅ Sin breaking changes en API

### Stack Utilizado
- Backend: Express + Prisma
- Frontend: React + Material UI + react-pdf
- Storage: FTP cPanel (notaria18quito.com.ec)

---

**Fecha de Implementación:** Enero 2025  
**Versión:** 1.0  
**Autor:** Sistema de IA (Claude) con supervisión humana

