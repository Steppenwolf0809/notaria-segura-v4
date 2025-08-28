/**
 * Sistema de Validación y Calidad de Datos Extraídos
 * Detecta problemas comunes y proporciona sugerencias automáticas
 */

class DataQualityValidator {
  constructor() {
    this.debug = process.env.NODE_ENV !== 'production'
  }

  /**
   * Valida datos extraídos de un acto notarial
   * @param {Object} actData - Datos del acto extraído
   * @returns {Object} Resultado de validación con score, issues y sugerencias
   */
  validateActData(actData) {
    const validation = {
      score: 1.0, // Puntuación inicial perfecta
      confidence: 'high',
      issues: [],
      warnings: [],
      suggestions: [],
      autoFixes: {},
      summary: ''
    }

    if (!actData) {
      validation.score = 0
      validation.confidence = 'none'
      validation.issues.push('No se encontraron datos para validar')
      return validation
    }

    // Validar tipo de acto
    this.validateTipoActo(actData.tipoActo, validation)
    
    // Validar otorgantes
    this.validateEntities(actData.otorgantes, 'otorgantes', validation)
    
    // Validar beneficiarios
    this.validateEntities(actData.beneficiarios, 'beneficiarios', validation)
    
    // Validar consistencia entre otorgantes y beneficiarios
    this.validateConsistency(actData, validation)
    
    // Calcular score final y confianza
    this.calculateFinalScore(validation)
    
    // Generar resumen
    this.generateSummary(validation)
    
    this.log('Validación completada:', validation)
    return validation
  }

  /**
   * Valida el tipo de acto
   */
  validateTipoActo(tipoActo, validation) {
    if (!tipoActo || typeof tipoActo !== 'string') {
      validation.issues.push('Tipo de acto no detectado')
      validation.score -= 0.3
      validation.suggestions.push('Verificar que el PDF contenga la sección "ACTO O CONTRATO"')
      return
    }

    const tipo = tipoActo.trim().toUpperCase()
    
    // Verificar tipos válidos comunes
    const tiposValidos = [
      'PODER', 'REVOCATORIA', 'COMPRAVENTA', 'TESTAMENTO', 
      'DONACIÓN', 'HIPOTECA', 'CONSTITUCIÓN', 'DECLARATORIA'
    ]
    
    const tipoReconocido = tiposValidos.some(t => tipo.includes(t))
    
    if (!tipoReconocido) {
      validation.warnings.push(`Tipo de acto "${tipo}" no es uno de los tipos comunes`)
      validation.score -= 0.1
      validation.suggestions.push('Verificar que el tipo de acto esté correctamente extraído')
    }

    // Verificar que no sea muy corto (posible extracción incompleta)
    if (tipo.length < 3) {
      validation.issues.push('Tipo de acto parece incompleto')
      validation.score -= 0.2
      validation.suggestions.push('El tipo de acto parece estar cortado, revisar extracción')
    }

    // Verificar que no contenga texto basura
    if (/\d{4,}|FECHA|PROVINCIA|CANTON/.test(tipo)) {
      validation.warnings.push('Tipo de acto contiene texto que parece ser metadata')
      validation.score -= 0.1
      validation.autoFixes.tipoActo = this.cleanActType(tipo)
    }
  }

  /**
   * Valida entidades (otorgantes o beneficiarios)
   */
  validateEntities(entities, tipo, validation) {
    if (!entities || entities.length === 0) {
      if (tipo === 'otorgantes') {
        validation.issues.push('No se detectaron otorgantes')
        validation.score -= 0.4
        validation.suggestions.push('Verificar que el PDF contenga la tabla de "OTORGANTES" o "OTORGADO POR"')
      } else {
        validation.warnings.push('No se detectaron beneficiarios')
        validation.score -= 0.1
        validation.suggestions.push('Los beneficiarios pueden estar implícitos o en sección "A FAVOR DE"')
      }
      return
    }

    entities.forEach((entity, index) => {
      this.validateSingleEntity(entity, `${tipo}[${index}]`, validation)
    })

    // Validar número típico de entidades
    if (tipo === 'otorgantes' && entities.length > 5) {
      validation.warnings.push(`Número inusualmente alto de otorgantes (${entities.length})`)
      validation.suggestions.push('Verificar que no se hayan incluido representantes como otorgantes separados')
    }
  }

  /**
   * Valida una entidad individual
   */
  validateSingleEntity(entity, context, validation) {
    if (!entity) {
      validation.issues.push(`${context}: Entidad faltante`)
      validation.score -= 0.2
      return
    }

    // Convertir string a objeto si es necesario
    if (typeof entity === 'string') {
      entity = { nombre: entity, tipo_persona: this.guessTipoPersona(entity) }
    }

    if (typeof entity !== 'object') {
      validation.issues.push(`${context}: Entidad inválida (${typeof entity})`)
      validation.score -= 0.2
      return
    }

    // Validar nombre
    this.validateEntityName(entity.nombre, context, validation)
    
    // Validar tipo de persona
    this.validateTipoPersona(entity.tipo_persona, entity.nombre, context, validation)
    
    // Validar representantes si existen
    if (entity.representantes && entity.representantes.length > 0) {
      this.validateRepresentantes(entity.representantes, context, validation)
    }
  }

