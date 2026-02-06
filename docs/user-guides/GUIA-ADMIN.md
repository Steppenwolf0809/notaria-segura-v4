# 👨‍💼 Guía del Administrador

Bienvenido a la guía de usuario para el rol de **Administrador**. Como admin, tienes control total del sistema para gestionar usuarios, supervisar operaciones y configurar el funcionamiento.

---

## 📋 Responsabilidades del Administrador

- Crear y gestionar usuarios del sistema
- Asignar roles y permisos
- Supervisar todos los documentos y operaciones
- Configurar parámetros del sistema
- Generar reportes avanzados
- Resolver problemas técnicos de usuarios
- Gestionar integraciones (Koinor, WhatsApp)

---

## 🚀 Panel de Administración

Al ingresar, verás el Panel de Control:

```
┌────────────────────────────────────────────────────────────┐
│  👨‍💼 PANEL DE ADMINISTRACIÓN                               │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 ESTADÍSTICAS GENERALES                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Usuarios │ │Documentos│ │ Entregas │ │ Facturas │      │
│  │   25     │ │  1,234   │ │   89     │ │  456     │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  📋 MENÚ DE ADMINISTRACIÓN                                 │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  👥 USUARIOS                📊 REPORTES                    │
│  ├─ Crear Usuario           ├─ Actividad                  │
│  ├─ Lista de Usuarios       ├─ Productividad              │
│  ├─ Roles y Permisos        ├─ Financiero                 │
│  └─ Resetear Contraseñas    └─ Auditoría                  │
│                                                             │
│  📁 DOCUMENTOS              ⚙️ CONFIGURACIÓN               │
│  ├─ Todos los Documentos    ├─ Sistema                    │
│  ├─ Asignaciones            ├─ WhatsApp                   │
│  ├─ Estados                 ├─ Koinor/Sync                │
│  └─ Historial               └─ Plantillas                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 👥 Gestión de Usuarios

### Crear Nuevo Usuario

1. Ve a **Usuarios → Crear Usuario**
2. Completa el formulario:

```
┌─────────────────────────────────────────┐
│  👤 Crear Nuevo Usuario                │
├─────────────────────────────────────────┤
│                                         │
│  Información Personal                   │
│  ────────────────────────────────────  │
│  Nombre:        [________________]     │
│  Apellido:      [________________]     │
│  Email:         [________________]     │
│  Teléfono:      [________________]     │
│                                         │
│  Rol del Sistema                        │
│  ────────────────────────────────────  │
│  ○ ADMIN                                │
│  ○ CAJA                                 │
│  ● MATRIZADOR  ← Seleccionado          │
│  ○ RECEPCIÓN                            │
│  ○ ARCHIVO                              │
│                                         │
│  ⚙️ Opciones                            │
│  ────────────────────────────────────  │
│  ☑️ Requiere cambio de contraseña      │
│      al primer login                    │
│                                         │
│  [Cancelar]        [Crear Usuario]     │
│                                         │
└─────────────────────────────────────────┘
```

3. Haz clic en **Crear Usuario**
4. El sistema enviará un email con:
   - Usuario (email)
   - Contraseña temporal
   - Link de acceso

### Lista de Usuarios

Ve a **Usuarios → Lista** para ver todos los usuarios:

```
┌────────────────────────────────────────────────────────────┐
│  👥 Usuarios del Sistema                                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [🔍 Buscar...]  [Filtros ▼]  [➕ Nuevo Usuario]          │
│                                                             │
│  Nombre           Email              Rol      Estado  Acc. │
│  ─────────────────────────────────────────────────────────│
│  Ana García      ana@notaria.com    Matrizador  🟢    [⚙️] │
│  Carlos López    carlos@notaria.com Caja        🟢    [⚙️] │
│  María Ruiz      maria@notaria.com  Recepción   🔴    [⚙️] │
│  ...                                                    │
│                                                             │
│  Leyenda: 🟢 Activo  🔴 Inactivo  🟡 Bloqueado           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Acciones disponibles:**
- ✏️ Editar información
- 🔄 Resetear contraseña
- 🚫 Desactivar/Activar
- 🗑️ Eliminar (solo si no tiene actividad)

