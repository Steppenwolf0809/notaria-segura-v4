# Formulario UAFE + Generacion Automatica de Reportes

**Fecha:** 2026-03-06
**Ultima actualizacion:** 2026-03-10
**Estado:** OLAs 1-4 COMPLETADAS y en produccion. Pendiente: vehiculos, hipoteca doble minuta, alertas.
**Autor:** Matrizador + Claude Code

---

## 1. Objetivo

Redisenar el flujo de formularios UAFE para que:
1. El reporte mensual UAFE (TRANSACCION.xlsx + INTERVINIENTE.xlsx) se genere automaticamente
2. Cada paso del proceso le aporte valor inmediato al matrizador (no sea "trabajo extra")
3. Los datos se capturen progresivamente desde la minuta hasta la facturacion
4. El formulario publico del cliente se simplifique con datos pre-llenados

**Principio rector:** El reporte UAFE es un subproducto del trabajo diario, nunca un paso adicional.

---

## 2. Fuentes de datos

| Dato UAFE | Fuente principal | Momento disponible |
|---|---|---|
| No Protocolo | Document (sistema) | Al facturar |
| Fecha | Minuta / Document | Inicio del tramite |
| Tipo de acto (codigo) | Minuta (extraido) | Inicio del tramite |
| Cuantia/Precio | Minuta (extraido) | Inicio del tramite |
| Avaluo municipal | Minuta (extraido) | Inicio del tramite |
| Comparecientes + cedulas | Minuta (extraido) | Inicio del tramite |
| Nacionalidad | Minuta (extraido) | Inicio del tramite |
| Estado civil | Minuta (extraido) | Inicio del tramite |
| Forma de comparecer | Minuta (extraido) | Inicio del tramite |
| Descripcion del bien | Minuta (extraido) | Inicio del tramite |
| Forma de pago | Minuta (extraido) | Inicio del tramite |
| Telefono, correo, profesion | Minuta (si aparece) | Inicio del tramite |
| Ubicacion inmueble | Minuta (extraido) | Inicio del tramite |
| Direccion domicilio | Formulario publico (cliente) | Cuando el cliente llena |
| Situacion laboral | Formulario publico (cliente) | Cuando el cliente llena |
| Datos conyugue | Formulario publico (cliente) | Cuando el cliente llena |
| Declaracion PEP | Formulario publico (cliente) | Cuando el cliente llena |
| Ingreso mensual | Formulario publico (cliente) | Cuando el cliente llena |

**Nota:** El extracto del Consejo de la Judicatura (PDF) se genera despues de facturar. NO es fuente primaria, solo sirve para verificacion al cierre del mes.

---

## 3. Flujo del matrizador

```
1. Matrizador sube minuta (Word) al crear tramite
   -> Sistema extrae datos con regex + LLM (seccion 5)
   -> Se crea ProtocoloUAFE en estado BORRADOR (sin No protocolo)

2. Matrizador revisa datos pre-llenados
   -> Corrige/completa lo que el parser erro
   -> Sistema muestra revision de clausulas (numeracion, existencia)
   -> VALOR: ahorra tipeo + checklist de clausulas

3. Envia formulario publico a comparecientes
   -> Clientes llenan: direccion, laboral, PEP, conyugue
   -> Semaforo muestra progreso por persona

4. Sistema genera encabezado de escritura (ya existe)

5. Se factura -> Document obtiene No protocolo
   -> Vinculacion al ProtocoloUAFE:
      a) Auto-suggest por cedula de comparecientes (match con Document)
      b) Manual: matrizador pega el numero de protocolo
   -> Estado pasa a COMPLETO
```

---

## 4. Modelo de datos

### 4.1 Cambios al modelo ProtocoloUAFE (campos nuevos)

```prisma
+ estado              String  @default("BORRADOR")
                      // BORRADOR, EN_PROCESO, PENDIENTE_PROTOCOLO, COMPLETO, REPORTADO
+ minutaUrl           String?              // Ruta al archivo Word subido
+ minutaParseada      Boolean @default(false)
+ datosExtraidos      Json?                // Resultado raw del parsing regex+LLM
+ documentId          Int?    @unique      // FK al Document del sistema
+ reporteUafeId       String?             // FK al ReporteUAFE donde se incluyo
+ codigoCanton        String  @default("1701")  // Del catalogo UAFE
+ tipoBien            String?             // CAS, DEP, TER, VEH, EDI, OFI, EMB, OTR
```

