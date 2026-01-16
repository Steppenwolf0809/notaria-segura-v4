# 📋 PLAN: TRANSFORMACIÓN MÓDULO UAFE - HERRAMIENTA DE PRE-REDACCIÓN JURÍDICA

## 🎯 OBJETIVO GENERAL

Transformar el módulo de Formularios UAFE de una simple "encuesta de datos" a una **herramienta de pre-redacción jurídica** que:
1. Permita crear protocolos sin número (identificador temporal)
2. Muestre estado de completitud por compareciente (semáforo)
3. Genere automáticamente **DOS outputs diferentes**:
   - **ENCABEZADO**: Tabla estructurada con espacios para Word
   - **COMPARECENCIA**: Texto corrido del párrafo de comparecientes
4. Convierta números, fechas, direcciones y teléfonos a formato notarial (letras + números)
5. Permita agregar personas por cédula aunque NO estén registradas (completar después)

---

## 📝 DOS OUTPUTS DE GENERACIÓN

### OUTPUT 1: ENCABEZADO (Tabla Estructurada)
Formato con columnas alineadas mediante espacios, listo para pegar en Word:

```
                              COMPRAVENTA

                              OTORGANTES:
APELLIDOS Y NOMBRES                                              CEDULA                    CALIDAD

CARLOS MANUEL DIEGO STACEY CHIRIBOGA              1700936170              PROMITENTE VENDEDOR
ANDRÉS PATRICIO FLOR PAZMIÑO                      1720749389              PROMITENTE COMPRADOR
JESSICA ESTEFANÍA BOSQUE CUMBAL                   1721645305              PROMITENTE COMPRADORA

                        UBICACIÓN DEL INMUEBLE:

LOTE DE TERRENO NÚMERO DIEZ (10), DENOMINADO "D2-B-10 SEGÚN PLANO 
APROBADO", PREDIO NÚMERO CINCO OCHO CERO UNO SEIS TRES SEIS (5801636), 
PARROQUIA TUMBACO, CANTÓN QUITO, PROVINCIA DE PICHINCHA

                    CUANTÍA: USD $ 171.150,80
                    AVALÚO: USD $ 134.876,06
```

**Nota sobre MULTA vs AVALÚO:**
- **PROMESA DE COMPRAVENTA** → Muestra MULTA (generalmente 10% de cuantía)
- **Otros actos** → Muestra AVALÚO MUNICIPAL

### OUTPUT 2: COMPARECENCIA (Texto Corrido)
Párrafo largo con formato notarial para pegar en Word:

```
En la ciudad de San Francisco de Quito, Capital de la República del Ecuador, 
hoy día MIÉRCOLES TRES (03) DE SEPTIEMBRE DEL DOS MIL VEINTICINCO (2025), 
ante mí, DOCTORA GLENDA ZAPATA SILVA, NOTARIA DÉCIMA OCTAVA DEL CANTÓN QUITO...
```

---

## 📊 FASE 1: REESTRUCTURACIÓN DEL MODELO DE DATOS

### 1.0 Cambios al Modal "Crear Nuevo Protocolo"

**Ubicación**: `frontend/src/components/matrizador/FormulariosUAFE/CrearFormulario.jsx`

**Campos actuales** (según screenshot):
- Número de Protocolo*
- Fecha*
- Avalúo Municipal (opcional)
- Valor del Contrato*
- Formas de Pago (tipo, monto, banco)

**Campos a agregar**:

```
┌─────────────────────────────────────────────────────────────────┐
│ Crear Nuevo Protocolo UAFE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Información del Protocolo                                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│ │ Nº Protocolo │ │ Fecha*       │ │ Tipo de Acto*           │ │
│ │ (opcional)   │ │ 01/14/2026   │ │ [COMPRAVENTA        ▼]  │ │
│ └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│ │ Valor del    │ │ Avalúo       │ │ Multa (solo Promesas)   │ │
│ │ Contrato*    │ │ Municipal    │ │ (auto: 10% o manual)    │ │
│ │ $0.00        │ │ $0.00        │ │ $0.00                   │ │
│ └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│                                                                 │
│ 📍 Ubicación del Inmueble (para encabezado)                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Descripción del lote/predio:                                │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ LOTE DE TERRENO NÚMERO DIEZ (10), DENOMINADO "D2-B-10  │ │ │
│ │ │ SEGÚN PLANO APROBADO", PREDIO NÚMERO 5801636           │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ Parroquia: [________] Cantón: [QUITO___] Provincia: [PICH] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 💰 Formas de Pago                                  Total: $0,00 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Tipo ▼] │ $ 0.00 │ [Banco          ] │ 🗑️               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ + Agregar otra forma de pago                                    │
│                                                                 │
│                              [Cancelar] [📋 Crear Protocolo]   │
└─────────────────────────────────────────────────────────────────┘
```

**Tipos de Acto (selector)**:
```javascript
const TIPOS_ACTO = [
  { value: "COMPRAVENTA", label: "Compraventa" },
  { value: "PROMESA_COMPRAVENTA", label: "Promesa de Compraventa" },
  { value: "DONACION", label: "Donación" },
  { value: "DACION_EN_PAGO", label: "Dación en Pago" },
  { value: "PERMUTA", label: "Permuta" },
  { value: "PODER_ESPECIAL", label: "Poder Especial" },
  { value: "PODER_GENERAL", label: "Poder General" },
  { value: "HIPOTECA", label: "Hipoteca" },
  { value: "CANCELACION_HIPOTECA", label: "Cancelación de Hipoteca" },
  { value: "CONSTITUCION_COMPANIA", label: "Constitución de Compañía" },
  { value: "AUMENTO_CAPITAL", label: "Aumento de Capital" },
  { value: "OTRO", label: "Otro (especificar)" }
];
```

**Lógica condicional**:
- Si `tipoActo === "PROMESA_COMPRAVENTA"` → Mostrar campo MULTA
- Si `tipoActo !== "PROMESA_COMPRAVENTA"` → Ocultar campo MULTA
- Si no hay número de protocolo → Generar `identificadorTemporal` automático

### 1.1 Modificaciones al Modelo `FormularioUAFE`

**Archivo**: `backend/prisma/schema.prisma`

**Cambios requeridos**:

```
🔴 CRÍTICOS:
- Hacer `numeroProtocolo` opcional (nullable)
- Agregar campo `identificadorTemporal` (autogenerado si no hay protocolo)
- Agregar campo `fechaEscritura` (DateTime para el picker)
- Agregar campo `tipoActo` con enum de valores
- Agregar campos de ubicación del inmueble
- Agregar campo `multa` (solo para promesas)

🟡 IMPORTANTES:
- Agregar campo `textoEncabezadoGenerado` (Text, para cachear el resultado)
- Agregar campo `textoComparecenciaGenerado` (Text, para cachear)
- Agregar campo `fechaUltimaGeneracion` (para saber si hay que regenerar)
```

**Nuevos campos en el modelo**:
```prisma
model FormularioUAFE {
  id                      String    @id @default(uuid())
  token                   String    @unique @db.VarChar(8)
  
  // IDENTIFICACIÓN (ahora flexible)
  numeroProtocolo         String?   // Ahora OPCIONAL
  identificadorTemporal   String    @unique @default(uuid()) // ID interno siempre presente
  
  // TIPO Y FECHA
  tipoActo                String    // "COMPRAVENTA", "PROMESA_COMPRAVENTA", etc.
  fechaEscritura          DateTime? // Fecha para el encabezado (picker)
  
  // VALORES
  valorContrato           Decimal   @db.Decimal(12, 2)
  avaluoMunicipal         Decimal?  @db.Decimal(12, 2)
  multa                   Decimal?  @db.Decimal(12, 2) // Solo para PROMESA_COMPRAVENTA
  
  // UBICACIÓN DEL INMUEBLE (nuevo)
  ubicacionDescripcion    String?   @db.Text // "LOTE DE TERRENO NÚMERO DIEZ (10)..."
  ubicacionParroquia      String?
  ubicacionCanton         String?   @default("QUITO")
  ubicacionProvincia      String?   @default("PICHINCHA")
  
  // CACHE DE TEXTO GENERADO
  textoEncabezadoGenerado    String?   @db.Text
  textoComparecenciaGenerado String?   @db.Text
  fechaUltimaGeneracion      DateTime?
  
  // ESTADO
  estado                  String    @default("borrador") 
  // "borrador", "en_proceso", "completo", "firmado"
  
  // AUDITORÍA
  createdBy               Int      
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  // RELACIONES
  creador                 User     @relation(fields: [createdBy], references: [id])
  participantes           ParticipanteFormulario[]
  formasPago              FormaPagoUAFE[]
  
  @@map("formularios_uafe")
  @@index([token])
  @@index([numeroProtocolo])
  @@index([identificadorTemporal])
  @@index([tipoActo])
}

// Modelo separado para formas de pago
model FormaPagoUAFE {
  id              String   @id @default(uuid())
  formularioId    String
  tipo            String   // "EFECTIVO", "CHEQUE", "TRANSFERENCIA", "TARJETA"
  monto           Decimal  @db.Decimal(12, 2)
  banco           String?
  
  formulario      FormularioUAFE @relation(fields: [formularioId], references: [id], onDelete: Cascade)
  
  @@map("formas_pago_uafe")
}
```

### 1.2 Modificaciones al Modelo `ParticipanteFormulario`

**Cambio clave**: Permitir agregar personas por cédula aunque NO estén registradas.

**Lógica**:
- Si la persona existe en BD → Se vincula y muestra nombre
- Si NO existe → Se guarda solo la cédula, nombre queda pendiente
- Cuando la persona se registra después → Se autocompletan los datos

**Campos nuevos para el semáforo individual y flexibilidad**:

