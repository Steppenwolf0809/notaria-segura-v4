# 💰 Guía de Caja

Bienvenido a la guía de usuario para el rol de **Caja**. Aquí aprenderás a gestionar facturas, importar datos y generar reportes financieros.

---

## 📋 Responsabilidades de Caja

- Importar facturas desde archivos XML del sistema Koinor
- Verificar estado de pagos de facturas
- Consultar y reportar pagos recibidos
- Generar reportes financieros
- Apoyar en consultas sobre facturación
- Sincronizar datos con el sistema de cobros

---

## 🚀 Acceso al Sistema

1. Ingresa a: `https://notaria-segura.railway.app`
2. Usa tu correo y contraseña
3. Serás dirigido al **Panel de Caja**

---

## 📊 Panel Principal

```
┌────────────────────────────────────────────────────────────┐
│  💰 PANEL DE CAJA                                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 RESUMEN FINANCIERO DEL DÍA                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Facturas    │ │   Pagos     │ │  Pendientes │          │
│  │ Importadas  │ │  Recibidos  │ │    Hoy      │          │
│  │    25       │ │   $3,450    │ │    12       │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  📋 ACCESOS RÁPIDOS                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ 📥           │ │ 🔍           │ │ 📊           │      │
│  │ Importar     │ │ Consultar    │ │ Reportes     │      │
│  │ Facturas     │ │ Factura      │ │ Financieros  │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                             │
│  📈 ESTADÍSTICAS                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Facturas del mes: 234  │  Cobrado: $45,600         │ │
│  │ Por cobrar: $12,300    │  Vencidas: 5              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📥 Importar Facturas

Las facturas se importan desde archivos XML generados por el sistema Koinor.

### Paso 1: Preparar el Archivo

- El archivo debe estar en formato **XML**
- Tamaño máximo: **10 MB**
- El nombre del archivo debe indicar la fecha (ej: `facturas_20250206.xml`)

### Paso 2: Subir el Archivo

1. Ve a **Facturas → Importar XML**
2. Arrastra el archivo al área designada o haz clic para seleccionar:

```
┌────────────────────────────────────────────────────────────┐
│  📥 Importar Facturas XML                                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                      │ │
│  │           📄 Arrastra archivo aquí                  │ │
│  │                   o                                 │ │
│  │        [Seleccionar archivo]                        │ │
│  │                                                      │ │
│  │   Formatos aceptados: .xml (máx. 10MB)             │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ℹ️ El archivo XML debe venir del sistema Koinor         │
│                                                             │
│  [Cancelar]                                           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Paso 3: Verificar Datos

Antes de importar, el sistema muestra un resumen:

```
┌────────────────────────────────────────────────────────────┐
│  ✅ Pre-visualización de Importación                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Archivo: facturas_20250206.xml                           │
│  Total de facturas encontradas: 45                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Facturas nuevas:        40                          │ │
│  │ Facturas actualizadas:   5                          │ │
│  │ Con errores:             0                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  📋 Muestra de facturas (primeras 5):                     │
│  ──────────────────────────────────────────────────────── │
│  #  Factura         Cliente              Total   Estado   │
│  ──────────────────────────────────────────────────────── │
│  1  001-002-000123  Juan Pérez López     $150.00 Nuevo    │
│  2  001-002-000124  María García         $200.00 Nuevo    │
│  3  001-002-000125  Carlos Ruiz          $75.00  Nuevo    │
│  ...                                                      │
│                                                             │
│  ⚠️ Las facturas se vincularán automáticamente con        │
│     documentos si el número de trámite coincide.          │
│                                                             │
│  [❌ Cancelar]        [✅ Confirmar Importación]          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Paso 4: Confirmar Importación

1. Revisa que los datos sean correctos
2. Haz clic en **Confirmar Importación**
3. Espera a que el proceso termine
4. El sistema mostrará un resumen de resultados:

```
✅ Importación Completada

Facturas importadas: 40
Facturas actualizadas: 5
Errores: 0
Documentos vinculados: 35
Documentos sin vincular: 10

