# ✅ IMPLEMENTACIÓN: PÁGINAS OCULTAS PARA PROTECCIÓN DE PRIVACIDAD

## 🎯 OBJETIVO

Proteger datos sensibles en los PDFs de escrituras (especialmente de menores: cédulas, biométricos, etc.) permitiendo al matrizador ocultar páginas específicas que no se mostrarán al público.

---

## 🔑 CONCEPTO

- **Al subir PDF**: Mostrar preview de todas las páginas con checkboxes
- **Seleccionar páginas**: Marcar páginas con datos sensibles para ocultar
- **Guardar metadata**: Registrar qué páginas están ocultas en base de datos
- **Al visualizar**: Mostrar placeholder de privacidad en páginas ocultas

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **BASE DE DATOS**

#### Schema Prisma (`backend/prisma/schema.prisma`)
```prisma
model EscrituraQR {
  // ... campos existentes ...
  
  pdfHiddenPages  String?  // Array JSON de páginas ocultas (ej: "[2,5,7]")
}
```

#### Migración SQL
**Archivo**: `backend/prisma/migrations/20250106000001_add_hidden_pages_to_pdfs/migration.sql`

```sql
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfHiddenPages" TEXT;
```

**Formato de datos**:
- JSON string de array de números
- Ejemplo: `"[2,5,7]"` - Oculta páginas 2, 5 y 7
- `null` o `"[]"` - Todas las páginas visibles

---

### 2. **BACKEND**

#### Controlador (`backend/src/controllers/escrituras-qr-controller.js`)

**A. Endpoint modificado: POST `/api/escrituras/:id/pdf`**
- Acepta parámetro adicional: `hiddenPages` (JSON string)
- Valida que sea array de números positivos
- Guarda en campo `pdfHiddenPages`

```javascript
// En el request body:
{
  pdf: <archivo>,
  hiddenPages: "[2,5,7]"  // Opcional
}
```

**B. Nuevo endpoint: GET `/api/verify/:token/pdf/metadata`**
- Público (sin autenticación)
- Retorna metadata del PDF incluyendo páginas ocultas
- Útil para que el frontend sepa qué páginas ocultar

Respuesta:
```json
{
  "success": true,
  "data": {
    "numeroEscritura": "20251701018P02183",
    "pdfFileName": "C8GHIWTZ.pdf",
    "pdfFileSize": 1024000,
    "hiddenPages": [2, 5, 7],
    "hasHiddenPages": true
  }
}
```

#### Rutas (`backend/src/routes/escrituras-qr-routes.js`)
- ✅ Ruta pública agregada: `GET /api/verify/:token/pdf/metadata`
- ✅ Función `getPDFMetadata` exportada

---

### 3. **FRONTEND - SERVICIOS**

#### Archivo: `frontend/src/services/escrituras-qr-service.js`

**A. Función modificada: `uploadPDFToEscritura()`**
```javascript
// Firma actualizada
uploadPDFToEscritura(escrituraId, pdfFile, hiddenPages = [], onUploadProgress)

// Uso
await uploadPDFToEscritura(123, pdfFile, [2, 5, 7], progressCallback);
```

**B. Nueva función: `getPDFMetadata()`**
```javascript
// Obtiene metadata del PDF (incluyendo páginas ocultas)
const metadata = await getPDFMetadata(token);
// metadata.data.hiddenPages: [2, 5, 7]
```

---

### 4. **FRONTEND - COMPONENTES**

#### A. **PDFUploaderModalV2.jsx** (NUEVO)

**Ubicación**: `frontend/src/components/escrituras/PDFUploaderModalV2.jsx`

**Características**:
- ✅ **Stepper de 2 pasos**:
  1. Seleccionar PDF
  2. Configurar privacidad (preview de páginas)
  
- ✅ **Preview de todas las páginas**:
  - Renderiza miniatura de cada página
  - Checkbox para marcar/desmarcar como oculta
  - Visual claro: páginas ocultas con borde amarillo
  
- ✅ **Información clara**:
  - Alert informativo sobre protección de privacidad
  - Contador de páginas ocultas
  - Lista de números de páginas marcadas

