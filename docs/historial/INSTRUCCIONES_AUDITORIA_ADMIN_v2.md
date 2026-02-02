# 🔍 AUDITORÍA Y CORRECCIÓN DEL PANEL ADMIN
## Sistema de Trazabilidad Notarial - Notaría 18 Quito
### Versión 2.0 - Con Archivos Exactos del Proyecto

---

## 📋 CONTEXTO PARA CLAUDE CODE

**Repositorio:** https://github.com/Steppenwolf0809/sistema-trazabilidad-notaria
**Stack:** Node.js + Express + Prisma + PostgreSQL + React + Material UI
**Ambiente:** Railway (producción)

**Desarrollador:** Principiante en programación - necesita explicaciones claras de cada cambio realizado.

---

## 🎯 OBJETIVO

Realizar una auditoría completa del panel de administración (rol ADMIN) para:
1. Identificar todos los botones y funcionalidades que no funcionan
2. Corregir los problemas encontrados
3. Mejorar la información mostrada en dashboards y gestores
4. Crear tests E2E para prevenir regresiones futuras

---

## 🔴 ARCHIVOS DE CONTEXTO CRÍTICOS (Analizar PRIMERO)

### Backend - Controladores Admin:
```
backend/src/controllers/admin-controller.js
backend/src/controllers/admin-document-controller.js
backend/src/controllers/admin-notification-controller.js
backend/src/controllers/escrituras-qr-controller.js
```

### Backend - Rutas Admin:
```
backend/src/routes/admin-routes.js
backend/src/routes/escrituras-qr-routes.js
```

### Backend - Modelo de Datos:
```
backend/prisma/schema.prisma
```

### Frontend - Componentes Admin (TODOS estos archivos):
```
frontend/src/components/admin/AdminFormulariosUAFE.jsx
frontend/src/components/admin/AdminSettings.jsx
frontend/src/components/admin/AnalisisUAFE.jsx
frontend/src/components/admin/BulkOperationsDialog.jsx
frontend/src/components/admin/ConfirmDialog.jsx
frontend/src/components/admin/DocumentOversight.jsx        ← BOTÓN DETALLES
frontend/src/components/admin/DocumentStatusTimeline.jsx
frontend/src/components/admin/EncuestasSatisfaccion.jsx
frontend/src/components/admin/NotificationCenter.jsx
frontend/src/components/admin/NotificationHistory.jsx
frontend/src/components/admin/NotificationSettings.jsx
frontend/src/components/admin/NotificationTemplates.jsx
frontend/src/components/admin/QROversight.jsx              ← GESTOR QR ADMIN
frontend/src/components/admin/UserFormModal.jsx
frontend/src/components/admin/UserManagement.jsx
frontend/src/components/admin/WhatsAppTemplates.jsx
```

### Frontend - Componentes Principales Admin:
```
frontend/src/components/AdminCenter.jsx
frontend/src/components/AdminLayout.jsx
frontend/src/components/Dashboard.jsx                      ← DASHBOARD PRINCIPAL
```

### Frontend - Servicios Admin:
```
frontend/src/services/admin-service.js
frontend/src/services/admin-dashboard-service.js
frontend/src/services/admin-notifications.js
frontend/src/services/admin-supervision-service.js
frontend/src/services/escrituras-qr-service.js
```

---

## 🟡 ARCHIVOS IMPORTANTES (Si necesitas más contexto)

### Autenticación y Middleware:
```
backend/src/middleware/auth-middleware.js
backend/src/middleware/rate-limiter.js
frontend/src/store/auth-store.js
frontend/src/hooks/use-auth.js
```

### Componentes QR del Matrizador (para comparar):
```
frontend/src/components/matrizador/GeneradorQR.jsx
frontend/src/components/matrizador/QRDisplay.jsx
frontend/src/components/matrizador/ExtractedDataForm.jsx
```

### Configuración de Navegación:
```
frontend/src/config/nav-items.js
frontend/src/App.jsx
```

---

## 🚨 PROBLEMA 1: BOTÓN "DETALLES" NO FUNCIONA