```prisma
model ParticipanteFormulario {
  id                      String    @id @default(uuid())
  formularioId            String
  
  // IDENTIFICACIÓN FLEXIBLE
  personaId               String?   // Puede ser NULL si persona no está registrada
  cedulaRuc               String    // SIEMPRE presente (clave para buscar)
  nombreTemporal          String?   // Si no hay persona registrada, queda vacío o "PENDIENTE"
  
  // ROL EN ESTE TRÁMITE (definido por matrizador)
  calidad                 String    // "VENDEDOR", "COMPRADOR", "DONANTE", "DONATARIO", etc.
  actuaPor                String    @default("PROPIOS_DERECHOS")
  // "PROPIOS_DERECHOS", "REPRESENTANDO_SOCIEDAD_CONYUGAL", "COMO_APODERADO"
  
  // SEMÁFORO DE COMPLETITUD
  estadoCompletitud       String    @default("pendiente")
  // "pendiente" (🔴 rojo), "incompleto" (🟡 amarillo), "completo" (🟢 verde)
  porcentajeCompletitud   Int       @default(0) // 0-100%
  camposFaltantes         Json?     // Lista de campos que faltan
  
  // CAMPOS PARA REDACCIÓN
  compareceConyugeJunto   Boolean   @default(false)
  esApoderado             Boolean   @default(false)
  mandanteCedula          String?   // Si es apoderado, cédula del mandante
  mandanteNombre          String?   // Nombre del mandante (se autocompleta)
  
  // ESTADO DE GENERACIÓN
  encabezadoGenerado      Boolean   @default(false)
  yaFirmado               Boolean   @default(false)
  
  // ORDEN de aparición
  orden                   Int       @default(0)
  
  // SNAPSHOT de datos al momento de generar
  snapshotDatos           Json?
  
  // TIMESTAMPS
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  // RELACIONES
  formulario              FormularioUAFE    @relation(fields: [formularioId], references: [id], onDelete: Cascade)
  persona                 PersonaRegistrada? @relation(fields: [personaId], references: [id])
  
  @@map("participantes_formulario")
  @@unique([formularioId, cedulaRuc]) // Una persona solo puede estar una vez por formulario
  @@index([formularioId])
  @@index([personaId])
  @@index([cedulaRuc])
  @@index([estadoCompletitud])
}
```

**Flujo de agregar persona**:

```
1. Matrizador ingresa cédula: 0603123340
   ↓
2. Sistema busca en PersonaRegistrada
   ↓
   ├─ SI EXISTE:
   │   ✅ "Persona encontrada: Jose Luis Zapata"
   │   → Se vincula personaId
   │   → Se copia nombre a la tarjeta
   │   → Semáforo según completitud de datos
   │
   └─ NO EXISTE:
       ⚠️ "Persona no registrada"
       → personaId = NULL
       → cedulaRuc = "0603123340"
       → nombreTemporal = NULL o "PENDIENTE DE REGISTRO"
       → Semáforo = 🔴 ROJO (pendiente)
       → Se permite agregar igual

3. Matrizador selecciona:
   - Calidad: [Comprador ▼]
   - Actúa Por: [Por sus propios derechos ▼]

4. Click "Agregar Persona"
   → Se crea ParticipanteFormulario
   → Aparece en lista con semáforo correspondiente
```

**Vista en lista de comparecientes**:

```
┌─────────────────────────────────────────────────────────────────┐
│ COMPARECIENTES DEL PROTOCOLO                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🟢 100%  JOSE LUIS ZAPATA CORDERO                              │
│          0603123340 | COMPRADOR | Por sus propios derechos      │
│          [Ver] [Editar] [Toggle Cónyuge]                       │
│                                                                 │
│ 🔴 0%   CÉDULA: 1712345678                                     │
│         [PENDIENTE DE REGISTRO]                                 │
│         VENDEDOR | Por sus propios derechos                     │
│         [Enviar link de registro] [Editar manualmente]         │
│                                                                 │
│ 🟡 65%  MARÍA FERNANDA LÓPEZ SÁNCHEZ                           │
│         1723456789 | COMPRADORA | Representando sociedad conyug.│
│         Faltan: parroquia, teléfono                            │
│         [Ver] [Editar] [Toggle Cónyuge]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Modificaciones al Modelo `PersonaRegistrada`

**Campos adicionales para redacción**:

```prisma
model PersonaRegistrada {
  // ... campos existentes ...
  
  // NUEVOS CAMPOS PARA REDACCIÓN NOTARIAL
  tituloAcademico         String?   // "Doctor", "Ingeniero", "Licenciado", etc.
  profesion               String?   // "Jurisprudencia", "Medicina", etc.
  
  // El campo datosPersonaNatural ya existe, pero debe incluir:
  // - estadoCivil con opciones: "soltero", "casado", "viudo", "divorciado", "union_libre", "casado_con_disolucion"
}
```

---

## 📊 FASE 2: SERVICIO DE CONVERSIÓN A TEXTO NOTARIAL

### 2.1 Crear Nuevo Servicio: `notarial-text-service.js`

**Ubicación**: `backend/src/services/notarial-text-service.js`

**Funcionalidades requeridas**:

#### A) Conversión de Números a Letras
```javascript
// Ejemplos de conversión:
"1700936170" → "uno siete cero cero nueve tres seis uno siete cero (1700936170)"
"27" → "veintisiete (27)"
"1115" → "mil ciento quince (1115)"
"022370289" → "cero dos dos tres siete cero dos ocho nueve (022370289)"
```

**Reglas específicas**:
- Cédulas: dígito por dígito + (número original)
- Números de casa/direcciones: número completo en letras + (número original)
- Teléfonos: dígito por dígito + (número original)
- Valores monetarios: número completo en letras + (número original)

#### B) Conversión de Fechas a Formato Notarial
```javascript
// Input: Date object o string ISO
// Output: "MIÉRCOLES TRES (03) DE SEPTIEMBRE DEL DOS MIL VEINTICINCO (2025)"

convertirFechaNotarial(fecha) {
  // Debe incluir:
  // - Día de la semana en mayúsculas
  // - Número del día en letras + (número)
  // - Mes en mayúsculas
  // - Año en letras + (año)
}
```

#### C) Expansión de Abreviaturas de Direcciones
```javascript
// Tabla de conversión:
const ABREVIATURAS = {
  "av.": "Avenida",
  "av": "Avenida",
  "calle": "calle",
  "c.": "calle",
  "nro.": "número",
  "nro": "número",
  "no.": "número",
  "n°": "número",
  "#": "número",
  "n.": "número",
  "urb.": "Urbanización",
  "conj.": "Conjunto",
  "edif.": "Edificio",
  "dept.": "Departamento",
  "dpto.": "Departamento",
  "km.": "kilómetro",
  "km": "kilómetro",
  "oe": "OE",
  "s/n": "sin número",
  "esq.": "esquina",
  "int.": "interior",
  "loc.": "local",
  "piso": "piso",
  "mz.": "Manzana",
  "mz": "Manzana",
  "lt.": "Lote",
  "lt": "Lote",
  "villa": "Villa",
  "sector": "sector",
  "barrio": "Barrio",
  "cdla.": "Ciudadela",
  "cdla": "Ciudadela"
};
```

#### D) Formateo de Dirección Completa
```javascript
// Input: objeto con campos de dirección
// Output: "en la calle Norberto Salazar número mil ciento quince (1115) y Vicente Álvarez, Parroquia Tumbaco"

formatearDireccionNotarial(direccion) {
  // Debe:
  // 1. Expandir abreviaturas
  // 2. Convertir números a letras
  // 3. Estructurar con conectores apropiados
}
```

---

## 📊 FASE 3: MOTOR DE GENERACIÓN DE TEXTOS

### 3.0 Generador de ENCABEZADO (Tabla Estructurada)

**Servicio**: `backend/src/services/encabezado-tabla-generator-service.js`

**Output esperado** (con espacios calculados para alinear columnas):

```
                              COMPRAVENTA

                              OTORGANTES:
APELLIDOS Y NOMBRES                                              CEDULA                    CALIDAD

CARLOS MANUEL DIEGO STACEY CHIRIBOGA              1700936170              PROMITENTE VENDEDOR
ANDRÉS PATRICIO FLOR PAZMIÑO                      1720749389              PROMITENTE COMPRADOR
JESSICA ESTEFANÍA BOSQUE CUMBAL                   1721645305              PROMITENTE COMPRADORA

                        UBICACIÓN DEL INMUEBLE:

LOTE DE TERRENO NÚMERO DIEZ (10), DENOMINADO "D2-B-10 SEGÚN PLANO 
APROBADO", PREDIO NÚMERO CINCO OCHO CERO UNO SEIS TRES SEIS (5801636), 
PARROQUIA TUMBACO, CANTÓN QUITO, PROVINCIA DE PICHINCHA

                    CUANTÍA: USD $ 171.150,80
                    AVALÚO: USD $ 134.876,06
