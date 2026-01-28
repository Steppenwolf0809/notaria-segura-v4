# 🔍 Herramienta de Diagnóstico XML Koinor

## Uso Rápido

Cuando obtengas el error **"El archivo no tiene la estructura XML de Koinor esperada"**, sigue estos pasos:

### 1. Ejecuta el Script de Diagnóstico

```bash
node backend/scripts/diagnose-xml-structure.js <ruta-al-archivo.xml>
```

**Ejemplo en Windows:**
```bash
node backend/scripts/diagnose-xml-structure.js C:\Users\Usuario\Desktop\koinor_export.xml
```

**Ejemplo en Linux/Mac:**
```bash
node backend/scripts/diagnose-xml-structure.js /home/usuario/Descargas/koinor_export.xml
```

### 2. Interpreta los Resultados

El script mostrará:

#### ✅ Archivo Válido
```
✅ El archivo parece tener la estructura XML de Koinor correcta
   Puede proceder con la importación.
```
→ **Puedes importar el archivo sin problemas**

#### ❌ Archivo Inválido
```
⚠️ PROBLEMA DETECTADO:
   ❌ No se encontró la estructura esperada (d_vc_i_estado_cuenta_group1)
   ❌ Faltan campos requeridos (numdoc, numtra, valcob)
```
→ **El archivo no es compatible**

### 3. Soluciones Comunes

| Problema | Solución |
|----------|----------|
| No se encuentra la estructura esperada | Verifica que exportaste "Estado de Cuenta" desde Koinor, no otro reporte |
| Archivo muy corto o vacío | La exportación falló. Intenta exportar nuevamente |
| Tags con nombres diferentes | Puede ser otra versión de Koinor. Contacta a soporte |
| Encoding incorrecto | El sistema detecta automáticamente UTF-16LE, UTF-8 y Latin1 |

### 4. Exportación Correcta desde Koinor

1. Abre **Koinor**
2. Ve a **Cuentas por Cobrar** → **Reportes** → **Estado de Cuenta**
3. Selecciona el rango de fechas
4. Haz clic en **Exportar** → **XML**
5. Guarda el archivo y ejecútalo con el script de diagnóstico

## Ejemplo de Salida

```
🔍 DIAGNÓSTICO DE ESTRUCTURA XML
============================================================
📁 Archivo: C:\Users\Usuario\Desktop\koinor_export.xml

📊 Tamaño del archivo: 45.23 KB
🔤 Encoding detectado: UTF-16LE

📄 Primeros 1000 caracteres del XML:
------------------------------------------------------------
<?xml version="1.0" encoding="UTF-16"?>
<d_vc_i_estado_cuenta_row>
  <d_vc_i_estado_cuenta_group1>
    <tipdoc>AB</tipdoc>
    <numdoc>001-2601000305</numdoc>
    ...
------------------------------------------------------------

🔎 Análisis de estructura:
------------------------------------------------------------
✅ Declaración XML                          <?xml
✅ Tag raíz d_vc_i_estado_cuenta_row        <d_vc_i_estado_cuenta_row
✅ Tag grupo d_vc_i_estado_cuenta_group1    <d_vc_i_estado_cuenta_group1
✅ Tag cierre group1                        </d_vc_i_estado_cuenta_group1>
✅ Campo tipdoc                              <tipdoc>
✅ Campo numdoc                              <numdoc>
✅ Campo numtra                              <numtra>
✅ Campo valcob                              <valcob>
✅ Campo fecemi                              <fecemi>
✅ Campo nomcli                              <nomcli>

📊 Estadísticas del contenido:
------------------------------------------------------------
   Grupos encontrados (group1): 142
   Tipo AB (Pagos): 45
   Tipo NC (Notas de Crédito): 2
   Tipo FC (Facturas): 95

✅ DIAGNÓSTICO COMPLETADO
============================================================
✅ El archivo parece tener la estructura XML de Koinor correcta
   Puede proceder con la importación.
```

## Documentación Completa

Para más detalles, consulta:
- **[XML-IMPORT-TROUBLESHOOTING.md](../src/services/XML-IMPORT-TROUBLESHOOTING.md)** - Guía completa de solución de problemas
- **[XML-IMPORT-IMPLEMENTATION.md](../src/services/XML-IMPORT-IMPLEMENTATION.md)** - Documentación técnica del sistema

## Soporte

Si el problema persiste después de usar el script de diagnóstico:

1. Guarda la salida completa del script
2. Revisa los logs del servidor (busca `[xml-koinor-parser]`)
3. Contacta a soporte con esta información

---

**¿Necesitas ayuda?** Ejecuta el script y comparte la salida para obtener asistencia específica.
