---
trigger: always_on
---

# Project Context
You are working on "Notaría Segura", a LegalTech SaaS platform.
- **Backend:** Node.js, Express.
- **Database:** PostgreSQL controlled via **Prisma ORM**.
- **Frontend:** (Especifica aquí si usas React/Vue/etc).

# Coding Standards
1. **Prisma First:** Always check `prisma/schema.prisma` before writing any SQL or backend logic to ensure field names match.
2. **Modular Architecture:**
   - Business logic goes into `services/`.
   - Request handling goes into `controllers/` or route handlers.
   - Do not bloat the entry files (index.js/app.js).
3. **Language:** Respond in Spanish.
4. **Error Handling:** Always wrap database calls in try/catch blocks and return standardized error responses.

# Specific Preferences
- Prefer `const` over `let`.
- Use async/await syntax, not callbacks.
- When modifying the `xml-watcher-service`, ensure XML parsing logic is robust against malformed inputs.
