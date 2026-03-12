# Formulario Vehículos UAFE + Actos Manuales + Umbral $10,000

**Fecha**: 2026-03-11
**Estado**: Aprobado para implementación
**Branch**: feature/formulario-vehiculos-uafe

---

## Contexto

Los reconocimientos de firma de vehículo (5-15/mes) se procesan manualmente hoy:
- El matrizador toma las firmas del contrato de compraventa
- Para el reporte mensual UAFE, el operador descarga todos los reconocimientos y busca manualmente la información en cada expediente (CUV, matrícula, contrato)
- No hay minuta Word — los contratos de vehículo son en papel preimpreso de papelería
- El CUV (Certificado Único Vehicular) es un PDF del ANT con datos del vehículo y propietario

### Fuente de datos del índice notarial

Del sistema notarial ya se importan los reconocimientos de firma como `Document`, pero solo con número de diligencia y datos de facturación (NO cédulas ni cuantía):

```
20261701018D00295     02/03/2026     RECONOCIMIENTO DE FIRMAS DE VEHÍCULO
GANDY VINICIO ENRIQUEZ GUERRA     1711858652
VERONICA ANDREA ERAZO MERINO     1716212129
GUSTAVO ANDRES SALINAS SALGADO     1719693499
    37500.0
```

---

## Catálogos UAFE Oficiales (corregidos 2026-03-11)

**IMPORTANTE**: Los catálogos del sistema fueron corregidos con datos del archivo `Catalogo-Notarios.xls` (fuente oficial UAFE). Commit `2f17e07f`.

### Tipo Transacción
| Código | Descripción |
|--------|-------------|
| 73 | PROMESA DE CELEBRAR CONTRATOS |
| 74 | COMPRAVENTA |
| 75 | COMPRAVENTA MIDUVI |
| 76 | TRANSFERENCIA DE DOMINIO CON CONSTITUCIÓN DE HIPOTECA |
| 77 | CONSTITUCIÓN DE HIPOTECA |
| 78 | HIPOTECA BIESS/ISSFA/ISSPOL/MUNICIPALIDADES/MUTUALISTAS |
| 79 | CONSTITUCIÓN DE HIPOTECA ABIERTA |
| 80 | HIPOTECA MIDUVI |
| 81 | DONACIÓN |
| 82 | PERMUTA |
| 83 | LIQUIDACIÓN DE LA SOCIEDAD CONYUGAL |
| 84 | LIQUIDACIÓN DE LA SOCIEDAD DE BIENES |
| 85 | DACIÓN EN PAGO |
| 86 | CESIÓN DE DERECHOS ONEROSOS |
| 87 | COMODATO |
| 88 | CONSTITUCIÓN DE CONSORCIOS CON CUANTÍA DETERMINADA |
| 89 | TRASPASO DE UN CRÉDITO CON CUANTÍA |
| 90 | CESIÓN DE PARTICIPACIONES |

**Nota**: El código 74 (COMPRAVENTA) es genérico — aplica tanto para inmuebles como vehículos. La diferencia se marca en el campo `tipoBien` (VEH vs CAS/DEP/TER).

### Papel Interviniente (más usados)
| Código | Nombre | Actos típicos |
|--------|--------|---------------|
| 20 | COMPRADOR(A) | 74 |
| 63 | VENDEDOR(A) | 74, 76 |
| 52 | PROMITENTE COMPRADOR(A) | 73 |
| 55 | PROMITENTE VENDEDOR(A) | 73 |
| 32 | DONANTE | 81 |
| 33 | DONATARIO(A) | 81 |
| 22 | COMPRADOR(A)-DEUDOR(A)-HIPOTECARIO(A) | 76 |
| 03 | ACREEDOR(A) HIPOTECARIO(A) | 77, 76 |
| 29 | DEUDOR(A) HIPOTECARIO(A) | 77, 78 |
| 45 | PERMUTANTE | 82 |
| 15 | CEDENTE | 90, 86 |
| 16 | CESIONARIO(A) | 90, 86 |
| 24 | COMPARECIENTE | 83, 84 |

### Rol Interviniente
| Código | Descripción |
|--------|-------------|
| 01 | COMPARECIENTE (OTORGADO POR) — quien transfiere/entrega/debe |
| 02 | COMPARECIENTE (A FAVOR DE) — quien recibe/adquiere |

---

## Diseño del Formulario

### Acceso

