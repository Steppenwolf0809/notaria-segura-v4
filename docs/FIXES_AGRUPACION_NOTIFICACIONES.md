# Fixes de Agrupación de Notificaciones

## Resumen

Se corrigieron problemas de agrupación en el Centro de Notificaciones donde los documentos del mismo cliente no se consolidaban correctamente.

---

## Problemas Corregidos

### Problema 1: Documentos no se sumaban a notificaciones existentes

**Situación:**
- Cliente tenía 2 documentos marcados LISTO → Se crearon 2 notificaciones PENDING
- Usuario no envió la notificación
- Se marcó un 3er documento como LISTO del mismo cliente
- **Error:** El 3er documento aparecía por separado, no sumado a los anteriores

**Solución aplicada:**
- Al enviar una notificación, el backend ahora busca **TODOS** los documentos LISTO del cliente
- El mensaje de WhatsApp incluye todos los documentos consolidados
- Todos los documentos quedan con el mismo código de retiro

### Problema 2: Notificaciones duplicadas

**Situación:**
- Documentos con notificaciones PENDING existentes se marcaban como LISTO
- Al enviar notificación, se creaban notificaciones duplicadas

**Solución aplicada:**
- Antes de crear nuevas notificaciones, se actualizan las PENDING existentes a PREPARED
- Se evita crear duplicados verificando si ya existe notificación PREPARED/SENT

### Problema 3: Mensaje no incluía todos los documentos

**Situación:**
- Usuario seleccionaba 1 documento para notificar
- Cliente tenía 3 documentos LISTO en total
- **Error:** El mensaje solo mencionaba 1 documento

**Solución aplicada:**
- El backend consolida automáticamente todos los documentos LISTO del cliente
- El mensaje incluye la lista completa de documentos
- La respuesta indica cuántos documentos fueron consolidados

---

## Comportamiento Esperado

### Flujo Normal

```
1. Documento A marcado LISTO → Notificación PENDIENTE creada
2. Documento B marcado LISTO → Notificación PENDIENTE creada  
3. Usuario abre Centro de Notificaciones → Ve "Cliente X: 2 documentos"
4. Usuario hace clic en NOTIFICAR
5. Backend busca TODOS los documentos LISTO del cliente (A, B, y cualquier otro)
6. Se genera UN código de retiro para todos
7. Mensaje de WhatsApp incluye lista completa de documentos
8. Todas las notificaciones pasan a PREPARED/SENT
```

### Caso: Documentos previamente notificados

```
1. Documentos A y B notificados (SENT) hace 3 días
2. Documento C marcado LISTO → Notificación PENDIENTE creada
3. Usuario ve "Cliente X: 1 documento" (solo el nuevo)
4. Al enviar notificación:
   - El mensaje incluye A, B y C (todos los LISTO)
   - Se informa que hay documentos previamente notificados
   - Todos quedan con el mismo código actualizado
```

---

## Cambios en el Backend

### `backend/src/controllers/document-controller.js`

#### Función `bulkNotify()`

**Cambios:**

1. **Consolidación de documentos:**
```javascript
// Buscar TODOS los documentos LISTO de los clientes seleccionados
const allClientDocuments = await prisma.document.findMany({
  where: {
    status: 'LISTO',
    OR: [
      { clientPhone: { in: clientPhones } },
      { clientId: { in: clientIds } }
    ]
  }
});
```

2. **Actualización de notificaciones existentes:**
```javascript
// Marcar como PREPARED todas las notificaciones PENDING
await prisma.whatsAppNotification.updateMany({
  where: {
    documentId: { in: documentIdsToUpdate },
    status: 'PENDING',
    messageType: 'DOCUMENTO_LISTO'
  },
  data: {
    status: sendWhatsApp ? 'PREPARED' : 'PENDING',
    messageBody: `Consolidado - Código: ${codigoRetiro}...`
  }
});
```

3. **Prevención de duplicados:**
```javascript
// Solo crear si no existe PREPARED/SENT
const existingPrepared = await prisma.whatsAppNotification.findFirst({
  where: {
    documentId: doc.id,
    status: { in: ['PREPARED', 'SENT'] }
  }
});

if (!existingPrepared) {
  await prisma.whatsAppNotification.create({...});
}
```

4. **Respuesta con información de consolidación:**
```javascript
res.json({
  data: {
    ...results,
    consolidacion: {
      documentosSeleccionados: 1,
      documentosTotales: 3,
      documentosAdicionales: 2,
      mensaje: "Se incluyeron 2 documentos adicionales..."
    }
  }
});
```

### `backend/src/routes/notifications-routes.js`

#### Endpoint `GET /api/notifications/queue`

**Cambios:**

