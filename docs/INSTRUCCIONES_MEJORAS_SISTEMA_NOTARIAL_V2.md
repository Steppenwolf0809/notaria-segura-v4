# 🔧 MEJORAS DEL SISTEMA DE TRAZABILIDAD NOTARIAL - Instrucciones para Cursor

## 📋 RESUMEN EJECUTIVO

Este documento contiene las instrucciones para implementar mejoras críticas al Sistema de Trazabilidad Notarial en dos fases. La Fase 1 se enfoca en el Centro de Notificaciones y la Fase 2 en mejoras generales de UX en todos los roles.

---

## 🔴 FASE 1: CENTRO DE NOTIFICACIONES

### CONTEXTO
El Centro de Notificaciones ya está creado y funciona parcialmente. Los problemas identificados afectan la operación diaria de envío de mensajes WhatsApp a clientes.

**Tecnología de Envío:** Links `wa.me` que abren WhatsApp Web directamente.
- **Ventaja:** Sin restricciones de templates, total flexibilidad en formato
- **Formato:** `https://wa.me/593XXXXXXXXX?text=MENSAJE_ENCODED`
- **El mensaje debe ser encoded con `encodeURIComponent()`**

### ARCHIVOS DE CONTEXTO REQUERIDOS

**🔴 CRÍTICOS (analizar primero):**
- `frontend/src/components/matrizador/CentroNotificaciones.jsx` - Componente principal
- `backend/src/services/whatsapp-service.js` - Servicio que genera links wa.me
- `backend/prisma/schema.prisma` - Modelos de datos (plantillas, notificaciones)

**🟡 IMPORTANTES:**
- `frontend/src/services/notification-service.js` - Llamadas API de notificaciones
- `backend/src/controllers/notification-controller.js` - Controlador de notificaciones
- `backend/src/controllers/admin-whatsapp-templates-controller.js` - Gestión de plantillas
- `backend/src/routes/notification-routes.js` - Rutas de notificaciones

**🟢 OPCIONALES:**
- `frontend/src/components/admin/WhatsappTemplates.jsx` - UI de plantillas admin
- `backend/src/utils/phone-validator.js` - Si existe, validación de teléfonos

---

### PROBLEMA 1.1: Conectar Plantillas de Mensajes con las de Administración

**Descripción:**
Actualmente los mensajes que se envían desde el Centro de Notificaciones NO usan las plantillas configuradas en la sección de Administración. Deben estar conectados.

**Contexto Técnico:**
- El sistema usa links `wa.me` para abrir WhatsApp Web directamente
- NO hay restricciones de Twilio - total flexibilidad en formato de mensaje
- Las plantillas se configuran en Administración → WhatsApp Templates

**Resultado Esperado:**
1. El Centro de Notificaciones debe consultar las plantillas activas desde la BD
2. Usar la plantilla activa para tipo "documento_listo" 
3. Reemplazar variables dinámicamente:
   - `{{NOMBRE_CLIENTE}}` = Nombre del cliente
   - `{{TIPO_DOCUMENTO}}` = PROTOCOLO, DILIGENCIA, etc.
   - `{{CODIGO_DOCUMENTO}}` = Número de escritura (ej: 20251701018P00011)
   - `{{TIPO_ACTO}}` = DELEGACIÓN PODER GENERAL, CANCELACIÓN DE HIPOTECA, etc.
   - `{{CODIGO_RETIRO}}` = Código de 4 dígitos para seguridad
   - `{{NUM_DOCUMENTOS}}` = Cantidad de documentos del cliente

**Validación:**
- Si no hay plantilla activa, mostrar error al usuario antes de intentar enviar
- El mensaje debe construirse dinámicamente desde la plantilla guardada

---

### PROBLEMA 1.2: Formato del Mensaje - Mejorar Diseño

**Descripción:**
El formato actual del mensaje de WhatsApp perdió información importante. Se necesita un formato más completo y profesional.

**Formato Deseado (sin restricciones, usando wa.me):**

```
🏛️ NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO

Estimado/a {{NOMBRE_CLIENTE}},

Sus documentos están listos para retiro:
📄 Documento: {{TIPO_DOCUMENTO}}
📝 Acto: {{TIPO_ACTO}}
🔢 Código de escritura: {{CODIGO_DOCUMENTO}}
📊 Número de documentos: {{NUM_DOCUMENTOS}}

🔑 Código de retiro: {{CODIGO_RETIRO}}

⚠️ IMPORTANTE: Presente este código al momento del retiro.

📍 Dirección: Azuay E2-231 y Av Amazonas, Quito
🕐 Horario: Lunes a Viernes 8:00-17:00

¡Gracias por confiar en nosotros!
```

