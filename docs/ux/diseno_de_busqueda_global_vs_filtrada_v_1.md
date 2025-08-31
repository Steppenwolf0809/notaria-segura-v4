# Diseño de Búsqueda — Global vs Filtrada (v1.2)

> Objetivo: permitir encontrar documentos **aunque no se conozca el estado** (En proceso, Listo, Entregado) sin introducir ruido. Mantener paleta/estilos actuales. Compatible con roles **Matrizador**, **Archivo** y **Recepción**.

---

## 1) Patrones de búsqueda (opciones)

### Patrón A — **"Ámbito inteligente" (recomendado)**

- **Por defecto** la búsqueda filtra **solo el contexto visible** (pestaña/agrupación actual).
- Si el resultado es **0–2 coincidencias**, el sistema ejecuta **en paralelo** una búsqueda **global** (todos los estados) y muestra un **banner sutil**:
  - *“Sin resultados en esta pestaña. Mostrando también coincidencias globales (Todos los estados).”*
  - Chips: **Estado: En proceso | Listo | Entregado** (on/off).
- UX: no “salta” de vista; agrega un bloque **“Resultados globales”** **agrupado por estado** (Top 3 por grupo) con botón **“Ver todos”** que cambia de pestaña/abre sección.

**Cuándo usarlo:**

- **Matrizador/Archivo**: ideal, mantiene foco en trabajo y resuelve consultas puntuales sin navegar.
- **Recepción**: bueno para consultas rápidas cuando no recuerdan estado.

---

### Patrón B — **Toggle de alcance (Actual | Global)**

- Un conmutador a la derecha del buscador: **“Buscar en: [Actual ▼]”** con opciones: **Actual** (pestaña/grupo visible) | **Global** (todos los estados).
- Atajo: **Alt+A** alterna el alcance.
- Placeholder contextual:
  - *Actual*: “Buscar por cliente o código **(pestaña actual)** …”
  - *Global*: “Buscar por cliente o código **(todos los estados)** …”

**Cuándo usarlo:**

- **Recepción** con alto volumen de consultas históricas.

---

### Patrón C — **Global por defecto + chips de estado**

- Siempre busca en todos los estados y renderiza por **grupos con chips** (Estado: En proceso/Listo/Entregado).
- Riesgo: añade **ruido** al flujo de trabajo del día a día.
- **No recomendado** como default para Matrizador/Archivo.

---

## 2) Recomendación por rol

- **Matrizador**: **Patrón A (Ámbito inteligente)**.
  - Mantiene foco en *Trabajo* (En proceso+Listo) y, si no encuentra, muestra global agrupado.
- **Archivo**: igual a Matrizador (A).
- **Recepción**: **A** por defecto + habilitar **Toggle (B)** para usuarios que prefieren global.

---

## 3) Comportamiento detallado (Patrón A)

1. Usuario escribe (debounce 120–180 ms): se filtra en **contexto actual**.
2. Si `matchesContext <= 2` → lanzar **búsqueda global** en segundo plano.
3. Render:
   - **Bloque 1**: resultados del **contexto** (si existen).
   - **Bloque 2**: **Resultados globales** (label con icono de mundo), **agrupados por estado** con contador y **Top 3** por grupo.
   - Cada grupo tiene **“Ver todos”** → cambia pestaña/expande sección y aplica la misma query.
4. Microcopy del banner:
   - *“Mostrando coincidencias en ****Todos los estados****. Filtrar por: [En proceso] [Listo] [Entregado]”*.
5. **Enter** ejecuta apertura del **primer resultado del contexto**; **Ctrl+Enter** abre el primer resultado **global**.

---

## 4) UI / Micro‑interacciones

- **Atajos**: `/` foco, `↑/↓` filas, **Alt+A** alterna alcance (si usas Patrón B), `Esc` limpia.
- **Prefill**: click en **Cliente** o **Código** → pre-llenar input **y** mantener alcance actual.
  - Sugerencia: **Ctrl+Click** fuerza alcance **Global** (útil cuando sospechas que está entregado).
