# UI Audit: rama actual vs feat/concuerdos-v1 (frontend)
Fecha: 2025-09-23
Rama comparada: actual vs origin/feat/concuerdos-v1
Alcance: carpeta frontend únicamente

## 1) Diff de UI (A/M/D) y resumen
Resultado de git diff --name-status limitado a frontend:
- M [frontend/.env.example](frontend/.env.example) — agrega flags y ajustes de build
- M [frontend/package.json](frontend/package.json) — dependencias para stores/teclas rápidas
- M [frontend/src/components/Dashboard.jsx](frontend/src/components/Dashboard.jsx) — gating por flag, render condicional v2
- A [frontend/src/components/DocumentCenter.jsx](frontend/src/components/DocumentCenter.jsx) — nuevo centro unificado de documentos (v2)
- A [frontend/src/components/ReceptionCenter.jsx](frontend/src/components/ReceptionCenter.jsx) — nuevo centro unificado de recepción (v2)
- M [frontend/src/components/recepcion/DocumentosEnProceso.jsx](frontend/src/components/recepcion/DocumentosEnProceso.jsx) — mejoras batch y UX
- M [frontend/src/services/document-service.js](frontend/src/services/document-service.js) — autodetección API base, nuevas operaciones grupo
- A [frontend/src/store/receptions-store.js](frontend/src/store/receptions-store.js) — store para ReceptionCenter v2
- A [frontend/src/store/unified-documents-store.js](frontend/src/store/unified-documents-store.js) — store para DocumentCenter v2
- M [frontend/vite.config.js](frontend/vite.config.js) — define de flags, hash filenames, manifest

Cambios relevantes por archivo:
- Dashboard.jsx (M): se introduce gating con flag [`import.meta.env.VITE_UI_ACTIVOS_ENTREGADOS`](frontend/src/components/Dashboard.jsx:109) y [`ReceptionCenter` vs `RecepcionCenter`](frontend/src/components/Dashboard.jsx:233). CAJA alterna [`DocumentCenter()`](frontend/src/components/DocumentCenter.jsx:43) con [`CajaDashboard()`](frontend/src/components/CajaDashboard.jsx:50) según flag.
- DocumentCenter.jsx (A): nuevo listado tabulado Activos/Entregados; inicio en [`DocumentCenter()`](frontend/src/components/DocumentCenter.jsx:43), usa store [`useUnifiedDocumentsStore()`](frontend/src/store/unified-documents-store.js:7).
- ReceptionCenter.jsx (A): interfaz v2; inicio en [`ReceptionCenter()`](frontend/src/components/ReceptionCenter.jsx:43), usa store [`useReceptionsStore()`](frontend/src/store/receptions-store.js:7).
- Vite config (M): define explícito de [`import.meta.env.VITE_API_URL`](frontend/vite.config.js:45) y [`import.meta.env.VITE_UI_ACTIVOS_ENTREGADOS`](frontend/vite.config.js:47); cache-busting con nombres con hash.
- Stores (A): [`useUnifiedDocumentsStore()`](frontend/src/store/unified-documents-store.js:7) y [`useReceptionsStore()`](frontend/src/store/receptions-store.js:7) proveen consultas /api/documents y /api/reception.
- document-service.js (M): base URL autodetectada en [`getApiBaseUrl()`](frontend/src/services/document-service.js:4).

## 2) Mapa de flags de Vite e import.meta.env
Resumen por flag:
- VITE_UI_ACTIVOS_ENTREGADOS
  - Usos: [`Dashboard.jsx`](frontend/src/components/Dashboard.jsx:109), [`Dashboard.jsx`](frontend/src/components/Dashboard.jsx:228), [`DocumentCenter.jsx`](frontend/src/components/DocumentCenter.jsx:45), [`ReceptionCenter.jsx`](frontend/src/components/ReceptionCenter.jsx:45)
  - Lógica: habilita UI v2 (Activos/Entregados). Si es estrictamente 'true', renderiza componentes v2; cualquier otro valor cae a legacy.
  - Definición de build: [`vite.config.js`](frontend/vite.config.js:47) inyecta el valor desde process.env con default 'true'.
  - .env: presente en [`frontend/.env.example`](frontend/.env.example) como true; ausente en [`frontend/.env.production`](frontend/.env.production).
