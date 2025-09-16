# Environment Variables Audit

Generated: 2025-09-16T22:48:11.107Z

Total variables: 86
Total occurrences: 212
Warnings: none

## Declared vs Used

Unused declared (8): DATABASE_PUBLIC_URL, RAILWAY_START_COMMAND, RUN_MIGRATIONS_ON_START, TEMPLATE_CACHE_TTL_MS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, CIRCUIT_BREAKER_THRESHOLD, RETRY_MAX_ATTEMPTS
Missing declared (48): ADVANCED_EXTRACTION, ALLOWED_ORIGINS, ALLOWED_ORIGINS_DEV, API_SECRET_KEY, API_URL, APP_TIMEZONE, BACKEND_URL, CACHE_ENABLED, CACHE_TTL_MS, CAJA_DOCS_LIMIT_DEFAULT, CONCUERDOS_OCR_FIRST, DEFAULT_EXTRACTION_CONFIDENCE, DEV, GEMINI_CIRCUIT_THRESHOLD, GEMINI_CIRCUIT_TIMEOUT, GEMINI_MAX_RETRIES, GEMINI_MAX_RETRY_DELAY, GEMINI_RETRY_DELAY, JWT_EXPIRES_IN, LLM_ROUTER_ENABLED, NOTARIA_CONTACTO, NOTARIA_DIRECCION, NOTARIA_HORARIO, NOTARIA_NOMBRE, OCR_CACHE_TTL_MS, OCR_ENABLED, OCR_LANGS, OCR_MAX_PAGES, OCR_PSM, PDF_EXTRACTOR_BASE_URL, PDF_EXTRACTOR_ENABLED, PDF_EXTRACTOR_TIMEOUT, PDF_EXTRACTOR_TOKEN, PDF_OCR_DPI, PDF_USE_PDFTOTEXT, PORT, PROMPT_FORCE_TEMPLATE, RAILWAY_PUBLIC_DOMAIN, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, SERVICE_EMAIL, SERVICE_PASSWORD, SLOW_REQUEST_MS, TZ, VITE_API_BASE_URL, WHATSAPP_ASYNC, XML_WATCHER_ENABLED

## Variables