### 4.2 Nuevo modelo ReporteUAFE

```prisma
model ReporteUAFE {
  id                    String   @id @default(uuid())
  mes                   Int
  anio                  Int
  estado                String   @default("BORRADOR")
                        // BORRADOR, GENERADO, VERIFICADO
  totalTransacciones    Int      @default(0)
  totalIntervinientes   Int      @default(0)
  archivoTransacciones  String?  // Ruta del xlsx generado
  archivoIntervinientes String?  // Ruta del xlsx generado
  generadoPor           Int
  generadoAt            DateTime?
  verificadoConCJ       Boolean  @default(false)
  notaryId              Int      @default(1)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  protocolos            ProtocoloUAFE[]
  generador             User     @relation(fields: [generadoPor], references: [id])
  notary                Notary   @relation(fields: [notaryId], references: [id])

  @@unique([mes, anio, notaryId])
  @@map("reportes_uafe")
}
```

### 4.3 Estados del ProtocoloUAFE

```
BORRADOR ---------> EN_PROCESO ---------> PENDIENTE_PROTOCOLO ---------> COMPLETO ---------> REPORTADO
  |                     |                         |                          |
  Minuta subida,     Comparecientes           Todo listo,               Incluido en
  datos parciales    llenando formularios     falta solo No             reporte mensual
                                              protocolo
```

Transiciones:
- BORRADOR -> EN_PROCESO: cuando se envian formularios publicos a comparecientes
- EN_PROCESO -> PENDIENTE_PROTOCOLO: cuando todos los datos estan completos excepto No protocolo
- PENDIENTE_PROTOCOLO -> COMPLETO: cuando se vincula el No protocolo
- BORRADOR -> COMPLETO: si el matrizador llena todo manualmente de una vez
- COMPLETO -> REPORTADO: al incluirse en un ReporteUAFE generado

---

## 5. Extraccion de datos de la minuta

### 5.1 Fase 1: Regex (gratis, inmediato)

Identifica secciones de la minuta Word:
- Seccion COMPARECIENTES: patron de inicio/fin
- Cedulas/RUC: `\d{10}` o `\d{13}`
- Montos: patrones "USD", "$", "DOLARES", cifras con decimales
- Frases clave: "por sus propios derechos", "en representacion de"
- Secciones: CLAUSULAS, PRECIO, FORMA DE PAGO

### 5.2 Fase 2: LLM (solo secciones relevantes)

**Input:** Solo texto de secciones COMPARECIENTES + PRECIO + FORMA DE PAGO (~500-1500 tokens)

**Prompt estructurado:** Extrae datos de fragmento de minuta notarial ecuatoriana.

**Output JSON esperado:**
```json
{
  "comparecientes": [{
    "nombre": "TERAN VALLEJO ANA LUCIA",
    "cedula": "1703761872",
    "nacionalidad": "ECUATORIANA",
    "estadoCivil": "CASADA",
    "telefono": "0991234567",
    "correo": "ana@email.com",
    "profesion": "ABOGADA",
    "calidad": "VENDEDOR",
    "actuaPor": "PROPIOS_DERECHOS",
    "representadoDe": null
  }],
  "cuantia": 56500.00,
  "avaluoMunicipal": 45000.00,
  "tipoBien": "TER",
  "descripcionBien": "Lote de terreno ubicado en...",
  "ubicacionInmueble": {
    "descripcion": "...",
    "parroquia": "INAQUITO",
    "canton": "QUITO",
    "provincia": "PICHINCHA"
  },
  "formaPago": [
    { "tipo": "TRANSFERENCIA", "monto": 56500.00, "banco": "Pichincha" }
  ]
}
```

**Estimacion de costo:** ~80 tramites/mes x ~2000 tokens = ~$0.01/mes con Gemini Flash.

**Fallback:** Si el parsing falla, el matrizador llena manualmente. Nada se bloquea.

---

## 6. Formulario publico (cliente)

### 6.1 Datos pre-llenados de la minuta (no editables por cliente)

- Nombre completo
- Cedula
- Nacionalidad
- Estado civil
- Telefono (si se encontro)
- Correo (si se encontro)
- Profesion (si se encontro)

### 6.2 Datos que el cliente completa