El **matrizador** accede desde su vista existente. Botón **"Registrar Vehículo UAFE"** abre el formulario. El matrizador registra TODOS los reconocimientos de firma de vehículo, sin importar el monto.

### Estructura: 3 Tabs

#### Tab 1 — Acto
| Campo | Tipo | Requerido | Default | Notas |
|-------|------|-----------|---------|-------|
| Tipo de acto | Dropdown | Sí | 74 (COMPRAVENTA) | Solo opciones relevantes: 74, 81 |
| Fecha | DatePicker | Sí | Hoy | |
| Cuantía (precio venta) | Number | Sí | - | Lo que pagó el comprador |
| Avalúo | Number | No | - | Del CUV/matrícula |
| Forma de pago | Dropdown | Sí | - | TRANSFERENCIA, CHEQUE, EFECTIVO, DEPÓSITO, CRÉDITO_HIPOTECARIO, OTRO |
| Detalle forma de pago | Text | No | - | Ej: "Banco Pichincha" |
| Vincular diligencia | Buscador | No | - | Buscar por número de diligencia existente |

#### Tab 2 — Vehículo
| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| Marca | Text | Sí | Ej: TOYOTA |
| Modelo | Text | Sí | Ej: LAND CRUISER PRADO VX AC 4.0 |
| Año | Number | Sí | Ej: 2020 |
| Placa | Text | Sí | Ej: PDJ6228 |
| Color | Text | No | Ej: PLATEADO |
| Motor | Text | No | Número de motor del CUV |
| Chasis/VIN | Text | No | VIN del CUV |
| Ciudad comercialización | Text | Sí | Default: QUITO |

#### Tab 3 — Intervinientes
- Mismo componente reutilizado de inmuebles
- Cédula + nombre + calidad (VENDEDOR/COMPRADOR para compraventa, DONANTE/DONATARIO para donación)
- Mínimo 2 intervinientes
- Datos personales se obtienen del formulario público existente (PersonaUAFE)

### Datos que se guardan

Se crea un `ProtocoloUAFE` con:
```
tipoActo: "COMPRAVENTA" (o "DONACION")
codigoActo: "74" (o "81")
tipoBien: "VEH"
descripcionBien: "VEHÍCULO COMERCIALIZADO EN {ciudad}, MARCA: {marca}, Placa: {placa}, Motor: {motor}, Chasis: {chasis}"
valorContrato: cuantía
avaluoMunicipal: avalúo
formasPago: [{ tipo, monto, detalle }]
vehiculoMarca, vehiculoModelo, vehiculoAnio, vehiculoPlaca, vehiculoCiudadComercializacion
codigoCanton: "1701" (default)
estado: "BORRADOR"
numeroProtocolo: "D{numero}" (formato diligencia, no protocolo)
```

El formato de `descripcionBien` replica exactamente el del reporte UAFE real:
`"VEHÍCULO COMERCIALIZADO EN QUITO, MARCA: FORD, Placa: PDG9514, Motor: JBC41552, Chasis: 2FMPK3J80JBC41552"`

---

## Lógica de Umbral $10,000

### Regla UAFE
- Actos >= $10,000 se reportan siempre
- Si un compareciente acumula >= $10,000 en el mes (sumando TODOS sus actos: vehículos + inmuebles), se reportan TODOS sus actos del mes

### Cuándo se evalúa
- Al guardar cualquier registro UAFE (vehículo o inmueble)
- Al generar el reporte mensual

### Alerta al oficial de cumplimiento
- **Solo se alerta cuando**: un acto individual es < $10,000 PERO la acumulación del compareciente en el mes ya supera $10,000
- Si el acto individual ya es >= $10,000, NO hay alerta (es obvio que se reporta)
- La alerta es **informativa, no bloquea** el guardado

### Cómo se alerta
1. **Al matrizador** (al guardar): banner amarillo — *"El compareciente JUAN PÉREZ (1712345678) acumula $12,500 en actos este mes. Se notificó al oficial de cumplimiento."*
2. **Al oficial de cumplimiento** (en dashboard UAFE): badge/KPI — *"3 comparecientes superan umbral este mes"* con desglose detallado