| Var | Count | Layer | Sensitive |
|---|---:|---|---|
| ADVANCED_EXTRACTION | 2 | backend | no |
| ALLOWED_ORIGINS | 2 | backend | no |
| ALLOWED_ORIGINS_DEV | 2 | backend | no |
| API_SECRET_KEY | 1 | backend | yes |
| API_URL | 1 | backend | yes |
| APP_TIMEZONE | 1 | backend | no |
| BACKEND_URL | 1 | backend | no |
| CACHE_ENABLED | 1 | backend | no |
| CACHE_TTL_MS | 9 | backend | no |
| CAJA_DOCS_LIMIT_DEFAULT | 1 | backend | no |
| CONCUERDOS_OCR_FIRST | 1 | backend | no |
| CONCUERDOS_USE_GEMINI_FIRST | 2 | backend | no |
| DATABASE_URL | 5 | backend | yes |
| DEBUG_EXTRACTION_METHOD | 3 | backend | no |
| DEFAULT_EXTRACTION_CONFIDENCE | 1 | backend | no |
| DEV | 1 | frontend-build | no |
| EXTRACT_HYBRID | 1 | backend | no |
| FORCE_PYTHON_EXTRACTOR | 5 | backend | no |
| FRONTEND_URL | 4 | backend | no |
| GEMINI_CIRCUIT_THRESHOLD | 1 | backend | no |
| GEMINI_CIRCUIT_TIMEOUT | 1 | backend | no |
| GEMINI_ENABLED | 5 | backend | no |
| GEMINI_JSON_MODE | 1 | backend | no |
| GEMINI_MAX_RETRIES | 1 | backend | no |
| GEMINI_MAX_RETRY_DELAY | 1 | backend | no |
| GEMINI_MODEL | 4 | backend | no |
| GEMINI_PRIORITY | 2 | backend | no |
| GEMINI_RETRY_DELAY | 1 | backend | no |
| GEMINI_TIMEOUT | 1 | backend | no |
| GOOGLE_API_KEY | 3 | backend | yes |
| JWT_EXPIRES_IN | 1 | backend | yes |
| JWT_SECRET | 17 | backend | yes |
| LLM_ROUTER_ENABLED | 1 | backend | no |
| LLM_STRATEGY | 2 | backend | no |
| NEXT_PUBLIC_DOCS_ARCHIVO_TABS | 1 | shared | no |
| NEXT_PUBLIC_DOCS_LAZY_DELIVERED | 1 | shared | no |
| NEXT_PUBLIC_DOCS_MATRIZADOR_TABS | 1 | shared | no |
| NEXT_PUBLIC_DOCS_RECEPCION_GROUPED | 1 | shared | no |
| NEXT_PUBLIC_DOCS_SEARCH_SMART_SCOPE | 1 | shared | no |
| NEXT_PUBLIC_DOCS_SEARCH_TOGGLE_RECEPCION | 1 | shared | no |
| NEXT_PUBLIC_DOCS_WINDOWING | 1 | shared | no |
| NODE_ENV | 37 | backend | no |
| NOTARIA_CONTACTO | 2 | backend | no |
| NOTARIA_DIRECCION | 1 | backend | no |
| NOTARIA_HORARIO | 1 | backend | no |
| NOTARIA_NOMBRE | 1 | backend | no |
| OCR_CACHE_TTL_MS | 1 | backend | no |
| OCR_ENABLED | 4 | backend | no |
| OCR_LANGS | 1 | backend | no |
| OCR_MAX_PAGES | 1 | backend | no |
| OCR_PSM | 1 | backend | no |
| PDF_EXTRACTOR_BASE_URL | 5 | backend | no |
| PDF_EXTRACTOR_ENABLED | 3 | backend | no |
| PDF_EXTRACTOR_TIMEOUT | 1 | backend | no |
| PDF_EXTRACTOR_TOKEN | 4 | backend | yes |
| PDF_OCR_DPI | 1 | backend | no |
| PDF_USE_PDFTOTEXT | 1 | backend | no |
| PORT | 6 | backend | no |
| PROMPT_FORCE_TEMPLATE | 2 | backend | no |
| RAILWAY_PUBLIC_DOMAIN | 2 | backend | yes |
| REDIS_HOST | 1 | backend | no |
| REDIS_PASSWORD | 1 | backend | yes |
| REDIS_PORT | 1 | backend | no |
| REDIS_URL | 1 | backend | yes |
| SERVICE_EMAIL | 1 | backend | no |
| SERVICE_PASSWORD | 1 | backend | yes |
| SLOW_REQUEST_MS | 1 | backend | no |
| STRUCTURE_ROUTER_ENABLED | 1 | backend | no |
| TEMPLATE_MODE | 5 | backend | no |
| TWILIO_ACCOUNT_SID | 5 | backend | yes |
| TWILIO_AUTH_TOKEN | 3 | backend | yes |
| TWILIO_PHONE_NUMBER | 1 | backend | yes |
| TWILIO_WHATSAPP_FROM | 1 | backend | yes |
| TZ | 1 | backend | no |
| VITE_API_BASE_URL | 2 | frontend-build | yes |
| VITE_API_URL | 7 | frontend-build | yes |
| VITE_DOCS_ARCHIVO_TABS | 1 | shared | no |
| VITE_DOCS_LAZY_DELIVERED | 1 | shared | no |
| VITE_DOCS_MATRIZADOR_TABS | 1 | shared | no |
| VITE_DOCS_RECEPCION_GROUPED | 1 | shared | no |
| VITE_DOCS_SEARCH_SMART_SCOPE | 1 | shared | no |
| VITE_DOCS_SEARCH_TOGGLE_RECEPCION | 1 | shared | no |
| VITE_DOCS_WINDOWING | 1 | shared | no |
| WHATSAPP_ASYNC | 1 | backend | yes |
| WHATSAPP_ENABLED | 2 | backend | yes |
| XML_WATCHER_ENABLED | 1 | backend | no |

## Deprecated Candidates

- CONCUERDOS_USE_GEMINI_FIRST: 2 refs; superseded by LLM_STRATEGY; DEPRECATE
- EXTRACT_HYBRID: 1 refs; superseded by LLM_STRATEGY; DEPRECATE
- FORCE_PYTHON_EXTRACTOR: 5 refs; superseded by LLM_STRATEGY; DEPRECATE
- GEMINI_PRIORITY: 2 refs; superseded by LLM_STRATEGY; DEPRECATE