# Fixes del Centro de Notificaciones

## Resumen

Se identificaron y corrigieron bugs críticos en el Centro de Notificaciones que causaban que los documentos marcados como LISTO no aparecieran para notificación.

---

## Bug 1: No se creaba notificación cuando RECEPCIÓN marcaba como LISTO

### Problema

Existían dos rutas diferentes para marcar un documento como LISTO:

1. **`POST /api/reception/documentos/:id/marcar-listo`** → `marcarComoListo()` en `reception-controller.js`
   - ✅ SÍ creaba notificación automáticamente
   
2. **`PUT /api/documents/:id/status`** → `updateDocumentStatus()` en `document-controller.js`
   - ❌ NO creaba notificación automáticamente
   - Solo mostraba: `"Use el Centro de Notificaciones para enviar mensajes vía wa.me"`

Cuando RECEPCIÓN usaba el endpoint genérico de documentos (el #2), el documento quedaba en estado LISTO pero **sin notificación PENDING**, por lo que no aparecía en el Centro de Notificaciones.

### Solución

Se modificó `updateDocumentStatus()` en `backend/src/controllers/document-controller.js` para que automáticamente cree una notificación `WhatsAppNotification` con status `PENDING` cuando se marca un documento como LISTO.

**Cambios realizados:**

```javascript
// NUEVO: Crear notificación automática si se marca como LISTO
if (status === 'LISTO') {
  try {
    // Buscar si ya existe una notificación PENDING para este documento
    const notificacionExistente = await prisma.whatsAppNotification.findFirst({
      where: {
        documentId: id,
        status: { in: ['PENDING', 'PREPARED'] },
        messageType: 'DOCUMENTO_LISTO'
      }
    });

    if (!notificacionExistente) {
      // Crear nueva notificación PENDING
      notificacionCreada = await prisma.whatsAppNotification.create({
        data: {
          documentId: id,
          clientName: updatedDocument.clientName || document.clientName,
          clientPhone: (updatedDocument.clientPhone || document.clientPhone || '').trim(),
          messageType: 'DOCUMENTO_LISTO',
          messageBody: `Su documento está listo para retiro.`,
          status: 'PENDING',
          sentAt: null
        }
      });
    }
  } catch (notifError) {
    // No fallar la operación principal si falla la creación de notificación
    console.error('Error creando notificación automática:', notifError);
  }
}
```

**Características de la solución:**

1. **Idempotente**: No crea duplicados si ya existe una notificación PENDING
2. **Resiliente**: Si falla la creación de la notificación, el documento igual se marca como LISTO
3. **Universal**: Funciona para cualquier rol (RECEPCIÓN, MATRIZADOR, ARCHIVO)
4. **Informa en respuesta**: La respuesta incluye `notificationCreated` y `notificationId`

---

## Archivos Modificados

### Backend

| Archivo | Cambio |
|---------|--------|
| `backend/src/controllers/document-controller.js` | Agregada creación automática de notificación en `updateDocumentStatus()` |

### Tests

| Archivo | Descripción |
|---------|-------------|
| `backend/tests/notification-center.test.js` | Pruebas unitarias para verificar creación de notificaciones |
| `backend/tests/notification-integration.test.js` | Pruebas de integración para el flujo completo |

---

## Pruebas

### Ejecutar pruebas unitarias

```bash
cd backend
npm test -- tests/notification-center.test.js
```

### Pruebas manuales recomendadas

1. **Como RECEPCIÓN**, marcar un documento EN_PROCESO como LISTO vía `PUT /api/documents/:id/status`
2. **Verificar** que el documento aparece en `GET /api/notifications/queue?tab=pending`
3. **Verificar** que la respuesta incluye `whatsapp.notificationCreated: true`

4. **Como MATRIZADOR**, marcar un documento como LISTO
5. **Verificar** que aparece en el Centro de Notificaciones del matrizador

6. **Repetir** la operación con el mismo documento
7. **Verificar** que no se crea notificación duplicada

---

## Flujo Correcto Esperado

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   EN_PROCESO    │────▶│      LISTO      │────▶│  Notificación       │
│                 │     │                 │     │  PENDING creada     │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
                                                          │
                                                          ▼
                                               ┌─────────────────────┐
                                               │  Centro de Notif.   │
                                               │  (tab: Por Notificar)│
                                               └─────────────────────┘
                                                          │
                              ┌───────────────────────────┼───────────────────────────┐
                              │                           │                           │
                              ▼                           ▼                           ▼
                    ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
                    │   Enviar (wa.me)│        │   Ignorar       │        │   Recordatorio  │
                    │   → PREPARED    │        │   → DISMISSED   │        │   (después)     │
                    └─────────────────┘        └─────────────────┘        └─────────────────┘
```

---

## Notas Adicionales

### Endpoints que ahora crean notificación automáticamente:

1. ✅ `POST /api/reception/documentos/:id/marcar-listo` (reception-controller)
2. ✅ `POST /api/reception/documentos/marcar-listos` (reception-bulk-controller)
3. ✅ `PUT /api/documents/:id/status` con `body: { status: 'LISTO' }` (document-controller) **← FIX**

### Endpoints que NO crean notificación (por diseño):

- `PUT /api/documents/bulk-notify` - Solo envía notificaciones existentes
- `POST /api/documents/:id/deliver` - Para entregar, no para marcar listo

---

## Fecha del Fix

**2026-02-03**

## Autor

Agente de Desarrollo