### Lógica de acumulación (SQL conceptual)
```sql
SELECT personaCedula, SUM(p.valorContrato)
FROM PersonaProtocolo pp
JOIN ProtocoloUAFE p ON pp.protocoloId = p.id
WHERE EXTRACT(MONTH FROM p.fecha) = :mes
  AND EXTRACT(YEAR FROM p.fecha) = :anio
  AND p.notaryId = :notaryId
GROUP BY personaCedula
HAVING SUM(p.valorContrato) >= 10000
```

---

## Generación del Reporte Mensual

### Filtro de inclusión
1. Actos individuales >= $10,000 → incluir siempre
2. Actos < $10,000 → incluir **solo si** el compareciente acumula >= $10,000 en el mes

### Cambios en `reporte-uafe-generator-service.js`

#### `queryProtocolos` — agregar filtro de umbral
Actualmente trae todos los protocolos del mes. Debe cambiar a:
1. Traer todos los protocolos del mes
2. Calcular acumulación por cédula
3. Filtrar: incluir si `valorContrato >= 10000` O si la cédula tiene acumulación >= 10000

#### TRANSACCION.xlsx — sin cambios de formato
Mismas columnas. Para vehículos:
- `tipo_acto_codigo`: "74"
- `descripcion_acto`: "COMPRAVENTA" o "RECONOCIMIENTO DE FIRMAS DE VEHÍCULO - COMPRAVENTA"
- `tipo_bien_codigo`: "VEH"
- `descripcion_bien`: formato del CUV

#### INTERVINIENTE.xlsx — sin cambios de formato
Misma estructura exacta.

---

## Campos de schema.prisma (ya existen)

El modelo `ProtocoloUAFE` ya tiene los campos necesarios para vehículos:
```prisma
vehiculoAnio            String?
vehiculoMarca           String?
vehiculoModelo          String?
vehiculoPlaca           String?
vehiculoCiudadComercializacion String?
```

**Campos que faltan agregar** (para Motor y Chasis del CUV):
```prisma
vehiculoMotor           String?   // Número de motor
vehiculoChasis          String?   // VIN/Chasis
vehiculoColor           String?   // Color
```

---

## Plan de Implementación (OLAs)

### OLA 1: Schema + Backend endpoints
1. Migración Prisma: agregar `vehiculoMotor`, `vehiculoChasis`, `vehiculoColor` a ProtocoloUAFE
2. Endpoint POST `/api/uafe/protocolo/vehiculo` — crear protocolo de vehículo
3. Endpoint PUT `/api/uafe/protocolo/vehiculo/:id` — actualizar
4. Endpoint GET `/api/uafe/umbral/:mes/:anio` — consultar comparecientes que superan umbral
5. Lógica de acumulación por cédula en servicio

### OLA 2: Frontend formulario matrizador
1. Componente `UAFEVehiculoForm.jsx` con 3 tabs
2. Botón "Registrar Vehículo UAFE" en vista del matrizador
3. Banner de alerta de umbral al guardar
4. Reutilizar componente de intervinientes existente

### OLA 3: Dashboard oficial + reporte mejorado
1. KPI de comparecientes que superan umbral en `UAFEKPICards`
2. Vista detallada de acumulación por persona
3. Modificar `queryProtocolos` para filtro de umbral en generación de reporte
4. Tests con datos reales (reportes diciembre 2025 y enero 2026)

### OLA 4: Otros actos manuales (futuro)
- Donación (81), Permuta (82), Dación en pago (85), etc.
- Mismo patrón de formulario manual pero sin tab de vehículo
- Reutilizar tabs de Acto e Intervinientes

---

## Verificación con reportes reales

Los reportes de diciembre 2025 y enero 2026 confirman:
- **Diciembre**: 14 vehículos reportados (código 74, tipo bien VEH), cuantías desde $3,000 hasta $40,000
- **Enero**: 19 vehículos reportados, incluyendo 6 motos BAJAJ de $2,600 c/u (misma fecha, posible acumulación)
- Formato `descripcionBien` consistente: `"VEHÍCULO COMERCIALIZADO EN QUITO, MARCA: X, Placa: Y, Motor: Z, Chasis: W"`
- Las columnas de TRANSACCION son: [codigo_transaccion, fecha, tipo_acto, descripcion_acto, avaluo, cuantia, tipo_bien, descripcion_bien, canton, secuencial, fecha_corte]

**NOTA sobre orden de columnas**: En los reportes reales, la columna 5 (índice 4) es el AVALÚO y la columna 6 (índice 5) es la CUANTÍA/precio de venta. Verificar que el generador actual respete este orden.