[Ver Facturas Importadas]  [Importar Otro]
```

### Solución de Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Formato inválido" | No es XML válido | Verificar que el archivo no esté corrupto |
| "Factura duplicada" | Ya existe en el sistema | Revisar si es actualización |
| "Sin documento" | El trámite no está registrado | El documento se creará cuando se importe |
| "Error de lectura" | XML mal formado | Solicitar nuevo archivo a Koinor |

---

## 🔍 Consultar Facturas

### Buscar Factura

1. Ve a **Facturas → Consultar**
2. Usa la barra de búsqueda:

**Puedes buscar por:**
- Número de factura (ej: `001-002-000123456`)
- Nombre del cliente
- Número de cédula/RUC
- Número de protocolo

### Detalle de Factura

```
┌────────────────────────────────────────────────────────────┐
│  📄 Detalle de Factura                                    │
│  001-002-000123456                                        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 INFORMACIÓN DEL CLIENTE                                │
│  ─────────────────────────────────────────────────────   │
│  Nombre: Juan Pérez López                                 │
│  Cédula/RUC: 1723456789001                                │
│  Dirección: Av. Principal 123                             │
│  Teléfono: +593987654321                                  │
│                                                             │
│  📋 DETALLE DE LA FACTURA                                  │
│  ─────────────────────────────────────────────────────   │
│  Número: 001-002-000123456                                │
│  Fecha Emisión: 15/01/2025                                │
│  Fecha Vencimiento: 15/02/2025                            │
│                                                             │
│  Concepto: Escritura Pública - Protocolo 001-2025-0001   │
│                                                             │
│  💰 DETALLE DE PAGOS                                       │
│  ─────────────────────────────────────────────────────   │
│  Total Factura:        $150.00                            │
│  Pagado:               $150.00  ✅                        │
│  Saldo Pendiente:      $0.00                              │
│                                                             │
│  📅 Historial de Pagos:                                   │
│  [05/02/2025] Pago efectivo: $150.00                     │
│                                                             │
│  🔔 NOTIFICACIONES                                         │
│  ─────────────────────────────────────────────────────   │
│  Email enviado: ✅ 15/01/2025                             │
│                                                             │
│  📄 DOCUMENTO ASOCIADO                                     │
│  ─────────────────────────────────────────────────────   │
│  Protocolo: 001-2025-0001                                 │
│  Estado: ✅ ENTREGADO                                     │
│  [Ver Documento]                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 💳 Verificar Estado de Pago

### Estados de Pago

| Estado | Descripción | Acción |
|--------|-------------|--------|
| ⏳ **PENDIENTE** | Sin pagos registrados | Cobrar al cliente |
| 💳 **PARCIAL** | Pagó parte | Verificar saldo pendiente |
| ✅ **PAGADO** | Pago completo | Liberar documento |
| 🚫 **VENCIDO** | Fecha vencida pasada | Gestionar cobro |

### Verificar Pago de Cliente

Cuando un cliente dice que pagó:

1. Busca la factura por número o nombre
2. Revisa el estado de pago
3. Si muestra **PENDIENTE** pero el cliente dice que pagó:
   - Verifica en el sistema Koinor
   - El sync puede tardar hasta 30 minutos
   - Si ya pasó el tiempo, contacta al ADMIN

### Sincronización de Pagos

Los pagos se sincronizan automáticamente desde Koinor cada 30 minutos.

Para forzar una sincronización manual:
1. Ve a **Configuración → Sincronización**
2. Haz clic en **Sincronizar Ahora**
3. Espera el resultado

---

## 📊 Reportes Financieros

### Tipos de Reportes Disponibles

1. **Reporte de Ingresos**
   - Por día, semana, mes
   - Pagos recibidos vs pendientes
   - Por tipo de documento

2. **Reporte de Facturas**
   - Emitidas vs pagadas
   - Facturas vencidas
   - Por cliente

3. **Reporte de CXC (Cuentas por Cobrar)**
   - Saldos pendientes
   - Antigüedad de deudas
   - Proyección de cobros

### Generar Reporte

1. Ve a **Reportes → Financieros**
2. Selecciona el tipo de reporte
3. Configura filtros:
   - Rango de fechas
   - Estado (todos, pendientes, pagados)
   - Cliente específico (opcional)

```
┌────────────────────────────────────────────────────────────┐
│  📊 Generar Reporte Financiero                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Tipo de Reporte: [Ingresos ▼]                           │
│                                                             │
│  Período:                                                  │
│  Desde: [01/02/2025]  Hasta: [28/02/2025]                │
│                                                             │
│  Agrupar por:                                              │
│  ○ Día  ● Semana  ○ Mes                                  │
│                                                             │
│  Filtros adicionales:                                      │
│  Estado: [Todos ▼]                                        │
│  Cliente: [Todos los clientes ▼]                         │
│                                                             │
│  [📥 Generar PDF]  [📊 Generar Excel]  [👁️ Vista Previa] │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Reporte de Ingresos - Ejemplo

```
════════════════════════════════════════════════════════════
  REPORTE DE INGRESOS - Febrero 2025
  Generado: 06/02/2025 16:00
