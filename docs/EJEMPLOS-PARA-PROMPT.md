# 📝 PLANTILLA PARA AGREGAR EJEMPLOS AL PROMPT

**Instrucciones:** Llena esta plantilla con textos reales extraídos de PDFs de tu notaría.
Después de llenar, envía a tu desarrollador para integrar al prompt.

---

## 🎯 **EJEMPLOS PRIORITARIOS**

### **1. COMPRAVENTA**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Copiar aquí el texto tal cual aparece cuando extraes el PDF]
[Incluir desde el encabezado hasta la firma del notario]

Por ejemplo:
ESCRITURA PÚBLICA DE COMPRAVENTA...


────────────────────────────────────────────────────────────

DATOS CORRECTOS (validados manualmente):
────────────────────────────────────────────────────────────
Tipo de Acto:
Otorgante (Vendedor):
  - Apellidos:
  - Nombres:
  - Género: [M/F]
  - Tipo: [Natural/Jurídica]

Beneficiario (Comprador):
  - Apellidos:
  - Nombres:
  - Género: [M/F]
  - Tipo: [Natural/Jurídica]

Notario:
Notaría:

NOTAS ESPECIALES:
[Cualquier peculiaridad: múltiples compradores, inmueble específico, etc.]
```

---

### **2. HIPOTECA**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Texto del PDF aquí]


────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Tipo de Acto: CONSTITUCIÓN DE HIPOTECA / HIPOTECA

Otorgante (Deudor):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Beneficiario (Acreedor):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Notario:
Notaría:

NOTAS ESPECIALES:
[Banco involucrado, monto, garantía, etc.]
```

---

### **3. DONACIÓN**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Texto del PDF aquí]


────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Tipo de Acto: DONACIÓN / DONACIÓN IRREVOCABLE

Otorgante (Donante):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Beneficiario (Donatario):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Notario:
Notaría:

NOTAS ESPECIALES:
[Tipo de donación, bien donado, etc.]
```

---

### **4. REVOCATORIA DE PODER**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Texto del PDF aquí]


────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Tipo de Acto: REVOCATORIA DE PODER

Otorgante (Revocante):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Beneficiario (Revocado - el que tenía el poder):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Notario:
Notaría:

NOTAS ESPECIALES:
[Poder original que se revoca, fecha del poder original, etc.]
```

---

### **5. AUTORIZACIÓN DE SALIDA DE MENOR**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Texto del PDF aquí]


────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Tipo de Acto: AUTORIZACIÓN DE SALIDA / AUTORIZACIÓN DE SALIDA DEL MENOR

Otorgante (Padre/Madre que autoriza):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo: Natural

Beneficiario (Menor autorizado):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo: Natural

Notario:
Notaría:

NOTAS ESPECIALES:
[Destino del viaje, duración, acompañante, etc.]
```

---

### **6. CESIÓN DE DERECHOS**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Texto del PDF aquí]


────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Tipo de Acto: CESIÓN DE DERECHOS

Otorgante (Cedente):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Beneficiario (Cesionario):
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Notario:
Notaría:

NOTAS ESPECIALES:
[Tipo de derechos cedidos, sobre qué bien, etc.]
```

---

### **7. RECONOCIMIENTO DE FIRMA**

```
STATUS: [ ] Pendiente  [ ] En proceso  [ ] Completado

TEXTO EXTRAÍDO DEL PDF:
────────────────────────────────────────────────────────────
[Texto del PDF aquí]


────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Tipo de Acto: RECONOCIMIENTO DE FIRMA / RECONOCIMIENTO

Otorgante:
  - Apellidos:
  - Nombres:
  - Género:
  - Tipo:

Beneficiarios: [Generalmente ninguno - dejar vacío]

Notario:
Notaría:

NOTAS ESPECIALES:
[Documento en el que reconoce la firma]
```

---

## 📌 **CASOS ESPECIALES IMPORTANTES**

### **A. Persona Jurídica con Representante**