### Resetear Contraseña

Si un usuario olvida su contraseña:

1. Busca el usuario en la lista
2. Haz clic en **⚙️ → Resetear Contraseña**
3. El sistema genera una nueva contraseña temporal
4. Se envía al email del usuario

> ⚠️ **Seguridad:** El usuario deberá cambiar la contraseña en su próximo login.

---

## 📊 Supervisión de Documentos

### Ver Todos los Documentos

1. Ve a **Documentos → Todos**
2. Puedes filtrar por:
   - Estado (Creado, En Proceso, Listo, Entregado)
   - Matrizador asignado
   - Fecha de creación
   - Estado de pago

### Panel de Supervisión

```
┌────────────────────────────────────────────────────────────┐
│  📁 Supervisión de Documentos                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Resumen del Día                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Creados     │ │ En Proceso  │ │ Listos      │          │
│  │    12       │ │     45      │ │     8       │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Entregados  │ │ Con Factura │ │ Sin Factura │          │
│  │    23       │ │     67      │ │     18      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  📋 Documentos Recientes                                  │
│  Protocolo      Cliente       Estado      Matrizador       │
│  001-2025-0100  Juan Pérez    🔵 Proceso  Ana García       │
│  001-2025-0099  María López   🟢 Listo    Carlos Ruiz      │
│  ...                                                      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Reasignar Documento

Si necesitas cambiar el matrizador de un documento:

1. Busca el documento
2. Abre el detalle
3. Haz clic en **Cambiar Asignación**
4. Selecciona el nuevo matrizador
5. Confirma el cambio

---

## ⚙️ Configuración del Sistema

### Configuración de WhatsApp

Ve a **Configuración → WhatsApp**:

```
┌────────────────────────────────────────────────────────────┐
│  📱 Configuración de WhatsApp                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Estado de Conexión: 🟢 Conectado                         │
│  Número del Sistema: +593987654321                        │
│                                                             │
│  Plantillas de Mensajes                                   │
│  ───────────────────────────────────────────────────────  │
│                                                             │
│  📤 Documento Listo                                       │
│  ─────────────────────                                   │
│  "Hola {nombre}, su documento {protocolo} está listo.    │
│   Código de retiro: {codigo}"                            │
│  [Editar]                                                │
│                                                             │
│  ✅ Documento Entregado                                   │
│  ─────────────────────                                   │
│  "Su documento ha sido entregado exitosamente."          │
│  [Editar]                                                │
│                                                             │
│  📊 Estadísticas de Envío                                 │
│  Enviados hoy: 45                                        │
│  Tasa de entrega: 98%                                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Configuración de Sync (Koinor)

Ve a **Configuración → Koinor/Sync**:

```
┌────────────────────────────────────────────────────────────┐
│  🔄 Configuración de Sincronización                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Estado del Sync: 🟢 Activo                               │
│  Última sincronización: 06/02/2025 15:30                  │
│                                                             │
│  📊 Estadísticas de Sync                                  │
│  ┌─────────────────┐ ┌─────────────────┐                  │
│  │ Facturas Sync   │ │ CXC Sync        │                  │
│  │ Hoy: 150        │ │ Hoy: 2000       │                  │
│  │ OK: 148         │ │ OK: 1998        │                  │
│  │ Errores: 2      │ │ Errores: 2      │                  │
│  └─────────────────┘ └─────────────────┘                  │
│                                                             │
│  ⚙️ Configuración                                       │
│  ───────────────────────────────────────────────────────  │
│  ☑️ Sync automático cada 30 minutos                      │
│  ☑️ Marcar como pagado si no está en CXC                 │
│  ☐ Notificar errores de sync por email                   │
│                                                             │
│  [🔄 Forzar Sync Ahora]                                  │
│                                                             │
│  📜 Logs de Sincronización                                │
│  [06/02 15:30] Sync completado: 150 facturas             │
│  [06/02 15:00] Sync completado: 145 facturas             │
│  ...                                                      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📈 Reportes Avanzados

### Reporte de Actividad

Ve a **Reportes → Actividad**:

**Filtros disponibles:**
- Rango de fechas
- Usuario específico
- Tipo de actividad

**Datos incluidos:**
- Documentos creados
- Estados cambiados
- Entregas realizadas
- Notificaciones enviadas

### Reporte de Productividad

Ve a **Reportes → Productividad**:

```
┌────────────────────────────────────────────────────────────┐
│  📊 Productividad por Matrizador - Febrero 2025           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Matrizador      Procesados  Listos  Entregados  Tiempo   │
│  ─────────────────────────────────────────────────────────│
│  Ana García         45         43        42      2.3 días│
│  Carlos Ruiz        38         36        35      2.8 días│
│  María López        52         50        48      2.1 días│
│                                                             │
│  Promedio general: 2.4 días por documento                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Reporte Financiero