**Variables Disponibles:**
- `{{NOMBRE_CLIENTE}}` - Nombre completo
- `{{TIPO_DOCUMENTO}}` - PROTOCOLO o DILIGENCIA
- `{{TIPO_ACTO}}` - Nombre del acto (DELEGACIÓN PODER, COMPRAVENTA, etc.)
- `{{CODIGO_DOCUMENTO}}` - Código de barras/escritura
- `{{NUM_DOCUMENTOS}}` - Cantidad de documentos agrupados
- `{{CODIGO_RETIRO}}` - Código de 4 dígitos generado
- `{{FECHA}}` - Fecha actual
- `{{CEDULA}}` - Cédula/RUC del cliente

**Implementación:**
1. Generar código de retiro de 4 dígitos al marcar documento como "listo"
2. Almacenar código en BD para validación posterior en entrega
3. El código de retiro es para seguridad adicional (diferente al OTP eliminado)
4. La plantilla debe ser editable desde Administración

---

### PROBLEMA 1.3: Integrar Encuesta de Satisfacción

**Descripción:**
Anteriormente se enviaba un mensaje de entrega con link para encuestas. Esta funcionalidad se perdió. Se propone integrarla en el mensaje de "documento listo" ya que el cliente puede dar su feedback en ese momento.

**Implementación:**
1. Crear formulario de encuesta simple en el dominio de la notaría: `https://notaria18quito.com.ec/encuesta`
2. El formulario debe ser público (sin autenticación)
3. Campos sugeridos:
   - Calificación (1-5 estrellas)
   - Comentario (opcional)
   - Código de documento (para tracking, opcional)

4. Agregar link al mensaje de notificación:
   ```
   📝 Tu opinión nos importa: https://notaria18quito.com.ec/encuesta
   ```

5. Almacenar respuestas en tabla `EncuestasSatisfaccion`

**Nota:** Con wa.me no hay restricciones de links, se puede incluir directamente en el mensaje.

---

### PROBLEMA 1.4: Validación de Números de WhatsApp

**Descripción Crítica:**
El sistema NO valida si un número de teléfono es válido para WhatsApp. Cuando se intenta enviar a un número inválido:
- El link `wa.me` no abre correctamente o abre sin destinatario
- El documento desaparece de la pestaña "Por Notificar" como si se hubiera enviado
- NO se puede reenviar el mensaje
- Se pierde el tracking del documento

**Contexto de la Interfaz Actual (ver imagen):**
- Muestra badge "⚠️ 5 sin teléfono" - esto es bueno pero necesita mejoras
- Los clientes sin teléfono válido deben ser claramente identificados
- No hay forma de reenviar después de marcar como "notificado"

**Solución Requerida:**

**A) Validación Pre-envío:**
1. Antes de generar el link wa.me, validar formato del número:
   - Debe tener formato ecuatoriano: 09XXXXXXXX (10 dígitos) o +593 9XXXXXXXX
   - No puede estar vacío
   - No puede tener caracteres no numéricos (excepto + inicial)
   - Detectar números claramente inválidos (muy cortos, con letras, etc.)
2. Mostrar advertencia visual clara si el número parece inválido
3. Permitir editar el número antes de enviar (ver Problema 1.5)
4. NO permitir enviar a números vacíos o claramente inválidos

**B) Crear Pestaña "ENVIADOS" para Reenvío:**
1. Nueva pestaña en Centro de Notificaciones: "ENVIADOS" (junto a POR NOTIFICAR y PARA RECORDAR)
2. Lista de documentos con notificación enviada
3. Columnas: Cliente, Teléfono, Fecha Envío, Estado
4. Botón "Reenviar" para cada documento
5. Filtros por fecha
6. Esto permite reenviar si el mensaje no llegó o hubo error

**C) Mejorar manejo de estado:**
1. Al hacer clic en "NOTIFICAR" → marcar como "notificacion_enviada" 
2. El documento debe pasar a pestaña "ENVIADOS", no desaparecer
3. Desde "ENVIADOS" se puede reenviar si es necesario

---

### PROBLEMA 1.5: Editar Teléfono Antes de Enviar

