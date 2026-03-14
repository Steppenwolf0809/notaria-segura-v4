# Autocomplete con Catálogos UAFE

**Fecha**: 2026-03-14
**Estado**: Aprobado

## Problema

Los campos de nacionalidad, cantón y provincia en los formularios UAFE son texto libre. Esto causa:
- Datos inconsistentes (ej: "ECUATORIANA", "Ecuador", "EC", "ECU")
- El reporte UAFE necesita códigos exactos del catálogo oficial (Catalogo-Notarios.xls)
- El generador de reportes tiene mapeo manual frágil para convertir texto → código

## Solución

Reemplazar TextFields por MUI Autocomplete vinculados al catálogo oficial UAFE.

## Catálogos

| Catálogo | Items | Código | Ejemplo |
|---|---|---|---|
| Nacionalidad | 272 | ISO 3 chars | ECU = Ecuatoriana |
| Cantón | 222 | 4 dígitos | 1701 = QUITO (Pichincha) |

Parroquia queda como texto libre (no existe en catálogo UAFE).

## Archivos nuevos

### `frontend/src/data/catalogos-uafe.js`
- Generado desde `docs/Uafe/Catalogo-Notarios.xls`
- `NACIONALIDADES_UAFE`: `[{ codigo: 'ECU', label: 'Ecuatoriana' }, ...]`
- `CANTONES_UAFE`: `[{ codigo: '1701', provincia: 'PICHINCHA', canton: 'QUITO', label: 'QUITO (Pichincha)' }, ...]`

### `frontend/src/components/uafe/CatalogoAutocomplete.jsx`
- Wrapper de MUI Autocomplete con `freeSolo: false`
- Busca por label, código, o texto parcial
- Props: `options`, `value`, `onChange`, `label`, `size`, `required`

## Campos afectados

### Nacionalidad (Autocomplete)

| # | Formulario | Campo |
|---|---|---|
| 1 | Público Natural - personales | `nacionalidad` |
| 2 | Público Natural - cónyuge | `conyugeNacionalidad` |
| 3 | Público Jurídica - compañía | `compNacionalidad` **(nuevo)** |
| 4 | Público Jurídica - rep. legal | `repNacionalidad` |
| 5 | Público Jurídica - cónyuge rep. | `conNacionalidad` |
| 6 | Público Jurídica - socio natural | `socio.nacionalidad` |
| 7 | Público Jurídica - socio jurídico | `socio.nacionalidad` |
| 8 | Público Jurídica - sub-socio | `sub.nacionalidad` |
| 9 | Matrizador dialog - persona | `nacionalidad` |
| 10 | Matrizador dialog - cónyuge | `conyugeNacionalidad` |

### Cantón → Provincia (Autocomplete + readonly)

Orden: **Cantón primero, Provincia después** (autollenado readonly).

| # | Formulario | Cantón → Provincia |
|---|---|---|
| 1 | Público Natural - domicilio | `canton` → `provincia` |
| 2 | Público Natural - laboral | `cantonLaboral` → `provinciaLaboral` |
| 3 | Público Jurídica - compañía | `compCanton` → `compProvincia` |
| 4 | Público Jurídica - rep. legal | `repCanton` → `repProvincia` |
| 5 | Matrizador dialog - domicilio | `canton` → `provincia` |
| 6 | Matrizador dialog - laboral | `cantonLaboral` → `provinciaLaboral` |

## Almacenamiento

Al guardar, se almacena nombre legible + código:
```json
{
  "nacionalidad": "ECUATORIANA",
  "nacionalidadCodigo": "ECU",
  "canton": "QUITO",
  "cantonCodigo": "1701",
  "provincia": "PICHINCHA"
}
```

## Retrocompatibilidad

- Datos existentes sin código: el reporte sigue usando mapeo manual (getNacionalidad)
- Datos nuevos con código: el reporte usa el código directo
- No se migran datos viejos

## Nuevo campo: compNacionalidad

Se agrega nacionalidad/país de constitución en el tab Compañía del formulario jurídico.