Ve a **Reportes → Financiero**:

- Facturas emitidas vs pagadas
- Ingresos por período
- Documentos con factura pendiente
- Estadísticas de pagos

---

## 🔧 Tareas de Mantenimiento

### Verificar Estado del Sistema

1. Ve a **Configuración → Sistema**
2. Revisa:
   - ✅ Conexión a base de datos
   - ✅ Servicio de WhatsApp
   - ✅ Sync con Koinor
   - ✅ Espacio en disco
   - ✅ Último backup

### Gestionar Errores

Ve a **Configuración → Logs**:

```
┌────────────────────────────────────────────────────────────┐
│  🐛 Logs del Sistema                                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Nivel: [Todos ▼]  Servicio: [Backend ▼]  [🔄]           │
│                                                             │
│  Fecha              Nivel    Mensaje                      │
│  ──────────────────────────────────────────────────────── │
│  06/02 15:45:22     ERROR    Error sync factura #123456   │
│  06/02 15:44:10     WARN     Factura sin documento        │
│  06/02 15:30:05     INFO     Sync completado              │
│  ...                                                      │
│                                                             │
│  [📥 Descargar Logs]  [🧹 Limpiar Antiguos]              │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Respaldar Base de Datos

1. Ve a **Configuración → Backup**
2. Haz clic en **Crear Backup Ahora**
3. O programa backups automáticos diarios

---

## ⚠️ Problemas Comunes (Solución para Admin)

### "Usuario no puede iniciar sesión"

**Verificar:**
1. ¿El usuario está activo? (no desactivado)
2. ¿La contraseña es correcta?
3. ¿Hay errores en los logs?

**Solución:**
- Resetea la contraseña desde Usuarios → Resetear
- Verifica que el email sea correcto

### "Sync con Koinor falla"

**Verificar:**
1. Estado de conexión en Configuración → Koinor
2. Logs de errores recientes
3. Credenciales de acceso a Koinor

**Solución:**
- Verifica conectividad de red
- Revisa credenciales de Koinor
- Contacta soporte de Koinor si es necesario

### "WhatsApp no envía mensajes"

**Verificar:**
1. Estado de conexión en Configuración → WhatsApp
2. Número de teléfono del cliente
3. Saldo/créditos de Twilio

**Solución:**
- Reconecta la cuenta de WhatsApp
- Verifica saldo de Twilio
- Revisa número formateado correctamente (+593...)

### "Documento no aparece en búsqueda"

**Verificar:**
1. ¿El documento existe en la base de datos?
2. ¿Los índices de búsqueda están actualizados?
3. ¿Hay errores en los logs?

**Solución:**
- Busca por ID exacto
- Verifica en "Todos los Documentos"
- Reindexa si es necesario

---

## 📞 Contactos de Escalación

| Problema | Contacto |
|----------|----------|
| Error del sistema | Desarrollador |
| Problemas con Railway | Soporte Railway |
| Problemas con Twilio | Soporte Twilio |
| Problemas con Koinor | Soporte Koinor |

---

*Última actualización: Febrero 2025*
