# API del Microservicio PDF Extractor (Python)

## POST /extract

- Auth: `Authorization: Bearer <API_TOKEN>`
- Content-Type: `multipart/form-data`
- Campos:
  - `file`: PDF (máx 10MB por defecto)
  - `debug` (opcional): `0|1`

### Respuesta

```json
{
  "success": true,
  "processing_time": 0.45,
  "confidence_score": 0.68,
  "actos": [
    {
      "tipo_acto": "PODER ESPECIAL",
      "otorgantes": [ { "nombre": "SIGMAEC CIA LTDA", "tipo": "JURIDICA" } ],
      "beneficiarios": [],
      "validacion": {
        "score": 0.62,
        "issues": [],
        "confianza_campos": {"tipo_acto":0.95,"otorgantes":0.65,"beneficiarios":0.10,"notario":0,"fecha":0}
      }
    }
  ],
  "debug": { "pages_read": 2 },
  "debug_info": {
    "text_extraction_method": "pdfplumber",
    "sections_detected": ["otorgantes","beneficiarios"],
    "raw_sections": {"otorgantes_raw":"...","beneficiarios_raw":"..."}
  }
}
```

## GET /health

Sin autenticación. Devuelve límites y estado básico.