- Direccion domicilio (calle principal, secundaria, numero)
- Situacion laboral (dependencia, independiente, jubilado, etc.)
- Nombre entidad / cargo / fecha ingreso (si aplica)
- Ingreso mensual
- Datos conyugue (si aplica)
- Datos beneficiario (si aplica)
- Declaracion PEP (Persona Expuesta Politicamente)

### 6.3 Fallback manual

Si el cliente no llena el formulario, el matrizador puede:
- Reenviar el link del formulario
- Llenar manualmente desde su panel (se registra en auditoria como origen=MATRIZADOR)

---

## 7. Semaforo de completitud

### 7.1 Nivel protocolo

| Color | Significado | Detalle |
|---|---|---|
| ROJO | Faltan datos obligatorios UAFE | Sin comparecientes, sin cuantia, sin tipo acto |
| AMARILLO | Reporte OK parcial | Datos transaccion OK pero faltan datos personales, o falta No protocolo |
| VERDE | Completo | Todos los datos listos para reporte |

### 7.2 Nivel persona (dentro del protocolo)

| Color | Significado |
|---|---|
| ROJO | No ha llenado formulario, datos minimos de la minuta |
| AMARILLO | Formulario parcialmente completado |
| VERDE | Formulario completo |

### 7.3 Validacion flexible

**Campos obligatorios para reporte UAFE:**
- Nombre completo, cedula, nacionalidad, calidad (comprador/vendedor)

**Campos de debida diligencia (no bloquean reporte):**
- Direccion, situacion laboral, profesion, ingreso, PEP, conyugue

El semaforo NUNCA bloquea. Un protocolo en AMARILLO se puede incluir en el reporte.
El ROJO genera advertencia pero no impide la generacion.

**Tooltip granular:** El semaforo muestra que campos faltan al hacer hover.
Ejemplo: "Pendiente: profesion, direccion domicilio"

---

## 8. Generacion del reporte mensual

### 8.1 Dashboard del responsable UAFE

Vista mensual con:
- Resumen: total protocolos, desglose por semaforo
- Lista de protocolos ROJO que requieren atencion
- Boton generar TRANSACCION.xlsx e INTERVINIENTE.xlsx
- Opcion subir indice CJ para verificacion cruzada

### 8.2 Filtro para inclusion en reporte

```
WHERE numeroProtocolo IS NOT NULL
  AND tipoActo IN (codigos del catalogo UAFE: 73-93+)
  AND fecha BETWEEN inicioMes AND finMes
```

Solo entran protocolos con numero de protocolo asignado y cuyo tipo de acto este en el catalogo UAFE. Los borradores o protocolos sin facturar no se incluyen.

### 8.3 Formato TRANSACCION.xlsx

Fila header:
```
TRA | cod_notaria | fecha_cierre(YYYYMMDD) | total_registros
```

Filas de datos:
```
codigo_transaccion | fecha(YYYYMMDD) | cod_acto | descripcion_acto | avaluo | cuantia | tipo_bien | descripcion_bien | cod_canton | cod_notaria | fecha_cierre
```

Codigo de transaccion: `{YYYY}{canton4}{notaria4}{D o P}{nro_protocolo_padding5}`

### 8.4 Formato INTERVINIENTE.xlsx

Fila header:
```
INT | cod_notaria | fecha_cierre(YYYYMMDD) | total_registros
```

Filas de datos:
```
codigo_transaccion | rol(01/02) | cedula | nombre_completo | nacionalidad(codigo_iso) | tipo_id(C/R/P) | secuencial | cod_notaria
```

### 8.5 Verificacion contra indice CJ

Opcional. El responsable sube el indice CJ (Excel) y el sistema:
- Cruza por numero de protocolo
- Muestra escrituras en CJ no encontradas en el sistema
- Muestra escrituras en el sistema no encontradas en CJ
- Solo como verificacion, no modifica datos

---

## 9. Catalogos UAFE (dropdowns y autocomplete)

Fuente: `docs/Uafe/Catalogo-Notarios.xls`

### Dropdowns (catalogos cortos):
- **Tipo transaccion:** 21 opciones (codigo 73-93+)
- **Tipo bien:** 8 opciones (CAS, DEP, TER, EDI, OFI, VEH, EMB, OTR)
- **Tipo identificacion:** 4 opciones (C, R, P, A)
- **Rol interviniente:** 2 opciones (01=Otorgado por, 02=A favor de)

