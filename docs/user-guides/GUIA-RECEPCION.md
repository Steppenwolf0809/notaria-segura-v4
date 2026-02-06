# 🖥️ Guía de Recepción

Bienvenido a la guía de usuario para el rol de **Recepción**. Aprenderás a atender a los clientes, buscar documentos y gestionar entregas de forma segura.

---

## 📋 Responsabilidades de Recepción

- Atender a clientes que vienen a retirar documentos
- Buscar documentos en el sistema
- Validar identidad mediante códigos de verificación
- Registrar la entrega de documentos
- Responder consultas sobre estado de trámites

---

## 🚀 Acceso al Sistema

1. Ingresa a: `https://notaria-segura.railway.app`
2. Usa tu correo y contraseña
3. Serás dirigido al **Panel de Recepción**

---

## 📊 Panel Principal

```
┌────────────────────────────────────────────────────────────┐
│  🖥️ PANEL DE RECEPCIÓN                                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 BÚSQUEDA RÁPIDA                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  🔍 Buscar por nombre, cédula, protocolo o código   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  📋 ACCESOS DIRECTOS                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │  📄          │ │  📱          │ │  📊          │      │
│  │ Verificar    │ │ Validar      │ │ Consultar    │      │
│  │ Documento    │ │ Código       │ │ Estado       │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                             │
│  📊 ESTADÍSTICAS DEL DÍA                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Entregas    │ │ Pendientes  │ │ Consultas   │          │
│  │    15       │ │     8       │ │    25       │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🔍 Buscar Documento del Cliente

### Método 1: Búsqueda por Nombre

1. En la barra de búsqueda, escribe el **nombre del cliente**
2. Presiona Enter o haz clic en 🔍
3. Selecciona el documento correcto de la lista

**Ejemplo:**
```
Búsqueda: "Juan Pérez"

Resultados:
┌──────────────────────────────────────────────────┐
│ 📄 Juan Pérez López                              │
│    Protocolo: 001-2025-0001                     │
│    Estado: ✅ LISTO PARA ENTREGA                │
│    [Ver Documento]                              │
├──────────────────────────────────────────────────┤
│ 📄 Juan Pérez García                             │
│    Protocolo: 001-2025-0045                     │
│    Estado: 🔵 EN PROCESO                        │
│    [Ver Documento]                              │
└──────────────────────────────────────────────────┘
```

### Método 2: Búsqueda por Código de Verificación

Si el cliente trae el código de 4 dígitos:

1. Escribe el código en la búsqueda (ej: `7842`)
2. El sistema mostrará el documento asociado

### Método 3: Búsqueda por Protocolo

1. Escribe el número de protocolo completo
2. Ejemplo: `001-2025-0001`

---

## 📋 Verificar Estado del Documento

Al encontrar el documento, verás esta información:

```
┌────────────────────────────────────────────────────────────┐
│  📄 Estado del Documento                                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 INFORMACIÓN DEL CLIENTE                                │
│  ─────────────────────────────────────────────────────   │
│  Nombre: Juan Pérez López                                 │
│  Cédula: 1723456789                                       │
│  Teléfono: +593987654321                                  │
│                                                             │
│  📋 INFORMACIÓN DEL DOCUMENTO                              │
│  ─────────────────────────────────────────────────────   │
│  Protocolo: 001-2025-0001                                 │
│  Tipo: Escritura Pública                                  │
│  Matrizador: Ana García                                   │
│                                                             │
│  🚦 ESTADO DE ENTREGA                                      │
│  ─────────────────────────────────────────────────────   │
│  Status: ✅ LISTO PARA ENTREGA                            │
│  Código Verificación: 🔒 **** (se muestra al validar)    │
│                                                             │
│  💰 ESTADO DE PAGO                                         │
│  ─────────────────────────────────────────────────────   │
│  Factura: 001-002-000123456                               │
│  Total: $150.00                                           │
│  Pagado: ✅ $150.00 (COMPLETO)                            │
│                                                             │
│  📱 NOTIFICACIONES                                         │
│  ─────────────────────────────────────────────────────   │
│  WhatsApp enviado: ✅ 06/02/2025 10:30                    │
│  Código generado: 7842                                    │
│                                                             │
│  [✅ VALIDAR Y ENTREGAR]  [❌ NO PUEDE RETIRAR]          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Estados Posibles

