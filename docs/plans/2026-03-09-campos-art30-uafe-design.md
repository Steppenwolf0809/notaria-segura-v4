# Campos Art. 30 Reglamento UAFE — Diseño

**Fecha:** 2026-03-09
**Branch:** feature/formulario-uafe-reportes
**Referencia legal:** Art. 30, Reglamento a la Ley Orgánica de Prevención de Lavado de Activos (Decreto 298)

## Objetivo

Alinear los formularios UAFE (público + matrizador) y el documento Word con los campos obligatorios del Art. 30 del Reglamento. Solo persona natural en esta fase.

## Campos descartados (decisión del usuario)

- RUC / RUP persona natural — no aplica en práctica notarial
- Teléfono convencional — Art. 30 dice "celular y/o convencional", celular es suficiente
- Ciudad en dirección — cantón = ciudad en Ecuador, no duplicar
- Teléfono empresa — excluido por decisión del usuario
- Persona jurídica — fase posterior

## Cambios por capa

### 1. Base de datos (Prisma) — FormularioUAFERespuesta

Campos nuevos (todos opcionales/nullable):

```prisma
// Dirección domiciliaria (Art. 30 §1.1.d)
sector              String?
referencia          String?

// PEP - Es PEP (Art. 30 §2.a-g)
pepInstitucion        String?
pepCargo              String?
pepDireccionLaboral   String?
pepFechaDesde         DateTime?
pepFechaHasta         DateTime?

// PEP - Familiar de PEP (Art. 30 §2)
pepFamiliarNombre       String?
pepFamiliarParentesco   String?
pepFamiliarCargo        String?
pepFamiliarInstitucion  String?

// PEP - Colaborador de PEP (Art. 30 §2)
pepColaboradorNombre         String?
pepColaboradorTipoRelacion   String?

// Mandante / Beneficiario final (Art. 30 §1.3)
// Se llenan cuando actuaPor != PROPIOS_DERECHOS
mandanteApellidos         String?
mandanteNombres           String?
mandanteTipoIdentificacion String?
mandanteNumeroIdentificacion String?
mandanteNacionalidad      String?
mandanteGenero            String?
mandanteDireccion         String?   // dirección completa en texto
mandanteProvincia         String?
mandanteCanton            String?
mandanteParroquia         String?
mandanteSector            String?
mandanteReferencia        String?
mandanteCelular           String?
mandanteCorreo            String?
mandanteActividadOcupacional String?
mandanteIngresoMensual    String?
```

### 2. Formulario público (NaturalForm en FormularioUAFEPublico.jsx)

**Tab Dirección** — agregar después de parroquia:
- Sector (texto, opcional)
- Referencia (texto, opcional)

**Tab PEP** — campos condicionales:
- Si `esPEP`: institución, cargo, dirección laboral, fecha desde, fecha hasta
- Si `esFamiliarPEP`: nombre PEP, parentesco (select), cargo PEP, institución
- Si `esColaboradorPEP`: nombre PEP, tipo de relación

No maneja mandante (el compareciente llena sus propios datos).

### 3. Matrizador (UAFEPersonaEditDialog.jsx)

**Datos Personales** — agregar:
- Nivel de estudio (select, mismas opciones que formulario público)

**Dirección** — agregar:
- Sector
- Referencia

**Información Laboral** — agregar:
- Dirección empresa (`direccionLaboral`)
- Provincia laboral
- Cantón laboral

**PEP** — reemplazar campo texto libre `pepDetalle` por:
- 3 checkboxes (esPEP, esFamiliarPEP, esColaboradorPEP)
- Campos condicionales iguales al formulario público

**Mandante (nuevo bloque)** — condicional cuando `actuaPor` != PROPIOS_DERECHOS:
- Apellidos, nombres, tipo/número identificación
- Nacionalidad, género
- Dirección completa (calle, número, secundaria, provincia, cantón, parroquia, sector, referencia)
- Celular, correo
- Actividad ocupacional, ingreso mensual

### 4. Word service (formulario-uafe-word-service.js)

**Dirección:** agregar sector + referencia. Quitar campo "País" (nadie lo recolecta, hardcodear si es necesario).

**Información Laboral:** leer `direccionLaboral`, `provinciaLaboral`, `cantonLaboral` del DB.

**PEP:** renderizar campos estructurados:
- Si esPEP: tabla con institución, cargo, dirección, fechas
- Si esFamiliarPEP: tabla con nombre, parentesco, cargo, institución
- Si esColaboradorPEP: nombre + tipo relación

**Mandante:** nueva sección "DATOS DEL MANDANTE / BENEFICIARIO FINAL" cuando aplique, con todos los campos Art. 30 §1.3.

## Orden de implementación

1. Migración Prisma (campos nuevos)
2. Backend: endpoint guardar/leer los campos nuevos
3. Formulario público: sector, referencia, PEP condicional
4. Matrizador: todos los campos faltantes + mandante
5. Word service: actualizar plantilla
6. Test manual con minutas de ejemplo