**Descripción:**
El usuario debe poder editar el número de teléfono directamente en el Centro de Notificaciones antes de enviar la notificación. Casos de uso:
- Cliente cambió de número
- Número incorrecto en el sistema original
- Error de digitación

**Implementación:**
1. En la fila de cada cliente, hacer el número de teléfono editable (inline edit o modal)
2. Al modificar: actualizar en BD del documento
3. Validar formato antes de guardar
4. Mostrar icono de "editado" si el número fue modificado
5. Log de auditoría: registrar cambio de teléfono con usuario y timestamp

**UI Sugerida:**
```
[📞 0987654321] [✏️ Editar] [📤 Enviar WhatsApp]
```
Al hacer clic en "Editar" → Campo se vuelve editable → [Guardar] [Cancelar]

---

## 🟡 FASE 2: MEJORAS GENERALES DE UX

### ARCHIVOS DE CONTEXTO REQUERIDOS

**🔴 CRÍTICOS:**
- `frontend/src/components/recepcion/RecepcionDashboard.jsx` - Dashboard recepción
- `frontend/src/components/matrizador/DocumentosUnificados.jsx` - Gestión documentos
- `frontend/src/components/shared/DataTable.jsx` o similar - Componente de tablas
- `frontend/src/styles/` o archivos CSS/Theme - Estilos y modo oscuro

**🟡 IMPORTANTES:**
- `frontend/src/context/ThemeContext.jsx` - Contexto de tema
- Cualquier componente que use filtros y tablas

---

### PROBLEMA 2.1: Botón "Borrar Filtros" Global

**Descripción:**
En los roles donde hay múltiples filtros activos, es tedioso quitarlos uno por uno. Se necesita un botón que limpie todos los filtros de una vez.

**Problema Adicional:**
Cuando se quitan los filtros manualmente, el estado seleccionado (ej: "Listo para Entrega") no permanece. Se pierden las selecciones.

**Implementación:**
1. Agregar botón "🗑️ Borrar Filtros" visible cuando hay al menos 1 filtro activo
2. Al hacer clic:
   - Limpiar TODOS los filtros (fecha, búsqueda, tipo)
   - MANTENER el estado seleccionado si existe (Listo, En Proceso, etc.)
   - Resetear paginación a página 1
3. Ubicación: junto a los filtros, alineado a la derecha
4. Mostrar contador: "3 filtros activos" junto al botón

**Componentes a Modificar:**
- Todos los dashboards/tablas que tengan filtros múltiples
- Crear componente reutilizable `FilterBar` con lógica de "clear all"

---

### PROBLEMA 2.2: Paginación por Defecto a 25 Registros

**Descripción:**
Las tablas muestran muy pocos registros por defecto. Cambiar el valor predeterminado a 25.

**Implementación:**
1. Buscar todos los componentes de tabla/DataGrid
2. Cambiar `defaultRowsPerPage` o `pageSize` de 10 a 25
3. Opciones de paginación: [10, 25, 50, 100]
4. Persistir preferencia del usuario en localStorage (opcional)

**Archivos Probables:**
- Cualquier uso de MUI DataGrid, Table con paginación
- Props: `initialState={{ pagination: { pageSize: 25 } }}`

---

### PROBLEMA 2.3: Modo Oscuro de Recepción No Funciona

**Descripción:**
El modo oscuro no se aplica correctamente en el rol de Recepción. Algunos elementos quedan con colores claros.

**Diagnóstico Requerido:**
1. Verificar si ThemeContext se aplica en RecepcionDashboard
2. Buscar estilos hardcodeados (colores inline, clases CSS fijas)
3. Verificar componentes hijos que puedan tener sus propios estilos

**Solución:**
1. Usar variables de tema de MUI en lugar de colores hardcodeados
2. Reemplazar `color: '#000'` por `color: theme.palette.text.primary`
3. Reemplazar `background: '#fff'` por `background: theme.palette.background.paper`
4. Verificar modales, tooltips y componentes emergentes

**Patrón Correcto:**
```jsx
// ❌ Incorrecto
<Box sx={{ backgroundColor: '#ffffff', color: '#000000' }}>

// ✅ Correcto
<Box sx={{ 
  backgroundColor: 'background.paper', 
  color: 'text.primary' 
}}>
```

---

### PROBLEMA 2.4: Filtro de Búsqueda por Tipo de Acto

**Descripción:**
El filtro de búsqueda actual solo busca por cliente, código o tipo de documento. Se necesita que también busque por el nombre del acto/trámite.