```

**Algoritmo de alineación de columnas**:

```javascript
function generarEncabezadoTabla(formulario, participantes) {
  // Configuración de anchos de columna
  const ANCHO_NOMBRE = 50;      // Columna de nombres
  const ANCHO_CEDULA = 20;      // Columna de cédulas
  const ANCHO_CALIDAD = 25;     // Columna de calidad
  const ANCHO_TOTAL = 95;       // Ancho total de línea
  
  let output = '';
  
  // 1. TÍTULO DEL ACTO (centrado)
  const tituloActo = formulario.tipoActo.replace(/_/g, ' ');
  output += centrarTexto(tituloActo, ANCHO_TOTAL) + '\n\n';
  
  // 2. SECCIÓN OTORGANTES
  output += centrarTexto('OTORGANTES:', ANCHO_TOTAL) + '\n';
  output += 'APELLIDOS Y NOMBRES' + espacios(ANCHO_NOMBRE - 19);
  output += 'CEDULA' + espacios(ANCHO_CEDULA - 6);
  output += 'CALIDAD\n\n';
  
  // 3. LISTA DE PARTICIPANTES
  for (const p of participantes) {
    const nombre = p.nombreCompleto || `CÉDULA: ${p.cedulaRuc}`;
    const cedula = p.cedulaRuc;
    const calidad = formatearCalidad(p.calidad, p.genero);
    
    output += nombre + espacios(ANCHO_NOMBRE - nombre.length);
    output += cedula + espacios(ANCHO_CEDULA - cedula.length);
    output += calidad + '\n';
  }
  
  // 4. UBICACIÓN DEL INMUEBLE
  output += '\n' + centrarTexto('UBICACIÓN DEL INMUEBLE:', ANCHO_TOTAL) + '\n\n';
  output += formatearUbicacion(formulario) + '\n';
  
  // 5. CUANTÍA
  output += '\n' + centrarTexto(`CUANTÍA: USD $ ${formatearMoneda(formulario.valorContrato)}`, ANCHO_TOTAL) + '\n';
  
  // 6. AVALÚO O MULTA (según tipo de acto)
  if (formulario.tipoActo === 'PROMESA_COMPRAVENTA' && formulario.multa) {
    output += centrarTexto(`MULTA: USD $ ${formatearMoneda(formulario.multa)}`, ANCHO_TOTAL) + '\n';
  } else if (formulario.avaluoMunicipal) {
    output += centrarTexto(`AVALÚO: USD $ ${formatearMoneda(formulario.avaluoMunicipal)}`, ANCHO_TOTAL) + '\n';
  }
  
  return output;
}

// Funciones auxiliares
function espacios(n) {
  return ' '.repeat(Math.max(0, n));
}

function centrarTexto(texto, ancho) {
  const espaciosIzq = Math.floor((ancho - texto.length) / 2);
  return espacios(espaciosIzq) + texto;
}

function formatearCalidad(calidad, genero) {
  // Ajustar género: VENDEDOR → VENDEDORA si es femenino
  const calidades = {
    'VENDEDOR': { M: 'VENDEDOR', F: 'VENDEDORA' },
    'COMPRADOR': { M: 'COMPRADOR', F: 'COMPRADORA' },
    'PROMITENTE_VENDEDOR': { M: 'PROMITENTE VENDEDOR', F: 'PROMITENTE VENDEDORA' },
    'PROMITENTE_COMPRADOR': { M: 'PROMITENTE COMPRADOR', F: 'PROMITENTE COMPRADORA' },
    'DONANTE': { M: 'DONANTE', F: 'DONANTE' },
    'DONATARIO': { M: 'DONATARIO', F: 'DONATARIA' },
    // ... etc
  };
  
  const config = calidades[calidad];
  if (!config) return calidad;
  return config[genero] || config['M'];
}

function formatearUbicacion(formulario) {
  let ubicacion = formulario.ubicacionDescripcion || '';
  
  // Agregar parroquia, cantón, provincia si existen
  const partes = [];
  if (formulario.ubicacionParroquia) partes.push(`PARROQUIA ${formulario.ubicacionParroquia}`);
  if (formulario.ubicacionCanton) partes.push(`CANTÓN ${formulario.ubicacionCanton}`);
  if (formulario.ubicacionProvincia) partes.push(`PROVINCIA DE ${formulario.ubicacionProvincia}`);
  
  if (partes.length > 0) {
    ubicacion += ', ' + partes.join(', ');
  }
  
  return ubicacion;
}
```

### 3.1 Generador de COMPARECENCIA (Texto Corrido)

**Servicio**: `backend/src/services/comparecencia-generator-service.js`

### 3.1.1 Reglas de Negritas en la Comparecencia

**Las negritas se aplican a**:
1. ✅ **Fecha completa** (día, número, mes, año)
2. ✅ **Nombre de la notaria** (DOCTORA GLENDA ZAPATA SILVA, NOTARIA DÉCIMA OCTAVA DEL CANTÓN QUITO)
3. ✅ **Nombres de todos los comparecientes** (cada vez que aparecen)

**Ejemplo con negritas marcadas**:

```html
En la ciudad de San Francisco de Quito, Capital de la República del Ecuador, 
hoy día <strong>JUEVES VEINTICINCO (25) DE SEPTIEMBRE DEL DOS MIL VEINTICINCO 
(2025)</strong>, ante mí <strong>DOCTORA GLENDA ZAPATA SILVA, NOTARIA DÉCIMA 
OCTAVA DEL CANTÓN QUITO</strong>, comparecen con plena capacidad, libertad y 
conocimiento, a la celebración de la presente escritura pública, por una parte, 
los señores cónyuges <strong>MARIO HUMBERTO RECALDE BRAVO</strong> y 
<strong>ANA MARÍA CEVALLOS GUERRA</strong>, por sus propios y personales 
derechos y por los que representan de la sociedad conyugal que tienen formada; 
y por otra parte, en calidad de compradores, los señores 
<strong>LUIS MANUEL STACEY CÓRDOVA</strong> y <strong>MARÍA DEL MAR ACOSTA 
CÓRDOVA</strong>, casados entre sí, con disolución de la sociedad conyugal...
```

### 3.1.2 Estructura de la Comparecencia

```
[APERTURA]
En la ciudad de San Francisco de Quito, Capital de la República del Ecuador, 
hoy día <strong>[FECHA_FORMATEADA]</strong>, ante mí, <strong>DOCTORA GLENDA ZAPATA SILVA, 
NOTARIA DÉCIMA OCTAVA DEL CANTÓN QUITO</strong>, comparecen con plena capacidad, 
libertad y conocimiento, a la celebración de la presente escritura pública,

[COMPARECIENTES - Iteración por cada uno]
por una parte, [TITULO] <strong>[NOMBRE_COMPLETO]</strong>, de estado civil [ESTADO_CIVIL], 
[PROFESION_SI_APLICA], con cédula de ciudadanía número [CEDULA_LETRAS], 
[REPRESENTACION_SI_APLICA], en calidad de [ROL];

[DOMICILIOS - Iteración por cada uno]
Los comparecientes declaran ser de nacionalidad ecuatoriana, mayores de edad, 
domiciliados en esta ciudad de Quito de la siguiente manera: 
[TRATAMIENTO] <strong>[NOMBRE]</strong>, en la [DIRECCION_FORMATEADA], teléfono [TELEFONO_LETRAS], 
correo electrónico [EMAIL];