- VITE_API_URL
  - Usos: [`apiConfig.js`](frontend/src/utils/apiConfig.js:11), [`auth-service`](frontend/src/services/auth-service.js:10), [`notifications-service`](frontend/src/services/notifications-service.js:3), múltiples componentes admin (ej. [`NotificationSettings.jsx`](frontend/src/components/admin/NotificationSettings.jsx:41)).
  - Lógica: base para llamadas a API; en producción se fuerza a '/api'.
  - Definición de build: [`vite.config.js`](frontend/vite.config.js:45) la fija en '/api'.
  - .env: presente en [`frontend/.env.example`](frontend/.env.example) y [`frontend/.env.production`](frontend/.env.production) con valor /api.
- VITE_API_BASE_URL
  - Usos: [`AlertasPanel.jsx`](frontend/src/components/alertas/AlertasPanel.jsx:40), [`AlertasModal.jsx`](frontend/src/components/alertas/AlertasModal.jsx:30), [`ContadorAlertas.jsx`](frontend/src/components/alertas/ContadorAlertas.jsx:14).
  - Lógica: intenta apuntar al backend directo; si no existe, fallback a 'http://localhost:3001' incluso en producción.
  - .env: NO existe ni en [`frontend/.env.example`](frontend/.env.example) ni en [`frontend/.env.production`](frontend/.env.production). Riesgo de apuntar mal en prod.
- VITE_DEV_PORT
  - Usos: ninguno encontrado en código.
  - .env: presente solo en [`frontend/.env.example`](frontend/.env.example) = 5173.
- VITE_GA_TRACKING_ID
  - Usos: ninguno encontrado.
  - .env: presente solo en [`frontend/.env.example`](frontend/.env.example).
- VITE_ENABLE_SW
  - Usos: ninguno encontrado.
  - .env: presente solo en [`frontend/.env.example`](frontend/.env.example). No hay service worker registrado.
- Otras claves import.meta.env
  - [`MODE`](frontend/src/components/DocumentCenter.jsx:48) y [`MODE`](frontend/src/components/ReceptionCenter.jsx:48) se loguean solo para diagnóstico.

## 3) Wiring actual vs feat/concuerdos-v1
- Actual (rama presente):
  - CAJA: [`Dashboard()`](frontend/src/components/Dashboard.jsx:107) usa flag para alternar [`DocumentCenter()`](frontend/src/components/DocumentCenter.jsx:43) v2 si [`VITE_UI_ACTIVOS_ENTREGADOS`](frontend/src/components/Dashboard.jsx:109) === 'true'; si no, [`CajaDashboard()`](frontend/src/components/CajaDashboard.jsx:50).
  - RECEPCION: [`Dashboard()`](frontend/src/components/Dashboard.jsx:226) alterna [`ReceptionCenter()`](frontend/src/components/ReceptionCenter.jsx:43) v2 vs [`RecepcionCenter()`](frontend/src/components/RecepcionCenter.jsx:13).
  - No hay router declarativo (React Router). La navegación se resuelve en [`App`](frontend/src/App.jsx:16) + [`ProtectedRoute`](frontend/src/components/ProtectedRoute.jsx:9) y el propio dashboard por rol.
- En feat/concuerdos-v1:
  - CAJA: [`Dashboard()`](frontend/src/components/Dashboard.jsx:0) rendereaba siempre [`CajaDashboard()`](frontend/src/components/CajaDashboard.jsx:50).
  - RECEPCION: [`Dashboard()`](frontend/src/components/Dashboard.jsx:0) rendereaba siempre [`RecepcionCenter()`](frontend/src/components/RecepcionCenter.jsx:13).
  - No existían [`DocumentCenter.jsx`](frontend/src/components/DocumentCenter.jsx) ni [`ReceptionCenter.jsx`](frontend/src/components/ReceptionCenter.jsx).