  /**
   * Valida el nombre de una entidad
   */
  validateEntityName(nombre, context, validation) {
    if (!nombre || typeof nombre !== 'string') {
      validation.issues.push(`${context}: Nombre faltante`)
      validation.score -= 0.3
      return
    }

    const nombreTrim = nombre.trim()
    
    // Verificar longitud mínima
    if (nombreTrim.length < 3) {
      validation.issues.push(`${context}: Nombre demasiado corto ("${nombreTrim}")`)
      validation.score -= 0.2
      validation.suggestions.push('Nombre parece incompleto, verificar extracción')
      return
    }

    // Verificar que no sean solo números o caracteres especiales
    if (/^[\d\s\-\.]+$/.test(nombreTrim)) {
      validation.issues.push(`${context}: Nombre contiene solo números/símbolos`)
      validation.score -= 0.3
      validation.suggestions.push('Posible error en extracción, revisar tabla original')
      return
    }

    // Detectar nombres posiblemente incompletos
    const palabras = nombreTrim.split(/\s+/).filter(Boolean)
    
    if (palabras.length === 1 && !this.isLikelyCompanyName(nombreTrim)) {
      validation.warnings.push(`${context}: Nombre con una sola palabra ("${nombreTrim}")`)
      validation.score -= 0.1
      validation.suggestions.push('Verificar si el nombre completo fue extraído correctamente')
    }

    // Detectar texto basura común
    const textBasura = ['PERSONA', 'NATURAL', 'JURIDICA', 'JURÍDICA', 'TIPO', 'INTERVINIENTE', 'DOCUMENTO', 'NACIONALIDAD']
    if (textBasura.some(basura => nombreTrim.toUpperCase().includes(basura))) {
      validation.warnings.push(`${context}: Nombre contiene texto de tabla ("${nombreTrim}")`)
      validation.score -= 0.15
      validation.autoFixes[`${context}_nombre`] = this.cleanEntityName(nombreTrim)
    }

    // Verificar capitalización apropiada
    if (nombreTrim === nombreTrim.toUpperCase() && nombreTrim.length > 10) {
      validation.autoFixes[`${context}_nombre_capitalized`] = this.properCapitalize(nombreTrim)
    }
  }

  /**
   * Valida el tipo de persona asignado
   */
  validateTipoPersona(tipoPersona, nombre, context, validation) {
    if (!tipoPersona) {
      validation.warnings.push(`${context}: Tipo de persona no especificado`)
      validation.score -= 0.05
      return
    }

    if (!['Natural', 'Jurídica'].includes(tipoPersona)) {
      validation.issues.push(`${context}: Tipo de persona inválido ("${tipoPersona}")`)
      validation.score -= 0.1
      validation.suggestions.push('Tipo de persona debe ser "Natural" o "Jurídica"')
      return
    }

    // Verificar consistencia entre nombre y tipo
    if (nombre) {
      const shouldBeJuridica = this.isLikelyCompanyName(nombre)
      const isJuridica = tipoPersona === 'Jurídica'
      
      if (shouldBeJuridica && !isJuridica) {
        validation.warnings.push(`${context}: "${nombre}" parece ser jurídica pero está marcada como Natural`)
        validation.score -= 0.1
        validation.autoFixes[`${context}_tipo_persona`] = 'Jurídica'
        validation.suggestions.push('Revisar clasificación de tipo de persona')
      } else if (!shouldBeJuridica && isJuridica) {
        validation.warnings.push(`${context}: "${nombre}" parece ser natural pero está marcada como Jurídica`)
        validation.score -= 0.1
        validation.autoFixes[`${context}_tipo_persona`] = 'Natural'
        validation.suggestions.push('Revisar clasificación de tipo de persona')
      }
    }
  }

  /**
   * Valida representantes de una entidad jurídica
   */
  validateRepresentantes(representantes, context, validation) {
    if (!Array.isArray(representantes)) {
      validation.warnings.push(`${context}: Lista de representantes inválida`)
      validation.score -= 0.05
      return
    }

    representantes.forEach((rep, index) => {
      if (typeof rep === 'string') {
        this.validateEntityName(rep, `${context}.representante[${index}]`, validation)
      } else if (rep && rep.nombre) {
        this.validateEntityName(rep.nombre, `${context}.representante[${index}]`, validation)
      } else {
        validation.warnings.push(`${context}.representante[${index}]: Representante inválido`)
        validation.score -= 0.05
      }
    })
  }

