# 📁 Guía de Archivo

Bienvenido a la guía de usuario para el rol de **Archivo**. Como personal de archivo, supervisas y controlas todos los documentos del sistema.

---

## 📋 Responsabilidades de Archivo

- Supervisar todos los documentos del sistema
- Verificar estados y asignaciones
- Generar reportes de control
- Detectar documentos con problemas
- Auditar el flujo de documentos
- Consultar información general sin realizar cambios

---

## 🚀 Panel de Archivo

```
┌────────────────────────────────────────────────────────────┐
│  📁 PANEL DE ARCHIVO                                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 SUPERVISIÓN GENERAL                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Total    │ │ En       │ │ Listos   │ │ Entrega- │      │
│  │ Docs     │ │ Proceso  │ │          │ │ dos      │      │
│  │  1,234   │ │   45     │ │   23     │ │   890    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ⚠️ ALERTAS                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ • 5 documentos sin matrizador asignado              │ │
│  │ • 3 documentos en proceso > 5 días                  │ │
│  │ • 8 facturas pendientes de pago > 10 días           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  📋 VISTAS RÁPIDAS                                         │
│  [Todos los Documentos] [Sin Asignar] [Con Alertas]       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Supervisión de Documentos

### Ver Todos los Documentos

1. Ve a **Documentos → Todos**
2. Verás una lista completa con filtros avanzados:

```
┌────────────────────────────────────────────────────────────┐
│  📋 Todos los Documentos                                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [🔍 Buscar...]  [Filtros ▼]  [📥 Exportar]              │
│                                                             │
│  Filtros activos: Estado: Todos | Fecha: Este mes        │
│                                                             │
│  Protocolo      Cliente         Estado    Matrizador      │
│  ──────────────────────────────────────────────────────── │
│  001-2025-0100  Juan Pérez      🔵 Proceso  Ana García    │
│  001-2025-0099  María López     🟢 Listo    Carlos R.     │
│  001-2025-0098  Pedro Sánchez   ⚫ Entregado Ana García   │
│  ...                                                      │
│                                                             │
│  Página 1 de 50  [Anterior] 1 2 3 ... 50 [Siguiente]      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Filtros Disponibles

| Filtro | Opciones |
|--------|----------|
| **Estado** | Creado, En Proceso, Listo, Entregado, Todos |
| **Matrizador** | Por usuario específico o Sin asignar |
| **Fecha** | Hoy, Esta semana, Este mes, Rango personalizado |
| **Factura** | Con factura, Sin factura, Pendiente pago |
| **Alertas** | Con alertas, Vencidos, Todos |

---

## ⚠️ Gestión de Alertas

### Tipos de Alertas

| Alerta | Descripción | Acción |
|--------|-------------|--------|
| 🔴 **Sin matrizador** | Documento no asignado | Notificar a ADMIN |
| 🟠 **Proceso largo** | > 5 días en proceso | Verificar con matrizador |
| 🟡 **Pago pendiente** | Factura vencida sin pago | Notificar a CAJA |
| 🔵 **Sin notificación** | Listo pero sin WhatsApp | Verificar error |

### Ver Documentos con Alertas

1. Ve a **Alertas** en el menú lateral
2. O usa el filtro **Con Alertas** en la lista de documentos

```
┌────────────────────────────────────────────────────────────┐
│  ⚠️ Documentos con Alertas                                │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 Sin Matrizador (5)                                    │
│  ──────────────────────────────────────────────────────── │
│  Protocolo      Cliente         Fecha       Acción        │
│  001-2025-0090  Ana López       01/02/25   [Asignar]     │
│  ...                                                      │
│                                                             │
│  🟠 Proceso > 5 días (3)                                  │
│  ──────────────────────────────────────────────────────── │
│  Protocolo      Cliente         Matrizador  Días  Acción  │
│  001-2025-0085  Carlos Ruiz     Ana G.       7    [Ver]   │
│  ...                                                      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📈 Reportes de Control

### Reportes Disponibles

1. **Resumen General**
   - Totales por estado
   - Tiempo promedio por etapa
   - Documentos por matrizador

2. **Documentos Vencidos**
   - En proceso > 5 días
   - Facturas pendientes > 10 días
   - Sin asignar > 2 días

3. **Productividad**
   - Documentos por matrizador
   - Tiempos de respuesta
   - Eficiencia de entrega

4. **Auditoría**
   - Historial de cambios
   - Quién hizo qué y cuándo
   - Entregas registradas

### Generar Reporte

1. Ve a **Reportes → [Tipo de reporte]**
2. Configura filtros si es necesario
3. Haz clic en **Generar**
4. Descarga en PDF o Excel

---

## 🔍 Consultar Información

### Ver Detalle de Documento

Como archivo, puedes ver toda la información pero **no modificar**:

```
┌────────────────────────────────────────────────────────────┐
│  📄 Detalle del Documento (Vista Solo Lectura)            │
│  Protocolo: 001-2025-0001                                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 Información del Documento (Solo lectura)              │
│  ─────────────────────────────────────────────────────   │
│  Estado: 🔵 EN PROCESO                                    │
│  Matrizador: Ana García                                   │
│  Fecha creación: 01/02/2025                               │
│  Días en proceso: 5                                       │
│                                                             │
│  👤 Cliente: Juan Pérez López                             │
│  Teléfono: +593987654321                                  │
│                                                             │
│  💰 Factura: 001-002-000123456 - ⏳ Pendiente $150       │
│                                                             │
│  📜 Historial Completo:                                   │
│  [01/02 09:00] Documento creado                          │
│  [01/02 10:30] Asignado a Ana García                     │
│  [02/02 11:00] Cambiado a EN PROCESO                     │
│  ...                                                      │
│                                                             │
│  ⚠️ Si detectas algún problema, contacta al ADMIN         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 💡 Tareas de Supervisión

### Checklist Diario

- [ ] Revisar documentos **sin matrizador**
- [ ] Verificar documentos en proceso **> 5 días**
- [ ] Revisar **facturas vencidas** sin pago
- [ ] Verificar que todos los "Listos" tengan **notificación**

### Checklist Semanal

- [ ] Generar reporte de **productividad**
- [ ] Revisar **tiempos de entrega**
- [ ] Verificar **documentos entregados**
- [ ] Reportar **anomalías** al ADMIN

---

## ⚠️ Problemas a Reportar

Reporta inmediatamente al ADMIN si detectas:

1. **Documentos sin asignar** por más de 2 días
2. **Documentos en proceso** por más de 7 días
3. **Facturas pagadas** pero documentos no liberados
4. **Errores** en el sistema
5. **Discrepancias** en los datos

---

*Última actualización: Febrero 2025*
