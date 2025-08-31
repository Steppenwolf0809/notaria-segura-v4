# Guía para Codex — Roadmap Técnico y Issues (v1.2)

**Propósito:** implementar rápido con Codex. Incluye issues, criterios de aceptación, rutas sugeridas, firmas de funciones, contratos de API y checklist de QA.

---

## Issues Frontend y Backend (resumen)
- DocumentsPage por rol (Tabs vs Grupos)
- SearchBar con `/` y debounce
- Búsqueda con Ámbito inteligente (contexto + fallback global)
- Tabs Matrizador/Archivo con Entregado lazy
- RecepcionGrouped con Entregado colapsado + lazy
- DocRow mínima + acciones rápidas
- BulkBar (Marcar Listo masivo)
- DeliverModal por rol (validaciones)
- Windowing (25 + scroll infinito)
- Comportamiento B (2–3s)
- Atajos ↑/↓/Enter
- Telemetría TTFA/APM
- Endpoints: GET /api/docs, PATCH /api/docs/:id/state, PATCH /api/docs/bulk/state, GET /api/docs/search
- WhatsApp queue y auditoría