### Archivos a revisar (en orden de prioridad):

1. **`frontend/src/components/admin/DocumentOversight.jsx`**
   - Este componente muestra la supervisión de documentos
   - Probablemente tiene botones "Ver detalles" para cada documento
   - Verificar que el `onClick` esté conectado correctamente

2. **`frontend/src/components/admin/QROversight.jsx`**
   - Supervisión de escrituras QR
   - Puede tener botones de detalles para ver info de cada QR

3. **`frontend/src/components/admin/UserManagement.jsx`**
   - Gestión de usuarios
   - Puede tener botones para ver detalles de usuario

### Tareas específicas:

```bash
# Buscar TODOS los botones con "Detalles" o "Ver" en componentes admin
grep -rn "Detalles\|Ver detalles\|Ver más\|Details" frontend/src/components/admin/
grep -rn "onClick.*[Dd]etail\|onClick.*[Vv]er" frontend/src/components/admin/
```

### Para cada botón encontrado, verificar:

| Verificación | Qué buscar |
|--------------|------------|
| ¿Tiene onClick? | `onClick={...}` o `onClick={() => ...}` |
| ¿Handler definido? | Función en el componente que maneja el click |
| ¿Llama a servicio? | Import de `admin-service.js` o similar |
| ¿Abre modal? | Estado `useState` para controlar modal |
| ¿Muestra datos? | Props pasados al modal/componente hijo |

### Patrón correcto esperado:

```jsx
// Ejemplo de cómo DEBERÍA funcionar
const [selectedItem, setSelectedItem] = useState(null);
const [openModal, setOpenModal] = useState(false);

const handleVerDetalles = (item) => {
  setSelectedItem(item);
  setOpenModal(true);
};

// En el render:
<Button onClick={() => handleVerDetalles(documento)}>
  Ver Detalles
</Button>

// Modal:
<DetallesModal 
  open={openModal} 
  data={selectedItem}
  onClose={() => setOpenModal(false)}
/>
```

---

## 🚨 PROBLEMA 2: DASHBOARD SIN FILTROS ÚTILES

### Archivos principales:

1. **`frontend/src/components/Dashboard.jsx`** - Dashboard principal
2. **`frontend/src/services/admin-dashboard-service.js`** - Servicio de datos
3. **`backend/src/controllers/admin-controller.js`** - Endpoints

### Analizar primero:

```bash
# Ver qué filtros existen actualmente
grep -rn "filter\|Filter\|fecha\|estado\|matrizador" frontend/src/components/Dashboard.jsx
grep -rn "useState.*filter\|useEffect.*filter" frontend/src/components/Dashboard.jsx
```

### Filtros a implementar/corregir:

| Filtro | Componente UI | Query Param | Backend |
|--------|---------------|-------------|---------|
| Fecha Inicio | DatePicker | `fechaInicio` | `where: { createdAt: { gte: fecha } }` |
| Fecha Fin | DatePicker | `fechaFin` | `where: { createdAt: { lte: fecha } }` |
| Estado | Select/Dropdown | `estado` | `where: { status: estado }` |
| Matrizador | Select/Dropdown | `matrizadorId` | `where: { assignedToId: id }` |
| Tipo Documento | Select/Dropdown | `tipo` | `where: { documentType: tipo }` |

### Componente de filtros existente:

```
frontend/src/components/shared/DateRangeFilter.jsx  ← Ya existe, verificar si se usa
frontend/src/components/Documents/SearchAndFilters.jsx ← Filtros de documentos
```

### Endpoints backend a revisar/modificar:

```javascript
// En backend/src/controllers/admin-controller.js
// Buscar endpoints como:
GET /api/admin/dashboard
GET /api/admin/stats
GET /api/admin/documents

// Verificar que acepten query params:
// ?fechaInicio=2025-01-01&fechaFin=2025-01-22&estado=PENDIENTE
```

---

## 🚨 PROBLEMA 3: GESTOR QR MUY BÁSICO

### Archivos principales del módulo QR:

