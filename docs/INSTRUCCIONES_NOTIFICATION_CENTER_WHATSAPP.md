# 🚀 SISTEMA INTEGRAL DE NOTIFICACIONES WHATSAPP
## Notification Center - Sistema de Trazabilidad Notarial

**Versión:** 2.0 - Consolidada  
**Fecha:** Enero 2025  
**Objetivo:** Sistema de notificaciones de alto volumen (+1200 trámites/mes) con agrupación automática por cliente

---

## 📑 ÍNDICE

1. [Contexto y Problema](#1-contexto-y-problema)
2. [Arquitectura de la Solución](#2-arquitectura-de-la-solución)
3. [Fase de Limpieza (Cleanup)](#3-fase-de-limpieza-cleanup)
4. [Base de Datos](#4-base-de-datos)
5. [Backend - Endpoints](#5-backend---endpoints)
6. [Frontend - Utils](#6-frontend---utils)
7. [Frontend - Notification Center](#7-frontend---notification-center)
8. [Frontend - Modificaciones a Vistas Existentes](#8-frontend---modificaciones-a-vistas-existentes)
9. [Flujo de Entrega con Código](#9-flujo-de-entrega-con-código)
10. [Mensajes Internos (Alertas)](#10-mensajes-internos-alertas)
11. [Casos de Prueba](#11-casos-de-prueba)
12. [Criterios de Aceptación](#12-criterios-de-aceptación)

---

## 1. CONTEXTO Y PROBLEMA

### Problema Actual
- **Volumen alto:** +1200 trámites/mes
- **Proceso lento:** Interrumpe al operador cada vez que marca un documento como "Listo"
- **Agrupación manual:** Lógicas antiguas causan errores y confusión
- **Sin centralización:** Cada rol notifica por su cuenta sin visión global

### Solución: Separar Operación de Notificación

```
ANTES (Lento, interrumpe):
┌─────────────────────────────────────────────────────┐
│ Marcar Listo → Modal automático → Notificar → OK   │
│ (3-4 clics, espera, distracción)                   │
└─────────────────────────────────────────────────────┘

AHORA (Rápido, asíncrono):
┌─────────────────────────────────────────────────────┐
│ OPERATIVO: Marcar Listo (1 clic, < 1 segundo)      │
│            ↓                                        │
│ GESTIÓN: Notification Center agrupa automático     │
│            ↓                                        │
│ NOTIFICACIÓN: 1 mensaje por cliente (lote)         │
└─────────────────────────────────────────────────────┘
```

---

## 2. ARQUITECTURA DE LA SOLUCIÓN

### Flujo Completo

```
XML Importado (incluye teléfono)
        ↓
   EN_PROCESO
        ↓
   (Matrizador procesa)
        ↓
  LISTO_ENTREGA  ←── Acción instantánea, sin modal
        ↓
   [NOTIFICATION CENTER]
   - Agrupa automáticamente por cliente (identificación)
   - Genera código de retiro al notificar
        ↓
CLIENTE_NOTIFICADO ←── wa.me link abierto
        ↓
   (Cliente viene con código)
        ↓
    ENTREGADO ←── Validación visual del código
```

### Estados de Documentos

| Estado | Descripción | Visible en Notification Center |
|--------|-------------|-------------------------------|
| `EN_PROCESO` | Siendo procesado | ❌ No |
| `LISTO_ENTREGA` | Listo, nunca notificado | ✅ Tab "Por Notificar" |
| `CLIENTE_NOTIFICADO` | Notificado, pendiente retiro | ✅ Tab "Para Recordar" (si +X días) |
| `ENTREGADO` | Entregado al cliente | ❌ No (desaparece) |

### Permisos por Rol

| Rol | Notification Center | Ve documentos de | Puede entregar |
|-----|--------------------|--------------------|----------------|
| **ADMIN** | ✅ Acceso completo | Todos | Todos |
| **RECEPCION** | ✅ Acceso completo | Todos | Todos |
| **ARCHIVO** | ✅ Acceso limitado | Solo los suyos | Solo los suyos |
| **MATRIZADOR** | ✅ Acceso limitado | Solo los que procesó | Solo los que procesó |
| **CAJA** | ❌ Sin acceso | N/A | N/A |

> **Nota:** Si cliente quiere retirar documento de otro matrizador, debe ir a Recepción o contactar al matrizador correspondiente.

---

## 3. FASE DE LIMPIEZA (CLEANUP)

### 🗑️ Objetivo
Eliminar la deuda técnica de agrupación manual ANTES de implementar lo nuevo. Las columnas no tienen datos actualmente, es el momento ideal para limpiar.

### 3.1 Base de Datos - ELIMINAR Columnas Obsoletas

**Archivo:** `backend/prisma/schema.prisma`

**Crear migración para ELIMINAR estas 11 columnas:**

```sql
-- COLUMNAS A ELIMINAR (agrupación manual - sin datos):
documentGroupId
isGrouped
groupLeaderId
groupPosition
groupVerificationCode
groupCreatedAt
groupCreatedBy
groupDeliveredAt
groupDeliveredTo
individualDelivered
notificationPolicy
```

**Comando de migración:**
```bash
cd backend
npx prisma migrate dev --name cleanup_remove_group_columns
```

**Schema ANTES (eliminar estas líneas):**
```prisma
model Document {
  // ... otras columnas ...
  
  // ❌ ELIMINAR TODO ESTO:
  documentGroupId       String?
  isGrouped             Boolean   @default(false)
  groupLeaderId         String?
  groupPosition         Int?
  groupVerificationCode String?
  groupCreatedAt        DateTime?
  groupCreatedBy        Int?
  groupDeliveredAt      DateTime?
  groupDeliveredTo      String?
  individualDelivered   Boolean   @default(false)
  notificationPolicy    String?
}
```

**Schema DESPUÉS (columnas que SÍ se mantienen):**
```prisma
model Document {
  // Identificación
  id                       String    @id @default(uuid())
  protocolNumber           String
  
  // Cliente (viene del XML)
  clientName               String
  clientPhone              String?
  clientEmail              String?
  clientId                 String    // Cédula/RUC - CLAVE para agrupar automáticamente
  
  // Documento
  detalle_documento        String?
  comentarios_recepcion    String?
  documentType             String
  actoPrincipalDescripcion String?
  actoPrincipalValor       Decimal?
  totalFactura             Decimal?
  matrizadorName           String?
  itemsSecundarios         Json?
  xmlOriginal              String?
  
  // Estado y Trazabilidad
  status                   String    // EN_PROCESO, LISTO_ENTREGA, CLIENTE_NOTIFICADO, ENTREGADO
  fechaListo               DateTime? // Se llena al pasar a LISTO_ENTREGA
  ultimoRecordatorio       DateTime? // Se actualiza cada vez que se notifica
  fechaFactura             DateTime?
  
  // Código de Retiro (Seguridad)
  codigoRetiro             String?   // Código corto (ej: "X-921")
  
  // Datos de Entrega
  entregadoA               String?
  cedulaReceptor           String?
  relacionTitular          String?
  verificacionManual       Boolean   @default(false)
  facturaPresentada        Boolean?
  fechaEntrega             DateTime?
  usuarioEntregaId         Int?
  observacionesEntrega     String?
  
  // Notas de crédito
  notaCreditoMotivo        String?
  notaCreditoEstadoPrevio  String?
  notaCreditoFecha         DateTime?
  
  // Comunicación Interna
  alertaInterna            Boolean   @default(false)
  
  // Asignación
  assignedToId             Int?
  createdById              Int?
  
  // Pago (futuro)
  pagoConfirmado           Boolean   @default(false)
  
  // Timestamps
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}
```

### 3.2 Backend - ELIMINAR Servicio de Agrupación

**Archivo a ELIMINAR:** `backend/src/services/document-grouping-service.js`
- [ ] Eliminar el archivo completamente
- [ ] Buscar y eliminar todas las importaciones de este servicio
- [ ] Grep: `document-grouping-service` en todo el proyecto

**Archivo:** `backend/src/controllers/document-controller.js`
- [ ] Eliminar cualquier referencia a `documentGroupId`, `isGrouped`, etc.
- [ ] Eliminar validaciones que dependan de grupos
- [ ] Cada documento es independiente

**Buscar y eliminar en todo el backend:**
```bash
# Buscar referencias a columnas eliminadas
grep -r "documentGroupId" backend/src/
grep -r "isGrouped" backend/src/
grep -r "groupLeaderId" backend/src/
grep -r "groupPosition" backend/src/
grep -r "groupVerificationCode" backend/src/
grep -r "notificationPolicy" backend/src/
grep -r "individualDelivered" backend/src/
```

### 3.3 Frontend - ELIMINAR UI de Agrupación Manual

**Archivos a revisar:**
- `MatrizadorDashboard.jsx`
- `ListView.jsx`
- Cualquier componente con "Agrupar", "Crear Grupo", "Vincular"

**Acciones:**
- [ ] Eliminar checkboxes de selección para agrupar
- [ ] Eliminar botones "Agrupar", "Crear Grupo", "Vincular Trámites"
- [ ] Eliminar modales de agrupación
- [ ] El Matrizador solo debe tener: Guardar, Generar PDF, Cambiar Estado

**Buscar y eliminar en todo el frontend:**
```bash
# Buscar referencias a agrupación
grep -r "documentGroupId" frontend/src/
grep -r "isGrouped" frontend/src/
grep -r "groupLeader" frontend/src/
grep -r "Agrupar" frontend/src/
grep -r "Vincular" frontend/src/
```

### 3.4 Políticas de Notificación
- [ ] Eliminar cualquier lista blanca/negra de `tiposActo`
- [ ] TODO documento en estado `LISTO_ENTREGA` debe aparecer en Notification Center
- [ ] La agrupación ahora es AUTOMÁTICA por `clientId`, no manual

### 3.5 Checklist de Limpieza

```
□ Backup de BD antes de migración
□ Ejecutar migración Prisma (eliminar 11 columnas)
□ Eliminar document-grouping-service.js
□ Limpiar document-controller.js
□ Limpiar referencias en frontend
□ Probar que el sistema sigue funcionando
□ Verificar que no hay errores en consola
```

---

## 4. BASE DE DATOS

### Modelo Documento (Schema Limpio Post-Cleanup)

> **Nota:** Este schema asume que ya se ejecutó la Fase de Limpieza (Sección 3) que elimina las 11 columnas de agrupación manual.

```prisma
model Document {
  // Identificación
  id                       String    @id @default(uuid())
  protocolNumber           String    // Número de protocolo
  
  // Cliente (viene del XML de Koinor)
  clientName               String    // Nombre del cliente
  clientPhone              String?   // Teléfono (para WhatsApp)
  clientEmail              String?   // Email
  clientId                 String    // Cédula/RUC - CLAVE para agrupar automáticamente
  
  // Documento
  detalle_documento        String?
  comentarios_recepcion    String?
  documentType             String    // Tipo de documento
  actoPrincipalDescripcion String?   // Descripción del acto
  actoPrincipalValor       Decimal?  // Valor del acto
  totalFactura             Decimal?  // Total facturado
  matrizadorName           String?   // Nombre del matrizador (cache)
  itemsSecundarios         Json?     // Items secundarios del XML
  xmlOriginal              String?   // XML completo de Koinor
  
  // Estado y Trazabilidad
  status                   String    // EN_PROCESO, LISTO_ENTREGA, CLIENTE_NOTIFICADO, ENTREGADO
  fechaListo               DateTime? // Se llena automático al pasar a LISTO_ENTREGA
  ultimoRecordatorio       DateTime? // Se actualiza cada vez que se notifica
  fechaFactura             DateTime? // Fecha de la factura en Koinor
  
  // Código de Retiro (Seguridad)
  codigoRetiro             String?   // Código corto (ej: "X-921") generado al notificar
  
  // Datos de Entrega
  entregadoA               String?   // Nombre de quien retiró
  cedulaReceptor           String?   // Cédula de quien retiró
  relacionTitular          String?   // TITULAR, AUTORIZADO, FAMILIAR, etc.
  verificacionManual       Boolean   @default(false) // Si se entregó sin código
  facturaPresentada        Boolean?  // Si presentó factura física
  fechaEntrega             DateTime? // Cuándo se entregó
  usuarioEntregaId         Int?      // Quién entregó (User.id)
  observacionesEntrega     String?   // Notas de la entrega
  
  // Notas de Crédito
  notaCreditoMotivo        String?
  notaCreditoEstadoPrevio  String?
  notaCreditoFecha         DateTime?
  
  // Comunicación Interna (Alertas)
  alertaInterna            Boolean   @default(false)
  
  // Asignación
  assignedToId             Int?      // Matrizador asignado actualmente
  createdById              Int?      // Usuario que importó el documento
  
  // Pago (para futura integración)
  pagoConfirmado           Boolean   @default(false)
  
  // Timestamps
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
  
  // Relaciones
  assignedTo               User?     @relation("AssignedDocuments", fields: [assignedToId], references: [id])
  createdBy                User?     @relation("CreatedDocuments", fields: [createdById], references: [id])
  usuarioEntrega           User?     @relation("DeliveredDocuments", fields: [usuarioEntregaId], references: [id])
  events                   DocumentEvent[]
  
  @@index([clientId])        // Para agrupar por cliente
  @@index([status])          // Para filtrar por estado
  @@index([assignedToId])    // Para filtrar por matrizador
  @@index([fechaListo])      // Para ordenar por antigüedad
}
```

### Campo Nuevo: `mensajeInterno`

Si no existe, agregar para alertas internas:

```prisma
model Document {
  // ... otros campos ...
  
  // Comunicación Interna (Alertas)
  alertaInterna            Boolean   @default(false)
  mensajeInterno           String?   // Texto de la alerta entre empleados
}
```

### Modelo WhatsAppTemplate (Ya existe en Admin)

```prisma
model WhatsAppTemplate {
  id          String   @id @default(uuid())
  codigo      String   @unique // MSG_LISTO_SINGLE, MSG_LISTO_MULTI, MSG_RECORDATORIO
  nombre      String
  contenido   String   @db.Text 
  variables   String?  // JSON: ["NOMBRE_CLIENTE", "LISTA_DOCUMENTOS", "CODIGO_RETIRO"]
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Templates Requeridos en BD

| Código | Uso | Variables |
|--------|-----|-----------|
| `MSG_LISTO_SINGLE` | 1 documento listo | `{{NOMBRE_CLIENTE}}`, `{{TIPO_DOCUMENTO}}`, `{{NUMERO_DOCUMENTO}}`, `{{CODIGO_RETIRO}}` |
| `MSG_LISTO_MULTI` | Múltiples documentos | `{{NOMBRE_CLIENTE}}`, `{{CANTIDAD}}`, `{{LISTA_DOCUMENTOS}}`, `{{CODIGO_RETIRO}}` |
| `MSG_RECORDATORIO` | Recordatorio de retiro | `{{NOMBRE_CLIENTE}}`, `{{DIAS}}`, `{{LISTA_DOCUMENTOS}}`, `{{CODIGO_RETIRO}}` |

---

## 5. BACKEND - ENDPOINTS

### A. Obtener Cola de Notificaciones

**Endpoint:** `GET /api/notifications/queue`

**Permisos:** ADMIN, RECEPCION, ARCHIVO, MATRIZADOR

**Query Params:**
```
tab: 'pending' | 'reminders'  // Por Notificar vs Para Recordar
reminderDays: number          // Días para considerar recordatorio (default: 3)
```

**Lógica:**
```javascript
async function getNotificationQueue(req, res) {
  const { tab = 'pending', reminderDays = 3 } = req.query;
  const user = req.user;
  
  // Filtro base según tab
  let whereClause = {};
  
  if (tab === 'pending') {
    // Por Notificar: LISTO_ENTREGA (nunca notificados)
    whereClause.status = 'LISTO_ENTREGA';
  } else {
    // Para Recordar: CLIENTE_NOTIFICADO + más de X días
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reminderDays);
    
    whereClause.status = 'CLIENTE_NOTIFICADO';
    whereClause.ultimoRecordatorio = { lt: cutoffDate };
  }
  
  // Filtro por rol
  if (user.role === 'MATRIZADOR') {
    // Solo documentos que él procesó
    whereClause.assignedToId = user.id;
  } else if (user.role === 'ARCHIVO') {
    // Solo documentos que él procesó (usualmente él los marca como listo)
    whereClause.assignedToId = user.id;
  }
  // ADMIN y RECEPCION ven todos
  
  const documents = await prisma.documento.findMany({
    where: whereClause,
    orderBy: { fechaListo: 'asc' }, // FIFO: más antiguos primero
  });
  
  return res.json({
    success: true,
    data: documents,
    count: documents.length
  });
}
```

**Response:**
```json
{
  "success": true,
  "data": [/* documentos */],
  "count": 45
}
```

---

### B. Notificación Masiva (Bulk Notify)

**Endpoint:** `PUT /api/documents/bulk-notify`

**Permisos:** ADMIN, RECEPCION, ARCHIVO, MATRIZADOR

**Body:**
```json
{
  "documentIds": ["id1", "id2", "id3"],
  "clientId": "1791290151001",
  "clientPhone": "0991234567",
  "clientName": "PUNTONET S.A."
}
```

**Lógica:**
```javascript
async function bulkNotify(req, res) {
  const { documentIds, clientId, clientPhone, clientName } = req.body;
  const user = req.user;
  
  // 1. Validar que todos los documentos existen
  const documents = await prisma.documento.findMany({
    where: { id: { in: documentIds } }
  });
  
  if (documents.length !== documentIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Algunos documentos no existen'
    });
  }
  
  // 2. Validar que todos pertenecen al mismo cliente
  const uniqueClients = [...new Set(documents.map(d => d.clientId))];
  if (uniqueClients.length > 1) {
    return res.status(400).json({
      success: false,
      message: 'Los documentos deben ser del mismo cliente'
    });
  }
  
  // 3. Validar permisos por rol
  if (user.role === 'MATRIZADOR' || user.role === 'ARCHIVO') {
    const notOwned = documents.filter(d => d.assignedToId !== user.id);
    if (notOwned.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para notificar estos documentos'
      });
    }
  }
  
  // 4. Generar código de retiro ÚNICO para el lote
  const codigoRetiro = generateCodigoRetiro(); // Ej: "X-921"
  
  // 5. Actualizar todos los documentos
  await prisma.documento.updateMany({
    where: { id: { in: documentIds } },
    data: {
      status: 'CLIENTE_NOTIFICADO',
      codigoRetiro: codigoRetiro,
      ultimoRecordatorio: new Date()
    }
  });
  
  // 6. Crear auditoría
  await prisma.documentEvent.create({
    data: {
      tipo: 'NOTIFICACION_WHATSAPP',
      descripcion: `Notificación enviada a ${clientPhone || 'SIN TELÉFONO'}`,
      detalles: JSON.stringify({
        metodo: clientPhone ? 'WHATSAPP_CLICK_TO_CHAT' : 'SIN_TELEFONO',
        telefonoDestino: clientPhone,
        codigoRetiro: codigoRetiro,
        cantidadDocumentos: documentIds.length,
        documentIds: documentIds
      }),
      userId: user.id
    }
  });
  
  // 7. Obtener template de BD
  const template = await getTemplateForNotification(documents.length);
  
  // 8. Generar mensaje
  const message = fillTemplate(template, {
    NOMBRE_CLIENTE: clientName,
    CANTIDAD: documents.length,
    LISTA_DOCUMENTOS: generateDocumentListText(documents),
    CODIGO_RETIRO: codigoRetiro
  });
  
  // 9. Generar URL de WhatsApp (si tiene teléfono)
  let whatsappUrl = null;
  if (clientPhone) {
    const formattedPhone = formatPhoneForWhatsApp(clientPhone);
    whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  }
  
  return res.json({
    success: true,
    message: `${documentIds.length} documentos notificados`,
    data: {
      codigoRetiro: codigoRetiro,
      whatsappUrl: whatsappUrl,
      clientHasPhone: !!clientPhone,
      messagePreview: message,
      documentsUpdated: documentIds.length
    }
  });
}
```

---

### C. Endpoint de Entrega (Actualización)

**Endpoint:** `PUT /api/documents/deliver`

**Body:**
```json
{
  "documentIds": ["id1", "id2"],
  "entregadoA": "Juan Pérez",
  "cedulaReceptor": "1712345678",
  "relacionTitular": "TITULAR",
  "metodoValidacion": "CODIGO",
  "observaciones": "Cliente presentó cédula original"
}
```

**Valores de `metodoValidacion`:**
- `CODIGO`: Cliente dio código correcto
- `MANUAL`: Verificación manual (sin código)

**Lógica adicional si es MANUAL:**
```javascript
if (metodoValidacion === 'MANUAL') {
  // Requerir observaciones obligatorias
  if (!observaciones) {
    return res.status(400).json({
      success: false,
      message: 'Debe indicar motivo de verificación manual'
    });
  }
  
  // Marcar como verificación manual
  updateData.verificacionManual = true;
}
```

---

## 6. FRONTEND - UTILS

### Archivo: `frontend/src/utils/whatsappUtils.js`

```javascript
/**
 * Limpia y formatea número de teléfono ecuatoriano para WhatsApp
 * 
 * @param {string} phone - Número original
 * @returns {string|null} - Número formateado (593...) o null si inválido
 * 
 * Ejemplos:
 * - "0991234567" → "593991234567"
 * - "+593 99 123 4567" → "593991234567"
 * - "593991234567" → "593991234567"
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return null;
  
  // Limpiar: solo dígitos
  let cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 0, quitar y agregar 593
  if (cleaned.startsWith('0')) {
    cleaned = '593' + cleaned.substring(1);
  }
  
  // Si no empieza con 593, agregar
  if (!cleaned.startsWith('593')) {
    cleaned = '593' + cleaned;
  }
  
  // Validar longitud (593 + 9 dígitos = 12)
  if (cleaned.length !== 12) {
    return null;
  }
  
  return cleaned;
}

/**
 * Valida si un número es válido para Ecuador
 */
export function isValidEcuadorPhone(phone) {
  const formatted = formatPhoneForWhatsApp(phone);
  return formatted !== null;
}

/**
 * Agrupa documentos por cliente (identificación)
 * 
 * @param {Array} documents - Lista de documentos
 * @returns {Object} - Documentos agrupados por clientId
 */
export function groupDocumentsByClient(documents) {
  const groups = {};
  
  documents.forEach(doc => {
    const key = doc.clientId; // Agrupar SOLO por identificación
    
    if (!groups[key]) {
      groups[key] = {
        cliente: {
          nombre: doc.clientName,
          identificacion: doc.clientId,
          telefono: doc.clientPhone,
          email: doc.clientEmail
        },
        documentos: [],
        stats: {
          total: 0,
          porNotificar: 0,    // LISTO_ENTREGA
          paraRecordar: 0,     // CLIENTE_NOTIFICADO
          sinTelefono: !doc.clientPhone
        }
      };
    }
    
    groups[key].documentos.push(doc);
    groups[key].stats.total++;
    
    if (doc.status === 'LISTO_ENTREGA') {
      groups[key].stats.porNotificar++;
    } else if (doc.status === 'CLIENTE_NOTIFICADO') {
      groups[key].stats.paraRecordar++;
    }
    
    // Actualizar teléfono si este documento tiene y el grupo no
    if (doc.clientPhone && !groups[key].cliente.telefono) {
      groups[key].cliente.telefono = doc.clientPhone;
      groups[key].stats.sinTelefono = false;
    }
  });
  
  // Convertir a array y ordenar por fecha más antigua (FIFO)
  return Object.values(groups).sort((a, b) => {
    const fechaA = Math.min(...a.documentos.map(d => new Date(d.fechaListo || d.createdAt)));
    const fechaB = Math.min(...b.documentos.map(d => new Date(d.fechaListo || d.createdAt)));
    return fechaA - fechaB; // Más antiguos primero
  });
}

/**
 * Genera texto de lista de documentos para el mensaje
 */
export function generateDocumentListText(documents) {
  return documents
    .map((doc, index) => `${index + 1}. ${doc.actoPrincipalDescripcion || doc.documentType} - ${doc.protocolNumber}`)
    .join('\n');
}

/**
 * Rellena template con variables
 * 
 * @param {string} template - Template con {{VARIABLES}}
 * @param {Object} data - Datos para reemplazar
 */
export function fillTemplate(template, data) {
  let result = template;
  
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

/**
 * Genera URL de WhatsApp
 */
export function generateWhatsAppURL(phone, message) {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) return null;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Calcula días desde una fecha
 */
export function daysSince(date) {
  if (!date) return 0;
  const now = new Date();
  const then = new Date(date);
  const diffTime = Math.abs(now - then);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

---

## 7. FRONTEND - NOTIFICATION CENTER

### Nueva Vista: `NotificationCenter.jsx`

**Ubicación:** `frontend/src/components/notifications/NotificationCenter.jsx`

**Acceso desde menú:** Nueva sección "📱 Notificaciones" visible para ADMIN, RECEPCION, ARCHIVO, MATRIZADOR

### Estructura de la Vista

```
┌─────────────────────────────────────────────────────────────────┐
│ 📱 CENTRO DE NOTIFICACIONES                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tabs: [🆕 Por Notificar (45)]  [⏰ Para Recordar (12)]         │
│                                                                 │
│ Filtros: [Buscar cliente...] [Ordenar: Más antiguos ▼]         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 PUNTONET S.A.                                           │ │
│ │ 🆔 1791290151001                                           │ │
│ │ 📱 0991234567                                    3 docs 🆕  │ │
│ │                                                             │ │
│ │ 📄 Compraventa - 20251701018D00531        Hace 2 días      │ │
│ │ 📄 Compraventa - 20251701018D00532        Hace 2 días      │ │
│ │ 📄 Poder - 20251701018P02183              Hace 1 día       │ │
│ │                                                             │ │
│ │ [💬 NOTIFICAR (3)]                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 CARLOS MENDOZA                                    ⚠️    │ │
│ │ 🆔 0918273645                                              │ │
│ │ 📱 Sin teléfono                                   2 docs   │ │
│ │                                                             │ │
│ │ 📄 Hipoteca - 20251701018D00541           Hace 3 días      │ │
│ │ 📄 Cancelación - 20251701018D00542        Hace 3 días      │ │
│ │                                                             │ │
│ │ [💬 NOTIFICAR] ← GRIS, DESHABILITADO                       │ │
│ │ ⚠️ Sin teléfono: Se generará código pero no se enviará    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 MARÍA LÓPEZ                                             │ │
│ │ 🆔 1712345678                                              │ │
│ │ 📱 0987654321                                    1 doc ⏰   │ │
│ │                                                             │ │
│ │ 📄 Donación - 20251701018D00520           Hace 7 días      │ │
│ │    Código actual: X-445 (notificado hace 5 días)           │ │
│ │                                                             │ │
│ │ [🔔 RECORDAR]                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Props y Estado

```javascript
// Estado principal
const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'reminders'
const [documents, setDocuments] = useState([]);
const [groupedClients, setGroupedClients] = useState([]);
const [loading, setLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');

// Modal de notificación
const [showNotifyModal, setShowNotifyModal] = useState(false);
const [selectedGroup, setSelectedGroup] = useState(null);

// Cargar datos según tab
useEffect(() => {
  loadNotificationQueue(activeTab);
}, [activeTab]);

// Agrupar al cambiar documentos
useEffect(() => {
  const grouped = groupDocumentsByClient(documents);
  setGroupedClients(grouped);
}, [documents]);
```

### Componente: `ClientNotificationCard.jsx`

```javascript
function ClientNotificationCard({ group, onNotify, isReminder }) {
  const { cliente, documentos, stats } = group;
  const hasPhone = !!cliente.telefono;
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              👤 {cliente.nombre}
              {!hasPhone && <Chip label="⚠️ Sin teléfono" color="warning" size="small" sx={{ ml: 1 }} />}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🆔 {cliente.identificacion}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              📱 {cliente.telefono || 'Sin teléfono registrado'}
            </Typography>
          </Box>
          <Chip 
            label={`${documentos.length} docs ${isReminder ? '⏰' : '🆕'}`}
            color={isReminder ? 'warning' : 'primary'}
          />
        </Box>
        
        {/* Lista de documentos */}
        <Box sx={{ mt: 2 }}>
          {documentos.map(doc => (
            <Box key={doc.id} display="flex" justifyContent="space-between" py={0.5}>
              <Typography variant="body2">
                📄 {doc.actoPrincipalDescripcion || doc.documentType} - {doc.protocolNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hace {daysSince(doc.fechaListo)} días
                {doc.codigoRetiro && ` • Código: ${doc.codigoRetiro}`}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {/* Botón de acción */}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color={hasPhone ? (isReminder ? 'warning' : 'success') : 'inherit'}
            disabled={!hasPhone}
            onClick={() => onNotify(group)}
            startIcon={isReminder ? <NotificationsIcon /> : <WhatsAppIcon />}
          >
            {isReminder ? `RECORDAR (${documentos.length})` : `NOTIFICAR (${documentos.length})`}
          </Button>
          
          {!hasPhone && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
              ⚠️ Sin teléfono: Se generará código pero deberá notificar por otro medio
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
```

---

### Componente: `WhatsAppNotificationModal.jsx`

```javascript
function WhatsAppNotificationModal({ open, onClose, group, onConfirm, isReminder }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [messagePreview, setMessagePreview] = useState('');
  
  const { cliente, documentos } = group || {};
  const hasPhone = cliente?.telefono;
  
  // Cargar preview del mensaje al abrir
  useEffect(() => {
    if (open && group) {
      loadMessagePreview();
    }
  }, [open, group]);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await notificationService.bulkNotify({
        documentIds: documentos.map(d => d.id),
        clientId: cliente.identificacion,
        clientPhone: cliente.telefono,
        clientName: cliente.nombre
      });
      
      setResult(response.data);
      
      // Si tiene teléfono, abrir WhatsApp
      if (response.data.whatsappUrl) {
        window.open(response.data.whatsappUrl, '_blank');
      }
      
      // Callback para refrescar lista
      onConfirm && onConfirm(response.data);
      
    } catch (error) {
      console.error('Error al notificar:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {result ? '✅ Notificación Generada' : (isReminder ? '🔔 Enviar Recordatorio' : '📤 Confirmar Notificación')}
      </DialogTitle>
      
      <DialogContent>
        {!result ? (
          <>
            {/* Info del cliente */}
            <Box sx={{ mb: 3 }}>
              <Typography><strong>👤 Cliente:</strong> {cliente?.nombre}</Typography>
              <Typography><strong>🆔 Identificación:</strong> {cliente?.identificacion}</Typography>
              <Typography>
                <strong>📱 Teléfono:</strong> {cliente?.telefono || 'Sin teléfono'}
                {cliente?.telefono && ` → ${formatPhoneForWhatsApp(cliente.telefono)}`}
              </Typography>
            </Box>
            
            {/* Lista de documentos */}
            <Typography variant="subtitle2" gutterBottom>
              📄 Documentos a notificar ({documentos?.length}):
            </Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 3 }}>
              {documentos?.map((doc, i) => (
                <Typography key={doc.id} variant="body2">
                  {i + 1}. {doc.actoPrincipalDescripcion || doc.documentType} - {doc.protocolNumber}
                </Typography>
              ))}
            </Box>
            
            {/* Preview del mensaje */}
            <Typography variant="subtitle2" gutterBottom>📝 Vista previa del mensaje:</Typography>
            <Paper sx={{ p: 2, bgcolor: '#DCF8C6', maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {messagePreview}
              </Typography>
            </Paper>
            
            {/* Advertencias */}
            {!hasPhone && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Sin teléfono:</strong> Se generará el código de retiro pero deberá notificar al cliente por otro medio (email, llamada, presencial).
              </Alert>
            )}
            
            <Alert severity="info" sx={{ mt: 2 }}>
              Al confirmar:
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>Se generará un código de retiro único</li>
                <li>Los documentos cambiarán a estado "NOTIFICADO"</li>
                {hasPhone && <li>Se abrirá WhatsApp con el mensaje prellenado</li>}
                <li>Se registrará en el historial de auditoría</li>
              </ul>
            </Alert>
          </>
        ) : (
          /* Resultado exitoso */
          <Box textAlign="center">
            <Typography variant="h4" color="success.main" gutterBottom>
              ✅ Listo
            </Typography>
            
            <Paper sx={{ p: 3, bgcolor: 'success.light', mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                Código de Retiro: {result.codigoRetiro}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                El cliente debe presentar este código al retirar
              </Typography>
            </Paper>
            
            <Typography>
              {result.documentsUpdated} documento(s) actualizados a NOTIFICADO
            </Typography>
            
            {!result.clientHasPhone && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Recuerda notificar al cliente por otro medio (email, llamada, etc.)
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        {!result ? (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button 
              variant="contained" 
              color={hasPhone ? 'success' : 'primary'}
              onClick={handleConfirm}
              disabled={loading}
              startIcon={hasPhone ? <WhatsAppIcon /> : <CheckIcon />}
            >
              {loading ? 'Procesando...' : (hasPhone ? 'ABRIR WHATSAPP Y ENVIAR' : 'GENERAR CÓDIGO')}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

---

## 8. FRONTEND - MODIFICACIONES A VISTAS EXISTENTES

### A. RecepcionMain.jsx / DocumentosListos.jsx

**Cambio:** Quitar modal automático al marcar "Listo"

```javascript
// ANTES (con modal):
const handleMarcarListo = async (docId) => {
  await updateStatus(docId, 'LISTO_ENTREGA');
  setShowNotifyModal(true); // ← ELIMINAR
};

// DESPUÉS (sin modal, solo toast):
const handleMarcarListo = async (docId) => {
  await updateStatus(docId, 'LISTO_ENTREGA');
  toast.success('✅ Documento listo. Visible en Centro de Notificaciones');
};
```

### B. Menú Lateral

**Agregar nueva sección:**

```javascript
// Para ADMIN, RECEPCION:
{ 
  icon: <NotificationsIcon />, 
  label: 'Notificaciones', 
  path: '/notifications',
  badge: pendingCount // Contador de pendientes
}

// Para MATRIZADOR, ARCHIVO:
{ 
  icon: <NotificationsIcon />, 
  label: 'Mis Notificaciones', 
  path: '/notifications',
  badge: myPendingCount // Solo sus documentos
}
```

### C. ModalEntrega.jsx (Ventanilla)

**Mostrar código de retiro prominentemente:**

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 ENTREGA DE DOCUMENTO                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📋 Compraventa - 20251701018D00531                         │
│ 👤 Cliente: PUNTONET S.A.                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │           CÓDIGO DE RETIRO                              │ │
│ │                                                         │ │
│ │              X - 9 2 1                                  │ │
│ │                                                         │ │
│ │   ¿El cliente proporcionó este código?                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ○ Sí, código correcto                                      │
│ ○ No tiene código (verificación manual)                    │
│                                                             │
│ Si verificación manual:                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Motivo: [________________________________]              │ │
│ │ □ Presentó cédula original                              │ │
│ │ □ Presentó factura                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Datos de quien retira:                                     │
│ Nombre: [__________________________]                       │
│ Cédula: [__________________________]                       │
│ Relación: [Titular ▼]                                      │
│                                                             │
│ [CANCELAR]                         [✅ CONFIRMAR ENTREGA]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. FLUJO DE ENTREGA CON CÓDIGO

### Flujo Normal (Con Código)

```
1. Cliente llega: "Vengo a retirar mi escritura"
2. Operador pregunta: "¿Tiene el código de retiro?"
3. Cliente: "Sí, es X-921"
4. Operador busca documento → Ve código X-921 en pantalla
5. Coincide → Procede con entrega
6. Registra datos del receptor → Estado: ENTREGADO
```

### Flujo Alternativo (Sin Código)

```
1. Cliente: "No tengo código / No me llegó mensaje"
2. Operador marca "Verificación Manual"
3. Sistema exige:
   - Motivo de verificación manual
   - Al menos una verificación (cédula o factura)
4. Operador verifica identidad físicamente
5. Procede con entrega → Se registra como verificación manual
```

### Validación del Código

**Importante:** La validación es VISUAL, no automática.

```javascript
// El sistema NO valida automáticamente el código
// Solo muestra el código en pantalla para que el operador compare

// En ModalEntrega.jsx:
<Typography variant="h2" textAlign="center" fontFamily="monospace">
  {documento.codigoRetiro || 'SIN CÓDIGO'}
</Typography>
<Typography variant="body2" color="text.secondary" textAlign="center">
  Verifique que el cliente proporcione este código
</Typography>
```

---

## 10. MENSAJES INTERNOS (ALERTAS)

### Propósito
Permitir comunicación entre empleados sobre trámites específicos, especialmente para alertas de demora.

### Campo en Base de Datos

```prisma
model Documento {
  // ... otros campos ...
  alertaInterna    Boolean  @default(false)
  mensajeInterno   String?  // Texto de la alerta
}
```

### Casos de Uso

```
┌─────────────────────────────────────────────────────────────┐
│ ALERTAS INTERNAS                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️ Trámite demorado (más de 5 días en proceso)             │
│    → Recepción pregunta a Matrizador: "¿Qué pasó?"         │
│                                                             │
│ 🔴 Cliente esperando en ventanilla                         │
│    → Recepción alerta a Matrizador: "Cliente presente"     │
│                                                             │
│ 📋 Documento con observaciones                             │
│    → Matrizador notifica: "Falta firma del cónyuge"        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI Simplificada

En la vista de documento, agregar botón de alerta:

```javascript
<IconButton 
  onClick={() => setShowAlertModal(true)}
  color={documento.alertaInterna ? 'warning' : 'default'}
>
  <Badge badgeContent={documento.alertaInterna ? '!' : null} color="error">
    <NotificationIcon />
  </Badge>
</IconButton>
```

### Modal de Alerta Interna

```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 CREAR ALERTA INTERNA                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Trámite: 20251701018D00531 (Compraventa)                   │
│ Asignado a: María Pérez (Matrizador)                       │
│                                                             │
│ Mensaje rápido:                                            │
│ ○ ¿Cuál es el estado de este trámite?                      │
│ ○ Cliente preguntando por este documento                   │
│ ○ Urgente: Cliente esperando en ventanilla                 │
│ ○ Otro: [________________________________]                 │
│                                                             │
│ [CANCELAR]                              [📤 ENVIAR ALERTA] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visualización de Alertas

El matrizador ve un indicador en su dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 20251701018D00531                          🔔 ALERTA    │
│ Compraventa - PUNTONET S.A.                                │
│                                                             │
│ ⚠️ "Cliente esperando en ventanilla" - Juan (Recepción)   │
│    Hace 5 minutos                                          │
│                                                             │
│ [VER TRÁMITE] [MARCAR COMO LEÍDO]                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. CASOS DE PRUEBA

### Notification Center

| # | Caso | Resultado Esperado |
|---|------|-------------------|
| 1 | Admin abre Notification Center | Ve todos los documentos pendientes |
| 2 | Matrizador abre Notification Center | Solo ve sus documentos asignados |
| 3 | Tab "Por Notificar" | Solo muestra LISTO_ENTREGA |
| 4 | Tab "Para Recordar" | Solo muestra CLIENTE_NOTIFICADO con +3 días |
| 5 | Cliente con 5 docs listos | Aparece 1 tarjeta con 5 documentos |
| 6 | Cliente sin teléfono | Botón gris, mensaje de advertencia |
| 7 | Click en "Notificar" | Abre modal de confirmación |
| 8 | Confirmar notificación | Genera código, abre WhatsApp, actualiza estados |
| 9 | Cliente con diferentes teléfonos | Usa el más reciente |
| 10 | Ordenamiento | Más antiguos (FIFO) aparecen primero |

### Entrega

| # | Caso | Resultado Esperado |
|---|------|-------------------|
| 11 | Cliente da código correcto | Permite entrega normal |
| 12 | Cliente sin código | Requiere verificación manual con motivo |
| 13 | Documento sin codigoRetiro | Muestra "SIN CÓDIGO", permite entrega manual |
| 14 | Entrega parcial (2 de 3 docs) | Solo los 2 cambian a ENTREGADO |
| 15 | Código del lote sigue válido | Tercer doc mantiene mismo código |

### Mensajes Internos

| # | Caso | Resultado Esperado |
|---|------|-------------------|
| 16 | Recepción crea alerta | Documento muestra indicador de alerta |
| 17 | Matrizador ve alerta | Badge en dashboard, puede ver mensaje |
| 18 | Marcar como leído | Alerta desaparece del badge |

---

## 12. CRITERIOS DE ACEPTACIÓN

### ✅ Productividad
- [ ] Marcar "Listo" es instantáneo (< 1 segundo, sin modal)
- [ ] Notificación es asíncrona y agrupada por cliente
- [ ] Operador no es interrumpido al procesar documentos

### ✅ Limpieza
- [ ] No queda UI de agrupación manual en Matrizador
- [ ] Columnas obsoletas no se usan en código nuevo
- [ ] Templates vienen de BD, no hardcodeados

### ✅ Seguridad
- [ ] Código de retiro se genera y persiste al notificar
- [ ] Código se muestra prominentemente al entregar
- [ ] Verificación manual requiere motivo obligatorio

### ✅ Resiliencia
- [ ] Se puede entregar sin código (verificación manual)
- [ ] Cliente sin teléfono igual puede ser notificado (genera código)
- [ ] Recordatorios mantienen el mismo código

### ✅ Multi-Rol
- [ ] ADMIN y RECEPCION ven todos los documentos
- [ ] MATRIZADOR y ARCHIVO ven solo los suyos
- [ ] CAJA no tiene acceso al Notification Center

### ✅ Volumen
- [ ] Sistema maneja +1200 documentos/mes sin degradación
- [ ] Agrupación automática es eficiente (O(n))
- [ ] Paginación si hay muchos clientes pendientes

---

## 📁 RESUMEN DE ARCHIVOS

### Crear Nuevos
- `frontend/src/components/notifications/NotificationCenter.jsx`
- `frontend/src/components/notifications/ClientNotificationCard.jsx`
- `frontend/src/components/notifications/WhatsAppNotificationModal.jsx`
- `frontend/src/services/notification-service.js`
- `backend/src/controllers/notification-center-controller.js` (o integrar en existente)
- `backend/src/routes/notification-routes.js`

### Modificar
- `frontend/src/utils/whatsappUtils.js` - Agregar funciones de agrupación
- `frontend/src/components/recepcion/DocumentosListos.jsx` - Quitar modal automático
- `frontend/src/components/recepcion/ModalEntrega.jsx` - Mostrar código prominente
- `frontend/src/components/layout/Sidebar.jsx` - Agregar menú Notificaciones
- `backend/src/controllers/document-controller.js` - Limpiar referencias a grupos
- `backend/prisma/schema.prisma` - Eliminar 11 columnas obsoletas, agregar `mensajeInterno`

### ELIMINAR Completamente
- `backend/src/services/document-grouping-service.js` - Eliminar archivo
- Cualquier UI de "Agrupar", "Crear Grupo", "Vincular Trámites" en frontend
- Referencias a columnas: `documentGroupId`, `isGrouped`, `groupLeaderId`, `groupPosition`, `groupVerificationCode`, `groupCreatedAt`, `groupCreatedBy`, `groupDeliveredAt`, `groupDeliveredTo`, `individualDelivered`, `notificationPolicy`

---

## 🚀 ORDEN DE IMPLEMENTACIÓN SUGERIDO

```
FASE 1: LIMPIEZA (Día 1)
├── Backup de BD
├── Migración Prisma (eliminar columnas)
├── Eliminar document-grouping-service.js
├── Limpiar referencias en backend
└── Limpiar UI de agrupación en frontend

FASE 2: UTILS Y BACKEND (Día 2)
├── Actualizar whatsappUtils.js
├── Crear/actualizar endpoint GET /api/notifications/queue
├── Crear/actualizar endpoint PUT /api/documents/bulk-notify
└── Actualizar endpoint PUT /api/documents/deliver

FASE 3: FRONTEND - NOTIFICATION CENTER (Día 3-4)
├── Crear NotificationCenter.jsx
├── Crear ClientNotificationCard.jsx
├── Crear WhatsAppNotificationModal.jsx
├── Agregar al menú lateral
└── Configurar permisos por rol

FASE 4: MODIFICACIONES EXISTENTES (Día 5)
├── Quitar modal automático de DocumentosListos.jsx
├── Actualizar ModalEntrega.jsx con código prominente
└── Agregar campo mensajeInterno para alertas

FASE 5: TESTING (Día 6)
├── Probar flujo completo por rol
├── Verificar agrupación automática
├── Probar notificación y entrega
└── Probar casos sin teléfono
```

---

**Fin del documento**