## 4) Señales de caché/build
- Service worker: no se encontró registro ni plugin (no hay VitePWA ni registerServiceWorker). Vea [`frontend/vite.config.js`](frontend/vite.config.js) y [`frontend/index.html`](frontend/index.html).
- Cache busting: activo. Vite genera nombres con hash y [`manifest: true`](frontend/vite.config.js:21), y [`emptyOutDir: true`](frontend/vite.config.js:39).
- Build metadata: definidos [`__VITE_BUILD_TIME__`](frontend/vite.config.js:50) y [`__VITE_COMMIT_HASH__`](frontend/vite.config.js:51) pero no se usan en UI.
- HTML: [`index.html`](frontend/index.html) carga /src/main.jsx; Vite sustituye por assets hasheados en build.

## 5) Riesgos y quick wins
- Riesgo: Desalineación de flag (comparación estricta con cadena). Si [`VITE_UI_ACTIVOS_ENTREGADOS`](frontend/src/components/Dashboard.jsx:109) no es exactamente 'true' (p.ej. true sin comillas, '1', undefined), se muestra UI legacy.
  - Quick win: exportar y verificar en consola su tipo/valor en prod; definir en Railway VITE_UI_ACTIVOS_ENTREGADOS='true'.
- Riesgo: Uso de VITE_API_BASE_URL no definido en env → fallback a localhost en prod.
  - Quick win: unificar a [`VITE_API_URL`](frontend/src/utils/apiConfig.js:11) o añadir VITE_API_BASE_URL=/api en .env.production.
- Riesgo: HTML index cacheado en CDN/navegador sirviendo bundles viejos.
  - Quick win: invalidar caché del CDN y recargar forzada; dado que hay hash, con un redeploy se resuelve.

## 6) Apéndice: primeros 20–30 lines de archivos clave
- Dashboard.jsx — inicio de componente [`Dashboard()`](frontend/src/components/Dashboard.jsx:37)
```jsx
import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import useAuth from '../hooks/use-auth';
import ThemeToggle from './ThemeToggle';
import CajaDashboard from './CajaDashboard';
import DocumentCenter from './DocumentCenter';
```

- DocumentCenter.jsx — inicio de componente [`DocumentCenter()`](frontend/src/components/DocumentCenter.jsx:43)
```jsx
import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Pagination,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
```

- ReceptionCenter.jsx — inicio de componente [`ReceptionCenter()`](frontend/src/components/ReceptionCenter.jsx:43)
```jsx
import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
```

- vite.config.js — configuración y build [`defineConfig()`](frontend/vite.config.js:5)
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Agregar logs detallados para debugging
  logLevel: 'info',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    manifest: true,
```

- .env.example — fragmento
```env
VITE_API_URL=/api
VITE_UI_ACTIVOS_ENTREGADOS=true
VITE_DEV_PORT=5173
VITE_GA_TRACKING_ID=
VITE_ENABLE_SW=false
```

- unified-documents-store.js — inicio [`useUnifiedDocumentsStore()`](frontend/src/store/unified-documents-store.js:7)
```js
import { create } from 'zustand';

