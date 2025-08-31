Title: API: /api/docs list/search + patch state (single/bulk), indices, WhatsApp retry

Summary
- Adds alias routes under /api/docs:
  - GET /api/docs
  - PATCH /api/docs/:id/state
  - PATCH /api/docs/bulk/state
  - GET /api/docs/search (context + grouped global)
- Adds Prisma indices: (status,updatedAt), protocolNumber, clientName
- Adds WhatsApp send retry (1 retry) for robustness

Testing
- Smoke: /api/health OK
- Manual via frontend new UI

Notes
- Backwards compatible with existing /api/documents routes.