**Ejemplo:**
- Usuario escribe "promesa" → Debe mostrar todos los documentos de "PROMESA DE COMPRAVENTA"
- Usuario escribe "compraventa" → Debe mostrar "COMPRAVENTA", "PROMESA DE COMPRAVENTA"
- Usuario escribe "poder" → Debe mostrar "PODER GENERAL", "PODER ESPECIAL"

**Implementación Backend:**
1. Modificar endpoint de búsqueda de documentos
2. Agregar campo `actoContrato` o `detallesAdicionales` al query de búsqueda
3. Usar `OR` en la cláusula WHERE:
```sql
WHERE 
  nombreCliente ILIKE '%term%' OR
  codigoBarras ILIKE '%term%' OR
  tipoDocumento ILIKE '%term%' OR
  actoContrato ILIKE '%term%'  -- NUEVO
```

**Implementación Frontend:**
1. Si ya existe filtro de texto, solo asegurar que el backend busque en el campo correcto
2. Agregar placeholder descriptivo: "Buscar por cliente, código, tipo o acto..."

---

## 📊 RESUMEN DE CAMBIOS POR ARCHIVO

| Archivo | Cambios |
|---------|---------|
| `CentroNotificaciones.jsx` | Conectar plantillas, validar teléfonos, pestaña ENVIADOS, editar teléfono |
| `whatsapp-service.js` | Usar templates dinámicos de BD, generar link wa.me con mensaje formateado |
| `notification-controller.js` | Lógica de reenvío, estado de envío, código de retiro |
| `prisma/schema.prisma` | Modelo EncuestasSatisfaccion (si no existe), estado notificación |
| `RecepcionDashboard.jsx` | Modo oscuro |
| `DocumentosUnificados.jsx` | Botón borrar filtros, paginación |
| Componentes de tablas | Paginación 25, filtro por acto |
| `document-controller.js` | Búsqueda por actoContrato |

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Fase 1:
- [ ] Mensajes usan plantilla configurada en Administración (no hardcodeada)
- [ ] Formato de mensaje incluye: nombre, tipo documento, tipo acto, código, código retiro
- [ ] Números inválidos/vacíos muestran advertencia clara antes de enviar
- [ ] Existe pestaña "ENVIADOS" con opción de reenvío
- [ ] Se puede editar teléfono directamente en la tarjeta del cliente
- [ ] Link wa.me se genera correctamente con mensaje pre-formateado
- [ ] (Opcional) Link a encuesta de satisfacción incluido

### Fase 2:
- [ ] Botón "Borrar Filtros" funciona en todos los roles
- [ ] Al borrar filtros, el estado seleccionado permanece
- [ ] Tablas muestran 25 registros por defecto
- [ ] Modo oscuro funciona correctamente en Recepción
- [ ] Búsqueda encuentra documentos por nombre del acto (COMPRAVENTA, PODER, etc.)

---

## 🎓 CONCEPTOS TÉCNICOS QUE SE APLICARÁN

1. **Single Source of Truth**: Las plantillas WhatsApp deben tener una única fuente (BD de admin)
2. **Validación en Frontend**: Validar formato de teléfono antes de generar link wa.me
3. **Estado de UI Persistente**: Mantener filtros/estados al navegar
4. **Theming Consistente**: Usar sistema de temas de MUI correctamente
5. **Búsqueda Full-Text**: Expandir criterios de búsqueda en queries
6. **URL Encoding**: Correcta codificación del mensaje para wa.me (encodeURIComponent)

---

## 🚀 ORDEN DE IMPLEMENTACIÓN SUGERIDO

**Semana 1 - Fase 1 (Crítico):**
1. Conectar plantillas de administración (1.1)
2. Validación de teléfonos + advertencias (1.4A)
3. Editar teléfono antes de enviar (1.5)

**Semana 2 - Fase 1 (Importante):**
4. Pestaña "Enviados" con reenvío (1.4B)
5. Mejorar formato de mensaje (1.2)
6. Encuesta de satisfacción (1.3) - opcional

**Semana 3 - Fase 2:**
7. Botón borrar filtros (2.1)
8. Paginación 25 por defecto (2.2)
9. Modo oscuro recepción (2.3)
10. Búsqueda por tipo de acto (2.4)

---

*Documento generado para uso con Cursor IDE - Sistema de Trazabilidad Notarial - Notaría 18 Quito*