### Autocomplete con busqueda (catalogos extensos):
- **Nacionalidad:** 274 opciones - usuario escribe y el sistema sugiere, backend mapea a codigo ISO
- **Canton:** 224 opciones - usuario escribe y el sistema sugiere, backend mapea a codigo
- **Papel interviniente:** 71 opciones - usuario escribe y el sistema sugiere

### Almacenamiento
Los catalogos se cargan en tablas de referencia o como constantes en el backend.
El mapeo texto -> codigo UAFE es automatico al generar el reporte.

---

## 10. Reglas de formato para xlsx

Al generar los archivos xlsx se aplican estas validaciones:

```
- Strings: trim(), eliminar doble espacio, UPPERCASE para nombres
- Nombres: max 100 caracteres
- Cedula: exactamente 10 digitos, sin guiones ni espacios
- RUC: exactamente 13 digitos
- Montos: 2 decimales, sin simbolo $, punto como separador decimal
- Fechas: formato YYYYMMDD
- Campos vacios: string vacio "", nunca null
- Nacionalidad: codigo ISO de 3 letras (ECU, COL, etc.)
- Canton: codigo de 4 digitos (1701, 0101, etc.)
```

**Validacion pre-generacion:** El sistema muestra errores/advertencias antes de generar:
- Errores (impiden generar): cedula con formato invalido, tipo acto no mapeado
- Advertencias (permiten generar): avaluo vacio, nacionalidad no encontrada

---

## 11. Consideraciones tecnicas

### Parsing de Word (.docx)
- Usar libreria como `mammoth` o `docx-parser` para extraer texto
- Las minutas llegan mayoritariamente en Word; PDF con firma electronica como caso secundario
- Si se estandariza el formato, se puede pedir en Word

### LLM (Gemini)
- Ya existe integracion Gemini en el sistema (controlado por GEMINI_ENABLED)
- Usar Gemini Flash para minimizar costos
- Enviar solo secciones relevantes, no la minuta completa
- Timeout + fallback a manual si el LLM no responde

### Multi-tenant
- ProtocoloUAFE ya tiene notaryId
- ReporteUAFE tiene notaryId
- Los reportes se generan por notaria

### Vehiculos
- PENDIENTE para fase posterior
- Regla: vehiculos que sumen >$10,000/mes en la notaria deben reportarse
- Requiere modelo de certificado unico vehicular
- No incluido en esta fase de diseno

### Proteccion de datos personales

El formulario publico maneja datos sensibles (cedula, direccion, situacion laboral, ingresos,
declaracion PEP). Actualmente se protege con un PIN de 6 digitos, lo cual es basico.

**Opciones evaluadas (pendiente validacion con operadores):**

**Opcion A: Link unico con token + cedula (recomendada inicial)**
- El matrizador genera un link con token UUID unico (ya existe este flujo)
- Al acceder, el usuario ingresa su cedula para verificar identidad
- El link expira en 48-72h y es de un solo uso
- Seguridad: conocer el link + conocer la cedula del compareciente
- Sin PIN que recordar ni codigo que enviar

**Opcion B: PIN de 6 digitos mejorado (actual)**
- PIN generado por el sistema (no elegido por el usuario)
- PIN de un solo uso: se invalida al completar el formulario
- El matrizador lo entrega verbalmente o impreso
- Max 3 intentos, bloqueo 15 min

**Opcion C: OTP via WhatsApp/SMS (futuro)**
- Requiere API oficial de WhatsApp (no disponible actualmente)
- Seria la opcion ideal cuando se tenga API oficial
- Codigo OTP de 6 digitos, expira en 10 min, sesion 30 min

**Realidad operativa:** Muchos comparecientes no usaran el link y llegaran
a la oficina sin haber completado el formulario. El fallback manual del
matrizador (seccion 6.3) es critico para estos casos.

**Decision:** Documentar las 3 opciones. Implementar A o B segun validacion
con operadores. Migrar a C cuando se tenga API oficial de WhatsApp.