const useUnifiedDocumentsStore = create((set, get) => ({
  _initialized: (() => {
    console.log('📦 DOCUMENTS-STORE initialized');
    return true;
  })(),
  tab: 'ACTIVOS',
  query: '',
  clientId: null,
```

- receptions-store.js — inicio [`useReceptionsStore()`](frontend/src/store/receptions-store.js:7)
```js
import { create } from 'zustand';

const useReceptionsStore = create((set, get) => ({
  _initialized: (() => {
    console.log('📦 RECEPTIONS-STORE initialized');
    return true;
  })(),
  tab: 'ACTIVOS',
  query: '',
  clientId: null,
```

- document-service.js — base API [`getApiBaseUrl()`](frontend/src/services/document-service.js:4)
```js
import axios from 'axios';

const getApiBaseUrl = () => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
};

## Acciones en Railway (UI v2)

1) Variables requeridas (Railway → Variables)
- VITE_UI_ACTIVOS_ENTREGADOS='true' → habilita centros unificados en Dashboard; referenciado en [`Dashboard.jsx`](frontend/src/components/Dashboard.jsx:109), [`Dashboard.jsx`](frontend/src/components/Dashboard.jsx:228), [`DocumentCenter.jsx`](frontend/src/components/DocumentCenter.jsx:45), [`ReceptionCenter.jsx`](frontend/src/components/ReceptionCenter.jsx:45). En build se inyecta vía [`vite.config.js`](frontend/vite.config.js:47).
- VITE_API_URL='/api' → base de API; forzado a '/api' en build en [`vite.config.js`](frontend/vite.config.js:45). Usado en [`apiConfig.js`](frontend/src/utils/apiConfig.js:11), [`auth-service`](frontend/src/services/auth-service.js:10), [`notifications-service`](frontend/src/services/notifications-service.js:3), etc.
- (Opcional) VITE_API_BASE_URL='/api' → algunos componentes de alertas intentan usar esta clave (si no existe, hacen fallback a localhost). Aparece en [`ContadorAlertas.jsx`](frontend/src/components/alertas/ContadorAlertas.jsx:14), [`AlertasPanel.jsx`](frontend/src/components/alertas/AlertasPanel.jsx:40), [`AlertasModal.jsx`](frontend/src/components/alertas/AlertasModal.jsx:30). No está en [`frontend/.env.production`](frontend/.env.production:3).

Checklist en Railway:
- Crear/ajustar las 2–3 variables anteriores (respetar comillas simples para valores string).
- Guardar cambios ANTES de lanzar un nuevo build/deploy.

2) VITE_BUILD_ID (cache-buster) y validación
- Propósito: identificar inequívocamente el build (y ayudar a cache-busting a nivel HTML/CDN). Al ser VITE_*, se reemplaza en build-time en cualquier referencia del código como `import.meta.env.VITE_BUILD_ID`.
- Validación en consola del navegador:
  - Si la app referencia VITE_BUILD_ID en el bundle, ejecutar: `console.log(import.meta.env?.VITE_BUILD_ID)` debería imprimir el valor literal (si está expuesto en el contexto del módulo en tiempo de ejecución).
  - Indicadores equivalentes ya disponibles: `__VITE_BUILD_TIME__` y `__VITE_COMMIT_HASH__` están definidos en [`vite.config.js`](frontend/vite.config.js:50) y [`vite.config.js`](frontend/vite.config.js:51); se puede verificar en consola: `console.log(__VITE_BUILD_TIME__, __VITE_COMMIT_HASH__)`.
  - Alternativamente, comprobar en Network que los assets generados tienen hashes nuevos tras un redeploy (ver [`manifest: true`](frontend/vite.config.js:21) y nombres con hash en [`rollupOptions.output`](frontend/vite.config.js:27)).

3) Recordatorio importante (build-time de Vite)
- Todas las variables VITE_* se evalúan en build-time. Deben existir en Railway ANTES de iniciar el build (deploy desde Git o manual).
- Si se cambian variables luego del build, no impactarán el bundle ya generado. Para aplicar cambios:
  - Actualizar variables en Railway.
  - Forzar un redeploy (ver .deploy-touch) para regenerar el bundle con los valores nuevos.

Operativa recomendada para encender UI v2 en producción:
- Establecer en Railway: VITE_UI_ACTIVOS_ENTREGADOS='true', VITE_API_URL='/api', (opcional) VITE_API_BASE_URL='/api'.
- Iniciar redeploy (ver sección .deploy-touch abajo).
- Tras deploy, en consola del navegador de producción:
  - Verificar flag: `console.log('UI_FLAG', '→', 'debería renderizar v2 si es "true"')`.
  - Verificar build metadata: `console.log(__VITE_BUILD_TIME__, __VITE_COMMIT_HASH__)`.

## Recuperación de Sidebar

a) Diagrama simple del layout
```
┌──────────────────────────────────────────────────────────────┐
│ AppBar (z-index > Drawer)                                    │
├───────────────┬──────────────────────────────────────────────┤
│ Sidebar       │  <main>                                      │
│ (Drawer)      │  - Contenido por rol (Dashboard/Centers)     │
│               │  - Scroll propio                             │
└───────────────┴──────────────────────────────────────────────┘
Altura: 100vh
Contenedor: display:flex; overflow:hidden
Main: flex:1; overflow:auto
```

b) Fuente única de elementos de navegación
- Archivo de configuración centralizada: [frontend/src/config/nav-items.js](frontend/src/config/nav-items.js)
- Exporta navItemsByRole con claves por rol (CAJA, RECEPCION, MATRIZADOR, ADMIN, ARCHIVO) y items con { id, label, view, icon }.
- Sidebar genérico: [frontend/src/components/layout/Sidebar.jsx](frontend/src/components/layout/Sidebar.jsx)
  - Mapea el icon por nombre (Dashboard, Assignment, WhatsApp, etc.)
  - Soporta Drawer permanent (≥ md) y temporary (&lt; md), con collapsed y mobileOpen.
  - zIndex del Drawer por debajo del AppBar (AppBar usa zIndex drawer+1).

