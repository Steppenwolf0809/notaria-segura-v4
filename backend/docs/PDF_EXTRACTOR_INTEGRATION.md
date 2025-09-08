Integración Microservicio Python PDF Extractor

Este documento describe cómo el backend Node.js se comunica con el microservicio Python para extraer datos estructurados desde PDFs, usando autenticación Bearer.

Flujo de Comunicación

- Frontend → POST /api/concuerdos/upload-pdf (PDF) y luego /api/concuerdos/extract-data (texto + buffer opcional)
- Backend concuerdo-controller:
  1. Decodifica buffer base64 (si está presente, máx 5MB)
  2. Llama a Python con Bearer Token (/extract) usando PythonPdfClient
  3. Si Python responde, mapea la respuesta a la estructura interna
  4. Si falla o no hay actos, aplica fallback (UniversalPdfParser → PdfExtractorService.parseAdvancedData)
  5. Devuelve al frontend la misma estructura de siempre (sin requerir cambios en el frontend)

Variables de Entorno

Añadir en el archivo .env del backend (o variables de Railway):

```
# Microservicio Python PDF Extractor
PDF_EXTRACTOR_BASE_URL=http://localhost:8001
PDF_EXTRACTOR_TOKEN=your_secret_token_here
# PDF_EXTRACTOR_TIMEOUT=30000
```

- En producción (Railway):
  - PDF_EXTRACTOR_BASE_URL=https://pdf-extractor-python-xxx.railway.app
  - PDF_EXTRACTOR_TOKEN debe coincidir con el configurado en el microservicio Python

Si el entorno bloquea la creación de archivos dot (.env.example), copie estas líneas manualmente en su .env local.

Configuración en Código

- backend/src/config/environment.js expone:
  - config.pdfExtractor.baseUrl
  - config.pdfExtractor.token
  - config.pdfExtractor.timeout (ms)
- Cliente: backend/src/services/python-pdf-client.js
  - extractFromPdf(pdfBuffer, filename, { debug })
  - healthCheck()

Endpoints del Microservicio (Python)

- POST /extract (multipart/form-data)
  - Header Authorization: Bearer <token>
  - Campo file (PDF)
  - Respuesta (ejemplo):
  {
    "success": true,
    "actos": [
      {
        "tipo_acto": "PODER ESPECIAL",
        "otorgantes": [{ "nombre": "SIGMAEC CIA LTDA", "tipo": "JURIDICA" }],
        "beneficiarios": []
      }
    ]
  }
- GET /health (sin auth) para ver estado básico

Mapeo de Respuesta Python → Interna

- tipo_acto → tipoActo
- otorgantes[].{nombre,tipo} → otorgantes[].{nombre,tipo_persona} (JURIDICA/JURÍDICA → Jurídica, caso contrario Natural)
- beneficiarios[] mismo mapeo

Fallback y Tiempos de Espera

- Timeout configurable: PDF_EXTRACTOR_TIMEOUT (default 30s)
- Fallas gestionadas:
  - Timeout (AbortError)
  - Token faltante o inválido (401)
  - Servicio caído (5xx / conexión rechazada)
- Fallback: UniversalPdfParser y luego PdfExtractorService.parseAdvancedData (sin Python) para mantener compatibilidad.

Troubleshooting

- 401 desde Python:
  - Verificar PDF_EXTRACTOR_TOKEN en ambos servicios
- Timeout:
  - Ajustar PDF_EXTRACTOR_TIMEOUT
  - Verificar red y tamaño de PDF (límite recomendado 10MB)
- Servicio caído:
  - GET <BASE_URL>/health debe responder 200
  - Revisar logs del microservicio Python

Desarrollo Local vs Railway

- Local
  - Backend: PDF_EXTRACTOR_BASE_URL=http://localhost:8001
  - Token compartido en ambos .env
- Railway
  - Configurar variables en ambos servicios con el mismo token
  - Usar URL pública del servicio Python

Compatibilidad

- Sin cambios en endpoints del backend hacia el frontend
- Estructura de respuesta inalterada; la extracción puede ser más precisa si Python responde