| Estado | Acción a Tomar |
|--------|----------------|
| 🟢 **LISTO PARA ENTREGA** | Proceder con validación de código |
| 💰 **PENDIENTE DE PAGO** | Dirigir a CAJA para pago |
| 🔵 **EN PROCESO** | Informar que aún no está listo |
| ⚫ **YA ENTREGADO** | Verificar quién lo retiró |

---

## ✅ Entregar Documento

### Paso 1: Validar Código de Verificación

Cuando el cliente presente su código de 4 dígitos:

1. Abre el documento en el sistema
2. Haz clic en **✅ VALIDAR Y ENTREGAR**
3. El sistema pedirá confirmar el código

```
┌─────────────────────────────────────────┐
│  🔐 Validación de Código               │
├─────────────────────────────────────────┤
│                                         │
│  Documento: 001-2025-0001              │
│  Cliente: Juan Pérez López             │
│                                         │
│  Ingrese el código de 4 dígitos:       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │  7  │ │  8  │ │  4  │ │  2  │      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│  [Cancelar]        [Validar]           │
│                                         │
└─────────────────────────────────────────┘
```

### Paso 2: Registrar Datos de Retiro

Si el código es correcto, registra quién retira:

```
┌─────────────────────────────────────────┐
│  📝 Registro de Entrega                │
├─────────────────────────────────────────┤
│                                         │
│  ¿Quién retira el documento?           │
│                                         │
│  ○ El mismo cliente (Juan Pérez)       │
│  ○ Otra persona                        │
│                                         │
│  ────────────────────────────────────  │
│                                         │
│  Si es otra persona:                   │
│                                         │
│  Nombre completo: __________________   │
│  Cédula:          __________________   │
│  Parentesco:      __________________   │
│  (ej: hijo, esposa, abogado)           │
│                                         │
│  [Cancelar]        [Confirmar Entrega] │
│                                         │
└─────────────────────────────────────────┘
```

### Paso 3: Confirmar Entrega

1. Revisa que todos los datos sean correctos
2. Haz clic en **Confirmar Entrega**
3. El sistema:
   - Marca el documento como "ENTREGADO"
   - Envía WhatsApp de confirmación al cliente
   - Registra en el historial quién retiró

```
✅ ¡Entrega registrada exitosamente!

Documento: 001-2025-0001
Entregado a: María López (esposa)
Cédula: 1723456790
Hora: 14:30:15
```

---

## ❌ Cuándo NO Entregar el Documento

### Situaciones y Soluciones

| Problema | Qué Decir al Cliente | Acción |
|----------|---------------------|--------|
| **Pendiente de pago** | "Su documento está listo pero tiene una factura pendiente de pago. Por favor pase a caja primero." | Dirigir a CAJA |
| **En proceso** | "Su documento aún está en proceso de preparación. Le notificaremos cuando esté listo." | Verificar estado real |
| **Código incorrecto** | "El código proporcionado no coincide con nuestros registros. ¿Tiene el mensaje de WhatsApp?" | Verificar identidad |
| **Documento ya entregado** | "Según nuestros registros, este documento ya fue entregado el [fecha]." | Mostrar historial |
| **Persona no autorizada** | "Para entregar a otra persona, necesitamos autorización escrita del titular." | Solicitar autorización |

---

## 📱 Consultar Estado para Clientes

Cuando un cliente llama o viene a preguntar por su trámite:

### 1. Buscar el Documento
Usa nombre, cédula o número de trámite

### 2. Verificar Estado

