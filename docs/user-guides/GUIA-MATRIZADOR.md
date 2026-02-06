# 📝 Guía del Matrizador

Bienvenido a la guía de usuario para el rol de **Matrizador**. Aquí aprenderás a gestionar documentos, actualizar estados y notificar a clientes.

---

## 📋 Responsabilidades del Matrizador

- Procesar documentos asignados
- Cambiar estados de documentos (En Proceso → Listo)
- Notificar a clientes vía WhatsApp cuando los documentos estén listos
- Mantener actualizado el estado de pago de documentos

---

## 🚀 Acceso al Sistema

1. Ingresa a: `https://notaria-segura.railway.app`
2. Usa tu correo y contraseña
3. Serás dirigido automáticamente a tu **Panel de Matrizador**

---

## 📊 Panel Principal (Mi Portafolio)

Al ingresar, verás tu panel de trabajo:

```
┌────────────────────────────────────────────────────────────┐
│  📊 MI PORTAFOLIO - Matrizador                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📈 Estadísticas Rápidas                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ En Proceso  │ │    Listos   │ │  Entregados │          │
│  │     5       │ │     3       │ │    12       │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  📋 Mis Documentos                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🔍 Buscar...    [Filtros ▼]    [Recargar ↻]        │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ Protocolo      Cliente           Estado    Acciones │ │
│  │ ─────────────────────────────────────────────────── │ │
│  │ 001-2025-0001  Juan Pérez       🔵 En Proceso  [📋] │ │
│  │ 001-2025-0002  María López      🟢 Listo      [📋] │ │
│  │ 001-2025-0003  Carlos Ruiz      💰 Pendiente   [📋] │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Columnas Importantes

| Columna | Descripción |
|---------|-------------|
| **Protocolo** | Número de protocolo del documento |
| **Cliente** | Nombre del compareciente |
| **Estado** | Estado actual del documento (color codificado) |
| **Factura** | Estado de pago de la factura asociada |
| **Acciones** | Botones para ver detalles y realizar acciones |

---

## 📋 Ver Detalle de un Documento

Para ver toda la información de un documento:

1. En la lista de documentos, haz clic en el botón **📋 Ver** o en la fila del documento
2. Se abrirá la pantalla de detalle:

```
┌────────────────────────────────────────────────────────────┐
│  📄 Detalle del Documento                                 │
│  Protocolo: 001-2025-0001                                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 INFORMACIÓN GENERAL                                    │
│  ─────────────────────────────────────────────────────   │
│  Cliente: Juan Pérez López                                │
│  Tipo de Documento: Escritura Pública                     │
│  Estado Actual: 🔵 EN PROCESO                             │
│  Asignado a: [Tu nombre]                                  │
│                                                             │
│  💰 INFORMACIÓN DE PAGO                                    │
│  ─────────────────────────────────────────────────────   │
│  Factura: 001-002-000123456                               │
│  Total: $150.00                                           │
│  Estado: ⏳ PENDIENTE DE PAGO                              │
│                                                             │
│  📱 NOTIFICACIONES                                         │
│  ─────────────────────────────────────────────────────   │
│  WhatsApp: ✅ Enviado (06/02/2025 10:30)                  │
│                                                             │
│  📜 HISTORIAL                                              │
│  ─────────────────────────────────────────────────────   │
│  [06/02 09:00] Documento asignado a Matrizador           │
│  [05/02 16:30] Documento registrado en sistema           │
│                                                             │
│  [🟢 Marcar como Listo]  [📱 Reenviar WhatsApp]          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🟢 Marcar Documento como "Listo"

Cuando termines de procesar un documento:

### Paso 1: Cambiar Estado
1. Abre el detalle del documento
2. Haz clic en el botón **🟢 Marcar como Listo**
3. El sistema pedirá confirmación

### Paso 2: Confirmar Acción
```
┌─────────────────────────────────────┐
│  ⚠️ Confirmar Cambio de Estado     │
├─────────────────────────────────────┤
│                                     │
│  ¿Estás seguro de marcar como      │
│  LISTO el documento?               │
│                                     │
│  Protocolo: 001-2025-0001          │
│  Cliente: Juan Pérez               │
│                                     │
│  [❌ Cancelar]  [✅ Confirmar]     │
│                                     │
└─────────────────────────────────────┘
```

### Paso 3: Notificación Automática

**Si el documento NO tiene factura pendiente:**
- ✅ El sistema envía WhatsApp automáticamente al cliente
- 📱 El cliente recibe: código de 4 dígitos para retiro