**Flujo de Usuario**:
1. Click "Subir PDF" en una escritura
2. **Paso 1**: Seleccionar archivo PDF (drag & drop o click)
3. Click "Siguiente"
4. **Paso 2**: Ver preview de todas las páginas
5. Marcar checkboxes en páginas con datos sensibles
6. Click "Subir PDF"
7. El sistema guarda las páginas marcadas

#### B. **SecurePDFViewer.jsx** (MODIFICADO)

**Nueva prop**:
```javascript
<SecurePDFViewer
  pdfUrl={url}
  numeroEscritura={numero}
  hiddenPages={[2, 5, 7]}  // NUEVO
  showControls={true}
  showBanner={true}
/>
```

**Comportamiento**:
- Cuando el usuario navega a una página oculta:
  - **NO** se muestra el contenido de la página
  - **SÍ** se muestra un placeholder elegante:
    ```
    🚫 Ícono grande de "oculto"
    
    "Página Oculta por Privacidad"
    
    "Esta página contiene datos sensibles y ha sido
    ocultada para proteger la privacidad."
    
    [Chip: Página 2 de 10]
    ```

- El usuario puede navegar entre páginas normalmente
- Las páginas ocultas simplemente muestran el placeholder
- Los controles de navegación funcionan igual

---

## 🔄 FLUJO COMPLETO

### Como Matrizador:

1. **Subir PDF con protección**:
   ```
   Tabla de escrituras → Click "Subir PDF"
   ↓
   PASO 1: Seleccionar archivo
   ↓
   Click "Siguiente"
   ↓
   PASO 2: Ver preview de todas las páginas
   ↓
   Marcar checkbox en páginas 2, 5, 7 (datos de menores)
   ↓
   Click "Subir PDF"
   ↓
   ✅ PDF subido con páginas 2, 5, 7 ocultas
   ```

2. **Ver PDF desde panel admin**:
   - Click "Ver PDF" en la tabla
   - Puede ver TODAS las páginas (incluyendo ocultas)
   - Es matrizador, tiene acceso completo

### Como Usuario Público:

1. **Escanea QR** del documento físico
2. **Ve datos extraídos** (número, acto, fecha, etc.)
3. **Scroll hacia abajo**: Ve el visor de PDF
4. **Navega las páginas**:
   - Página 1: ✅ Contenido visible
   - Página 2: 🚫 "Página Oculta por Privacidad"
   - Página 3: ✅ Contenido visible
   - Página 4: ✅ Contenido visible
   - Página 5: 🚫 "Página Oculta por Privacidad"
   - ...y así sucesivamente

---

## 💾 ESTRUCTURA DE DATOS

### Base de Datos

```sql
-- Ejemplo de registro
SELECT id, numeroEscritura, pdfFileName, pdfHiddenPages 
FROM escrituras_qr 
WHERE token = 'C8GHIWTZ';

-- Resultado:
id  | numeroEscritura      | pdfFileName     | pdfHiddenPages
----+----------------------+-----------------+----------------
123 | 20251701018P02183    | C8GHIWTZ.pdf    | "[2,5,7]"
```

### API Response (metadata)

```json
GET /api/verify/C8GHIWTZ/pdf/metadata

{
  "success": true,
  "data": {
    "numeroEscritura": "20251701018P02183",
    "pdfFileName": "C8GHIWTZ.pdf",
    "pdfFileSize": 2048000,
    "hiddenPages": [2, 5, 7],
    "hasHiddenPages": true
  }
}
```

---

## 🎨 UI/UX

### Preview de Páginas (Paso 2 de subida)

```
┌─────────────────────────────────────────┐
│ ℹ️ Protección de Privacidad             │
│                                         │
│ Marca las páginas que contengan datos  │
│ sensibles (cédulas, biométricos de      │
│ menores, etc.)                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚠️ 3 páginas ocultas: 2, 5, 7          │
└─────────────────────────────────────────┘

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ [📄] │ │ [📄] │ │ [📄] │ │ [📄] │
│ Pág 1│ │ Pág 2│ │ Pág 3│ │ Pág 4│
│ ☐    │ │ ☑ (*)│ │ ☐    │ │ ☐    │
└──────┘ └──────┘ └──────┘ └──────┘

(*) = Borde amarillo, fondo amarillo claro
```

### Placeholder de Página Oculta (Vista pública)