**Medidas adicionales de proteccion:**
- Datos personales encriptados en reposo (campos sensibles en BD)
- Rate limiting en endpoint de OTP (max 3 intentos, bloqueo 15 min)
- Logs de auditoria: quien accedio, cuando, desde que IP
- Sesion vinculada a IP + User-Agent (cambio = sesion invalida)
- HTTPS obligatorio (ya existe)
- Los datos del formulario no se muestran en la URL (POST, no GET)
- Acceso a datos personales desde panel matrizador requiere autenticacion Clerk

**Consideracion LOPD Ecuador (Ley Organica de Proteccion de Datos):**
- Consentimiento: el formulario debe incluir checkbox de consentimiento explicito
- Finalidad: informar que los datos se usan para cumplimiento UAFE
- Minimizacion: solo pedir datos necesarios para el reporte + debida diligencia
- Retencion: definir tiempo de almacenamiento (sugerido: 10 anios por normativa UAFE)

---

## 12. Plan de implementacion (propuesto)

### OLA 1: Modelo de datos + catalogos
- Migrar schema: nuevos campos en ProtocoloUAFE, nuevo modelo ReporteUAFE
- Cargar catalogos UAFE como constantes o tablas de referencia
- Estados del protocolo + transiciones

### OLA 2: Subida y parsing de minuta
- Upload de Word en el flujo del matrizador
- Extraccion regex fase 1
- Integracion LLM fase 2 (secciones relevantes)
- UI de revision/correccion de datos extraidos

### OLA 3: Formulario publico mejorado
- Pre-llenado de datos desde minuta
- Validacion flexible (obligatorio UAFE vs debida diligencia)
- Fallback manual para matrizador
- Semaforo granular con tooltip

### OLA 4: Vinculacion de protocolo + generacion de reporte
- Vinculacion Document <-> ProtocoloUAFE (auto-suggest + manual)
- Dashboard responsable UAFE
- Generacion xlsx TRANSACCION + INTERVINIENTE
- Reglas de formato y validacion pre-generacion

### OLA 5: Verificacion CJ + mejoras
- Upload indice CJ para cruce
- Reporte de discrepancias
- Revision de clausulas de minuta (numeracion, existencia)
- Iteraciones de UX basadas en feedback

---

## 13. Declaracion legal obligatoria en formulario

El formulario publico DEBE mostrar la siguiente declaracion antes de que el usuario
pueda enviar sus datos. Requiere aceptacion explicita (checkbox).

**Texto de la declaracion:**

> La Unidad de Analisis Financiero y Economico UAFE, en cumplimiento a las politicas
> internas de prevencion de lavado de activos, requiere la entrega de la siguiente
> informacion (favor completar todos los campos obligatoriamente). Autorizo expresamente
> a la UAFE, a traves de la Notaria Decima Octava del canton Quito, cuando lo considere
> oportuno obtenga informacion ampliada relativa a mi persona o a la empresa que
> represento, de instituciones financieras y de control. Acepto que la presente informacion
> servira como insumo para controles sobre prevencion, deteccion y erradicacion del delito
> de lavado de activos y financiamiento de delitos.
>
> Declaro bajo juramento que los recursos utilizados para pagar las facturas generadas
> por la Notaria 18 del canton Quito por concepto de tasas notariales provenientes de los
> actos y contratos realizados, no proceden de ninguna de las actividades tipificadas en
> las normas de la legislacion ecuatoriana vigente para prevenir el lavado de activos,
> eximiendo a la Notaria de toda responsabilidad.

**Implementacion:**
- Se muestra al inicio del formulario, antes de cualquier campo
- Checkbox: "He leido y acepto la declaracion anterior"
- No se puede enviar el formulario sin aceptar
- Se registra en BD: fecha/hora de aceptacion, IP, user-agent
- El texto debe ser configurable por notaria (multi-tenant: cada notaria podria
  tener su propia version con su nombre)
- En el PDF generado se incluye esta declaracion con la fecha de aceptacion

---

## Pendientes / Preguntas abiertas

- [ ] Validar flujo con partes interesadas (matrizadores, responsable UAFE)
- [ ] Definir catalogo completo de tipos de acto del catálogo (faltan codigos 86-93+)
- [ ] Obtener minutas de ejemplo para afinar regex
- [ ] Definir reglas especificas de revision de clausulas
- [ ] Fase vehiculos: diseno separado cuando se aborde
- [ ] Confirmar si se necesita campo "moneda" en el reporte (USD por defecto?)
- [ ] Definir politica de retencion de minutas subidas (almacenamiento)