[CIERRE]
hábiles en derecho para contratar y contraer obligaciones; a quienes de conocer 
doy fe, en virtud de haberme exhibido sus documentos de identidad cuyas copias 
fotostáticas debidamente certificadas por mí agrego a esta escritura como 
documentos habilitantes, autorizando además, la consulta e impresión de sus 
certificados electrónicos de datos de identidad del Sistema Nacional de 
Identificación Ciudadana de la Dirección General del Registro Civil, 
Identificación y Cedulación, que también se agregan como habilitantes. 
Advertidos los comparecientes por mí, la Notaria, de los efectos y resultados 
de esta escritura, así como examinados que fueron en forma aislada y separada 
de que comparecen al otorgamiento de esta escritura sin coacción, amenazas, 
temor reverencial, ni promesa o seducción, me piden que eleve a escritura 
pública la siguiente minuta:
```

### 3.1.3 Función de Generación con Negritas

```javascript
function generarComparecencia(formulario, participantes, opciones = {}) {
  const { formatoHtml = true } = opciones;
  
  // Helper para aplicar negritas
  const negrita = (texto) => {
    return formatoHtml ? `<strong>${texto}</strong>` : texto;
  };
  
  // 1. APERTURA con fecha y notaria en negritas
  const fechaFormateada = convertirFechaNotarial(formulario.fechaEscritura);
  
  let texto = `En la ciudad de San Francisco de Quito, Capital de la República del Ecuador, `;
  texto += `hoy día ${negrita(fechaFormateada)}, `;
  texto += `ante mí, ${negrita('DOCTORA GLENDA ZAPATA SILVA, NOTARIA DÉCIMA OCTAVA DEL CANTÓN QUITO')}, `;
  texto += `comparecen con plena capacidad, libertad y conocimiento, `;
  texto += `a la celebración de la presente escritura pública, `;
  
  // 2. COMPARECIENTES (agrupados por rol)
  const grupos = agruparPorRol(participantes);
  const partesComparecientes = [];
  
  grupos.forEach((grupo, index) => {
    const esUltimo = index === grupos.length - 1;
    const conectores = index === 0 ? 'por una parte, ' : 'y por otra parte, ';
    
    let parteTexto = conectores;
    
    if (grupo.esParejaConyuge) {
      // Caso: cónyuges compareciendo juntos
      parteTexto += formatearParejaConyuge(grupo.participantes, negrita);
    } else if (grupo.participantes.length > 1) {
      // Caso: múltiples personas con mismo rol
      parteTexto += formatearMultiplesComparecientes(grupo.participantes, negrita);
    } else {
      // Caso: persona individual
      parteTexto += formatearComparecienteIndividual(grupo.participantes[0], negrita);
    }
    
    parteTexto += `, en calidad de ${grupo.calidad}`;
    partesComparecientes.push(parteTexto);
  });
  
  texto += partesComparecientes.join('; ') + '.- ';
  
  // 3. DOMICILIOS
  texto += `Los comparecientes declaran ser de nacionalidad ecuatoriana, mayores de edad, `;
  texto += `domiciliados en esta ciudad de Quito de la siguiente manera: `;
  
  const domicilios = participantes.map((p, idx) => {
    const tratamiento = obtenerTratamiento(p.genero);
    const direccion = formatearDireccionNotarial(p.direccion);
    const telefono = formatearTelefonoNotarial(p.telefono || p.celular);
    
    let dom = `${tratamiento} ${negrita(p.nombreCompleto)}, `;
    dom += `en la ${direccion}, `;
    dom += `teléfono ${telefono}, `;
    dom += `correo electrónico ${p.email || 'no proporcionado'}`;
    
    return dom;
  });
  
  texto += domicilios.join('; ') + '; ';
  
  // 4. CIERRE (texto fijo)
  texto += `hábiles en derecho para contratar y contraer obligaciones; `;
  texto += `a quienes de conocer doy fe, en virtud de haberme exhibido sus documentos de identidad `;
  texto += `cuyas copias fotostáticas debidamente certificadas por mí agrego a esta escritura `;
  texto += `como documentos habilitantes, autorizando además, la consulta e impresión de sus `;
  texto += `certificados electrónicos de datos de identidad del Sistema Nacional de Identificación `;
  texto += `Ciudadana de la Dirección General del Registro Civil, Identificación y Cedulación, `;
  texto += `que también se agregan como habilitantes. Advertidos los comparecientes por mí, `;
  texto += `la Notaria, de los efectos y resultados de esta escritura, así como examinados `;
  texto += `que fueron en forma aislada y separada de que comparecen al otorgamiento de esta `;
  texto += `escritura sin coacción, amenazas, temor reverencial, ni promesa o seducción, `;
  texto += `me piden que eleve a escritura pública la siguiente minuta:`;
  
  return texto;
}
```

### 3.1.4 Formateo de Pareja de Cónyuges

```javascript
function formatearParejaConyuge(participantes, negrita) {
  // Asumimos que vienen ordenados: primero el esposo, luego la esposa
  const p1 = participantes[0];
  const p2 = participantes[1];
  
  const tratamiento1 = obtenerTratamiento(p1.genero);
  const tratamiento2 = obtenerTratamiento(p2.genero);
  
  // Determinar tipo de unión
  const tieneDisolucion = p1.estadoCivil === 'CASADO_CON_DISOLUCION';
  const esUnionLibre = p1.estadoCivil === 'UNION_LIBRE';
  
  let texto = `los señores `;
  
  if (esUnionLibre) {
    texto += `${negrita(p1.nombreCompleto)} y ${negrita(p2.nombreCompleto)}, `;
    texto += `de estado civil en unión de hecho por sus propios y personales derechos `;
    texto += `y por los que representan de la sociedad de bienes que tienen formada`;
  } else if (tieneDisolucion) {
    texto += `${negrita(p1.nombreCompleto)} y ${negrita(p2.nombreCompleto)}, `;
    texto += `casados entre sí, con disolución de la sociedad conyugal, `;
    texto += `por sus propios y personales derechos`;
  } else {
    // Casados sin disolución - sociedad conyugal vigente
    texto += `cónyuges ${negrita(p1.nombreCompleto)} y ${negrita(p2.nombreCompleto)}, `;
    texto += `por sus propios y personales derechos y por los que representan `;
    texto += `de la sociedad conyugal que tienen formada`;
  }
  
  return texto;
}
```

### 3.2 Lógica de Comparecencia según Estado Civil

**Casos a manejar**:

| Estado Civil | Comparece Solo | Comparecen Ambos Cónyuges |
|--------------|----------------|---------------------------|
| Soltero/a | "por sus propios y personales derechos" | N/A |
| Casado/a (sin disolución) | "de estado civil casado/a con [NOMBRE_CONYUGE], por sus propios y personales derechos" | "los señores cónyuges [NOMBRE1] y [NOMBRE2], por sus propios y personales derechos y por los que representan de la sociedad conyugal que tienen formada" |
| Casado/a con disolución | "de estado civil casado/a con disolución de la sociedad conyugal, por sus propios y personales derechos" | N/A |
| Divorciado/a | "de estado civil divorciado/a, por sus propios y personales derechos" | N/A |
| Viudo/a | "de estado civil viudo/a, por sus propios y personales derechos" | N/A |
| Unión libre | "de estado civil en unión de hecho, por sus propios y personales derechos" | "los señores [NOMBRE1] y [NOMBRE2], de estado civil en unión de hecho por sus propios y personales derechos y por los que representan de la sociedad de bienes que tienen formada" |

### 3.3 Lógica de Calidades (Definida por Matrizador)

**Importante**: La calidad NO se auto-asigna por tipo de acto. El **matrizador la selecciona** al agregar cada persona.

**Selector de Calidad en Modal "Agregar Persona"**:

```javascript
const CALIDADES_DISPONIBLES = [
  // Compraventas y similares
  { value: "VENDEDOR", label: "Vendedor/a" },
  { value: "COMPRADOR", label: "Comprador/a" },
  
  // Promesas
  { value: "PROMITENTE_VENDEDOR", label: "Promitente Vendedor/a" },
  { value: "PROMITENTE_COMPRADOR", label: "Promitente Comprador/a" },
  
  // Donaciones
  { value: "DONANTE", label: "Donante" },
  { value: "DONATARIO", label: "Donatario/a" },
  
  // Dación en pago
  { value: "DEUDOR", label: "Deudor/a" },
  { value: "ACREEDOR", label: "Acreedor/a" },
  
  // Permutas
  { value: "PERMUTANTE", label: "Permutante" },
  
  // Poderes
  { value: "PODERDANTE", label: "Poderdante" },
  { value: "APODERADO", label: "Apoderado/a" },
  
  // Hipotecas
  { value: "DEUDOR_HIPOTECARIO", label: "Deudor/a Hipotecario/a" },
  { value: "ACREEDOR_HIPOTECARIO", label: "Acreedor/a Hipotecario/a" },
  
  // Otros
  { value: "COMPARECIENTE", label: "Compareciente" },
  { value: "GARANTE", label: "Garante" },
  { value: "FIADOR", label: "Fiador/a" }
];
```

**Selector de "Actúa Por"**:

```javascript
const ACTUA_POR_OPCIONES = [
  { 
    value: "PROPIOS_DERECHOS", 
    label: "Por sus propios derechos",
    textoRedaccion: "por sus propios y personales derechos"
  },
  { 
    value: "REPRESENTANDO_SOCIEDAD_CONYUGAL", 
    label: "Representando sociedad conyugal",
    textoRedaccion: "por sus propios y personales derechos y por los que representa de la sociedad conyugal"
  },
  { 
    value: "REPRESENTANDO_SOCIEDAD_BIENES", 
    label: "Representando sociedad de bienes (unión libre)",
    textoRedaccion: "por sus propios y personales derechos y por los que representa de la sociedad de bienes que tienen formada"
  },
  { 
    value: "COMO_APODERADO", 
    label: "Como apoderado/a",
    textoRedaccion: "debidamente representado por"
  },
  { 
    value: "REPRESENTANTE_LEGAL", 
    label: "Como representante legal",
    textoRedaccion: "en su calidad de representante legal de"
  }
];
```

**Modal Actualizado "Agregar Persona al Protocolo"**:

```
┌─────────────────────────────────────────────────────────────────┐
│ Agregar Persona al Protocolo                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ℹ️ Protocolo: 123345                                            │
│                                                                 │
│ Buscar Persona por Cédula                                       │
│ Número de Cédula                                                │
│ ┌────────────────────────────────┐ ┌─────────────┐             │
│ │ 0603123340                     │ │ 🔍 Buscar   │             │
│ └────────────────────────────────┘ └─────────────┘             │
│                                                                 │
│ ✅ Persona encontrada: Jose Luis Zapata                         │
│    Estado: 🟢 Datos completos                                   │
│                                                                 │
│ ─── O ───                                                       │
│                                                                 │
│ ⚠️ Persona NO encontrada: 1712345678                            │
│    Se agregará solo con cédula. Complete los datos después.     │
│                                                                 │
│ Rol en el Trámite                                               │
│ ┌────────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Calidad        │ │ Actúa Por                               │ │
│ │ [Comprador  ▼] │ │ [Por sus propios derechos           ▼] │ │
│ └────────────────┘ └─────────────────────────────────────────┘ │
│                                                                 │
│ ☐ Comparece junto con cónyuge (mismo rol)                      │
│ ☐ Actúa como apoderado de otra persona                         │
│                                                                 │
│ [Si marca apoderado, aparece:]                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Cédula del Mandante: [_______________] [🔍 Buscar]         │ │
│ │ Nombre: CARLOS MANUEL DIEGO STACEY CHIRIBOGA               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                           [Cancelar] [➕ Agregar Persona]      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Lógica de Apoderados

**Cuando `esApoderado = true`**:

```
[TITULO] [NOMBRE_MANDANTE], de estado civil [ESTADO_CIVIL], 
[PROFESION_SI_APLICA], con cédula de ciudadanía número [CEDULA_LETRAS], 
debidamente representado por [TITULO_APODERADO] [NOMBRE_APODERADO], 
según consta en el poder que se agrega como habilitante, 
en calidad de [ROL];
```

---

## 📊 FASE 4: SISTEMA DE SEMÁFORO (COMPLETITUD)

### 4.1 Campos del Formulario Real (según HTML)

**IMPORTANTE**: Los campos para validar el semáforo vienen del formulario público de registro personal.

#### Persona Natural - Campos del Formulario Real:

```javascript
const CAMPOS_PERSONA_NATURAL = {
  // TAB 1: DATOS PERSONALES (IDs del HTML)
  datosPersonales: {
    obligatorios: [
      'apellidos',        // input#apellidos
      'nombres',          // input#nombres
      'genero',           // select#genero
      'estadoCivil',      // select#estadoCivil
      'celular'           // input#celular (mínimo para contacto)
    ],
    opcionales: [
      'nivelEstudio',     // select#nivelEstudio
      'email',            // input#email
      'telefono',         // input#telefono
      'nacionalidad'      // input#nacionalidad (default: ECUATORIANA)
    ]
  },
  
  // TAB 2: DIRECCIÓN
  direccion: {
    obligatorios: [
      'callePrincipal',   // input#callePrincipal
      'numeroCasa',       // input#numeroCasa
      'provincia',        // input#provincia
      'canton',           // input#canton
      'parroquia'         // input#parroquia
    ],
    opcionales: [
      'calleSecundaria'   // input#calleSecundaria
    ]
  },
  
  // TAB 3: INFORMACIÓN LABORAL
  informacionLaboral: {
    obligatorios: [
      'situacionLaboral', // select#situacionLaboral (PUBLICO, PRIVADO, JUBILADO, NO_APLICA)
      'profesion'         // input#profesion
    ],
    opcionales: [
      'relacionDependencia',  // select#relacionDependencia
      'nombreEntidad',        // input#nombreEntidad
      'direccionEmpresa',     // input#direccionEmpresa
      'provinciaCantonEmpresa', // input#provinciaCantonEmpresa
      'cargo',                // input#cargo
      'ingresoMensual',       // input#ingresoMensual
      'fechaIngreso'          // input#fechaIngreso
    ]
  },
  
  // TAB 4: CÓNYUGE (Solo si estadoCivil = CASADO o UNION_LIBRE)
  conyuge: {
    obligatoriosSiCasado: [
      'conyugeApellidos',     // input#conyugeApellidos
      'conyugeNombres',       // input#conyugeNombres
      'conyugeNumeroId'       // input#conyugeNumeroId
    ],
    opcionales: [
      'conyugeTipoId',        // select#conyugeTipoId
      'conyugeNacionalidad',  // input#conyugeNacionalidad
      'conyugeEmail',         // input#conyugeEmail
      'conyugeProfesion',     // input#conyugeProfesion
      'conyugeCelular',       // input#conyugeCelular
      'conyugeSituacionLaboral' // select#conyugeSituacionLaboral
    ]
  },
  
  // TAB 5: PEP (siempre tiene valores por defecto, no bloquea)
  pep: {
    campos: ['esPEP', 'esFamiliarPEP', 'esColaboradorPEP']
    // Estos tienen default "NO", así que siempre están completos
  }
};
```

#### Persona Jurídica - Campos del Formulario Real:

```javascript
const CAMPOS_PERSONA_JURIDICA = {
  // TAB 1: COMPAÑÍA
  compania: {
    obligatorios: [
      'jRazonSocial',     // input#jRazonSocial
      'jRuc',             // input#jRuc (readonly, viene de cédula)
      'jObjetoSocial'     // textarea#jObjetoSocial
    ],
    direccion: [
      'jCallePrincipal',  // input#jCallePrincipal
      'jProvincia',       // input#jProvincia (default: PICHINCHA)
      'jCanton',          // input#jCanton (default: QUITO)
      'jParroquia'        // input#jParroquia
    ],
    contacto: [
      'jEmailCompania',   // input#jEmailCompania
      'jTelefonoCompania', // input#jTelefonoCompania
      'jCelularCompania'  // input#jCelularCompania
    ]
  },
  
  // TAB 2: REPRESENTANTE LEGAL
  representanteLegal: {
    obligatorios: [
      'jRepApellidos',    // input#jRepApellidos
      'jRepNombres',      // input#jRepNombres
      'jRepNumeroId',     // input#jRepNumeroId
      'jRepGenero',       // select#jRepGenero
      'jRepEstadoCivil'   // select#jRepEstadoCivil
    ],
    opcionales: [
      'jRepTipoId',       // select#jRepTipoId
      'jRepNacionalidad', // input#jRepNacionalidad
      'jRepNivelEstudio', // select#jRepNivelEstudio
      'jRepEmail',        // input#jRepEmail
      'jRepTelefono',     // input#jRepTelefono
      'jRepCelular',      // input#jRepCelular
      'jRepCallePrincipal', // input#jRepCallePrincipal
      'jRepNumero',       // input#jRepNumero
      'jRepCalleSecundaria', // input#jRepCalleSecundaria
      'jRepSituacionLaboral', // select#jRepSituacionLaboral
      'jRepRelacionDependencia', // select#jRepRelacionDependencia
      'jRepProfesion',    // input#jRepProfesion
      'jRepIngresoMensual' // input#jRepIngresoMensual
    ]
  },
  
  // TAB 3: CÓNYUGE DEL REPRESENTANTE (si es casado)
  conyugeRepresentante: {
    obligatoriosSiCasado: [
      'jConyugeApellidos',  // input#jConyugeApellidos
      'jConyugeNombres',    // input#jConyugeNombres
      'jConyugeNumeroId'    // input#jConyugeNumeroId
    ]
  },
  
  // TAB 4: SOCIOS (tabla dinámica)
  socios: {
    // Array de objetos con: nombresApellidos, identificacion, telefono, celular
    minimoRequerido: 0  // Opcional, pero si hay datos deben estar completos
  },
  
  // TAB 5: PEP (defaults a NO)
  pep: {
    campos: ['jEsPEP', 'jEsFamiliarPEP', 'jEsColaboradorPEP']
  }
};
```

### 4.2 Algoritmo de Cálculo de Completitud

```javascript
function calcularCompletitudPersonaNatural(datos) {
  const resultado = {
    estado: 'pendiente',
    porcentaje: 0,
    camposFaltantes: [],
    detalles: {}
  };
  
  if (!datos) {
    resultado.camposFaltantes = ['No hay datos registrados'];
    return resultado;
  }
  
  let camposTotal = 0;
  let camposLlenos = 0;
  
  // 1. Validar datos personales obligatorios
  const personales = datos.datosPersonales || {};
  const contacto = datos.contacto || {};
  
  const obligatoriosPersonales = [
    { campo: 'apellidos', valor: personales.apellidos },
    { campo: 'nombres', valor: personales.nombres },
    { campo: 'genero', valor: personales.genero },
    { campo: 'estadoCivil', valor: personales.estadoCivil },
    { campo: 'celular', valor: contacto.celular }
  ];
  
  obligatoriosPersonales.forEach(item => {
    camposTotal++;
    if (item.valor && item.valor.trim() !== '') {
      camposLlenos++;
    } else {
      resultado.camposFaltantes.push(item.campo);
    }
  });
  
  // 2. Validar dirección obligatoria
  const direccion = datos.direccion || {};
  const obligatoriosDireccion = [
    { campo: 'callePrincipal', valor: direccion.callePrincipal },
    { campo: 'numeroCasa', valor: direccion.numero },
    { campo: 'provincia', valor: direccion.provincia },
    { campo: 'canton', valor: direccion.canton },
    { campo: 'parroquia', valor: direccion.parroquia }
  ];
  
  obligatoriosDireccion.forEach(item => {
    camposTotal++;
    if (item.valor && item.valor.trim() !== '') {
      camposLlenos++;
    } else {
      resultado.camposFaltantes.push(item.campo);
    }
  });
  
  // 3. Validar información laboral mínima
  const laboral = datos.informacionLaboral || {};
  camposTotal += 2;
  if (laboral.situacion) camposLlenos++; else resultado.camposFaltantes.push('situacionLaboral');
  if (laboral.profesionOcupacion) camposLlenos++; else resultado.camposFaltantes.push('profesion');
  
  // 4. Si es casado o unión libre, validar cónyuge
  if (personales.estadoCivil === 'CASADO' || personales.estadoCivil === 'UNION_LIBRE') {
    const conyuge = datos.conyuge || {};
    const obligatoriosConyuge = [
      { campo: 'conyugeApellidos', valor: conyuge.apellidos },
      { campo: 'conyugeNombres', valor: conyuge.nombres },
      { campo: 'conyugeNumeroId', valor: conyuge.numeroIdentificacion }
    ];
    
    obligatoriosConyuge.forEach(item => {
      camposTotal++;
      if (item.valor && item.valor.trim() !== '') {
        camposLlenos++;
      } else {
        resultado.camposFaltantes.push(item.campo);
      }
    });
  }
  
  // Calcular porcentaje
  resultado.porcentaje = Math.round((camposLlenos / camposTotal) * 100);
  
  // Determinar estado
  if (resultado.porcentaje === 0) {
    resultado.estado = 'pendiente';  // 🔴
  } else if (resultado.porcentaje < 100) {
    resultado.estado = 'incompleto'; // 🟡
  } else {
    resultado.estado = 'completo';   // 🟢
  }
  
  return resultado;
}
```

### 4.3 Estados del Semáforo Visual

| Estado | Porcentaje | Color | Icono | Descripción |
|--------|------------|-------|-------|-------------|
| `pendiente` | 0% | 🔴 Rojo | `#C62828` | Solo tiene cédula, no se ha registrado |
| `incompleto` | 1-99% | 🟡 Amarillo | `#F9A825` | Registrado pero faltan campos obligatorios |
| `completo` | 100% | 🟢 Verde | `#2E7D32` | Todos los campos obligatorios llenos |

### 4.4 Campos Mínimos para Semáforo Verde (Resumen)

**Persona Natural** (12-15 campos según estado civil):
1. ✅ Apellidos
2. ✅ Nombres
3. ✅ Género
4. ✅ Estado Civil
5. ✅ Celular
6. ✅ Calle Principal
7. ✅ Número de casa
8. ✅ Provincia
9. ✅ Cantón
10. ✅ Parroquia
11. ✅ Situación Laboral
12. ✅ Profesión/Ocupación
13. ➕ Si casado: Apellidos cónyuge
14. ➕ Si casado: Nombres cónyuge
15. ➕ Si casado: Cédula cónyuge

**Persona Jurídica** (10-13 campos según estado civil del rep. legal):
1. ✅ Razón Social
2. ✅ RUC
3. ✅ Objeto Social
4. ✅ Rep. Legal - Apellidos
5. ✅ Rep. Legal - Nombres
6. ✅ Rep. Legal - Cédula
7. ✅ Rep. Legal - Género
8. ✅ Rep. Legal - Estado Civil
9. ✅ Parroquia compañía
10. ✅ Al menos un teléfono/celular compañía
11. ➕ Si rep. casado: Apellidos cónyuge
12. ➕ Si rep. casado: Nombres cónyuge
13. ➕ Si rep. casado: Cédula cónyuge

