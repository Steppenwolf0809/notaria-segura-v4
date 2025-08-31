# Plan de Implementación UX — Roles (Matrizador, Archivo, Recepción) + Búsqueda (v1.2)

> **Restricciones**
> - Mantener **barra lateral**, **paleta**, **tipografías** y **densidad** actuales.  
> - Cambios enfocados en **flujo** y **jerarquía** de la vista de documentos.

---

## 0) Alcance y objetivo
Optimizar la gestión de documentos para los roles **Matrizador**, **Archivo** y **Recepción**, reduciendo el “ruido” de *Entregado*, acelerando **Marcar Listo/Entregar**, e incorporando una **búsqueda con “Ámbito inteligente”** que encuentra documentos aunque el usuario **no conozca el estado**.

---

## 1) Diseño funcional por rol

### 1.1 Matrizador — Pestañas por estado
- Tabs: **Trabajo (En proceso + Listo)** · **En proceso** · **Listo** · **Entregado** *(lazy-load)*.
- **Búsqueda**: por defecto filtra **solo** la pestaña activa.  
  - Si el resultado es **≤ 2**, se lanza **fallback global** y se muestran **Resultados globales** agrupados por estado con **chips** y **“Ver todos”**.
- **Fila mínima**: **Código · Cliente · Estado** + acciones **Listo**/**Entregar**.
- **Acción masiva**: “**Marcar Listo**” para seleccionados en *En proceso*.
- **Orden**: `lastUpdated desc` (sin columna visible).
- **Tamaño inicial**: 25 + **scroll infinito** (windowing).
- **Comportamiento B**: tras acción, **2–3 s** “Actualizado” y luego mover fila, **conservando scroll**.

### 1.2 Archivo — Igual a Matrizador
- Misma UI y reglas; opcional **“Mis Documentos”** ON por defecto si existe asignación.

### 1.3 Recepción — Grupos expandibles
- Secciones: **En proceso** (abierta) → **Listo** (abierta) → **Entregado** (**colapsado** + *lazy-load on expand*).
- **Búsqueda**: por defecto filtra **grupos visibles**.  
  - **Toggle opcional** “Buscar en: **Actual / Todos**” (atajo **Alt+A**).  
  - Fallback global si **≤ 2** resultados en el contexto.
- **Acción masiva**: “**Marcar Listo**” en *En proceso*.
- **Orden**: `lastUpdated desc`; 25 por grupo + scroll infinito por panel.

---

## 2) Interacciones comunes
- **Autofocus** al buscador al entrar; atajo **`/`** para enfocar.
- **Prefill**: click en **Cliente** o **Código** → pre-llenar buscador (ejecuta filtro inmediato).  
  - *Pro*: **Ctrl+Click** copia al input sin ejecutar (editable).
- **Atajos**: `↑/↓` mover selección; `Enter` abre 1er resultado del **contexto**; `Ctrl+Enter` abre 1er resultado **global**; `Esc` limpia.
- **Entregar**:  
  - **Recepción** → pedir **código verificación, nombre, cédula, relación, observaciones** (WhatsApp no bloqueante, “Deshacer” si aplica).  
  - **Matrizador/Archivo** → solo **nombre**.

---

## 3) Búsqueda — “Ámbito inteligente” (Global vs Filtrada)
- **Default**: buscar en **contexto** (pestaña/grupo actual) → menos ruido.
- **Fallback**: si `matchesContext ≤ 2`, ejecutar **búsqueda global** y renderizar un bloque **“Resultados globales (Todos los estados)”** **agrupado por estado** con chips **En proceso / Listo / Entregado** y **botón “Ver todos”** (cambia a la pestaña/sección correspondiente aplicando la misma query).
- **Recepción**: añadir **toggle** “Buscar en: **Actual / Todos**” (atajo **Alt+A**).  
- **Debounce** 120–180 ms; **throttle** 1 req/200 ms.

**Endpoint sugerido**  
`GET /api/docs/search?query=...&scope=context|all&state=proceso|listo|entregado|any&ownerId=...&limit=25&cursor=...`

**Respuesta (resumen)**
```json
{
  "context": { "state": "proceso|listo|entregado|mixed", "hits": [...], "nextCursor": "..." },
  "global": { "groups": [
    { "state": "proceso",   "count": 14, "hits": [...] },
    { "state": "listo",     "count":  7, "hits": [...] },
    { "state": "entregado", "count": 28, "hits": [...] }
  ]}
}
```

---

## 4) Mapa de componentes (frontend)
```
app/
  pages/documentos/index.tsx      // DocumentsPage (switch por rol y layout)
  components/documents/
    SearchBar.tsx                 // autofocus + '/' + onChange + toggle (Recepción)
    DocRow.tsx                    // fila mínima + acciones
    BulkBar.tsx                   // acción masiva “Marcar Listo”
    DeliverModal.tsx              // campos según rol
    GroupPanel.tsx                // acordeón colapsable
    useWindowing.ts               // hook scroll infinito (25/step)
    useDocsStore.ts               // Zustand/Context con pools por estado
    SearchResults.tsx             // contexto + global preview (chips/"Ver todos")
  components/roles/
    MatrizadorTabs.tsx            // Tabs Trabajo/Proceso/Listo/Entregado (lazy)
    ArchivoTabs.tsx               // Reusa MatrizadorTabs
    RecepcionGrouped.tsx          // Grupos con Entregado lazy
```

---

## 5) Backend — API y validaciones

### 5.1 Listado por estado (cursor + búsqueda mínima)
`GET /api/docs?state=proceso|listo|entregado&search=...&ownerId=...&limit=25&cursor=...`

### 5.2 Cambio de estado
- Uno: `PATCH /api/docs/:id/state` → `{ state: 'LISTO'|'ENTREGADO', payload? }`
- Masivo: `PATCH /api/docs/bulk/state` → `{ ids: string[], state: 'LISTO' }`

### 5.3 Búsqueda unificada
- `GET /api/docs/search` (arriba). Retorna **contexto** + **global agrupado** (Top N por grupo + `count`).

### 5.4 Validaciones por rol
- **Recepción/ENTREGADO**: `verificationCode`, `receiverName`, `receiverIdNumber`, `receiverRelation` (y `deliveryNotes` opc.).
- **Matrizador/Archivo**: sólo `receiverName`.

### 5.5 Rendimiento
- Índices: `(state, updatedAt desc)`, `code`, `LOWER(clientName)`.
- **Cursor** por `updatedAt,id` para *Entregado*.

---

## 6) Estados de UI y transiciones
- **Listo**: `tempUpdated=true` → **2–3 s** → mover a *Listo* (mantener scroll).
- **Entregar**: validar → mover *Listo→Entregado* (o *Proceso→Listo→Entregado* en cadena) con el mismo patrón.
- **Entregado**: **lazy-load** (tab/expand) + cursor para “Cargar más”.

---

## 7) Telemetría y QA
- **TTFA** (tiempo a primera acción), **APM** (acciones por minuto), uso de **búsqueda/prefill**, errores en **Entregar**, % uso de **scroll infinito**.
- **QA** por rol:  
  - Matrizador/Archivo: tab **Trabajo**, prefill por click, masivo **Listo**, entrega con **nombre**.  
  - Recepción: grupos visibles, entrega con validaciones, **toggle** de alcance, lazy *Entregado*.  
  - Búsqueda: código exacto (match primero), nombre parcial, **“Ver todos”** abre correctamente el estado.

---

## 8) Plan de entrega (rollout)

### 8.1 Feature flags
- `documents.matrizador.tabs=true`  
- `documents.archivo.tabs=true`  
- `documents.recepcion.grouped=true`  
- `documents.lazyDelivered=true`  
- `documents.windowing=true`  
- `documents.search.smartScope=true`  
- `documents.search.toggleRecepcion=true`

### 8.2 Sprints sugeridos
- **Sprint A (UX base)**: tabs (M/Archivo) y grupos (Recepción), búsqueda con `/`, **búsqueda con “Ámbito inteligente” (contexto + fallback global)** con chips por estado, prefill por click, acción masiva **Listo**, comportamiento B, lazy *Entregado*.
- **Sprint B (perf & QA)**: windowing/virtualización, cursores, **endpoint `/search`** con throttle/debounce, métricas TTFA/APM, pruebas de carga, validaciones de entrega y auditoría.

### 8.3 Despliegue gradual
- Activar a 1–2 usuarios por rol → feedback 3–5 días → activar al resto. Monitorear TTFA/APM.

---

## 9) Riesgos y mitigaciones
- **Listas largas / lag** → windowing + respuestas mínimas.  
- **Confusión por alcance** → banner claro cuando hay **Resultados globales** + chips de estado.  
- **Fallo en WhatsApp** → reintentos asíncronos y no bloquear UI.

---

## 10) Glosario
- **Trabajo**: combinación **En proceso + Listo**.  
- **Lazy-load**: cargar datos al abrir tab/sección.  
- **Windowing**: renderizar una ventana de N filas.  
- **Ámbito inteligente**: buscar en contexto y, si no hay suficientes resultados, mostrar global agrupado.