**Si el documento TIENE factura pendiente:**
- ⏳ El documento queda en "Pendiente de Pago"
- 📱 NO se envía WhatsApp hasta que se confirme el pago

---

## 📱 Enviar/Reenviar Notificación WhatsApp

### Cuándo Reenviar
- El cliente no recibió el mensaje
- El número de teléfono fue corregido
- El cliente solicita el código nuevamente

### Cómo Reenviar
1. Abre el detalle del documento
2. Haz clic en **📱 Reenviar WhatsApp**
3. Confirma la acción

### Mensaje que Recibe el Cliente
```
NOTARÍA SEGURA

Estimado/a Juan Pérez,

Su documento está listo para retiro:

📄 Escritura Pública
🔢 Protocolo: 001-2025-0001
💰 Estado: Pagado

🎫 CÓDIGO DE RETIRO: 7842

Presente este código en recepción.

Gracias por preferirnos.
```

---

## 💰 Gestionar Estado de Pago

### Verificar si hay Pago

En el detalle del documento, revisa la sección **Información de Pago**:

| Indicador | Significado | Acción |
|-----------|-------------|--------|
| ⏳ **Pendiente** | Cliente no ha pagado | Esperar pago o cobrar |
| 💳 **Parcial** | Pagó parte | Verificar saldo pendiente |
| ✅ **Pagado** | Pago completo | Proceder con entrega |

### Actualizar Estado de Pago (si es necesario)

> ⚠️ **Nota:** Generalmente el estado de pago se actualiza automáticamente desde el sistema de facturación.

Si necesitas reportar un pago manual:
1. Contacta a **CAJA** para que registren el pago
2. El sistema se actualizará automáticamente

---

## 🔍 Buscar Documentos

### Búsqueda Global
En la parte superior de la página:
1. Escribe nombre del cliente, número de protocolo o factura
2. Presiona Enter
3. Selecciona el documento de los resultados

### Filtros en Mi Portafolio

Haz clic en **Filtros ▼** para filtrar por:

| Filtro | Opciones |
|--------|----------|
| **Estado** | Todos, En Proceso, Listo, Pendiente Pago, Entregado |
| **Fecha** | Hoy, Esta semana, Este mes, Rango personalizado |
| **Tipo** | Escritura, Poder, etc. |

---

## 📊 Reportes del Matrizador

Para ver tu productividad:

1. Ve a **Reportes** en el menú lateral
2. Selecciona **Mi Productividad**
3. Elige el rango de fechas

**Datos disponibles:**
- Documentos procesados por día/semana/mes
- Tiempo promedio de procesamiento
- Documentos entregados

---

## ⚠️ Problemas Comunes

### "No puedo marcar como Listo"
**Causa:** El documento ya está marcado como Listo o Entregado
**Solución:** Verifica el estado actual en el detalle

### "No se envió el WhatsApp"
**Causas posibles:**
- ❌ El cliente no tiene número registrado
- ❌ El número está mal escrito
- ❌ El documento tiene factura pendiente

**Solución:**
1. Verifica el número en el detalle del documento
2. Si está mal, contacta al ADMIN para corregir
3. Si tiene factura pendiente, esperar pago

### "El cliente dice que no recibió el código"
**Solución:**
1. Abre el detalle del documento
2. Haz clic en **📱 Reenviar WhatsApp**
3. Verifica que el número sea correcto

### "El documento no aparece en mi lista"
**Causa:** No te está asignado
**Solución:** Contacta al ADMIN para que te asigne el documento

---

## 💡 Consejos de Productividad

### 🎯 Organización Diaria
1. **Por la mañana:** Revisa documentos "En Proceso"
2. **Durante el día:** Actualiza estados conforme avanzas
3. **Por la tarde:** Verifica documentos "Listos" pendientes de notificación

### 📱 Comunicación con Clientes
- Usa el WhatsApp del sistema (no tu personal)
- El código de 4 dígitos es único por documento
- Si el cliente pierde el código, puedes reenviarlo

### 🔄 Flujo Ideal de Trabajo
```
Documento Asignado → Procesar → Marcar Listo 
                                          ↓
Entregado ← Cliente retira ← WhatsApp automático
```

---

## 📞 Contactos de Soporte

| Problema | Contactar |
|----------|-----------|
| No puedo iniciar sesión | ADMIN |
| Error al cambiar estado | ADMIN |
| Número de cliente incorrecto | ADMIN o CAJA |
| Problemas con WhatsApp | ADMIN |
| Duda sobre factura/pago | CAJA |

---

*Última actualización: Febrero 2025*