```
EJEMPLO: Empresa que otorga poder

TEXTO:
────────────────────────────────────────────────────────────
CONSTRUCTORA EDIFICIOS DEL NORTE S.A. representada por
el señor PEDRO RAMIREZ CASTRO confiere poder especial
al señor CARLOS MENDOZA LOPEZ...

────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Otorgante:
  - Apellidos: CONSTRUCTORA EDIFICIOS DEL NORTE S.A.
  - Nombres: [vacío]
  - Tipo: Jurídica
  - Género: null

Beneficiario:
  - Apellidos: MENDOZA LOPEZ
  - Nombres: CARLOS
  - Tipo: Natural
  - Género: M

IMPORTANTE: Pedro Ramirez Castro (representante) NO se incluye
            como otorgante, solo representa a la empresa.
```

---

### **B. Múltiples Otorgantes (Matrimonio)**

```
EJEMPLO: Pareja que vende propiedad

TEXTO:
────────────────────────────────────────────────────────────
Los cónyuges JUAN CARLOS PEREZ LOPEZ y MARIA FERNANDA
TORRES SANCHEZ venden a favor de...

────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Otorgantes:
  1. Apellidos: PEREZ LOPEZ
     Nombres: JUAN CARLOS
     Género: M
     Calidad: VENDEDOR

  2. Apellidos: TORRES SANCHEZ
     Nombres: MARIA FERNANDA
     Género: F
     Calidad: VENDEDOR

[Incluir ambos como otorgantes independientes]
```

---

### **C. Nombres Complicados (4+ palabras)**

```
EJEMPLO: Nombres con artículos o compuestos

TEXTO:
────────────────────────────────────────────────────────────
JOSE MARIA DE LOS ANGELES GONZALEZ PEREZ

────────────────────────────────────────────────────────────

DATOS CORRECTOS:
────────────────────────────────────────────────────────────
Apellidos: GONZALEZ PEREZ
Nombres: JOSE MARIA DE LOS ANGELES

[Regla: Los últimos 2 tokens son apellidos, el resto nombres]
```

---

## 📋 **CHECKLIST ANTES DE ENVIAR**

Antes de enviar estos ejemplos a tu desarrollador, verifica:

- [ ] Tienes al menos 3 ejemplos de diferentes tipos de actos
- [ ] El texto está copiado exactamente como aparece en el PDF
- [ ] Los datos (apellidos/nombres) están validados manualmente
- [ ] Has indicado si es persona Natural o Jurídica
- [ ] Has especificado el género cuando es claro (M/F)
- [ ] Has incluido notas sobre casos especiales
- [ ] Los nombres del notario y notaría están completos

---

## 📤 **CÓMO ENVIAR**

### **Opción 1: Archivo completado**
Completa este archivo y envíalo por email o súbelo al repositorio.

### **Opción 2: Formato estructurado**
Para cada ejemplo, envía en este formato JSON:

```json
{
  "tipo": "COMPRAVENTA",
  "texto_extraido": "[texto completo del PDF]",
  "datos_correctos": {
    "acto_o_contrato": "COMPRAVENTA",
    "otorgantes": [{
      "apellidos": "...",
      "nombres": "...",
      "genero": "M",
      "calidad": "VENDEDOR",
      "tipo_persona": "Natural"
    }],
    "beneficiarios": [{
      "apellidos": "...",
      "nombres": "...",
      "genero": "F",
      "calidad": "COMPRADOR",
      "tipo_persona": "Natural"
    }],
    "notario": "...",
    "notaria": "..."
  },
  "notas": "..."
}
```

---

## ❓ **PREGUNTAS FRECUENTES**

**P: ¿Debo eliminar información sensible?**
R: SÍ. Puedes cambiar nombres reales por ficticios, pero manteniendo el formato (APELLIDO APELLIDO NOMBRE NOMBRE).

**P: ¿Cuántos ejemplos necesito?**
R: Mínimo 1 por tipo de acto. Ideal: 2-3 por tipo para cubrir variaciones.

**P: ¿Qué hago si el PDF tiene errores o está mal escaneado?**
R: Envía el texto tal cual y marca en las notas que es un caso difícil. Esto ayuda a entrenar el sistema para esos casos.

**P: ¿Puedo usar documentos antiguos?**
R: Sí, siempre que el formato sea similar al actual.

---

**Fecha creación:** Enero 2025
**Próxima revisión:** Al completar 5+ ejemplos
