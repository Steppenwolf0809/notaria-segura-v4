# 🔄 GENERADOR AUTOMÁTICO DE CONCUERDOS NOTARIALES

## 🎯 OBJETIVO
Crear una funcionalidad para matrizadores que extraiga datos de extractos notariales PDF y genere automáticamente documentos "concuerdo/razón" con plantillas inteligentes.

## 📋 CONTEXTO TÉCNICO
- **Ubicación**: Nueva sección en menú lateral de matrizadores
- **Input**: PDF de extracto notarial del Consejo de la Judicatura (con texto seleccionable)
- **Output**: Documentos Word (.docx) y PDF con numeración de copias
- **Tecnología**: Extracción directa de texto PDF (no OCR), plantillas dinámicas

## 🔍 DATOS A EXTRAER DEL EXTRACTO

### Campos Obligatorios:
- **Acto o Contrato**: "PODER ESPECIAL", "AUTORIZACIÓN DE SALIDA DEL PAÍS", etc.
- **Otorgantes** (OTORGADO POR): Nombres completos, género inferido
- **Beneficiarios** (A FAVOR DE): Nombres completos, género inferido
- **Calidad**: Mandante/Mandatario, Compareciente/Beneficiario, etc.

### Campos Opcionales:
- **Notario**: Para casos de notario suplente
- **Escritura N°**: Para referencia

## 🧠 LÓGICA DE PROCESAMIENTO INTELIGENTE

### Detección de Género:
1. **Automática por nombre**: Base de datos de nombres comunes
2. **Manual override**: Botones señor/señora para casos ambiguos
3. **Casos especiales**: Menores de edad, nombres extranjeros

### Manejo de Plurales:
- **Singular**: "otorga el señor", "a favor de la señora"
- **Plural**: "otorgan los señores", "a favor de las señoras"
- **Mixto**: "otorgan el señor X y la señora Y"

### Plantillas por Tipo de Acto:
- **Estructura base**: "Se otorgó ante mí, en fe de ello confiero esta..."
- **Variables dinámicas**: {{NUMERO_COPIA}}, {{TIPO_ACTO}}, {{OTORGANTES}}, {{BENEFICIARIOS}}
- **Lógica condicional**: Texto específico según tipo de acto

## 📚 EJEMPLOS DE PLANTILLAS

### Plantilla Base:
```
Se otorgó ante mí, en fe de ello confiero esta {{NUMERO_COPIA}} **COPIA CERTIFICADA** de la escritura pública de {{TIPO_ACTO}} que {{VERBO_OTORGAR}} {{TRATAMIENTO_OTORGANTES}} {{NOMBRES_OTORGANTES}}, a favor de {{TRATAMIENTO_BENEFICIARIOS}} {{NOMBRES_BENEFICIARIOS}}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.
```

### Casos Específicos:

#### Poder General/Especial:
- **Tipo**: "**PODER GENERAL**"
- **Estructura**: "que otorga la señora X, a favor de la señora Y"

#### Autorización de Salida del País:
- **Tipo**: "**ACTA NOTARIAL DE AUTORIZACIÓN DE SALIDA DEL PAÍS PARA MENORES DE EDAD**"
- **Estructura**: "que otorga el señor X, a favor de su hijo(a) menor de edad Y"
- **Especial**: Relación familiar inferida

## 🏗️ ARQUITECTURA DEL SISTEMA

### Frontend (Nueva Sección):
```
src/components/matrizador/
├── ConcuerdoGenerator/
│   ├── ConcuerdoMain.jsx          # Página principal
│   ├── PDFUploader.jsx            # Componente de upload
│   ├── ExtractedDataForm.jsx      # Formulario de edición
│   ├── TemplatePreview.jsx        # Vista previa del documento
│   └── DocumentGenerator.jsx      # Generación final
```

### Backend (Nuevos Endpoints):
```
src/controllers/
├── concuerdo-controller.js        # Controlador principal
src/services/
├── pdf-text-extractor.js          # Extracción de texto PDF
├── template-engine.js             # Motor de plantillas
├── gender-detector.js             # Detección de género
└── document-generator.js          # Generación Word/PDF
```

### Base de Datos:
```sql
-- Plantillas por tipo de acto
CREATE TABLE concuerdo_templates (
    id SERIAL PRIMARY KEY,
    tipo_acto VARCHAR(255),
    template_content TEXT,
    variables JSON
);

-- Base de datos de nombres y géneros
CREATE TABLE nombres_genero (
    nombre VARCHAR(100),
    genero ENUM('M', 'F', 'U'), -- Masculino, Femenino, Unisex
    frecuencia INT
);
```

## 🔄 FLUJO DE TRABAJO

### Fase 1: Upload y Extracción
1. Usuario sube PDF del extracto
2. Sistema extrae texto usando PDF parser
3. Regex/parsing identifica campos clave
4. Presenta datos extraídos para revisión

### Fase 2: Validación y Edición
1. Sistema infiere género de nombres automáticamente
2. Muestra formulario con datos extraídos
3. Botones señor/señora para casos ambiguos
4. Usuario puede editar cualquier campo manualmente

### Fase 3: Generación de Plantilla
1. Sistema selecciona plantilla según tipo de acto
2. Aplica lógica de plurales y género
3. Muestra vista previa del documento
4. Usuario ajusta número de copias (default: 2)

### Fase 4: Generación Final
1. Genera documentos Word (.docx) editables
2. Genera PDFs finales con numeración
3. Descarga automática de archivos
4. Opción de regenerar con cambios

## 🧪 CASOS DE PRUEBA

### Caso 1: Poder General Simple
- **Input**: 1 otorgante, 1 beneficiario, nombres claros
- **Output**: Plantilla estándar con género correcto

