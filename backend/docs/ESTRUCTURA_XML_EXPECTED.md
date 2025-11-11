# Estructura XML Esperada para Documentos de Trazabilidad

## Descripción

El sistema procesa archivos XML que contienen información de facturas notariales. Esta documentación describe la estructura esperada del XML y los campos requeridos.

## Estructura XML Mínima Requerida

```xml
<?xml version="1.0" encoding="UTF-8"?>
<factura>
  <infoFactura>
    <razonSocialComprador>Nombre del Cliente</razonSocialComprador>
    <identificacionComprador>123456789</identificacionComprador>
    <importeTotal>1500.00</importeTotal>
  </infoFactura>

  <infoAdicional>
    <campoAdicional nombre="NÚMERO DE LIBRO">20251701018P01741</campoAdicional>
    <campoAdicional nombre="Matrizador">Juan Pérez</campoAdicional>
    <campoAdicional nombre="Email Cliente">cliente@example.com</campoAdicional>
    <campoAdicional nombre="CELULAR">0987654321</campoAdicional>
  </infoAdicional>

  <detalles>
    <detalle>
      <descripcion>ESCRITURA DE COMPRAVENTA</descripcion>
      <precioTotalSinImpuesto>1500.00</precioTotalSinImpuesto>
    </detalle>
  </detalles>
</factura>
```

## Campos Requeridos

### 1. **infoFactura** (Requerido)
Contiene la información principal de la factura.

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `razonSocialComprador` | String | Nombre del cliente | Sí |
| `identificacionComprador` | String | Cédula, RUC, pasaporte u otra identificación | No |
| `importeTotal` | Decimal | Monto total de la factura | Sí* |

*Si no se encuentra `importeTotal`, se usa 0 como valor por defecto.

### 2. **infoAdicional** (Requerido)
Contiene campos adicionales necesarios para procesar el documento.

#### Campos Obligatorios en infoAdicional:

**campoAdicional[@nombre="NÚMERO DE LIBRO"]** (Requerido)
- Contiene el código único del documento
- Formato: `[YYYYMMDD][NOTARY_ID][LETTER][SEQUENCE]`
- Ejemplo: `20251701018P01741`
- La letra indica el tipo de documento:
  - **P**: PROTOCOLO
  - **D**: DILIGENCIA
  - **A**: ARRENDAMIENTO
  - **C**: CERTIFICACION
  - **O**: OTROS (copias, razones marginales)

**campoAdicional[@nombre="Matrizador"]** (Opcional)
- Nombre del matrizador para asignación automática
- Ejemplo: `Juan Pérez García`

#### Campos Opcionales en infoAdicional:

**campoAdicional[@nombre="Email Cliente"]**
- Email del cliente
- Ejemplo: `cliente@example.com`

**campoAdicional[@nombre="CELULAR"]**
- Número de teléfono/celular
- Ejemplo: `0987654321`

### 3. **detalles** (Opcional)
Contiene los ítems/servicios registrados en la factura.

```xml
<detalles>
  <detalle>
    <descripcion>ESCRITURA DE COMPRAVENTA</descripcion>
    <precioTotalSinImpuesto>1500.00</precioTotalSinImpuesto>
  </detalle>
  <detalle>
    <descripcion>CONSULTA DATOS BIOMETRICOS</descripcion>
    <precioTotalSinImpuesto>50.00</precioTotalSinImpuesto>
  </detalle>
</detalles>
```

## Procesamiento Automático

El sistema realiza las siguientes acciones automáticamente:

### 1. Clasificación de Documentos
Según la letra en el "NÚMERO DE LIBRO":
- **P** → PROTOCOLO
- **D** → DILIGENCIA
- **A** → ARRENDAMIENTO
- **C** → CERTIFICACION
- **O** → OTROS

### 2. Selección de Acto Principal
Según el tipo de documento, el sistema selecciona automáticamente el acto principal:

**PROTOCOLO (P):**
- Prioridad: ESCRITURA > PODER > TESTAMENTO > CANCELACIÓN > HIPOTECA
- Ignora: CERTIFICACIÓN

**DILIGENCIA (D):**
- Selecciona el primer item que no sea certificación

**ARRENDAMIENTO (A):**
- Busca: ARRENDAMIENTO, CONTRATO
- Alternativa: Primer item que no sea certificación

**CERTIFICACION (C):**
- Agrupa TODOS los items como "CERTIFICACIONES"

**OTROS (O):**
- Prioridad: OTORGAMIENTO COPIAS ARCHIVO > RAZÓN MARGINAL > OFICIO > Cualquier otro

### 3. Items Ignorados
Los siguientes items se marcan como secundarios (no como acto principal):
- CONSULTA DATOS BIOMETRICOS
- SISTEMA NACIONAL DE IDENTIFICACIÓN
- REGISTRO CIVIL
- CERTIFICACIÓN DE DOCUMENTOS
- MATERIALIZADOS
- PÁGINA WEB
- SOPORTE ELECTRÓNICO
- PRESTACION DE SERVICIO FUERA DE DESPACHO
- FUERA DE DESPACHO
- MATERIALIZACIÓN
- APOSTILLA

### 4. Asignación Automática
Si se incluye el campo "Matrizador" en infoAdicional, el sistema intenta asignar automáticamente el documento al matrizador especificado.

## Errores Comunes y Soluciones

### ❌ "XML no válido: falta elemento <factura>"
**Causa:** El archivo XML no tiene el elemento raíz `<factura>`
**Solución:** Asegúrate que el XML tenga `<factura>` como elemento raíz

### ❌ "XML no válido: falta elemento <infoFactura>"
**Causa:** Falta el elemento `<infoFactura>`
**Solución:** Agrega un elemento `<infoFactura>` con los datos del cliente

### ❌ "XML no válido: no se encontró campo 'NÚMERO DE LIBRO' en infoAdicional"
**Causa:** Falta el campo adicional con nombre "NÚMERO DE LIBRO"
**Solución:** Agrega: `<campoAdicional nombre="NÚMERO DE LIBRO">20251701018P01741</campoAdicional>`

### ❌ "Error al parsear XML"
**Causa:** El XML tiene errores de sintaxis
**Solución:**
- Valida el XML con un validador online
- Asegúrate que todos los caracteres especiales estén escapados
- Verifica que todos los tags estén cerrados correctamente

### ❌ "El documento XML debe contener el número de protocolo"
**Causa:** El "NÚMERO DE LIBRO" está vacío o no es válido
**Solución:** Verifica que tenga un formato válido: `YYYYMMDDNOTARYIDLETTERSEQUENCE`

## Validaciones Implementadas

✅ Validación de que xmlContent sea un string
✅ Validación de parseo XML válido
✅ Validación de existencia de elemento `<factura>`
✅ Validación de existencia de `<infoFactura>`
✅ Validación de NÚMERO DE LIBRO requerido
✅ Validación de estructura mínima
✅ Manejo seguro de campos opcionales
✅ Manejo de importeTotal faltante (usa 0 como default)

## Próximos Pasos

Para mejorar la detección de errores:
1. Incluye siempre un log detallado cuando haya problemas
2. Verifica la estructura del XML antes de subirlo
3. Usa un validador XML online para asegurar la validez
4. En caso de error, revisa los logs del servidor para más detalles