---

## 📊 FASE 5: CAMBIOS EN FRONTEND

### 5.1 Componentes a Modificar/Crear

**Ubicación base**: `frontend/src/components/matrizador/FormulariosUAFE/`

#### Componentes Nuevos:

```
FormulariosUAFE/
├── SemaforoCompletitud.jsx       # Indicador visual rojo/amarillo/verde
├── DatePickerNotarial.jsx        # Picker de fecha con preview del formato
├── PreviewEncabezado.jsx         # Vista previa del ENCABEZADO (tabla)
├── PreviewComparecencia.jsx      # Vista previa de COMPARECENCIA (texto)
├── BotonCopiarTexto.jsx          # Botón genérico para copiar al portapapeles
├── PanelGeneracion.jsx           # Panel con los dos botones y previews
├── ComparecienteCard.jsx         # Tarjeta de compareciente con semáforo
├── ToggleConyugeComparece.jsx    # Switch para "¿Comparece cónyuge?"
├── SelectorApoderado.jsx         # Selector cuando es apoderado
├── ListaComparecientes.jsx       # Lista con filtro de firmados/pendientes
├── ModalAgregarPersona.jsx       # Modal mejorado para agregar persona
└── UbicacionInmuebleInput.jsx    # Input para ubicación del inmueble
```

### 5.2 Panel de Generación con DOS Botones

**Componente**: `PanelGeneracion.jsx`

**Diseño**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📄 GENERACIÓN DE TEXTOS                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Estado: 🟢 Todos los comparecientes con datos completos                 │
│         [Regenerar Textos]                                              │
│                                                                         │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ 📋 ENCABEZADO (Tabla)           │ │ 📝 COMPARECENCIA (Texto)        │ │
│ ├─────────────────────────────────┤ ├─────────────────────────────────┤ │
│ │                                 │ │                                 │ │
│ │      COMPRAVENTA               │ │ En la ciudad de San Francisco   │ │
│ │                                 │ │ de Quito, Capital de la         │ │
│ │      OTORGANTES:               │ │ República del Ecuador, hoy día  │ │
│ │ APELLIDOS...  CEDULA  CALIDAD  │ │ MIÉRCOLES TRES (03) DE...       │ │
│ │ CARLOS M...   170... VENDEDOR  │ │                                 │ │
│ │ ANDRÉS P...   172... COMPRADOR │ │ ante mí, DOCTORA GLENDA ZAPATA  │ │
│ │                                 │ │ SILVA, NOTARIA DÉCIMA OCTAVA... │ │
│ │      UBICACIÓN DEL INMUEBLE:   │ │                                 │ │
│ │ LOTE DE TERRENO NÚMERO...      │ │ comparecen con plena capacidad, │ │
│ │                                 │ │ libertad y conocimiento...      │ │
│ │      CUANTÍA: USD $ 171.150,80 │ │                                 │ │
│ │      AVALÚO: USD $ 134.876,06  │ │ [texto continúa...]             │ │
│ │                                 │ │                                 │ │
│ ├─────────────────────────────────┤ ├─────────────────────────────────┤ │
│ │ [📋 Copiar Encabezado]         │ │ [📋 Copiar Comparecencia]       │ │
│ └─────────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                         │
│ 💡 Tip: El texto se copia listo para pegar en Word con el formato      │
│    correcto. Use Ctrl+V para pegar.                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Código del componente**:

```jsx
function PanelGeneracion({ formulario, participantes }) {
  const [encabezado, setEncabezado] = useState('');
  const [comparecencia, setComparecencia] = useState('');
  const [cargando, setCargando] = useState(false);
  const [copiadoEncabezado, setCopiadoEncabezado] = useState(false);
  const [copiadoComparecencia, setCopiadoComparecencia] = useState(false);
  
  // Verificar si todos están completos
  const todosCompletos = participantes.every(p => p.estadoCompletitud === 'completo');
  const algunoIncompleto = participantes.some(p => p.estadoCompletitud !== 'completo');
  
  const generarTextos = async () => {
    setCargando(true);
    try {
      const response = await formularioService.generarTextos(formulario.id);
      setEncabezado(response.data.encabezado);
      setComparecencia(response.data.comparecencia);
    } catch (error) {
      console.error('Error generando textos:', error);
    }
    setCargando(false);
  };
  
  const copiarAlPortapapeles = async (texto, tipo) => {
    try {
      await navigator.clipboard.writeText(texto);
      if (tipo === 'encabezado') {
        setCopiadoEncabezado(true);
        setTimeout(() => setCopiadoEncabezado(false), 2000);
      } else {
        setCopiadoComparecencia(true);
        setTimeout(() => setCopiadoComparecencia(false), 2000);
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        📄 Generación de Textos
      </Typography>
      
      {/* Estado general */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        {todosCompletos ? (
          <Chip icon={<span>🟢</span>} label="Todos los datos completos" color="success" />
        ) : (
          <Chip icon={<span>🟡</span>} label="Algunos datos incompletos" color="warning" />
        )}
        <Button 
          variant="outlined" 
          onClick={generarTextos}
          disabled={cargando || !algunoIncompleto && encabezado}
        >
          {cargando ? <CircularProgress size={20} /> : 'Regenerar Textos'}
        </Button>
      </Box>
      
      {/* Dos columnas con previews */}
      <Grid container spacing={3}>
        {/* Columna ENCABEZADO */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader 
              title="📋 ENCABEZADO (Tabla)" 
              titleTypographyProps={{ variant: 'subtitle1' }}
            />
            <CardContent>
              <Box 
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  maxHeight: 300,
                  overflow: 'auto'
                }}
              >
                {encabezado || 'Click en "Regenerar Textos" para generar...'}
              </Box>
            </CardContent>
            <CardActions>
              <Button
                fullWidth
                variant={copiadoEncabezado ? "contained" : "outlined"}
                color={copiadoEncabezado ? "success" : "primary"}
                startIcon={copiadoEncabezado ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={() => copiarAlPortapapeles(encabezado, 'encabezado')}
                disabled={!encabezado || !todosCompletos}
              >
                {copiadoEncabezado ? '¡Copiado!' : 'Copiar Encabezado'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Columna COMPARECENCIA */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader 
              title="📝 COMPARECENCIA (Texto)" 
              titleTypographyProps={{ variant: 'subtitle1' }}
            />
            <CardContent>
              <Box 
                sx={{ 
                  fontFamily: 'serif', 
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  backgroundColor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  maxHeight: 300,
                  overflow: 'auto'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: comparecencia || 'Click en "Regenerar Textos" para generar...' 
                }}
              />
            </CardContent>
            <CardActions>
              <Button
                fullWidth
                variant={copiadoComparecencia ? "contained" : "outlined"}
                color={copiadoComparecencia ? "success" : "primary"}
                startIcon={copiadoComparecencia ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={() => copiarAlPortapapeles(
                  comparecencia.replace(/<[^>]*>/g, ''), // Texto plano
                  'comparecencia'
                )}
                disabled={!comparecencia || !todosCompletos}
              >
                {copiadoComparecencia ? '¡Copiado!' : 'Copiar Comparecencia'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tip */}
      <Alert severity="info" sx={{ mt: 2 }}>
        💡 <strong>Tip:</strong> El texto se copia listo para pegar en Word. 
        Use <kbd>Ctrl+V</kbd> para pegar.
      </Alert>
      
      {/* Advertencia si hay incompletos */}
      {!todosCompletos && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          ⚠️ Hay comparecientes con datos incompletos. Los botones de copiar se 
          habilitarán cuando todos tengan el semáforo en 🟢 verde.
        </Alert>
      )}
    </Paper>
  );
}
```

### 5.2 Modificaciones a `CrearFormulario.jsx`

**Cambios requeridos**:

1. **Número de Protocolo Opcional**:
   - Campo no obligatorio
   - Si está vacío, mostrar el `identificadorTemporal` como referencia
   - Permitir agregar/editar el número de protocolo después

2. **Picker de Fecha**:
   - DatePicker para seleccionar fecha de escritura
   - Mostrar preview del formato: "MIÉRCOLES TRES (03) DE SEPTIEMBRE..."
   - Default: fecha actual

3. **Lista de Comparecientes con Semáforo**:
   ```jsx
   <ComparecienteCard
     persona={compareciente}
     estado="completo"        // rojo, amarillo, verde
     porcentaje={85}
     camposFaltantes={["email", "parroquia"]}
     onToggleConyugeComparece={handleToggle}
     compareceConyugeJunto={true}
     esApoderado={false}
   />
   ```

4. **Filtro de Comparecientes**:
   - Mostrar todos
   - Ocultar firmados/generados
   - Solo pendientes

### 5.3 Componente `PreviewEncabezado.jsx`

**Funcionalidad**:

```jsx
function PreviewEncabezado({ formulario, comparecientes }) {
  const [textoGenerado, setTextoGenerado] = useState("");
  const [cargando, setCargando] = useState(false);
  
  // Llamar al backend para generar el texto
  const generarEncabezado = async () => {
    setCargando(true);
    const response = await formularioService.generarEncabezado(formulario.id);
    setTextoGenerado(response.data.encabezado);
    setCargando(false);
  };
  
  return (
    <Box>
      {/* Preview con formato visual */}
      <Paper sx={{ p: 2, fontFamily: 'serif', lineHeight: 1.8 }}>
        {/* Renderizar con negritas donde corresponda */}
        <Typography component="div" dangerouslySetInnerHTML={{ 
          __html: textoGenerado 
        }} />
      </Paper>
      
      {/* Botones de acción */}
      <Stack direction="row" spacing={2} mt={2}>
        <BotonCopiarTexto 
          texto={textoGenerado} 
          label="Copiar Encabezado"
          formato="html"  // Para mantener negritas en Word
        />
        <BotonCopiarTexto 
          texto={textoGenerado} 
          label="Copiar Solo Texto"
          formato="texto"  // Sin formato
        />
      </Stack>
    </Box>
  );
}
```