### Caso 2: Múltiples Otorgantes
- **Input**: 2+ otorgantes del mismo/diferente género
- **Output**: Plurales correctos, tratamientos mixtos

### Caso 3: Autorización Salida País
- **Input**: Padre/madre + menor de edad
- **Output**: Plantilla específica con relación familiar

### Caso 4: Nombres Ambiguos
- **Input**: Nombres extranjeros o unisex
- **Output**: Botones manuales señor/señora activados

### Caso 5: ESCRITURAS MÚLTIPLES (COMPLEJO)
- **Input**: Extracto con 2-3 actos diferentes (Cancelación + Compraventa + Poder)
- **Parsing**: Sistema detecta múltiples secciones "ACTO O CONTRATO"
- **Output**: Plantilla compuesta con conectores "y de [SEGUNDO_ACTO]"
- **Ejemplo**: "...de **CANCELACIÓN DE HIPOTECA** que otorga el BANCO X a favor de Y; y de **COMPRAVENTA** que otorga Y a favor de Z..."

### Caso 6: Personas Jurídicas Complejas
- **Input**: Fideicomisos, bancos, constructoras con representantes
- **Parsing**: Extraer razón social + representante legal
- **Output**: Formato "la compañía CONSTRUCTORA X" vs "el BANCO Y"

## 🛠️ PLAN DE IMPLEMENTACIÓN

### Sprint 1 (Semana 1): Extracción Básica
- [ ] Crear sección en menú matrizador
- [ ] Implementar upload de PDF
- [ ] Desarrollar extractor de texto básico
- [ ] Crear formulario de edición manual
- [ ] Parsing de casos simples (1 acto por extracto)

### Sprint 2 (Semana 2): Motor de Plantillas
- [ ] Desarrollar sistema de plantillas dinámicas
- [ ] Implementar lógica de género y plurales
- [ ] Crear base de datos de nombres
- [ ] Vista previa de documentos
- [ ] Plantillas para casos simples

### Sprint 3 (Semana 3): Generación de Documentos
- [ ] Integrar generador de Word (docx)
- [ ] Implementar generador de PDF
- [ ] Sistema de numeración de copias
- [ ] Descargas automáticas

### Sprint 4 (Semana 4): Casos Complejos
- [ ] Parser de escrituras múltiples
- [ ] Plantillas compuestas con conectores
- [ ] Manejo de personas jurídicas complejas
- [ ] Validación y edición manual de casos complejos

### Sprint 5 (Semana 5): Pulimiento Final
- [ ] Casos especiales (menores, nombres extranjeros)
- [ ] Validaciones y manejo de errores
- [ ] Pruebas exhaustivas con extractos reales
- [ ] Documentación y capacitación

## 📈 BENEFICIOS ESPERADOS

### Operacionales:
- **Reducción 80%** tiempo creación concuerdos
- **Eliminación** errores de transcripción
- **Estandarización** formato documentos
- **Trazabilidad** documentos generados

### Técnicos:
- **Reutilización** plantillas dinámicas
- **Escalabilidad** para nuevos tipos de actos
- **Mantenibilidad** separación lógica
- **Extensibilidad** futuro sistema QR

## 🚨 CONSIDERACIONES ESPECIALES

### Manejo de Errores:
- Validación formato PDF
- Fallback a edición manual si extracción falla
- Validación campos obligatorios

### Casos Edge:
- Nombres con caracteres especiales
- Múltiples otorgantes de géneros mixtos
- Actos notariales no contemplados en plantillas

### **ESCRITURAS MÚLTIPLES - DESAFÍOS CRÍTICOS:**

#### Detección Automática:
- **Parser inteligente**: Identificar múltiples secciones "ACTO O CONTRATO"
- **Separación de contextos**: Cada acto tiene sus propios otorgantes/beneficiarios
- **Validación cruzada**: Verificar que personas aparezcan en roles correctos

#### Plantillas Compuestas:
```
CASO SIMPLE: "...de **PODER GENERAL** que otorga X a favor de Y..."

CASO MÚLTIPLE: "...de **CANCELACIÓN DE HIPOTECA** que otorga el BANCO X a favor de Y; y de **COMPRAVENTA** que otorga la compañía Y a favor del señor Z..."
```

#### Estrategias de Implementación:
1. **MVP (Sprints 1-3)**: Solo casos simples, manual para múltiples
2. **Avanzado (Sprints 4-5)**: Parser inteligente para casos múltiples
3. **Fallback**: Siempre permitir edición manual completa

#### Complejidades Personas Jurídicas:
- **Bancos**: "el BANCO PICHINCHA C.A." (masculino)
- **Compañías**: "la compañía CONSTRUCTORA X CIA. LTDA." (femenino)
- **Fideicomisos**: "el FIDEICOMISO INMOBILIARIO Y" (masculino)
- **Representación**: Incluir representante legal cuando sea relevante

### Seguridad:
- Validación archivos PDF (no ejecutables)
- Sanitización nombres y datos
- Logs de documentos generados

### **ESTRATEGIA GRADUAL RECOMENDADA:**
1. **Fase MVP**: Implementar casos simples (80% de uso)
2. **Fase Avanzada**: Agregar parser para casos múltiples
3. **Siempre**: Mantener opción de edición manual completa
4. **Feedback**: Permitir reportar casos no manejados para mejoras

## 🎯 MÉTRICAS DE ÉXITO

- [ ] **95%+ precisión** en extracción automática
- [ ] **<30 segundos** tiempo generación documento
- [ ] **0 errores** transcripción nombres
- [ ] **100% satisfacción** matrizadores en pruebas

---
*Documento de referencia para desarrollo del Generador Automático de Concuerdos - Sistema de Trazabilidad Notarial*