c) Montaje consistente y trazas
- El layout con Sidebar se monta siempre tras autenticación y no depende del flag de UI:
  - CAJA: Dashboard envuelve el contenido con [frontend/src/components/layout/CajaLayout.jsx](frontend/src/components/layout/CajaLayout.jsx) y renderiza v2 o legacy dentro del main.
  - RECEPCION: Cuando v2, se envuelve con [frontend/src/components/RecepcionLayout.jsx](frontend/src/components/RecepcionLayout.jsx); cuando legacy, [RecepcionCenter](frontend/src/components/RecepcionCenter.jsx) ya incluye su layout.
- Trazas:
  - En el montaje del layout se emite console.info('[LAYOUT]', { role, sidebar: 'mounted' }) desde [CajaLayout.jsx](frontend/src/components/layout/CajaLayout.jsx).
  - En el Sidebar genérico se emite console.info('[SIDEBAR]', { role, items: navItems?.length }) desde [Sidebar.jsx](frontend/src/components/layout/Sidebar.jsx).
- Condición de carga:
  - [ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx) muestra un loader mientras useAuth() verifica token/rol, evitando parpadeo sin barra.

d) Checklist de verificación
- [LAYOUT] en consola muestra role correcto y sidebar: 'mounted'.
- [SIDEBAR] en consola muestra role y número de items > 0.
- El AppBar está por encima del Drawer (no se tapa).
- Responsive:
  - ≥ md: Drawer permanente con opción de colapso (ancho 240px/60px).
  - &lt; md: Drawer temporary que se abre con el botón de menú en AppBar.
- Active-route:
  - Se resalta el item activo utilizando el hash (#/item) o el id activo provisto por el contenedor.
- Scroll:
  - El contenedor padre usa overflow:hidden y main usa overflow:auto con altura 100vh.

## Topbar + Theme + Logout + Sidebar CAJA

Fecha: 2025-09-23

1) Árbol de componentes relevante (render principal autenticado)
```
App
└─ ThemeProvider (centralizado en App)
   └─ ProtectedRoute
      └─ Dashboard
         ├─ CAJA (v2 por flag): CajaLayout
         │  ├─ Topbar (AppBar fijo, z-index > Drawer)
         │  ├─ Sidebar (permanente ≥md, temporal &lt;md)
         │  └─ &lt;main&gt; (overflow:auto)
         │     └─ DocumentCenter (si VITE_UI_ACTIVOS_ENTREGADOS)
         │     └─ CajaDashboard (legacy si flag desactivado)
         └─ RECEPCION: RecepcionLayout + (ReceptionCenter v2 | RecepcionCenter legacy)
```

2) Persistencia de tema (light | dark | system)
- Fuente única de preferencia: localStorage('theme') con valores 'light' | 'dark' | 'system'.
- Implementación:
  - Contexto: [frontend/src/contexts/theme-ctx.jsx](frontend/src/contexts/theme-ctx.jsx)
  - Utilidad de almacenamiento: [frontend/src/utils/storage.js](frontend/src/utils/storage.js)
  - Toggle de UI: [frontend/src/components/ThemeToggle.jsx](frontend/src/components/ThemeToggle.jsx)
- Resolución efectiva:
  - Si mode === 'system', se observa prefers-color-scheme del SO.
  - Se sincroniza el booleano isDark en Zustand para retrocompatibilidad.
  - Se aplica atributo data-theme al documentElement y tema enterprise via ThemeProvider centralizado en [frontend/src/App.jsx](frontend/src/App.jsx:1).