Agregadas estadísticas por cliente:
```javascript
const clientStats = {};
for (const phone of clientPhones) {
  const totalListo = await prisma.document.count({
    where: { clientPhone: phone, status: 'LISTO' }
  });
  
  clientStats[phone] = {
    totalListo,
    withPendingNotification: pendingCount,
    alreadyNotified: totalListo - pendingCount
  };
}
```

---

## Cambios en el Frontend

### `frontend/src/components/notifications/WhatsAppNotificationModal.jsx`

**Nuevo:** Muestra información de consolidación cuando aplica:
```jsx
{result?.consolidacion?.documentosAdicionales > 0 && (
  <Alert severity="info">
    <strong>📦 Consolidación:</strong> {result.consolidacion.mensaje}
    Seleccionados: {result.consolidacion.documentosSeleccionados} | 
    Totales: {result.consolidacion.documentosTotales}
  </Alert>
)}
```

### `frontend/src/components/notifications/ClientNotificationCard.jsx`

**Nuevo:** Muestra indicador de documentos adicionales:
```jsx
{additionalDocs > 0 && !isReminder && (
  <Alert severity="info">
    <strong>📦 Nota:</strong> Este cliente tiene {totalDocs} documentos listos en total.
    {additionalDocs} ya fueron notificados anteriormente.
    Al enviar esta notificación se incluirán todos.
  </Alert>
)}
```

### `frontend/src/components/notifications/NotificationCenter.jsx`

**Nuevo:** Maneja y pasa las estadísticas del cliente:
```javascript
const [clientStats, setClientStats] = useState({});

// Al cargar datos
setClientStats(result.clientStats || {});

// Al renderizar
<ClientNotificationCard
  clientStats={clientStats[group.cliente.telefono]}
/>
```

---

## Ejemplos de Uso

### Escenario 1: Cliente con múltiples documentos nuevos

```javascript
// Documentos del cliente Juan Pérez:
// - Doc A (LISTO) - Notificación PENDING
// - Doc B (LISTO) - Notificación PENDING
// - Doc C (LISTO) - Notificación PENDING

// Usuario selecciona solo Doc A y hace clic en NOTIFICAR

// Resultado:
// - Mensaje de WhatsApp incluye A, B y C
// - Código de retiro único para los 3
// - Todas las notificaciones pasan a PREPARED
// - Modal muestra: "2 documentos adicionales consolidados"
```

### Escenario 2: Cliente con documentos mixtos

```javascript
// Documentos del cliente María López:
// - Doc A (LISTO) - Notificación SENT (hace 2 días)
// - Doc B (LISTO) - Notificación SENT (hace 2 días)
// - Doc C (LISTO) - Notificación PENDING (nuevo)

// Centro de Notificaciones muestra: "María López: 1 documento"
// Con indicador: "Tiene 3 documentos listos en total, 2 ya notificados"

// Usuario envía notificación del Doc C:
// - Mensaje incluye A, B y C (todos los LISTO)
// - Todos quedan con el nuevo código de retiro
// - El cliente recibe mensaje actualizado con todos
```

---

## Pruebas

### Pruebas Unitarias

Archivo: `backend/tests/notification-consolidation.test.js`

Casos cubiertos:
- ✅ Consolidación de múltiples documentos LISTO
- ✅ Actualización de notificaciones PENDING a PREPARED
- ✅ Prevención de duplicados
- ✅ Inclusión de documentos EN_PROCESO seleccionados
- ✅ Filtrado por rol (MATRIZADOR)

### Pruebas Manuales Recomendadas

1. **Crear 3 documentos para el mismo cliente**
2. **Marcar todos como LISTO**
3. **Verificar:** Centro de Notificaciones muestra "3 documentos"
4. **Seleccionar solo 1 y enviar notificación**
5. **Verificar:** 
   - Mensaje incluye los 3 documentos
   - Modal muestra "2 documentos adicionales consolidados"
   - Todos quedan con el mismo código

---

## Notas Técnicas

### Base de Datos

**Tabla `WhatsAppNotification`:**
- `status`: PENDING → PREPARED → SENT
- Un documento puede tener múltiples notificaciones (historial)
- Solo una debe estar en estado PENDING/PREPARED activo

**Tabla `Document`:**
- `codigoRetiro`: Se actualiza para todos los documentos consolidados
- `ultimoRecordatorio`: Se actualiza al enviar notificación

### Seguridad

- MATRIZADOR/ARCHIVO solo ven documentos asignados a ellos
- La consolidación respeta el filtro por assignedToId
- RECEPCION/ADMIN ven todos los documentos

---

## Fecha del Fix

**2026-02-03**

## Autor

Agente de Desarrollo
