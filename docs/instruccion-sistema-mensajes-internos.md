# INSTRUCCIÓN PARA CLAUDE CODE: Sistema de Mensajes Internos y Alertas

## 🎯 OBJETIVO
Implementar un sistema de mensajes/alertas internas que permita al administrador (notario) enviar solicitudes de actualización a matrizadores y recepción desde el panel de supervisión, con notificaciones visibles en el sistema.

---

## 📋 CONTEXTO DEL PROYECTO

### Stack Tecnológico
- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: React + Material UI
- **Deploy**: Railway (backend) + cPanel (frontend público)

### Archivos de Contexto Críticos

**🔴 CRÍTICOS (analizar primero):**
- `backend/prisma/schema.prisma` - Modelos de base de datos
- `backend/src/routes/alertas-routes.js` - Rutas de alertas existentes
- `backend/src/services/alertas-service.js` - Servicio de alertas existente
- `frontend/src/components/admin/DocumentOversight.jsx` - Panel de supervisión actual
- `frontend/src/components/alertas/` - Componentes de alertas existentes

**🟡 IMPORTANTES:**
- `backend/src/controllers/admin-controller.js` - Controlador admin
- `frontend/src/components/layout/Sidebar.jsx` - Navegación lateral
- `frontend/src/components/Topbar.jsx` - Barra superior (para badge)
- `backend/src/middleware/auth-middleware.js` - Autenticación

**🟢 OPCIONALES:**
- `frontend/src/services/notification-service.js` - Si existe
- `backend/src/utils/logger.js` - Para logging

---

## 🗄️ FASE 1: MODELO DE BASE DE DATOS

### Crear nueva tabla `MensajeInterno`

```prisma
// Agregar a schema.prisma

model MensajeInterno {
  id              Int      @id @default(autoincrement())
  
  // Relaciones
  remitenteId     Int
  remitente       User     @relation("MensajesEnviados", fields: [remitenteId], references: [id])
  
  destinatarioId  Int
  destinatario    User     @relation("MensajesRecibidos", fields: [destinatarioId], references: [id])
  
  // Contexto del mensaje
  documentoId     Int?
  documento       Document? @relation(fields: [documentoId], references: [id])
  
  facturaId       Int?     // Para mensajes de cobro (futuro)
  
  // Contenido
  tipo            String   // "SOLICITUD_ACTUALIZACION", "PRIORIZAR", "CLIENTE_ESPERANDO", "COBRO", "OTRO"
  urgencia        String   @default("NORMAL") // "NORMAL", "URGENTE", "CRITICO"
  mensaje         String?  // Mensaje personalizado opcional
  
  // Estado
  leido           Boolean  @default(false)
  leidoAt         DateTime?
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("mensajes_internos")
  @@index([destinatarioId, leido])
  @@index([documentoId])
  @@index([createdAt])
}
```

### Actualizar modelo User (si no tiene las relaciones)

```prisma
model User {
  // ... campos existentes ...
  
  // Agregar relaciones para mensajes
  mensajesEnviados    MensajeInterno[] @relation("MensajesEnviados")
  mensajesRecibidos   MensajeInterno[] @relation("MensajesRecibidos")
}
```

### Migración
```bash
npx prisma migrate dev --name add_mensajes_internos
```

---

## 🔧 FASE 2: BACKEND - API

### Crear archivo: `backend/src/controllers/mensajes-internos-controller.js`

```javascript
// Funciones a implementar:

// 1. Enviar mensaje individual
// POST /api/mensajes-internos
// Body: { destinatarioId, documentoId?, tipo, urgencia, mensaje? }

// 2. Enviar mensaje masivo (múltiples documentos/destinatarios)
// POST /api/mensajes-internos/masivo
// Body: { documentoIds: [], tipo, urgencia, mensaje? }
// Agrupa por matrizador asignado automáticamente

// 3. Obtener mis mensajes no leídos (para badge)
// GET /api/mensajes-internos/no-leidos/count

// 4. Obtener mis mensajes (con paginación)
// GET /api/mensajes-internos?page=1&limit=20&leido=false

// 5. Marcar mensaje como leído
// PUT /api/mensajes-internos/:id/leer

// 6. Marcar todos como leídos
// PUT /api/mensajes-internos/leer-todos
```

### Crear archivo: `backend/src/routes/mensajes-internos-routes.js`

Registrar las rutas con autenticación JWT.

### Actualizar `backend/server.js`

Importar y usar las nuevas rutas:
```javascript
import mensajesInternosRoutes from './src/routes/mensajes-internos-routes.js';
app.use('/api/mensajes-internos', mensajesInternosRoutes);
```

---

## 🎨 FASE 3: FRONTEND - COMPONENTES

### 3.1 Badge de Notificaciones en Header

**Archivo:** `frontend/src/components/Topbar.jsx`

Agregar badge con contador de mensajes no leídos:

```jsx
// Estructura esperada:
<Badge badgeContent={mensajesNoLeidos} color="error">
  <NotificationsIcon />
</Badge>

// Al hacer click, mostrar dropdown con mensajes recientes
// Opción "Ver todos" que lleva a /mensajes
```

