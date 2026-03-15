# Migración FTP → Cloudflare R2 para Escrituras PDF

**Fecha**: 2026-03-15
**Estado**: Aprobado
**Objetivo**: Reemplazar FTP (cPanel) por Cloudflare R2 para almacenamiento de PDFs de escrituras, agregar compresión automática con Ghostscript y mantener marca de agua.

---

## Contexto

Actualmente los PDFs de escrituras se suben vía FTP a `notaria18quito.com.ec/fotos-escrituras/`. Esto tiene problemas de escalabilidad (30 notarías futuras), dependencia de cPanel, y los PDFs pesan 5-10MB sin compresión.

Cloudflare R2 ya está configurado y en uso para minutas UAFE (`storage-service.js`). Se extiende su uso a escrituras.

## Decisiones de Diseño

### Almacenamiento: R2 con proxy backend
- PDFs se almacenan en R2 (egress gratis, ~$0.40/mes por 30 notarías)
- Se sirven via proxy del backend para mantener contador de vistas y headers de seguridad
- Con PDFs comprimidos a ~1.5MB, el egress de Railway es mínimo (~$5/mes con 30 notarías)

### Compresión: Ghostscript
- Se comprime al momento del upload (síncrono)
- Nivel de compresión: **por determinar** — se harán pruebas con `/screen`, `/ebook`, `/printer`
- Ghostscript también estampa la marca de agua en el mismo paso

### Marca de agua
- Texto: "COPIA VÁLIDA PARA VERIFICACIÓN SIN VALOR LEGAL"
- Diagonal, semitransparente, en cada página
- Se aplica con PostScript overlay en el paso de Ghostscript

### Compatibilidad hacia atrás
- Escrituras antiguas (FTP) siguen funcionando sin cambios
- Lógica dual: si `pdfR2Key` existe → R2, si `pdfFileName` → FTP
- No se migran escrituras existentes (script batch futuro opcional)

---

## Arquitectura

### Flujo de Upload

```
Matrizador sube PDF (5-10MB)
    ↓
multer recibe en memoria
    ↓
pdf-parser-escrituras.js extrae datos (número, partes, cuantía, etc.)
    ↓
pdf-optimizer-service.js:
  - Ghostscript comprime + estampa marca de agua
  - Un solo paso, resultado ~1-3MB
  - Fallback: si falla, sube original sin comprimir (pdfOptimized=false)
    ↓
storage-service.js sube 2 archivos a R2:
  - {notaryId}/escrituras/{token}_original.pdf  → sin marca de agua
  - {notaryId}/escrituras/{token}_public.pdf    → comprimido + marca de agua
    ↓
BD: pdfR2Key, pdfR2KeyPublic, pdfFileSize, pdfFileSizeCompressed, pdfOptimized
```

### Flujo de Lectura Pública

```
Usuario escanea QR → verificar.html?token=XXX
    ↓
GET /api/verify/:token → datos de la escritura
    ↓
SecurePDFViewer carga:
  GET /api/verify/:token/pdf
    ↓
Backend:
  1. Si pdfR2KeyPublic → downloadFile(key) → stream al cliente
  2. Si pdfFileName (legacy) → redirect 302 al FTP
```

### Flujo de Lectura Privada (Admin/Matrizador)

```
GET /api/escrituras/:id/pdf (autenticado)
    ↓
Backend:
  1. Si pdfR2Key → downloadFile(key) → stream original sin marca
  2. Si pdfFileName (legacy) → downloadPDFFromFTP()
```

---

## Cambios en Base de Datos

### Campos nuevos en EscrituraQR

```prisma
pdfR2Key              String?   // key en R2 del PDF original
pdfR2KeyPublic        String?   // key en R2 del PDF con marca de agua
pdfFileSizeCompressed Int?      // tamaño después de compresión (bytes)
pdfOptimized          Boolean   @default(false)  // true si Ghostscript procesó OK
```

### Campos existentes que se mantienen (legacy FTP)