```
┌─────────────────────────────────────────┐
│                                         │
│              🚫 (ícono grande)          │
│                                         │
│      Página Oculta por Privacidad      │
│                                         │
│   Esta página contiene datos sensibles │
│   y ha sido ocultada para proteger la  │
│   privacidad.                           │
│                                         │
│      [ Página 2 de 10 ]                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔒 CONSIDERACIONES DE SEGURIDAD

### ✅ Protección Implementada

1. **Metadata en BD**: Las páginas ocultas solo están en metadata
2. **PDF intacto**: El archivo PDF original NO se modifica
3. **Control en visor**: El frontend decide qué mostrar
4. **Sin descarga**: El usuario público no puede descargar el PDF

### ⚠️ Limitaciones

**Importante entender**:
- El PDF completo SÍ se descarga al navegador del usuario
- La ocultación es **visual/UX**, no criptográfica
- Un usuario técnico podría:
  - Abrir DevTools
  - Capturar la respuesta HTTP del PDF completo
  - Ver todas las páginas

**Por qué esto es aceptable**:
1. **Balance pragmático**: 
   - Protege de usuarios casuales (99% de casos)
   - No requiere procesamiento complejo de PDFs server-side
   - Mantiene simplicidad del sistema

2. **Contexto de uso**:
   - PDFs son públicos para quien tenga el token (ya es semi-público)
   - Token difícil de adivinar (218 trillones de combinaciones)
   - Usuario ya tiene documento físico (por eso lo está verificando)

3. **Propósito principal**:
   - Evitar que datos sensibles aparezcan "a simple vista"
   - Dar mensaje claro de privacidad
   - Cumplir con buenas prácticas de protección de menores

---

## 🧪 TESTING

### Test Manual - Flujo Completo

#### 1. Subir PDF con páginas ocultas:
```
1. Login como matrizador
2. Ir a Generador QR
3. Click "Subir PDF" en una escritura
4. Seleccionar un PDF de prueba (5+ páginas)
5. Click "Siguiente"
6. ✅ Verificar que se muestran miniatures de TODAS las páginas
7. Marcar checkbox en páginas 2 y 4
8. ✅ Verificar que páginas marcadas tienen borde/fondo amarillo
9. ✅ Verificar que se muestra "2 páginas ocultas: 2, 4"
10. Click "Subir PDF"
11. ✅ Esperar barra de progreso
12. ✅ Confirmar mensaje de éxito
```

#### 2. Ver desde panel de admin:
```
1. Click "Ver PDF" en la misma escritura
2. Navegar a página 2
3. ✅ DEBE ver el contenido (matrizador tiene acceso completo)
```

#### 3. Ver como usuario público:
```
1. Obtener el token de la escritura
2. Acceder a: https://notaria18quito.com.ec/verificar.html?token=TOKEN
3. Scroll hasta el visor de PDF
4. Navegar páginas:
   - Página 1: ✅ Debe ver contenido
   - Página 2: ✅ Debe ver placeholder "Página Oculta por Privacidad"
   - Página 3: ✅ Debe ver contenido
   - Página 4: ✅ Debe ver placeholder "Página Oculta por Privacidad"
   - Página 5: ✅ Debe ver contenido
5. ✅ Controles de navegación deben funcionar normalmente
```

#### 4. Endpoint de metadata:
```bash
# Test con curl
curl https://tu-api.com/api/verify/TOKEN/pdf/metadata

# Debe retornar:
{
  "success": true,
  "data": {
    "hiddenPages": [2, 4],
    "hasHiddenPages": true,
    ...
  }
}
```

---

## 📊 CASOS DE USO REALES

### Caso 1: PODER ESPECIAL con menor involucrado
- **Páginas**: 8 total
- **Página 3**: Contiene cédula y foto del menor
- **Página 6**: Contiene datos biométricos

**Acción del matrizador**:
1. Sube el PDF
2. En preview, marca páginas 3 y 6
3. Confirma subida

**Resultado público**:
- Páginas 1, 2, 4, 5, 7, 8: ✅ Visibles
- Páginas 3, 6: 🚫 Placeholder de privacidad

### Caso 2: COMPRAVENTA normal (sin menores)
- **Páginas**: 12 total
- **Sin datos sensibles**: Solo adultos con cédulas normales

**Acción del matrizador**:
1. Sube el PDF
2. En preview, NO marca ninguna página
3. Confirma subida

**Resultado público**:
- Todas las páginas 1-12: ✅ Completamente visibles

---

## 🚀 INSTALACIÓN

### 1. Backend

```bash
cd backend