### 5.4 Componente `BotonCopiarTexto.jsx`

**Funcionalidad**:

```jsx
function BotonCopiarTexto({ texto, label, formato = "texto" }) {
  const [copiado, setCopiado] = useState(false);
  
  const copiarAlPortapapeles = async () => {
    try {
      if (formato === "html") {
        // Copiar con formato para Word
        const blob = new Blob([texto], { type: 'text/html' });
        const data = [new ClipboardItem({ 'text/html': blob })];
        await navigator.clipboard.write(data);
      } else {
        // Copiar solo texto plano
        const textoPlano = texto.replace(/<[^>]*>/g, '');
        await navigator.clipboard.writeText(textoPlano);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };
  
  return (
    <Button
      variant={copiado ? "contained" : "outlined"}
      color={copiado ? "success" : "primary"}
      startIcon={copiado ? <CheckIcon /> : <ContentCopyIcon />}
      onClick={copiarAlPortapapeles}
    >
      {copiado ? "¡Copiado!" : label}
    </Button>
  );
}
```

### 5.5 Componente `SemaforoCompletitud.jsx`

**Diseño visual**:

```jsx
function SemaforoCompletitud({ estado, porcentaje, camposFaltantes }) {
  const colores = {
    pendiente: { bg: "#FFEBEE", icon: "🔴", color: "#C62828" },
    incompleto: { bg: "#FFF8E1", icon: "🟡", color: "#F9A825" },
    completo: { bg: "#E8F5E9", icon: "🟢", color: "#2E7D32" }
  };
  
  const config = colores[estado];
  
  return (
    <Tooltip title={
      estado === "completo" 
        ? "Todos los datos completos" 
        : `Faltan: ${camposFaltantes.join(", ")}`
    }>
      <Chip
        icon={<span>{config.icon}</span>}
        label={`${porcentaje}%`}
        sx={{ 
          backgroundColor: config.bg,
          color: config.color,
          fontWeight: 'bold'
        }}
      />
    </Tooltip>
  );
}
```

---

## 📊 FASE 6: ENDPOINTS DEL BACKEND

### 6.1 Nuevos Endpoints Requeridos

**Archivo**: `backend/src/routes/formularios-uafe-routes.js`

```javascript
// ==========================================
// GESTIÓN DE PROTOCOLOS
// ==========================================

// Crear formulario SIN número de protocolo (opcional)
POST /api/formularios-uafe
Body: {
  numeroProtocolo: null,  // OPCIONAL - puede ser vacío
  fechaEscritura: "2025-01-15",
  tipoActo: "COMPRAVENTA",
  valorContrato: 85000,
  avaluoMunicipal: 75000,
  multa: null,  // Solo para PROMESA_COMPRAVENTA
  ubicacionDescripcion: "LOTE DE TERRENO NÚMERO DIEZ (10)...",
  ubicacionParroquia: "TUMBACO",
  ubicacionCanton: "QUITO",
  ubicacionProvincia: "PICHINCHA",
  formasPago: [
    { tipo: "EFECTIVO", monto: 50000, banco: null },
    { tipo: "TRANSFERENCIA", monto: 35000, banco: "PICHINCHA" }
  ]
}
Response: {
  success: true,
  data: {
    id: "uuid",
    identificadorTemporal: "uuid-temp",  // Siempre presente
    numeroProtocolo: null,               // Puede ser null
    token: "C8GHIWTZ"
  }
}

// Actualizar número de protocolo después
PATCH /api/formularios-uafe/:id/protocolo
Body: {
  numeroProtocolo: "20251701018D00531"
}

// ==========================================
// GESTIÓN DE PARTICIPANTES
// ==========================================

// Agregar persona (aunque NO esté registrada)
POST /api/formularios-uafe/:id/participantes
Body: {
  cedulaRuc: "1712345678",
  calidad: "VENDEDOR",
  actuaPor: "PROPIOS_DERECHOS",
  compareceConyugeJunto: false,
  esApoderado: false,
  mandanteCedula: null
}
Response: {
  success: true,
  data: {
    id: "uuid",
    cedulaRuc: "1712345678",
    personaId: null,           // NULL si no está registrada
    nombreCompleto: null,      // NULL si no está registrada
    estadoCompletitud: "pendiente",  // 🔴 Rojo
    porcentajeCompletitud: 0,
    mensaje: "Persona no registrada. Se agregó con cédula pendiente de completar."
  }
}

// Toggle: Comparece cónyuge junto
PATCH /api/formularios-uafe/:id/participantes/:participanteId/toggle-conyuge
Body: {
  compareceConyugeJunto: true
}

// Marcar como apoderado
PATCH /api/formularios-uafe/:id/participantes/:participanteId/apoderado
Body: {
  esApoderado: true,
  mandanteCedula: "1700936170"
}
Response: {
  success: true,
  mandanteNombre: "CARLOS MANUEL DIEGO STACEY CHIRIBOGA"  // Si existe en BD
}

// ==========================================
// COMPLETITUD Y SEMÁFORO
// ==========================================

// Obtener estado de completitud de todos los participantes
GET /api/formularios-uafe/:id/completitud
Response: {
  success: true,
  estadoGeneral: "incompleto",  // "pendiente", "incompleto", "completo"
  puedeGenerar: false,          // true solo si todos están en verde
  participantes: [
    {
      id: "uuid",
      cedulaRuc: "0603123340",
      nombreCompleto: "JOSE LUIS ZAPATA CORDERO",
      estado: "completo",       // 🟢
      porcentaje: 100,
      camposFaltantes: []
    },
    {
      id: "uuid",
      cedulaRuc: "1712345678",
      nombreCompleto: null,     // Pendiente de registro
      estado: "pendiente",      // 🔴
      porcentaje: 0,
      camposFaltantes: ["registro_completo"]
    },
    {
      id: "uuid",
      cedulaRuc: "1723456789",
      nombreCompleto: "MARÍA FERNANDA LÓPEZ",
      estado: "incompleto",     // 🟡
      porcentaje: 65,
      camposFaltantes: ["parroquia", "telefono", "email"]
    }
  ]
}

// ==========================================
// GENERACIÓN DE TEXTOS
// ==========================================

// Generar AMBOS textos (Encabezado y Comparecencia)
POST /api/formularios-uafe/:id/generar-textos
Response: {
  success: true,
  data: {
    encabezado: "                    COMPRAVENTA\n\n                    OTORGANTES:\n...",
    comparecencia: "En la ciudad de San Francisco de Quito...",
    comparecenciaHtml: "<p>En la ciudad de San Francisco de Quito, Capital de la República del Ecuador, hoy día <strong>MIÉRCOLES TRES (03) DE SEPTIEMBRE...</strong></p>",
    fechaGeneracion: "2025-01-15T10:30:00Z",
    advertencias: []  // Si hay datos que podrían estar mal
  }
}

// Generar solo ENCABEZADO (tabla)
POST /api/formularios-uafe/:id/generar-encabezado
Response: {
  success: true,
  encabezado: "                    COMPRAVENTA\n\n                    OTORGANTES:\n..."
}

// Generar solo COMPARECENCIA (texto corrido)
POST /api/formularios-uafe/:id/generar-comparecencia
Response: {
  success: true,
  comparecencia: "En la ciudad de San Francisco de Quito...",
  comparecenciaHtml: "<p>En la ciudad de San Francisco de Quito..."
}

// ==========================================
// SINCRONIZACIÓN DE DATOS
// ==========================================

// Cuando una persona se registra/actualiza, sincronizar con formularios pendientes
// Este endpoint se llama automáticamente desde el sistema de registro personal
POST /api/formularios-uafe/sincronizar-persona/:cedula
Response: {
  success: true,
  formulariosActualizados: 3,
  detalles: [
    { formularioId: "uuid1", estadoAnterior: "pendiente", estadoNuevo: "completo" },
    { formularioId: "uuid2", estadoAnterior: "pendiente", estadoNuevo: "incompleto" }
  ]
}
```

### 6.2 Nuevo Controlador: `generacion-textos-controller.js`

**Ubicación**: `backend/src/controllers/generacion-textos-controller.js`

**Funciones principales**:
- `generarTextos(formularioId)` - Genera ambos outputs
- `generarEncabezadoTabla(formularioId)` - Solo la tabla estructurada
- `generarComparecencia(formularioId)` - Solo el texto corrido
- `validarDatosParaGeneracion(formularioId)` - Verifica semáforos en verde
- `sincronizarPersona(cedula)` - Actualiza formularios cuando alguien se registra

---

## 📊 FASE 7: VALIDACIONES Y CASOS ESPECIALES

### 7.1 Validación de Cédula Ecuatoriana

```javascript
function validarCedulaEcuatoriana(cedula) {
  // Algoritmo módulo 10
  // Retorna true/false
}
```

### 7.2 Validación de RUC

```javascript
function validarRUC(ruc) {
  // Validar formato y dígito verificador
  // Retorna true/false
}
```

### 7.3 Manejo de Género en Redacción

```javascript
const GENERO_REDACCION = {
  MASCULINO: {
    articulo: "el",
    tratamiento: "señor",
    titulo: {
      "Doctor": "Doctor",
      "Ingeniero": "Ingeniero",
      "Licenciado": "Licenciado",
      "Abogado": "Abogado"
    }
  },
  FEMENINO: {
    articulo: "la",
    tratamiento: "señora",
    titulo: {
      "Doctor": "Doctora",
      "Ingeniero": "Ingeniera",
      "Licenciado": "Licenciada",
      "Abogado": "Abogada"
    }
  }
};
```

### 7.4 Conversión de Números - Casos Especiales