**Comportamiento:**
- Polling cada 30 segundos para actualizar contador
- Click abre dropdown con últimos 5 mensajes
- Link a vista completa de mensajes

### 3.2 Dropdown de Notificaciones

**Crear:** `frontend/src/components/notifications/NotificacionesDropdown.jsx`

```
┌─────────────────────────────────────────┐
│ 🔔 MENSAJES (3 nuevos)                  │
├─────────────────────────────────────────┤
│ ⚠️ Admin - hace 5 min                   │
│ Solicitar actualización: P02724         │
│ "Cliente preguntando por este trámite"  │
├─────────────────────────────────────────┤
│ 🔴 Admin - hace 1 hora                  │
│ URGENTE: Priorizar P02739               │
├─────────────────────────────────────────┤
│ [Ver todos los mensajes →]              │
└─────────────────────────────────────────┘
```

### 3.3 Vista Completa de Mensajes

**Crear:** `frontend/src/components/MisMensajes.jsx`

Página completa con:
- Lista de todos los mensajes
- Filtros: Todos, No leídos, Por tipo
- Marcar como leído individual y masivo
- Link directo al documento relacionado

### 3.4 Modal de Envío de Mensaje

**Crear:** `frontend/src/components/admin/EnviarMensajeModal.jsx`

```
┌─────────────────────────────────────────────────┐
│ 📨 ENVIAR MENSAJE INTERNO                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📄 Documento: 20251701018P02724                 │
│ 👤 Destinatario: Jose Luis Zapata Silva         │
│ 📅 Antigüedad: 62 días (⚠️ CRÍTICO)            │
│                                                 │
│ ─────────────────────────────────────────────   │
│                                                 │
│ Tipo de mensaje:                                │
│ ○ ⏰ Solicitar actualización de estado          │
│ ○ 🔴 Priorizar este trámite                    │
│ ○ 👤 Cliente preguntando                       │
│ ○ 💰 Recordatorio de cobro                     │
│ ○ 📝 Otro                                      │
│                                                 │
│ Urgencia: ( ) Normal  ( ) Urgente  (•) Crítico │
│                                                 │
│ Nota adicional (opcional):                      │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [CANCELAR]                    [📤 ENVIAR]      │
└─────────────────────────────────────────────────┘
```

### 3.5 Modal de Mensaje Masivo

**Crear:** `frontend/src/components/admin/EnviarMensajeMasivoModal.jsx`

```
┌─────────────────────────────────────────────────┐
│ 📨 MENSAJE MASIVO                               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Documentos seleccionados: 4                     │
│                                                 │
│ Se notificará a:                                │
│ • Jose Luis Zapata (2 documentos)               │
│ • Mayra Cristina Corella (2 documentos)         │
│                                                 │
│ Tipo: [Solicitar actualización ▼]              │
│ Urgencia: [Normal ▼]                           │
│                                                 │
│ [CANCELAR]              [📤 ENVIAR A TODOS]    │
└─────────────────────────────────────────────────┘
```

---

## 🎨 FASE 4: ACTUALIZAR PANEL DE SUPERVISIÓN

### Modificar: `frontend/src/components/admin/DocumentOversight.jsx`

#### 4.1 Agregar filtro por defecto EN_PROCESO

```javascript
// Estado inicial del filtro
const [filtroEstado, setFiltroEstado] = useState('EN_PROCESO');
```

#### 4.2 Optimizar columna "Acto" con badges de letra

Reemplazar el chip actual de tipo de acto por badge compacto:

```jsx
// Mapeo de tipos a badges
const actoBadges = {
  'PROTOCOLO': { label: 'P', color: '#1976d2' },      // Azul
  'CERTIFICACION': { label: 'C', color: '#2e7d32' },  // Verde
  'ARRENDAMIENTO': { label: 'A', color: '#7b1fa2' },  // Morado
  'DECLARACION': { label: 'D', color: '#ed6c02' },    // Naranja
  'RECONOCIMIENTO': { label: 'R', color: '#757575' }, // Gris
};

// Componente Badge
<Box
  sx={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '4px',
    backgroundColor: actoBadges[acto]?.color || '#9e9e9e',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.875rem',
  }}
>
  {actoBadges[acto]?.label || '?'}
</Box>
```

#### 4.3 Agregar checkbox para selección múltiple

```jsx
// Columna de checkbox al inicio
<TableCell padding="checkbox">
  <Checkbox
    checked={selectedIds.includes(doc.id)}
    onChange={() => toggleSelection(doc.id)}
  />
</TableCell>

// Header con "Seleccionar todo"
<TableCell padding="checkbox">
  <Checkbox
    indeterminate={selectedIds.length > 0 && selectedIds.length < docs.length}
    checked={selectedIds.length === docs.length}
    onChange={toggleSelectAll}
  />
</TableCell>
```

#### 4.4 Agregar botón de mensaje individual

En columna "Acción", agregar botón [💬]:

```jsx
<IconButton
  size="small"
  onClick={() => openMensajeModal(doc)}
  title="Enviar mensaje al matrizador"
>
  <ChatIcon fontSize="small" />
</IconButton>
```