3) Disparo de logout desde Topbar
- Menú de usuario en Topbar incluye "Cerrar sesión".
- Acción conecta con hook de auth:
  - Hook: [frontend/src/hooks/use-auth.js](frontend/src/hooks/use-auth.js:1)
  - Método: logout() ahora:
    - Limpia token/estado.
    - Navega a /login (pushState o assign).
    - Emite traza: console.info('[SESSION]', { event: 'logout' }).
- Topbar: [frontend/src/components/Topbar.jsx](frontend/src/components/Topbar.jsx:1)

4) Sidebar CAJA por rol (fuente única)
- Definición centralizada: [frontend/src/config/nav-items.js](frontend/src/config/nav-items.js:1)
  - CAJA: Dashboard, Documentos, Subir XML.
- Sidebar genérico por rol: [frontend/src/components/layout/Sidebar.jsx](frontend/src/components/layout/Sidebar.jsx:1)
  - Lee role desde use-auth y usa navItemsByRole[role].
  - Emite traza: console.info('[SIDEBAR]', { role, items: navItems.length }).
  - Responsive: Drawer temporal (&lt;md) y permanente (≥md); colapsable (60px) en desktop.

5) Accesibilidad y UX
- Atajo Shift+D en Topbar para enfocar buscador:
  - Prioriza #global-search-input (DocumentCenter v2) o #reception-search-input (ReceptionCenter v2).
- Tooltip “Cambiar tema” en ThemeToggle.
- AppBar fijo con z-index mayor al Drawer para evitar solapes en desktop.

6) Flags de UI y trazas
- readFlag en Dashboard para gating de v2:
  - [frontend/src/components/Dashboard.jsx](frontend/src/components/Dashboard.jsx:35)
  - Log requerido: console.info('[UI-GATE]', { role: user?.role, uiV2: readFlag('VITE_UI_ACTIVOS_ENTREGADOS', true) })
- Resultado:
  - CAJA: monta CajaLayout SIEMPRE; dentro, v2 (DocumentCenter) si flag true.
  - RECEPCION: v2 (ReceptionCenter + RecepcionLayout) si flag true; caso contrario legacy (RecepcionCenter).

7) Checklist de verificación
- [ ] Sidebar visible en CAJA con items definidos (Dashboard, Documentos, Subir XML).
- [ ] AppBar fijo (Topbar) con:
  - [ ] Interruptor de tema funcional y persistente entre recargas (localStorage('theme')).
  - [ ] Menú de usuario con “Cerrar sesión” que limpia token/estado y navega a /login.
- [ ] Logs visibles en DevTools:
  - [ ] [SIDEBAR]
  - [ ] [THEME]
  - [ ] [SESSION]
  - [ ] [UI-GATE]
- [ ] En móvil (&lt;md), el Sidebar actúa como Drawer (abre con botón menú en Topbar).
- [ ] Atajo Shift+D enfoca el buscador (si existe en vista actual).

8) Archivos clave modificados/creados
- Creado: [frontend/src/components/Topbar.jsx](frontend/src/components/Topbar.jsx:1)
- Creado: [frontend/src/utils/storage.js](frontend/src/utils/storage.js:1)
- Creado: [frontend/src/contexts/theme-ctx.jsx](frontend/src/contexts/theme-ctx.jsx:1)
- Modificado: [frontend/src/components/ThemeToggle.jsx](frontend/src/components/ThemeToggle.jsx:1) → ahora usa ThemeCtx y ciclo light|dark|system.
- Modificado: [frontend/src/main.jsx](frontend/src/main.jsx:1) → envuelve en ThemeCtxProvider.
- Modificado: [frontend/src/App.jsx](frontend/src/App.jsx:1) → centraliza ThemeProvider (tema enterprise).
- Modificado: [frontend/src/hooks/use-auth.js](frontend/src/hooks/use-auth.js:90) → logout con traza [SESSION] y navegación a /login.
- Modificado: [frontend/src/components/layout/CajaLayout.jsx](frontend/src/components/layout/CajaLayout.jsx:1) → integra Topbar fijo.
- Modificado: [frontend/src/components/Dashboard.jsx](frontend/src/components/Dashboard.jsx:35) → readFlag + [UI-GATE] + gating de v2 para CAJA/RECEPCION.
