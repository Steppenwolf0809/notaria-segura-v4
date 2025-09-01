# TASK: Pestaña “Entregados” sin scroll infinito (baseline 30-ago)

**Contexto:** Estás en el último commit funcional del 30 de agosto (`7238c73`). Queremos un cambio **pequeño y seguro** que: (1) agregue una pestaña separada para *Entregados* sin tocar la lógica existente, (2) quite el scroll infinito, y (3) al hacer clic en el nombre del cliente, se autocompleten la búsqueda y el filtro.

---

## Objetivo

1. **Nueva pestaña “Entregados”** que muestre **solo** `ENTREGADO`.
2. **Pestaña principal** mantiene tu lógica, pero **sin** mostrar `ENTREGADO` (solo `EN_PROCESO` + `LISTO`).
3. **Sin scroll infinito**: máximo **25** ítems por vista.
4. **Click en el nombre**: autocompleta la **búsqueda** con el nombre clicado y filtra.

> **No cambiar endpoints ni lógica de backend.** Solo UI/consultas con parámetros (`states`, `limit`, `q`).

---

## Branch

```bash
git checkout -b feat/entregados-tab-no-infinite
```

---

## Implementación (React + MUI; con o sin React Query)

### Helper de datos (reutilizable)

```ts
// src/services/documents.ts
import axios from "axios";

export type DocState = "EN_PROCESO" | "LISTO" | "ENTREGADO";

export async function fetchDocuments(opts: {
  states: DocState[];
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}) {
  const { states, limit = 25, search, signal } = opts;
  const params: Record<string, any> = { limit };
  states.forEach((s) => {
    if (!params.states) params.states = [];
    params.states.push(s);
  });
  if (search && search.trim()) params.q = search.trim(); // ajusta si tu API usa otro nombre

  const { data } = await axios.get("/api/documents/my-documents", { params, signal });
  return data as any[];
}
```

### Página con Tabs y 25 items (sin infinito)

```tsx
// src/pages/Matrizador.tsx (o componente equivalente)
import { useMemo, useRef, useState } from "react";
import { Tabs, Tab, TextField, List, ListItemButton, ListItemText, Box } from "@mui/material";
import { fetchDocuments, DocState } from "../services/documents";
// Si usas React Query:
import { useQuery } from "@tanstack/react-query";

type TabKey = "principal" | "entregados";

export default function Matrizador() {
  const [activeTab, setActiveTab] = useState<TabKey>("principal");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const states: DocState[] = useMemo(
    () => (activeTab === "entregados" ? ["ENTREGADO"] : ["EN_PROCESO", "LISTO"]),
    [activeTab]
  );

  // CLAVE ESTABLE (evita loops)
  const key = useMemo(() => {
    const s = states.slice().sort().join(",");
    const q = (search || "").trim();
    return ["docs", s, 25, q] as const;
  }, [states, search]);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => fetchDocuments({ states, limit: 25, search: search.trim() || undefined }),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const handleNameClick = (name: string) => {
    setActiveTab("principal");         // opcional: ver búsqueda en principal
    setSearch(name);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <Box sx={{ p: 2, display: "grid", gap: 2 }}>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="Trabajo / Listo" value="principal" />
        <Tab label="Entregados" value="entregados" />
      </Tabs>

      <TextField
        inputRef={inputRef}
        size="small"
        label="Buscar"
        placeholder="Cliente, protocolo, etc."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <Box sx={{ color: "error.main", fontSize: 14 }}>{(error as any).message || "Error"}</Box>}

      <List dense>
        {(data ?? []).slice(0, 25).map((doc: any) => (
          <ListItemButton key={doc.id} onClick={() => handleNameClick(doc.clientName)}>
            <ListItemText primary={doc.clientName} secondary={`${doc.protocolNumber ?? ""} • ${doc.currentStatus}`} />
          </ListItemButton>
        ))}
      </List>

      {isFetching && <Box sx={{ fontSize: 12, opacity: 0.7 }}>Cargando…</Box>}

      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <button onClick={() => refetch()}>Refrescar</button>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Máx. 25 por vista</span>
      </Box>
    </Box>
  );
}
```

> Si no usas React Query, reemplaza el `useQuery` por `useEffect + useState` con `AbortController`, **deps estables** y `retry:0`.

---

## Criterios de aceptación

- **Tabs**: “Trabajo / Listo” (solo `EN_PROCESO`,`LISTO`) y “Entregados” (solo `ENTREGADO`).
- **Sin infinito**: máximo 25 ítems; no cargar más en scroll.
- **Click en nombre**: autocompleta búsqueda y filtra; el input recibe foco.
- **Sin cambios en backend**: misma ruta `/api/documents/my-documents` con `states[]` y `limit=25` (+ `q` si aplica).
- **Estabilidad**: clave de datos **estable** (no objetos inline), `retry:0`, `refetchOnWindowFocus:false`.
- **No rompe la UI previa**: la pestaña principal sigue comportándose como antes, solo que ya no muestra `ENTREGADO`.

---

## PR Checklist

- [ ] Rama: `feat/entregados-tab-no-infinite`
- [ ] Código compilando, sin warnings relevantes
- [ ] Prueba manual: tabs, búsqueda por click, límite 25
- [ ] Sin regresiones en la vista principal
- [ ] Descripción del PR clara (qué se cambió y por qué)
