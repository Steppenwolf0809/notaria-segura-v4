# Preflight Staging v1.2 — Notaría Segura

Este documento describe el preflight antes de desplegar a Railway para la UX v1.2 (roles y búsqueda con "Ámbito inteligente").

## 1) Migración Postgres (pg_trgm + índices GIN)

- Archivo: `backend/prisma/migrations/20250830_add_trgm_indexes/migration.sql`
- Acciones:
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - Índices GIN por trigramas:
    - `documents("clientName")` (búsqueda por nombre)
    - `documents("protocolNumber")` (equiv. a "code")

Ejecutar:
```
cd backend
npm run migrate:deploy
```

## 2) Seed de datos (v1.2)

- Archivo: `backend/scripts/seed-docs-v1_2.js`
- Inserta:
  - 60 documentos EN_PROCESO
  - 20 documentos LISTO
  - 40 documentos ENTREGADO
- Campos clave: `protocolNumber` (code), `clientName` aleatorios, mínimos requeridos del esquema.

Ejecutar:
```
cd backend
npm run seed:v1_2
```

## 3) Colección Postman

- Archivo: `docs/api/postman/notaria-docs-v1_2.json`
- Variables: `baseUrl`, `token`
- Requests incluidas:
  - GET `/api/docs?state=proceso&limit=25`
  - PATCH `/api/docs/:id/state` → LISTO/ENTREGADO (payload por rol)
  - PATCH `/api/docs/bulk/state` → LISTO masivo
  - GET `/api/docs/search?query=...&scope=context|all` (respuesta contexto + grupos)

## 4) Scripts package.json

- `migrate:deploy`: `prisma migrate deploy`
- `seed:v1_2`: `node scripts/seed-docs-v1_2.js`
- `dev`: `nodemon server.js`

## 5) .env Staging

Archivo ejemplo: `backend/.env.staging`
- `DATABASE_URL=postgresql://...`
- `TWILIO_*` (credenciales)
- Flags UX v1.2:
  - `documents.matrizador.tabs=true`
  - `documents.archivo.tabs=true`
  - `documents.recepcion.grouped=true`
  - `documents.lazyDelivered=true`
  - `documents.windowing=true`
  - `documents.search.smartScope=true`
  - `documents.search.toggleRecepcion=true`
- `WHATSAPP_DRY_RUN=true` (evita envíos reales)

## 6) Arranque backend

```
cd backend
# Usando .env con DATABASE_URL válido
npm run migrate:deploy && npm run seed:v1_2
npm run dev
```

## 7) Smoke tests (mínimos)

- Por estado:
  - `GET /api/docs?state=proceso&limit=25`
- Búsqueda "MARIA":
  - `GET /api/docs/search?query=MARIA&scope=context&state=proceso`
  - `GET /api/docs/search?query=MARIA&scope=all`

Esperado: respuesta `success=true`, `context.hits` y, si ≤2 en contexto o `scope=all`, `global.groups` con conteos/hits.

## 8) Observaciones / Notas

- No se cambiaron sidebar, paleta ni tipografías.
- UI sigue los patrones de `plan-roles-v1.2.md` y `diseno_de_busqueda_global_vs_filtrada_v_1.md`.
- WhatsApp en modo `DRY_RUN` para staging.

## 9) PR

Rama: `preflight-railway-v1_2`
Incluye: migración `pg_trgm`, seed v1.2 y colección Postman.

