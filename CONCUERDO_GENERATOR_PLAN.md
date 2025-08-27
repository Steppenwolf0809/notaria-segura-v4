# Generador de Concuerdos – Plan y Alcance

## Objetivos
- Extraer comparecientes (otorgantes/beneficiarios) desde PDF con texto.
- Soportar múltiples actos en un mismo PDF (múltiples “ACTO O CONTRATO”).
- Generar copias numeradas como documentos separados (PRIMERA_COPIA, SEGUNDA_COPIA, …).
- Proveer vista previa por copia en el frontend.

## Backend

- `backend/src/services/pdf-extractor-service.js`
  - `extractText(buffer)`: cadena de extractores (pdf-parse → pdfjs → pdftotext opcional) + validación %PDF.
  - `parseAdvancedData(text)`: parser robusto con regex para:
    - Múltiples “ACTO O CONTRATO”.
    - Bloques entre “OTORGADO POR/OTORGANTES/Nombres/Razón social” y “A FAVOR DE/BENEFICIARIO(S)”.
    - Notario cuando esté presente.
  - `parseSimpleData(text)`: legado para fallback.

- `backend/src/controllers/concuerdo-controller.js`
  - `uploadPdf`: recibe PDF, valida y devuelve `text` extraído.
  - `extractData`: utiliza `parseAdvancedData`; retorna `{ acts, ...primerActo }`.
  - `previewConcuerdo`: retorna `previewText` y `previews[]` (copias lista de texto).
  - `generateDocuments`: NUEVO. Recibe `{ tipoActo, otorgantes, beneficiarios, numCopias, notario?, format }` y retorna `documents[]` (HTML/TXT por ahora, base64).

- Rutas: `backend/src/routes/concuerdo-routes.js`
  - `POST /upload-pdf`, `POST /extract-data`, `POST /preview`, `POST /generate-documents`.

## Frontend

- `frontend/src/components/matrizador/concuerdos/ExtractedDataForm.jsx`
  - Textareas para otorgantes/beneficiarios (uno por línea).

- `frontend/src/components/matrizador/concuerdos/ConcuerdoGenerator.jsx`
  - Paso de vista previa muestra todas las copias (renderizado del HTML base64).

- `frontend/src/components/matrizador/concuerdos/hooks/useConcuerdoGenerator.js`
  - `preview()`: llama `concuerdoService.generateDocuments` con formato `html` para vistas previas.

- `frontend/src/services/concuerdo-service.js`
  - `generateDocuments(data)`: invoca el endpoint del backend.

## Futuras Mejoras
- DOCX/PDF reales: sustituir HTML con generadores (docx, pdf-lib) según variable de entorno.
- OCR opcional para PDFs escaneados (Tesseract), activado por env var.
- Plantillas configurables por tipo de acto.