```prisma
pdfFileName    String?   // nombre en FTP (legacy)
pdfFileSize    Int?      // tamaño original
```

---

## Archivos Afectados

### Nuevos
- `backend/src/services/pdf-optimizer-service.js` — Ghostscript compresión + marca de agua

### Modificados
- `backend/src/controllers/escrituras-qr-controller.js` — upload y lectura desde R2
- `backend/src/services/storage-service.js` — agregar streamFile() para streaming
- `backend/prisma/schema.prisma` — campos nuevos en EscrituraQR

### Sin cambios
- `frontend/src/components/escrituras/SecurePDFViewer.jsx` — mismos endpoints
- `frontend/src/pages/VerificacionPublica.jsx` — mismos endpoints

### Legacy (se mantienen para escrituras antiguas)
- `backend/src/services/cpanel-ftp-service.js`
- `backend/src/routes/pdf-proxy-routes.js`

---

## Compresión Ghostscript

### Comando base

```bash
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dBATCH -dQUIET \
   -sOutputFile=output.pdf \
   watermark.ps input.pdf
```

### Niveles a probar

| Nivel      | DPI aprox. | Resultado esperado | Uso ideal            |
|------------|------------|-------------------|----------------------|
| `/screen`  | 72         | ~500KB-1MB        | Solo pantalla        |
| `/ebook`   | 150        | ~1-3MB            | Lectura en pantalla  |
| `/printer` | 300        | ~3-5MB            | Impresión            |

### Marca de agua PostScript

```postscript
<<
  /EndPage {
    2 eq { pop false } {
      gsave
      .85 setgray
      /Helvetica-Bold findfont 42 scalefont setfont
      306 396 translate 45 rotate
      -280 0 moveto
      (COPIA VALIDA PARA VERIFICACION SIN VALOR LEGAL) show
      grestore
      true
    } ifelse
  } bind
>> setpagedevice
```

### Railway: nixpacks.toml

```toml
[phases.setup]
aptPkgs = ["ghostscript"]
```

### Fallback

Si Ghostscript falla:
- Se sube el PDF original sin comprimir ni marca de agua
- Se marca `pdfOptimized = false` en BD
- Se loguea el error
- La escritura no se bloquea

---

## Plan de Implementación

### OLA 1: Ghostscript + servicio de optimización
- Crear `pdf-optimizer-service.js`
- Verificar Ghostscript en Railway (nixpacks)
- Pruebas de compresión: 3-4 escrituras reales con `/screen`, `/ebook`, `/printer`
- Decidir nivel óptimo con el usuario

### OLA 2: Migración del upload a R2
- Migración Prisma: campos nuevos en EscrituraQR
- Modificar `uploadEscritura()` y `uploadPDFToEscritura()` para usar R2
- Foto de verificación también a R2
- Lógica dual: R2 para nuevos, FTP para existentes

### OLA 3: Migración de lectura desde R2
- Modificar `getPDFPublic()`: stream desde R2
- Modificar `getPDFPrivate()`: stream original desde R2
- Mantener fallback FTP para escrituras antiguas

### OLA 4: Pruebas en staging + deploy
- Subir escrituras de prueba en staging
- Verificar flujo completo: upload → QR → escaneo → visor con marca de agua
- Verificar escrituras antiguas (FTP) siguen funcionando
- Deploy a producción

---

## Costos Estimados (30 notarías)

| Concepto           | FTP actual | R2 propuesto |
|--------------------|-----------|-------------|
| Almacenamiento     | cPanel ($) | ~$0.40/mes  |
| Egress (lecturas)  | cPanel ($) | $0 (R2)     |
| Proxy Railway      | N/A       | ~$5/mes     |
| **Total**          | Variable  | **~$5.40/mes** |

---

## Notas

- Las escrituras existentes en FTP NO se migran automáticamente
- El frontend no requiere cambios
- `SecurePDFViewer` ya tiene protecciones: sin click derecho, sin Ctrl+S/P, sin capa de texto, sin descarga
- La marca de agua es la protección principal contra uso indebido