```javascript
// Números que requieren manejo especial:
// - Ceros iniciales en teléfonos: "022345678" → "cero dos dos tres..."
// - Números de casa con letras: "N35-42" → "N treinta y cinco guion cuarenta y dos"
// - Rangos: "N70-294" → "N setenta guion doscientos noventa y cuatro"
// - Pisos/Oficinas: "Piso 3, Oficina 2B" → "Piso tres, Oficina dos B"
```

---

## 📊 FASE 8: PRUEBAS Y VALIDACIÓN

### 8.1 Casos de Prueba - Conversión de Números

| Input | Output Esperado |
|-------|-----------------|
| "1700936170" (cédula) | "uno siete cero cero nueve tres seis uno siete cero (1700936170)" |
| "022370289" (teléfono) | "cero dos dos tres siete cero dos ocho nueve (022370289)" |
| "0984015618" (celular) | "cero nueve ocho cuatro cero uno cinco seis uno ocho (0984015618)" |
| "1115" (número casa) | "mil ciento quince (1115)" |
| "N70-294" (número casa) | "N setenta guion doscientos noventa y cuatro (N70-294)" |
| "27" (número casa) | "veintisiete (27)" |
| "64-204" (número casa) | "sesenta y cuatro guion doscientos cuatro (64-204)" |

### 8.2 Casos de Prueba - Fechas

| Input | Output Esperado |
|-------|-----------------|
| 2025-09-03 | "MIÉRCOLES TRES (03) DE SEPTIEMBRE DEL DOS MIL VEINTICINCO (2025)" |
| 2025-11-21 | "VIERNES VEINTIUNO (21) DE NOVIEMBRE DEL DOS MIL VEINTICINCO (2025)" |
| 2026-01-14 | "MIÉRCOLES CATORCE (14) DE ENERO DEL DOS MIL VEINTISÉIS (2026)" |

### 8.3 Casos de Prueba - Estado Civil

| Estado | Solo | Con Cónyuge |
|--------|------|-------------|
| Soltero | "por sus propios y personales derechos" | N/A |
| Casado (comprador) | "de estado civil casado con [NOMBRE], por sus propios y personales derechos y por los que representa de la sociedad conyugal" | "los señores cónyuges [N1] y [N2], por sus propios y personales derechos y por los que representan de la sociedad conyugal que tienen formada" |
| Casado con disolución | "de estado civil casado con disolución de la sociedad conyugal, por sus propios y personales derechos" | N/A |
| Unión libre | "de estado civil en unión de hecho, por sus propios y personales derechos" | "los señores [N1] y [N2], de estado civil en unión de hecho por sus propios y personales derechos y por los que representan de la sociedad de bienes que tienen formada" |

---

## 📊 FASE 9: ORDEN DE IMPLEMENTACIÓN

### Sprint 1 (Semana 1): Fundamentos y Modelos
- [ ] **1.1** Migración de base de datos (nuevos campos en FormularioUAFE)
- [ ] **1.2** Migración ParticipanteFormulario (campos de semáforo y flexibilidad)
- [ ] **1.3** Modelo FormaPagoUAFE
- [ ] **1.4** Servicio de conversión de números a letras (cédulas, teléfonos, direcciones)
- [ ] **1.5** Servicio de conversión de fechas a formato notarial
- [ ] **1.6** Tests unitarios de conversiones

### Sprint 2 (Semana 2): Modal de Crear Protocolo Mejorado
- [ ] **2.1** Agregar campo Tipo de Acto (selector)
- [ ] **2.2** Agregar campos de Ubicación del Inmueble
- [ ] **2.3** Lógica condicional Multa vs Avalúo
- [ ] **2.4** Hacer número de protocolo opcional
- [ ] **2.5** Generar identificadorTemporal automático

### Sprint 3 (Semana 3): Modal de Agregar Persona Mejorado
- [ ] **3.1** Permitir agregar persona por cédula aunque no esté registrada
- [ ] **3.2** Selector de Calidad (VENDEDOR, COMPRADOR, etc.)
- [ ] **3.3** Selector de "Actúa Por" (propios derechos, sociedad conyugal, etc.)
- [ ] **3.4** Toggle "Comparece junto con cónyuge"
- [ ] **3.5** Checkbox "Actúa como apoderado" con búsqueda de mandante
- [ ] **3.6** Endpoints de agregar/modificar participante

### Sprint 4 (Semana 4): Sistema de Semáforo
- [ ] **4.1** Servicio de validación de completitud
- [ ] **4.2** Componente `SemaforoCompletitud.jsx`
- [ ] **4.3** Componente `ComparecienteCard.jsx` con semáforo
- [ ] **4.4** Endpoint GET /completitud
- [ ] **4.5** Lógica de sincronización cuando persona se registra
- [ ] **4.6** Vista de lista con estados visuales

### Sprint 5 (Semana 5): Generador de Encabezado (Tabla)
- [ ] **5.1** Servicio `encabezado-tabla-generator-service.js`
- [ ] **5.2** Algoritmo de alineación de columnas con espacios
- [ ] **5.3** Formateo de calidades con género
- [ ] **5.4** Formateo de ubicación con conversión de números
- [ ] **5.5** Endpoint POST /generar-encabezado
- [ ] **5.6** Tests con datos reales

### Sprint 6 (Semana 6): Generador de Comparecencia (Texto)
- [ ] **6.1** Servicio `comparecencia-generator-service.js`
- [ ] **6.2** Lógica de estado civil y cónyuges
- [ ] **6.3** Lógica de apoderados y representantes
- [ ] **6.4** Formateo de domicilios con conversión
- [ ] **6.5** Endpoint POST /generar-comparecencia
- [ ] **6.6** Tests con datos reales

### Sprint 7 (Semana 7): Panel de Generación en Frontend
- [ ] **7.1** Componente `PanelGeneracion.jsx` con dos columnas
- [ ] **7.2** Preview de Encabezado (fuente monospace)
- [ ] **7.3** Preview de Comparecencia (fuente serif)
- [ ] **7.4** Botón "Copiar Encabezado" con feedback
- [ ] **7.5** Botón "Copiar Comparecencia" con feedback
- [ ] **7.6** Deshabilitación si hay semáforos no verdes

### Sprint 8 (Semana 8): Integración y Pulimiento
- [ ] **8.1** Pruebas end-to-end con datos reales de notaría
- [ ] **8.2** Ajustes de formato según feedback de matrizadores
- [ ] **8.3** Manejo de casos especiales (nombres muy largos, etc.)
- [ ] **8.4** Optimización de rendimiento
- [ ] **8.5** Documentación para usuarios
- [ ] **8.6** Capacitación al equipo

---

## ⏱️ ESTIMACIÓN DE TIEMPO

| Sprint | Descripción | Duración | Prioridad |
|--------|-------------|----------|-----------|
| Sprint 1 | Fundamentos y Modelos | 5 días | 🔴 Crítico |
| Sprint 2 | Modal Crear Protocolo | 3 días | 🔴 Crítico |
| Sprint 3 | Modal Agregar Persona | 4 días | 🔴 Crítico |
| Sprint 4 | Sistema de Semáforo | 4 días | 🔴 Crítico |
| Sprint 5 | Generador Encabezado | 4 días | 🟡 Alto |
| Sprint 6 | Generador Comparecencia | 5 días | 🟡 Alto |
| Sprint 7 | Panel Frontend | 3 días | 🟡 Alto |
| Sprint 8 | Integración y Pulimiento | 4 días | 🟢 Medio |

**TOTAL ESTIMADO: 6-8 semanas**

---

## 🎯 ENTREGABLES POR MILESTONE

### Milestone 1: MVP Funcional (Sprints 1-4)
✅ Crear protocolos sin número obligatorio
✅ Agregar personas aunque no estén registradas
✅ Semáforo visual por compareciente
✅ Sincronización automática cuando alguien se registra

### Milestone 2: Generación de Textos (Sprints 5-7)
✅ Botón "Copiar Encabezado" funcional
✅ Botón "Copiar Comparecencia" funcional
✅ Conversión correcta de números a letras
✅ Panel visual con previews

### Milestone 3: Producción (Sprint 8)
✅ Sistema probado con datos reales
✅ Equipo capacitado
✅ Documentación completa

---

## 📋 ARCHIVOS DE CONTEXTO PARA CURSOR

### 🔴 CRÍTICOS (Analizar primero):
```
backend/prisma/schema.prisma
backend/src/controllers/formularios-uafe-controller.js
frontend/src/components/matrizador/FormulariosUAFE/
```

### 🟡 IMPORTANTES:
```
backend/src/services/
frontend/src/services/formularios-uafe-service.js
frontend/src/components/matrizador/FormulariosUAFE/CrearFormulario.jsx
```

### 🟢 OPCIONALES:
```
backend/src/routes/formularios-uafe-routes.js
frontend/src/hooks/useFormularioUAFE.js
```

---

## 🎯 MÉTRICAS DE ÉXITO

- [ ] **Conversión 100% correcta** de números a letras (sin errores)
- [ ] **Formato de fecha correcto** con día de la semana
- [ ] **Semáforo funcional** con indicador claro por compareciente
- [ ] **Copiar al portapapeles** funciona con formato para Word
- [ ] **Tiempo de redacción reducido 80%** según feedback de matrizadores

---

## 📝 NOTAS TÉCNICAS IMPORTANTES

1. **Copiar con formato HTML**: Para que el texto pegado en Word mantenga las negritas, usar `text/html` en el clipboard

2. **Números en direcciones**: Los números como "N70-294" tienen formato especial ecuatoriano

3. **Teléfonos**: Siempre empiezan con 0 en Ecuador, mantener el cero inicial

4. **Cédulas**: 10 dígitos, cada uno se convierte individualmente

5. **Zona horaria**: Ecuador usa GMT-5, las fechas deben mostrarse en hora local

---

*Documento de referencia para implementación del Módulo UAFE con Pre-Redacción Automática*
*Sistema de Trazabilidad Notarial - Notaría 18 Quito*