**Frontend:**
```
frontend/src/components/admin/QROversight.jsx          ← COMPONENTE PRINCIPAL A MEJORAR
frontend/src/components/matrizador/GeneradorQR.jsx     ← Referencia (más completo)
frontend/src/components/matrizador/QRDisplay.jsx       ← Referencia para display
frontend/src/components/matrizador/ExtractedDataForm.jsx
frontend/src/services/escrituras-qr-service.js
```

**Backend:**
```
backend/src/controllers/escrituras-qr-controller.js
backend/src/routes/escrituras-qr-routes.js
backend/src/services/qr-generator-service.js
backend/src/services/pdf-parser-escrituras.js
```

**Modelo de datos (en schema.prisma):**
```prisma
model EscrituraQR {
  id                Int      @id @default(autoincrement())
  token             String   @unique
  numeroEscritura   String?
  datosCompletos    String?  // JSON con todos los datos
  archivoOriginal   String?
  estado            String   @default("activo")
  activo            Boolean  @default(true)
  createdBy         Int?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Comparar QROversight.jsx vs GeneradorQR.jsx:

El componente de matrizador (`GeneradorQR.jsx`) probablemente tiene más funcionalidades que el de admin (`QROversight.jsx`). Analizar ambos y llevar las mejores features al admin.

### 3.1 Mejorar la tabla en QROversight.jsx

**Columnas actuales vs esperadas:**

| Columna | ¿Existe? | Importancia |
|---------|----------|-------------|
| Token (8 chars) | Verificar | Alta |
| Nº Escritura | Verificar | Alta |
| Acto (tipo) | Probablemente NO | Alta |
| Fecha Otorgamiento | Probablemente NO | Media |
| Otorgantes | Probablemente NO | Alta |
| Estado (chip color) | Verificar | Alta |
| Verificaciones (contador) | Probablemente NO | Media |
| Creado por (matrizador) | Verificar | Media |
| Fecha creación | Verificar | Media |
| Acciones | Verificar | Alta |

### 3.2 Agregar estadísticas

Crear un componente de estadísticas o agregar al existente:

```jsx
// Datos a mostrar:
const stats = {
  totalGenerados: 156,
  activos: 148,
  revisionRequerida: 5,
  inactivos: 3,
  verificacionesHoy: 23,
  verificacionesSemana: 89,
  masVerificado: { token: 'C8GHIWTZ', count: 45 }
};
```

**Endpoint backend necesario:**
```javascript
// GET /api/escrituras-qr/stats
// En backend/src/controllers/escrituras-qr-controller.js
export const getEscriturasStats = async (req, res) => {
  const stats = await prisma.escrituraQR.groupBy({
    by: ['estado'],
    _count: true
  });
  // ... más queries para estadísticas
};
```

### 3.3 Agregar filtros al gestor QR

```jsx
// Filtros necesarios en QROversight.jsx:
const [filtros, setFiltros] = useState({
  estado: 'todos',      // activo, revision_requerida, inactivo
  fechaInicio: null,
  fechaFin: null,
  matrizadorId: null,
  tipoActo: null,
  busqueda: ''          // Por token o número escritura
});
```

### 3.4 Mejorar modal de detalles

El modal debe mostrar TODO el contenido de `datosCompletos` (JSON):

```javascript
// Estructura de datosCompletos:
{
  "escritura": "20251701018P02183",
  "acto": "PODER ESPECIAL",
  "fecha_otorgamiento": "18 DE SEPTIEMBRE DEL 2025",
  "notario": "MARIA SALOME CAMINO SALTOS",
  "notaria": "DÉCIMA OCTAVA DEL CANTÓN QUITO",
  "otorgantes": {
    "otorgado_por": [...],
    "a_favor_de": [...]
  },
  "ubicacion": {...},
  "cuantia": "INDETERMINADA",
  "objeto_observaciones": "..."
}
```

---

## 🧪 TESTS E2E A CREAR

### Estructura de tests:

```
frontend/
├── tests/
│   ├── e2e/
│   │   ├── admin/
│   │   │   ├── dashboard-filters.spec.js
│   │   │   ├── document-oversight.spec.js
│   │   │   ├── qr-oversight.spec.js
│   │   │   └── user-management.spec.js
│   │   └── fixtures/
│   │       └── admin-auth.js
│   └── playwright.config.js
```

### Configuración Playwright:

```bash
cd frontend
npm init playwright@latest
```

### Test 1: Dashboard Filters
```javascript
// tests/e2e/admin/dashboard-filters.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard Admin - Filtros', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@notaria18.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('filtro por fecha actualiza datos', async ({ page }) => {
    // Seleccionar fecha inicio
    await page.click('[data-testid="fecha-inicio"]');
    await page.fill('[data-testid="fecha-inicio"]', '2025-01-01');
    
    // Verificar que datos cambiaron
    await expect(page.locator('[data-testid="total-documentos"]')).not.toHaveText('0');
  });

  test('filtro por estado funciona', async ({ page }) => {
    await page.selectOption('[data-testid="filtro-estado"]', 'PENDIENTE');
    
    // Verificar que solo muestra pendientes
    const estados = await page.locator('[data-testid="estado-documento"]').allTextContents();
    expect(estados.every(e => e.includes('PENDIENTE'))).toBeTruthy();
  });
});
```

### Test 2: Botones Detalles
```javascript
// tests/e2e/admin/document-oversight.spec.js
test.describe('DocumentOversight - Botones Detalles', () => {
  test('botón detalles abre modal con información', async ({ page }) => {
    await page.goto('/admin/documentos');
    
    // Click en primer botón de detalles
    await page.click('[data-testid="btn-detalles"]:first-child');
    
    // Verificar que modal se abre
    await expect(page.locator('[data-testid="modal-detalles"]')).toBeVisible();
    
    // Verificar que tiene contenido
    await expect(page.locator('[data-testid="detalle-numero"]')).not.toBeEmpty();
  });
});
```

### Test 3: Gestor QR
```javascript
// tests/e2e/admin/qr-oversight.spec.js
test.describe('QROversight - Gestor de Escrituras QR', () => {
  test('tabla muestra columnas correctas', async ({ page }) => {
    await page.goto('/admin/qr');
    
    // Verificar columnas
    const headers = ['Token', 'Escritura', 'Acto', 'Estado', 'Acciones'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('modal detalles muestra información completa', async ({ page }) => {
    await page.goto('/admin/qr');
    await page.click('[data-testid="btn-ver-qr"]:first-child');
    
    // Verificar campos del modal
    await expect(page.locator('[data-testid="qr-token"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="qr-escritura"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="qr-preview"]')).toBeVisible();
  });

  test('filtros funcionan correctamente', async ({ page }) => {
    await page.goto('/admin/qr');
    
    // Filtrar por estado
    await page.selectOption('[data-testid="filtro-estado-qr"]', 'activo');
    
    // Verificar resultados
    const estados = await page.locator('[data-testid="qr-estado"]').allTextContents();
    expect(estados.every(e => e.toLowerCase().includes('activo'))).toBeTruthy();
  });
});
```

---

## 📝 FORMATO DE REPORTE ESPERADO

Al completar, generar este reporte:

```markdown
# REPORTE DE AUDITORÍA - Panel Admin v2

## Fecha: [FECHA]
## Duración: [X horas]

## Resumen Ejecutivo
- Total de problemas encontrados: X
- Corregidos: Y
- Pendientes: Z

---

## PROBLEMA 1: Botón Detalles

### Ubicación encontrada:
- `frontend/src/components/admin/DocumentOversight.jsx` línea XX
- `frontend/src/components/admin/QROversight.jsx` línea YY

### Estado anterior:
[Descripción del problema - ej: "onClick no definido"]

### Solución aplicada:
[Descripción de la corrección]

### Archivos modificados:
- `archivo.jsx` (líneas X-Y): [qué se cambió]

### Verificación:
- [ ] Click abre modal
- [ ] Modal muestra datos
- [ ] No hay errores en consola

---

## PROBLEMA 2: Filtros Dashboard

### Estado anterior:
[Qué filtros existían y cuáles no funcionaban]

### Filtros implementados/corregidos:
| Filtro | Estado | Notas |
|--------|--------|-------|
| Fecha | ✅ Funcionando | ... |
| Estado | ✅ Corregido | ... |
| Matrizador | 🆕 Nuevo | ... |

### Archivos modificados:
- Frontend: [archivos]
- Backend: [archivos]

---

## PROBLEMA 3: Gestor QR

### Mejoras a la tabla:
| Columna | Antes | Después |
|---------|-------|---------|
| Acto | ❌ | ✅ |
| Otorgantes | ❌ | ✅ |
| ... | ... | ... |

### Estadísticas agregadas:
[Lista de estadísticas]

### Filtros agregados:
[Lista de filtros]

---

## Tests Creados

| Archivo | Tests | Pasando |
|---------|-------|---------|
| dashboard-filters.spec.js | 3 | ✅ |
| document-oversight.spec.js | 2 | ✅ |
| qr-oversight.spec.js | 4 | ✅ |

---

## Recomendaciones Futuras
1. ...
2. ...
```

---

## ⚠️ REGLAS IMPORTANTES

1. **NO romper funcionalidad existente** - Cambios incrementales
2. **Crear rama de trabajo:** `git checkout -b fix/admin-audit-v2`
3. **Commits descriptivos** - Un commit por problema
4. **Agregar `data-testid`** a elementos para tests
5. **Probar en staging** antes de producción
6. **Documentar cada cambio** - El desarrollador está aprendiendo

---

## 🔄 FLUJO DE TRABAJO

```
1. git checkout -b fix/admin-audit-v2
   ↓
2. Leer archivos críticos (especialmente los .jsx de admin)
   ↓
3. PROBLEMA 1: Botones Detalles
   a. Abrir DocumentOversight.jsx y QROversight.jsx
   b. Buscar botones con "Detalles" o "Ver"
   c. Verificar onClick handlers
   d. Corregir los que no funcionen
   e. Agregar data-testid para tests
   ↓
4. PROBLEMA 2: Filtros Dashboard
   a. Abrir Dashboard.jsx
   b. Revisar qué filtros existen
   c. Implementar los faltantes
   d. Conectar con backend (admin-controller.js)
   e. Verificar persistencia en URL
   ↓
5. PROBLEMA 3: Gestor QR
   a. Comparar QROversight.jsx vs GeneradorQR.jsx
   b. Mejorar tabla con columnas faltantes
   c. Agregar componente de estadísticas
   d. Implementar filtros
   e. Mejorar modal de detalles
   ↓
6. Crear tests E2E
   ↓
7. Ejecutar tests: npx playwright test
   ↓
8. Generar reporte
   ↓
9. git push y crear PR
```

---

## 💡 CONCEPTOS EDUCATIVOS

Explicar al desarrollador:

1. **data-testid** - Atributo para que tests encuentren elementos sin depender de clases CSS que pueden cambiar

2. **Patrón de filtros con URL** - Usar `useSearchParams` de React Router para que los filtros persistan al refrescar

3. **Separación de responsabilidades** - El componente muestra, el servicio obtiene datos, el backend procesa

4. **Tests E2E vs Unit Tests** - E2E simulan usuario real, Unit tests verifican funciones aisladas

---

## ✅ CHECKLIST FINAL

- [ ] Todos los botones "Detalles" funcionan
- [ ] Dashboard tiene filtros por fecha, estado, matrizador
- [ ] Filtros persisten al refrescar (URL params)
- [ ] QROversight muestra: token, escritura, acto, otorgantes, estado
- [ ] QROversight tiene estadísticas
- [ ] QROversight tiene filtros
- [ ] Modal de detalles QR muestra datosCompletos parseado
- [ ] Tests E2E creados y pasando
- [ ] Sin errores en consola del navegador
- [ ] Sin errores en logs del backend
- [ ] Reporte de auditoría generado
- [ ] PR creado para revisión

---

**Versión:** 2.0
**Fecha:** Enero 2025
**Archivos referenciados:** Actualizados según ESTRUCTURA_PROYECTO.md