  /**
   * Valida consistencia entre diferentes partes del acto
   */
  validateConsistency(actData, validation) {
    const { tipoActo, otorgantes, beneficiarios } = actData
    
    // Para poderes, debe haber al menos un otorgante y un beneficiario
    if (tipoActo && tipoActo.toUpperCase().includes('PODER')) {
      if (!otorgantes || otorgantes.length === 0) {
        validation.issues.push('Poder sin otorgantes detectados')
        validation.score -= 0.3
      }
      if (!beneficiarios || beneficiarios.length === 0) {
        validation.warnings.push('Poder sin beneficiarios explícitos')
        validation.score -= 0.1
        validation.suggestions.push('En poderes generales, el beneficiario puede ser implícito')
      }
    }

    // Verificar duplicados entre otorgantes y beneficiarios
    if (otorgantes && beneficiarios) {
      const nombresOtorgantes = otorgantes.map(o => o.nombre?.toUpperCase().trim()).filter(Boolean)
      const nombresBeneficiarios = beneficiarios.map(b => b.nombre?.toUpperCase().trim()).filter(Boolean)
      
      const duplicados = nombresOtorgantes.filter(nombre => nombresBeneficiarios.includes(nombre))
      if (duplicados.length > 0) {
        validation.warnings.push(`Personas aparecen como otorgantes y beneficiarios: ${duplicados.join(', ')}`)
        validation.score -= 0.05
        validation.suggestions.push('Verificar si es correcto que la misma persona sea otorgante y beneficiario')
      }
    }
  }

  /**
   * Calcula score final y nivel de confianza
   */
  calculateFinalScore(validation) {
    // Asegurar que el score esté entre 0 y 1
    validation.score = Math.max(0, Math.min(1, validation.score))
    
    // Determinar nivel de confianza
    if (validation.score >= 0.9) {
      validation.confidence = 'high'
    } else if (validation.score >= 0.7) {
      validation.confidence = 'medium'
    } else if (validation.score >= 0.5) {
      validation.confidence = 'low'
    } else {
      validation.confidence = 'very_low'
    }
  }

  /**
   * Genera resumen legible de la validación
   */
  generateSummary(validation) {
    const score = Math.round(validation.score * 100)
    const totalProblemas = validation.issues.length + validation.warnings.length
    
    if (validation.confidence === 'high') {
      validation.summary = `Excelente calidad (${score}%). Datos extraídos correctamente.`
    } else if (validation.confidence === 'medium') {
      validation.summary = `Buena calidad (${score}%). ${totalProblemas} problema(s) menor(es) detectado(s).`
    } else if (validation.confidence === 'low') {
      validation.summary = `Calidad aceptable (${score}%). Revisar ${totalProblemas} problema(s) antes de usar.`
    } else {
      validation.summary = `Calidad baja (${score}%). Requiere revisión manual detallada.`
    }
  }

  /**
   * Utilidades de limpieza y validación
   */
  
  cleanActType(tipo) {
    return tipo
      .replace(/\b(FECHA|PROVINCIA|CANTON|PARROQUIA|UBICACI[ÓO]N)\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  cleanEntityName(nombre) {
    return nombre
      .replace(/\b(PERSONA|NATURAL|JUR[IÍ]DICA|TIPO|INTERVINIENTE|DOCUMENTO|NACIONALIDAD)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  properCapitalize(texto) {
    return texto.toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ')
  }

  isLikelyCompanyName(nombre) {
    const companyIndicators = [
      'FUNDACI[ÓO]N', 'ASOCIACI[ÓO]N', 'CORPORACI[ÓO]N', 'EMPRESA', 'COMPA[ÑN][IÍ]A',
      'S\\.?A\\.?', 'LTDA\\.?', 'CIA\\.?', 'COOPERATIVA', 'UNIVERSIDAD', 'MUNICIPIO',
      'GAD', '\\bEP\\b', 'FIDEICOMISO', 'BANCO', 'CONSTRUCTORA'
    ]
    
    const pattern = new RegExp(`\\b(${companyIndicators.join('|')})\\b`, 'i')
    return pattern.test(nombre)
  }

  /**
   * Valida múltiples actos de una vez
   */
  validateMultipleActs(acts) {
    if (!Array.isArray(acts) || acts.length === 0) {
      return {
        overallScore: 0,
        overallConfidence: 'none',
        validations: [],
        summary: 'No hay actos para validar'
      }
    }

    const validations = acts.map((act, index) => ({
      actIndex: index,
      ...this.validateActData(act)
    }))

    const overallScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length
    const overallConfidence = overallScore >= 0.8 ? 'high' : overallScore >= 0.6 ? 'medium' : 'low'

    return {
      overallScore,
      overallConfidence,
      validations,
      summary: `${validations.length} acto(s) validado(s). Calidad promedio: ${Math.round(overallScore * 100)}%`
    }
  }

  /**
   * Log condicional para debugging
   */
  log(...args) {
    if (this.debug) {
      console.log('[DataQualityValidator]', ...args)
    }
  }
}

export default DataQualityValidator
