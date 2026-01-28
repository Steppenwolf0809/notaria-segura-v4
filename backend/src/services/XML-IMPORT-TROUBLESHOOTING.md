# Solución de Problemas: Importación XML Koinor

## Error: "El archivo no tiene la estructura XML de Koinor esperada"

### Causa del Error

Este error ocurre cuando el archivo XML que intentas importar no contiene las etiquetas y estructura que el sistema espera del formato de exportación de Koinor.

### Solución Paso a Paso

#### 1. Diagnosticar el Archivo XML

Antes de intentar importar, usa el script de diagnóstico para analizar la estructura:

```bash
node backend/scripts/diagnose-xml-structure.js <ruta-completa-al-archivo.xml>
```

**Ejemplo:**
```bash
node backend/scripts/diagnose-xml-structure.js C:/Users/Usuario/Downloads/estado_cuenta.xml
```

El script mostrará:
- ✅ Encoding detectado
- ✅ Estructura encontrada
- ✅ Campos requeridos presentes
- 📊 Estadísticas de contenido
- 📋 Ejemplo del primer grupo

#### 2. Verificar el Archivo

El archivo XML debe cumplir con estas características:

**Estructura requerida:**
```xml
<?xml version="1.0" encoding="UTF-16"?>
<d_vc_i_estado_cuenta_row>
  <d_vc_i_estado_cuenta_group1>
    <tipdoc>AB</tipdoc>
    <numdoc>001-2601000305</numdoc>
    <numtra>001002-00124369</numtra>
    <valcob>123.45</valcob>
    <fecemi>2026-01-19 00:00:00</fecemi>
    <nomcli>JUAN PEREZ</nomcli>
    <codcli>1234567890</codcli>
    <!-- ... más campos ... -->
  </d_vc_i_estado_cuenta_group1>
  <!-- ... más grupos ... -->
</d_vc_i_estado_cuenta_row>
```

**Campos obligatorios en cada grupo:**
- `<tipdoc>` - Tipo de documento (AB=Abono/Pago, NC=Nota Crédito, FC=Factura)
- `<numdoc>` - Número de recibo/documento
- `<numtra>` - Número de factura afectada
- `<valcob>` - Valor del pago/movimiento
- `<fecemi>` - Fecha de emisión
- `<nomcli>` - Nombre del cliente

#### 3. Problemas Comunes y Soluciones

##### ❌ Problema: Archivo vacío o muy corto
**Solución:** Verifique que el archivo se exportó completamente desde Koinor

##### ❌ Problema: Formato incorrecto
**Solución:** 
1. Abra Koinor
2. Vaya a Reportes → Estado de Cuenta
3. Seleccione el rango de fechas
4. Exporte como XML (no como Excel o PDF)

##### ❌ Problema: Encoding incorrecto
**Solución:** El sistema soporta UTF-16LE, UTF-8 y Latin1. Si el archivo usa otro encoding, conviértalo primero.

##### ❌ Problema: Tags con nombres diferentes
**Solución:** Verifique que está usando la exportación correcta de Koinor. El formato puede variar entre versiones.

#### 4. Verificar el Reporte en Koinor

El archivo XML debe ser generado desde:

**Koinor → Cuentas por Cobrar → Reportes → Estado de Cuenta del Cliente**

Configuración recomendada:
- ✅ Incluir todos los tipos de documento (AB, NC, FC)
- ✅ Rango de fechas: Último mes o período específico
- ✅ Formato de salida: XML
- ✅ Encoding: UTF-16 (default de Koinor)

#### 5. Validar Antes de Importar

Después de ejecutar el script de diagnóstico, deberías ver:

```
✅ El archivo parece tener la estructura XML de Koinor correcta
   Puede proceder con la importación.
```

Si ves esto, el archivo es válido y puedes proceder con la importación.

### Información Adicional en Logs

Con las mejoras implementadas, ahora el sistema registra información de diagnóstico:

```javascript
[xml-koinor-parser] Validation check: {
  hasXMLDeclaration: true,
  hasRowTag: true,
  hasGroup1Tag: true,
  hasGroup1CloseTag: true,
  length: 125847,
  firstChars: '<?xml version="1.0"...'
}
```

Revisa los logs del servidor para ver exactamente qué está detectando el sistema.

### ¿Aún tienes problemas?

Si después de seguir estos pasos el error persiste:

1. **Ejecuta el script de diagnóstico** y guarda la salida completa
2. **Revisa los logs del servidor** (busca `[xml-koinor-parser]`)
3. **Verifica la versión de Koinor** que estás usando
4. **Contacta a soporte** con:
   - Salida del script de diagnóstico
   - Primeros 1000 caracteres del XML (sin datos sensibles)
   - Versión de Koinor

### Importación Exitosa

Cuando el archivo es válido, verás:

```json
{
  "success": true,
  "message": "Importación XML completada",
  "stats": {
    "totalTransactions": 150,
    "paymentsCreated": 45,
    "paymentsSkipped": 0,
    "invoicesUpdated": 45,
    "documentsUpdated": 12,
    "notasCreditoProcessed": 2,
    "errors": 0
  }
}
```

---

**Fecha de creación:** 2026-01-28  
**Última actualización:** 2026-01-28