- **Chips**: al hacer click en un chip de estado, se activa/desactiva *on the fly* sin perder la query.
- **Cero resultados**: mostrar CTA “Buscar en **Todos los estados**” (si no se lanzó aún).

---

## 5) API / Contratos

### 5.1 Endpoint de búsqueda unificado

`GET /api/docs/search?query=...&scope=context|all&state=proceso|listo|entregado|any&ownerId=...&limit=25&cursor=...`

**Respuestas**

```json
{
  "context": {
    "state": "proceso", // o "listo", "entregado", o "mixed" (en Recepción)
    "hits": [ {"id":"...","code":"...","client":"...","state":"proceso"} ],
    "nextCursor": "..."
  },
  "global": {
    "groups": [
      {"state":"proceso","count": 14, "hits":[...]},
      {"state":"listo","count": 7,  "hits":[...]},
      {"state":"entregado","count": 28, "hits":[...]}
    ]
  }
}
```

- El backend puede reutilizar índices por `(state, updatedAt)`, `code`, `LOWER(clientName)`.
- **Global** puede devolver **Top N** (ej. 3–5) por grupo para vista previa + `count` real.

### 5.2 Reglas

- `scope=context` aplica automáticamente `state` del entorno (pestaña/grupo activos).
- `scope=all` ignora `state` salvo que el frontend envíe chips activos (`state=any` + `states[]=proceso&states[]=listo…`).

---

## 6) Render / Estados vacíos

- **Contexto sin resultados** y **Global con resultados** → mostrar **banner** + bloques globales.
- **Contexto y Global sin resultados** → mensaje claro + sugerencias: “Verificar tildes, usar sólo código, intentar por apellido…”.

---

## 7) Performance y límites

- **Debounce** 120–180 ms, **throttle** de 1 req/200 ms.
- **Respuestas pequeñas**: sólo campos mínimos (id, code, client, state).
- **Cursor** para “Ver todos” en cada grupo.
- **Memo** de los últimos 3 términos (cache en cliente 30–60 s) para navegación entre tabs sin reconsultar.

---

## 8) QA / Casos críticos

- Buscar por **código exacto** debe traer **1º** el match exacto (contexto y global).
- Buscar por **nombre parcial** ("MARIA") debe mostrar correctamente mayúsculas/minúsculas y tildes.
- Con **Entregado colapsado**: al pulsar **“Ver todos”** en el grupo Entregado, debe **expandir/cambiar** correctamente y aplicar la **misma query**.
- **Matrizador/Archivo**: que no se contamine la vista de trabajo si hay cientos de entregados (global limita a Top N).
- **Recepción**: validar que el **Toggle de alcance** no se persista entre sesiones (por decisión de producto actual).

---

## 9) Copy/Placeholders sugeridos

- Input (contexto): *“Buscar por cliente o código (pestaña actual)”*.
- Banner: *“Sin coincidencias aquí. Buscando ****Todos los estados****…”*.
- Bloque global: *“Resultados globales (Todos los estados)”*.
- Chips: *Estado: En proceso · Listo · Entregado*.

---

## 10) Árbol de decisión (simple)

```
Escribió búsqueda
  └─ Filtrar en contexto (scope=context)
      ├─ matches >= 3 → Mostrar sólo contexto
      └─ matches <= 2 → Lanzar global (scope=all)
           └─ Render bloques globales + banner + chips
```

---

## 11) Implementación (frontend)

- Hook `useSearch(scope)` con `scope: 'context'|'all'` y fallback automático.
- Componente `SearchResults` con dos slots: `ContextResults`, `GlobalPreviewGroups`.
- Atajo **Alt+A** para alternar alcance (si activas Patrón B).
- `onClientClick(name)`: pre-llenar input y **re-ejecutar** búsqueda en el alcance **actual**.

---

## 12) Resumen de decisión

- **Default**: **Patrón A (Ámbito inteligente)** para todos los roles.
- **Recepción**: habilitar además el **toggle de alcance** (Patrón B).
- Beneficio: cuando **no conoces el estado**, las coincidencias aparecen **sin cambiar de vista** y con **baja fricción**. Mantiene el foco del trabajo diario.