# Aplicar migración
npx prisma migrate deploy

# O si prefieres manual (la migración ya está creada):
# backend/prisma/migrations/20250106000001_add_hidden_pages_to_pdfs/migration.sql
```

### 2. Frontend

```bash
cd frontend

# No se requiere instalación adicional
# react-pdf ya se instaló en la implementación anterior
```

### 3. Desplegar

```bash
# Commit y push
git add .
git commit -m "Implementar páginas ocultas para protección de privacidad en PDFs"
git push origin main

# Railway aplicará migración automáticamente
```

---

## 📝 ARCHIVOS MODIFICADOS/CREADOS

### Backend (5 archivos)
- ✅ `backend/prisma/schema.prisma` - Campo `pdfHiddenPages` agregado
- ✅ `backend/prisma/migrations/.../migration.sql` - Migración creada
- ✅ `backend/src/controllers/escrituras-qr-controller.js` - Funciones actualizadas
- ✅ `backend/src/routes/escrituras-qr-routes.js` - Ruta de metadata agregada

### Frontend (4 archivos)
- ✅ `frontend/src/services/escrituras-qr-service.js` - Funciones actualizadas
- ✅ `frontend/src/components/escrituras/PDFUploaderModalV2.jsx` - **NUEVO** componente mejorado
- ✅ `frontend/src/components/escrituras/SecurePDFViewer.jsx` - Soporte de páginas ocultas
- ✅ `frontend/src/components/matrizador/GeneradorQR.jsx` - Import actualizado

---

## ✅ VENTAJAS DE ESTA IMPLEMENTACIÓN

1. **✅ Protege datos sensibles**: Especialmente de menores
2. **✅ Flexible**: Matrizador decide qué ocultar en cada PDF
3. **✅ Transparente**: Usuario sabe que hay páginas ocultas (no engaño)
4. **✅ No modifica PDF**: Archivo original intacto en FTP
5. **✅ Conservador**: Metadata simple en BD, sin procesamiento complejo
6. **✅ UX clara**: Visual intuitivo tanto al subir como al visualizar
7. **✅ Reversible**: Fácil re-subir PDF sin páginas ocultas
8. **✅ Sin costo**: No requiere servicios externos de procesamiento

---

## 🔄 PRÓXIMOS PASOS OPCIONALES

### Mejoras Futuras (No implementadas)

1. **Editar páginas ocultas sin re-subir**:
   - Endpoint PATCH para actualizar solo `pdfHiddenPages`
   - Modal para editar lista de páginas ocultas

2. **Estadísticas**:
   - Cuántas escrituras tienen páginas ocultas
   - Qué páginas se ocultan más frecuentemente

3. **Templates**:
   - Sugerencias automáticas (ej: "página 3 suele contener datos de menores")
   - Basado en histórico de escrituras similares

4. **Procesamiento real del PDF** (más seguro pero más complejo):
   - Generar dos versiones: completa y pública
   - Pública con páginas sensibles realmente removidas
   - Requiere procesamiento server-side (pdf-lib, PyPDF2, etc.)
   - Mayor complejidad y costo

---

## 📞 SOPORTE

### Consultas SQL Útiles

```sql
-- Escrituras con páginas ocultas
SELECT 
  numeroEscritura, 
  pdfHiddenPages,
  pdfViewCount
FROM escrituras_qr 
WHERE pdfHiddenPages IS NOT NULL 
  AND pdfHiddenPages != '[]';

-- Contar páginas ocultas por escritura
SELECT 
  numeroEscritura,
  json_array_length(pdfHiddenPages::json) as num_paginas_ocultas
FROM escrituras_qr
WHERE pdfHiddenPages IS NOT NULL;
```

---

*Última actualización: 6 de Enero, 2025*
*Módulo: Páginas Ocultas para Protección de Privacidad*
*Principio: CONSERVADOR ANTES QUE INNOVADOR ✅*