```
Respuesta según estado:

🔵 EN PROCESO:
"Su documento está en proceso de preparación. 
El matrizador asignado es [nombre]. 
Le notificaremos vía WhatsApp cuando esté listo."

🟢 LISTO (sin factura):
"¡Buenas noticias! Su documento está listo. 
Le enviamos un WhatsApp con el código de retiro. 
¿Lo recibió?"

💰 LISTO (con factura pendiente):
"Su documento está listo. Tiene una factura 
pendiente de [monto]. Puede pasar a caja 
a realizar el pago y luego retirar su documento."

⚫ ENTREGADO:
"Según nuestros registros, su documento fue 
entregado el [fecha] a [persona]."
```

### 3. Información Adicional

Puedes consultar:
- Fecha aproximada de finalización
- Matrizador asignado
- Estado de pago
- Historial de notificaciones

---

## 🔍 Verificar Entregas Anteriores

Si un cliente dice que no retiró su documento pero aparece como entregado:

1. Busca el documento
2. Revisa el **Historial de Eventos**
3. Verifica:
   - Fecha y hora de entrega
   - Nombre de quién retiró
   - Cédula de la persona
   - Tu nombre de usuario (quién registró)

```
📜 HISTORIAL DE ENTREGA
─────────────────────────────────
[06/02 14:30] Documento ENTREGADO
              Retirado por: María López
              Cédula: 1723456790
              Registrado por: recepcion01
```

---

## 📊 Reportes de Recepción

Para ver estadísticas de entregas:

1. Ve a **Reportes** en el menú lateral
2. Selecciona **Entregas del Día**
3. Filtra por fecha si es necesario

**Datos disponibles:**
- Documentos entregados por día
- Tiempo promedio de atención
- Entregas por tipo de documento

---

## ⚠️ Problemas Comunes

### "No encuentro el documento del cliente"

**Solución paso a paso:**
1. Pide la **cédula** del cliente (más precisa)
2. Busca solo el **número** (sin ceros iniciales si es necesario)
3. Intenta buscar por **apellido** únicamente
4. Pregunta si tiene el **número de protocolo**
5. Si sigue sin aparecer, contacta a **ARCHIVO**

### "El cliente dice que no recibió el WhatsApp"

**Verifica:**
1. ¿El número de teléfono es correcto?
2. ¿El documento está en estado "Listo"?
3. ¿Tiene factura pendiente? (no se envía WhatsApp si debe pagar)

**Solución:**
- Si el número está mal: Contacta al ADMIN
- Si no está listo: Explica el estado real
- Si debe pagar: Dirige a CAJA

### "El código no funciona"

**Causas:**
- El cliente leyó mal el número
- Es un código viejo (el documento ya fue entregado)
- El código es de otro documento

**Solución:**
1. Pide ver el mensaje de WhatsApp
2. Verifica el número de protocolo en el mensaje
3. Si no tiene el mensaje, busca por nombre/cedula

### "Vino alguien que no es el titular"

**Procedimiento:**
1. Verifica que tenga **autorización escrita** del titular
2. Pide **cédula** de la persona que retira
3. Registra el parentesco o relación
4. Toma foto de la autorización si es posible

---

## 💡 Mejores Prácticas

### Atención al Cliente
- ✅ Saluda amablemente
- ✅ Identifica rápidamente el documento
- ✅ Explica claramente el estado
- ✅ Ofrece soluciones, no excusas

### Seguridad
- 🔒 Nunca entregues sin validar el código
- 🔒 Verifica identidad si es tercera persona
- 🔒 Registra SIEMPRE quién retira
- 🔒 Mantén la confidencialidad de datos

### Eficiencia
- ⚡ Ten abierta la página de búsqueda
- ⚡ Usa atajos de teclado (Ctrl+F para buscar)
- ⚡ Mantén una lista de documentos pendientes visibles

---

## 📞 Contactos de Soporte

| Situación | Contactar |
|-----------|-----------|
| Documento no aparece en sistema | ARCHIVO o ADMIN |
| Error al registrar entrega | ADMIN |
| Cliente con queja formal | ADMIN |
| Problema con pago/factura | CAJA |
| Número de teléfono incorrecto | ADMIN |

---

*Última actualización: Febrero 2025*