#### 4.5 Barra de acciones masivas

Mostrar cuando hay seleccionados:

```jsx
{selectedIds.length > 0 && (
  <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
    <Typography component="span">
      {selectedIds.length} seleccionados
    </Typography>
    <Button
      startIcon={<SendIcon />}
      onClick={openMensajeMasivoModal}
      sx={{ ml: 2 }}
    >
      Enviar Mensaje Masivo
    </Button>
  </Box>
)}
```

---

## 🔔 FASE 5: NOTIFICACIONES PUSH (NAVEGADOR)

### Implementar en frontend

**Archivo:** `frontend/src/services/push-notification-service.js`

```javascript
// Solicitar permiso de notificaciones
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Mostrar notificación
export const showNotification = (title, options) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logo-notaria18.jpg',
      badge: '/logo-notaria18.jpg',
      ...options,
    });
  }
};
```

### Integrar con polling de mensajes

Cuando llegue un mensaje nuevo durante el polling:

```javascript
// En el hook de mensajes
useEffect(() => {
  if (nuevosMensajes > mensajesAnteriores) {
    showNotification('Nuevo mensaje', {
      body: `Tienes ${nuevosMensajes} mensaje(s) nuevo(s)`,
      tag: 'mensajes-internos',
    });
  }
}, [nuevosMensajes]);
```

---

## 📱 FASE 6: VISTA MATRIZADOR - RECIBIR MENSAJES

### Agregar badge en Sidebar del matrizador

**Archivo:** `frontend/src/components/layout/Sidebar.jsx`

En el ítem de menú correspondiente, mostrar badge:

```jsx
<ListItemButton>
  <ListItemIcon>
    <Badge badgeContent={mensajesNoLeidos} color="error">
      <InboxIcon />
    </Badge>
  </ListItemIcon>
  <ListItemText primary="Mis Alertas" />
</ListItemButton>
```

### Crear vista de alertas para matrizador

**Archivo:** `frontend/src/components/matrizador/MisAlertas.jsx`

Lista de mensajes recibidos con:
- Información del documento
- Tipo y urgencia del mensaje
- Botón para ir directo al documento
- Marcar como leído

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Funcionalidad Core
- [ ] Admin puede enviar mensaje individual desde panel de supervisión
- [ ] Admin puede enviar mensaje masivo a múltiples matrizadores
- [ ] Matrizador ve badge con contador de mensajes no leídos
- [ ] Matrizador puede ver lista de sus mensajes
- [ ] Matrizador puede marcar mensajes como leídos
- [ ] Click en mensaje lleva al documento relacionado

### UI/UX
- [ ] Panel de supervisión muestra EN_PROCESO por defecto
- [ ] Tipo de acto usa badges de letra compactos [P] [C] [A] [D] [R]
- [ ] Checkbox para selección múltiple funciona correctamente
- [ ] Modal de mensaje individual muestra contexto del documento
- [ ] Modal de mensaje masivo agrupa por matrizador
- [ ] Badge en header se actualiza cada 30 segundos

### Notificaciones
- [ ] Push notification del navegador cuando llega mensaje nuevo
- [ ] Sonido opcional de notificación (si el navegador lo permite)

---

## 🧪 CASOS DE PRUEBA

### Prueba 1: Mensaje Individual
1. Admin entra a Supervisión
2. Filtra por EN_PROCESO
3. Click en [💬] de un documento
4. Selecciona "Solicitar actualización" + Urgente
5. Click Enviar
6. Verificar: Matrizador ve badge actualizado

### Prueba 2: Mensaje Masivo
1. Admin selecciona 3 documentos de diferentes matrizadores
2. Click "Mensaje Masivo"
3. Verificar que muestra agrupación por matrizador
4. Enviar
5. Verificar: Cada matrizador recibe sus mensajes

### Prueba 3: Recepción de Mensajes
1. Login como matrizador
2. Verificar badge en header/sidebar
3. Click para ver mensajes
4. Marcar como leído
5. Verificar badge se actualiza

---

## 📝 NOTAS IMPORTANTES

1. **Sin sistema de email**: No hay cuenta de email configurada, usar solo notificaciones internas + push del navegador

2. **Polling vs WebSockets**: Usar polling (cada 30 seg) por simplicidad. WebSockets sería mejor pero más complejo de implementar.

3. **Permisos**: Solo ADMIN puede enviar mensajes. MATRIZADOR y RECEPCION solo reciben.

4. **Auditoría**: Registrar todos los mensajes enviados para trazabilidad.

5. **No es chat bidireccional**: Matrizador no responde por el sistema, solo actualiza el documento o contacta directamente.

---

## 🚀 ORDEN DE IMPLEMENTACIÓN SUGERIDO

1. **Sprint 1** (Backend): Modelo Prisma + Migración + Endpoints básicos
2. **Sprint 2** (Frontend Admin): Modal individual + Modal masivo + Actualizar tabla
3. **Sprint 3** (Frontend Matrizador): Badge + Vista de mensajes
4. **Sprint 4** (Polish): Push notifications + Testing + Ajustes UX

**Tiempo estimado total: 3-4 días**
