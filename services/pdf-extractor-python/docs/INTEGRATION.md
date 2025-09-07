# Integración con Node.js (FastAPI)

## Resumen

- Servicio Python FastAPI expuesto como `POST /extract` con Bearer Token.
- Node.js (Express) envía el PDF y recibe JSON estructurado de actos.
- Límite por defecto: 10MB, 8 páginas, 30s timeout.

## Variables de entorno en Python

- `API_TOKEN`: token de autenticación (obligatorio)
- `MAX_PDF_MB` (default 10)
- `MAX_PAGES` (default 8)
- `MAX_ACTS` (default 10)
- `TIMEOUT_SECONDS` (default 30)
- `SPACY_MODEL` (default `es_core_news_md`)

## Ejemplo de cliente Node.js (fetch)

```js
import fetch from 'node-fetch'

async function extractFromPython(buffer, filename = 'file.pdf') {
  const url = process.env.PY_PDF_EXTRACT_URL || 'http://localhost:8000/extract'
  const token = process.env.PY_PDF_TOKEN
  const form = new FormData()
  form.append('file', new Blob([buffer]), filename)
  const res = await fetch(url + '?debug=1', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Python extractor error ${res.status}`)
  const json = await res.json()
  return json
}
```

## Railway

- Archivo `railway.json` incluido.
- Agregar variable `API_TOKEN` y configurar el puerto ($PORT).