════════════════════════════════════════════════════════════

RESUMEN GENERAL
────────────────────────────────────────────────────────────
Total Facturado:        $67,890.00
Total Pagado:           $54,200.00  (80%)
Total Pendiente:        $13,690.00  (20%)

DESGLOSE POR SEMANA
────────────────────────────────────────────────────────────
Semana 1 (01-07):  Facturado $15,400  |  Pagado $12,300
Semana 2 (08-14):  Facturado $18,900  |  Pagado $15,600
...

TOP 10 CLIENTES (por monto facturado)
────────────────────────────────────────────────────────────
1. Cliente A          $8,500.00
2. Cliente B          $7,200.00
3. Cliente C          $6,800.00
...

DOCUMENTOS MÁS FACTURADOS
────────────────────────────────────────────────────────────
1. Escritura Pública      45 documentos  $32,400
2. Poder General          23 documentos  $11,500
3. ...
```

---

## 🔄 Sincronización con Koinor

### ¿Qué se sincroniza?

| Dato | Origen | Frecuencia |
|------|--------|------------|
| Facturas nuevas | Koinor XML | Manual (al importar) |
| Estado de pagos | Koinor CXC | Automático (30 min) |
| Clientes | Koinor | Con las facturas |

### Verificar Estado de Sync

1. Ve a **Configuración → Sincronización**
2. Revisa:
   - Última sincronización
   - Facturas sincronizadas
   - Errores (si hay)

```
Estado de Sincronización
════════════════════════════════════════════════════════════

Sync de Facturas (XML):
├─ Última importación: 06/02/2025 14:30
├─ Facturas importadas: 45
└─ Estado: ✅ OK

Sync de CXC (Pagos):
├─ Último sync: 06/02/2025 15:30
├─ Registros procesados: 2,000
├─ Pagos actualizados: 23
└─ Estado: ✅ OK

Próximo sync automático: 06/02/2025 16:00
```

---

## ⚠️ Problemas Comunes

### "La factura no aparece en el sistema"

**Verificar:**
1. ¿Se importó el XML del día?
2. ¿La factura está en Koinor?
3. ¿Hay errores en la importación?

**Solución:**
1. Importar el XML más reciente
2. Buscar por número exacto
3. Verificar logs de importación

### "El pago no se refleja"

**Causas:**
- El sync automático aún no corre (cada 30 min)
- El pago fue registrado después del último sync
- Problema de conexión con Koinor

**Solución:**
1. Esperar al siguiente sync (máx. 30 min)
2. Forzar sincronización manual
3. Verificar en Koinor que el pago esté registrado

### "Error al importar XML"

**Solución paso a paso:**
1. Verificar que el archivo no esté corrupto
2. Intentar abrir el XML en un navegador
3. Verificar codificación (debe ser UTF-8)
4. Contactar a Koinor si el archivo está dañado

### "Las cifras no coinciden con Koinor"

**Verificar:**
1. Fecha del último sync
2. Facturas importadas vs facturas en Koinor
3. Pagos registrados manualmente vs automáticos

**Solución:**
1. Realizar sync completo
2. Comparar reportes de ambos sistemas
3. Reportar discrepancias al ADMIN

---

## 💡 Mejores Prácticas

### 📅 Rutina Diaria

**Mañana:**
- [ ] Importar XML de facturas del día anterior
- [ ] Verificar facturas pendientes de ayer
- [ ] Revisar alertas de facturas vencidas

**Durante el día:**
- [ ] Consultar pagos reportados por clientes
- [ ] Verificar que los syncs estén funcionando

**Tarde:**
- [ ] Generar reporte de ingresos del día
- [ ] Verificar que todos los pagos estén registrados

### 🎯 Organización

1. **Guarda los XML** importados en una carpeta por mes
2. **Revisa los reportes** semanalmente
3. **Comunica** a RECEPCIÓN sobre facturas pagadas
4. **Reporta** discrepancias inmediatamente

---

## 📞 Contactos

| Situación | Contactar |
|-----------|-----------|
| Error de importación | ADMIN |
| Problema con sync | ADMIN |
| Discrepancia de cifras | ADMIN |
| Duda sobre factura específica | ADMIN o ARCHIVO |

---

*Última actualización: Febrero 2025*
