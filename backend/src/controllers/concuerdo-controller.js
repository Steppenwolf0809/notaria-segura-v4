import PdfExtractorService from '../services/pdf-extractor-service.js'
import { ExtractoTemplateEngine } from '../services/extractos/index.js'

/**
 * Controlador de Generador de Concuerdos (Sprint 1)
 * - Upload de PDF y extracción simple de texto
 * - Parsing básico por regex para un solo acto
 * - Vista previa de texto formateado (opcional)
 */

/**
 * POST /api/concuerdos/upload-pdf
 * Recibe PDF (multipart) y devuelve texto extraído
 */
async function uploadPdf(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Archivo PDF requerido' })
    }

    const { mimetype, buffer, size, originalname } = req.file
    console.log('📄 uploadPdf recibido:', { name: originalname, size, mimetype })
    if (mimetype !== 'application/pdf' && !originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Formato inválido. Solo se permiten archivos PDF' })
    }

    // Límite adicional de seguridad (10MB) – multer ya valida pero reforzamos
    const MAX_SIZE = 10 * 1024 * 1024
    if (size > MAX_SIZE) {
      return res.status(400).json({ success: false, message: 'El archivo PDF es demasiado grande (máximo 10MB)' })
    }

    const text = await PdfExtractorService.extractText(buffer)
    if (!text || text.length < 5) {
      return res.status(400).json({ success: false, message: 'No se pudo extraer texto legible del PDF. Verifique que no sea una imagen escaneada.' })
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({
      success: true,
      message: 'Texto extraído correctamente',
      data: { text }
    })
  } catch (error) {
    console.error('Error en uploadPdf:', error?.message || error)
    if (error?.cause) console.error('Causa:', error.cause?.message || error.cause)
    return res.status(500).json({ 
      success: false, 
      message: 'Error procesando PDF',
      details: process.env.NODE_ENV !== 'production' ? (error?.cause?.message || error?.message) : undefined
    })
  }
}

/**
 * POST /api/concuerdos/extract-data
 * Recibe texto y devuelve datos estructurados básicos
 */
async function extractData(req, res) {
  try {
    const { text } = req.body || {}
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Texto del PDF inválido o vacío' })
    }

    const { acts } = PdfExtractorService.parseAdvancedData(text)
    const parsed = acts[0] || { tipoActo: '', otorgantes: [], beneficiarios: [] }
    const { notarioNombre, notariaNumero, notariaNumeroDigit, notarioSuplente } = PdfExtractorService.extractNotaryInfo(text)

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({
      success: true,
      message: 'Datos extraídos correctamente',
      data: { ...parsed, acts, notario: notarioNombre, notarioSuplente, notariaNumero, notariaNumeroDigit }
    })
  } catch (error) {
    console.error('Error en extractData:', error)
    return res.status(500).json({ success: false, message: 'Error extrayendo datos' })
  }
}

/**
 * POST /api/concuerdos/preview
 * Genera un texto de vista previa del concuerdo
 */
async function previewConcuerdo(req, res) {
  try {
    console.log('[concuerdos] POST /preview body:', {
      keys: Object.keys(req.body || {}),
      numeroCopias: req.body?.numeroCopias,
      actsLen: Array.isArray(req.body?.acts) ? req.body.acts.length : 0
    })
    const { tipoActo, otorgantes, beneficiarios, acts, notario, notariaNumero, notarioSuplente, numeroCopias = 2 } = req.body || {}

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    // Normaliza posibles bloques sucios (con encabezados de tabla) → lista de nombres
    const extractFromBlock = (block) => {
      const s = String(block || '')
      const m1 = s.match(/NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ0-9\s\.,\-\&]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD)|$)/i)
      if (m1 && m1[1]) return [m1[1].replace(/\s+/g, ' ').trim()]
      const m2 = s.match(/NOMBRES\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD)|$)/i)
      if (m2 && m2[1]) return [m2[1].replace(/\s+/g, ' ').trim()]
      return null
    }
    const expandComparecientes = (raw) => {
      const arr = safeArray(raw)
      if (arr.length === 0) return []
      // Si llega un único bloque largo con encabezados conocidos, limpiarlo
      const joined = arr.join(' ')
      const hasHeaders = /RAZ[ÓO]N\s+SOCIAL|NOMBRES\s*\/|TIPO\s+INTERVINIENTE|NACIONALIDAD|CALIDAD/i.test(joined)
      if (arr.length === 1 && (arr[0].length > 40 || hasHeaders)) {
        const direct = extractFromBlock(arr[0])
        if (direct && direct.length) return direct.map(n => ({ nombre: n }))
        const names = PdfExtractorService.cleanPersonNames(arr[0])
        return names.map(n => ({ nombre: n }))
      }
      return arr.map(n => ({ nombre: n }))
    }

    const guessTipoPersona = (name) => {
      const s = String(name || '').toUpperCase()
      const keys = [' CIA', 'CIA.', ' LTDA', ' S.A', ' S.A.', ' BANCO', ' FIDEICOMISO', ' CONSTRUCTORA', ' CORPORACION', ' COMPAÑIA', ' COMPAÑÍA', ' GRUPO']
      return keys.some(k => s.includes(k)) ? 'Jurídica' : 'Natural'
    }
    const normalizeCompareciente = (c) => {
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const nombre = String(c.nombre || c.fullname || c.text || '').trim()
        const tipo_persona = c.tipo_persona || c.tipoPersona || c.tipo || guessTipoPersona(nombre)
        const representante = c.representante || c.apoderado || undefined
        return { ...c, nombre, tipo_persona, representante }
      }
      const nombre = String(c || '').trim()
      return { nombre, tipo_persona: guessTipoPersona(nombre) }
    }

    const actsData = Array.isArray(acts) && acts.length > 0
      ? acts
      : [{ tipoActo: tipoActo, otorgantes, beneficiarios }]

    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const ots = safeArray(a?.otorgantes)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const engineActs = actsData.map((a) => ({
      tipo: PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo),
      otorgantes: expandComparecientes(a?.otorgantes).map(normalizeCompareciente),
      beneficiarios: expandComparecientes(a?.beneficiarios).map(normalizeCompareciente)
    }))

    const engineDataBase = {
      notario,
      notarioNombre: notario,
      notarioSuplente: Boolean(notarioSuplente),
      notaria: notariaNumero || req.body?.notaria,
      notariaNumero: notariaNumero || req.body?.notaria,
      actos: []
    }

    // Si el frontend proporciona representantes (string o array), asociar al primer otorgante jurídico
    const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
    const actsPrepared = engineActs.map((act) => {
      const copy = JSON.parse(JSON.stringify(act))
      if (repsRaw) {
        const reps = Array.isArray(repsRaw) ? repsRaw : String(repsRaw).split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
        const ots = copy.otorgantes
        const findJuridicaIdx = ots.findIndex(o => /JUR[IÍ]DICA/i.test(o?.tipo_persona || ''))
        const idx = findJuridicaIdx !== -1 ? findJuridicaIdx : 0
        if (ots[idx]) ots[idx].representantes = reps
      }
      return copy
    })

    // Preparar vista previa combinando todos los actos en cada copia
    const firstAct = actsPrepared[0]
    const engineInfo = { template: 'poder-universal', acto: firstAct?.tipo, actosCount: actsPrepared.length }

    const copies = Math.max(1, Math.min(10, parseInt(numeroCopias || 2)))
    const ordinalWord = (n) => {
      const map = {
        1: 'PRIMERA', 2: 'SEGUNDA', 3: 'TERCERA', 4: 'CUARTA', 5: 'QUINTA',
        6: 'SEXTA', 7: 'SÉPTIMA', 8: 'OCTAVA', 9: 'NOVENA', 10: 'DÉCIMA',
        11: 'UNDÉCIMA', 12: 'DUODÉCIMA',
        13: 'DÉCIMA TERCERA', 14: 'DÉCIMA CUARTA', 15: 'DÉCIMA QUINTA', 16: 'DÉCIMA SEXTA',
        17: 'DÉCIMA SÉPTIMA', 18: 'DÉCIMA OCTAVA', 19: 'DÉCIMA NOVENA',
        20: 'VIGÉSIMA',
        21: 'VIGÉSIMA PRIMERA', 22: 'VIGÉSIMA SEGUNDA', 23: 'VIGÉSIMA TERCERA', 24: 'VIGÉSIMA CUARTA', 25: 'VIGÉSIMA QUINTA',
        26: 'VIGÉSIMA SEXTA', 27: 'VIGÉSIMA SÉPTIMA', 28: 'VIGÉSIMA OCTAVA', 29: 'VIGÉSIMA NOVENA',
        30: 'TRIGÉSIMA'
      }
      return map[n] || String(n)
    }
    const rotulo = (n) => `${ordinalWord(n)} COPIA`
    const previews = []
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rot = rotulo(n)
      const override = { NUMERO_COPIA: ordinalWord(n) }
      // Si hay múltiples actos y se solicita combinación, construir un solo párrafo con un encabezado
      if (Array.isArray(actsPrepared) && actsPrepared.length > 1 && req.body?.combine) {
        const phrases = []
        let footerNotario = ''
        let footerNotaria = ''
        for (const act of actsPrepared) {
          const engineData = { ...engineDataBase, actos: [act] }
          const { variables } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, override)
          const v = variables || {}
          footerNotario = v.NOMBRE_NOTARIO || footerNotario
          footerNotaria = v.NOTARIA || footerNotaria
          const isRev = /REVOCATORIA/i.test(v.TIPO_ACTO || '')
          let phrase
          if (isRev) {
            const commaOrEmpty = (v.FRASE_REPRESENTACION || '').trim().length > 0 ? '' : ','
            phrase = `**${v.TIPO_ACTO || ''}** otorgado por ${v.TRATAMIENTO_OTORGANTES || ''} **${v.NOMBRES_OTORGANTES || ''}**${v.FRASE_REPRESENTACION || ''}${commaOrEmpty} ${v.CONTRACCION_A_FAVOR || ''} ${v.TRATAMIENTO_BENEFICIARIOS || ''} **${v.NOMBRES_BENEFICIARIOS || ''}**`
          } else {
            phrase = `**${v.TIPO_ACTO || ''}** que ${v.VERBO_OTORGAR || ''} ${v.TRATAMIENTO_OTORGANTES || ''} **${v.NOMBRES_OTORGANTES || ''}**${v.FRASE_REPRESENTACION || ''} ${v.CONTRACCION_A_FAVOR || ''} ${v.TRATAMIENTO_BENEFICIARIOS || ''} **${v.NOMBRES_BENEFICIARIOS || ''}**`
          }
          phrase = phrase
            .replace(/\s+/g, ' ')
            .replace(/\s+,/g, ',')
            .replace(/,\s*,/g, ', ')
            .trim()
          phrases.push(phrase)
        }
        const connector = phrases.slice(1).map(p => `y de ${p}`).join('; ')
        const body = phrases.length > 1 ? `${phrases[0]}; ${connector}` : phrases[0]
        const combined = `Se otorgó ante mí, en fe de ello confiero esta **${ordinalWord(n)} COPIA CERTIFICADA** de la escritura pública de ${body}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.\n\n${footerNotario}\n${footerNotaria}\n`
        previews.push({ index: n, title: rot, text: `${rot}:\n\n${combined}` })
      } else {
        // Modo clásico: render individual por acto y concatenado con separador
        const rendered = []
        for (const act of actsPrepared) {
          const engineData = { ...engineDataBase, actos: [act] }
          const { text: t } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, override)
          rendered.push(t)
        }
        const combined = rendered.join('\n\n—\n\n')
        previews.push({ index: n, title: rot, text: `${rot}:\n\n${combined}` })
      }
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { previews, engine: engineInfo } })
  } catch (error) {
    console.error('Error en previewConcuerdo:', error?.stack || error)
    return res.status(500).json({ success: false, message: 'Error generando vista previa', details: process.env.NODE_ENV !== 'production' ? (error?.stack || error?.message) : undefined })
  }
}

export { uploadPdf, extractData, previewConcuerdo }
/**
 * Generar múltiples documentos (copias) numerados
 * POST /api/concuerdos/generate-documents
 * body: { tipoActo, otorgantes, beneficiarios, numCopias, notario?, format? }
 */
async function generateDocuments(req, res) {
  try {
    console.log('🔍 [concuerdos] POST /generate-documents - INICIO')
    console.log('📋 [concuerdos] req.body completo:', JSON.stringify(req.body, null, 2))
    console.log('[concuerdos] POST /generate-documents body keys:', {
      keys: Object.keys(req.body || {}),
      numCopias: req.body?.numCopias,
      combine: req.body?.combine,
      actsLen: Array.isArray(req.body?.acts) ? req.body.acts.length : 0
    })
    const { tipoActo, otorgantes, beneficiarios, acts, notario, notariaNumero, notarioSuplente, numCopias = 2 } = req.body || {}
    console.log('🎯 [concuerdos] Variables extraídas del body:', {
      tipoActo,
      otorgantes: Array.isArray(otorgantes) ? `Array[${otorgantes.length}]` : typeof otorgantes,
      beneficiarios: Array.isArray(beneficiarios) ? `Array[${beneficiarios.length}]` : typeof beneficiarios,
      acts: Array.isArray(acts) ? `Array[${acts.length}]` : typeof acts,
      notario,
      notariaNumero,
      notarioSuplente,
      numCopias
    })

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    const extractFromBlock = (block) => {
      const s = String(block || '')
      const m1 = s.match(/NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ0-9\s\.,\-\&]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD)|$)/i)
      if (m1 && m1[1]) return [m1[1].replace(/\s+/g, ' ').trim()]
      const m2 = s.match(/NOMBRES\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD)|$)/i)
      if (m2 && m2[1]) return [m2[1].replace(/\s+/g, ' ').trim()]
      return null
    }
    const expandComparecientes = (raw) => {
      const arr = safeArray(raw)
      if (arr.length === 0) return []
      const joined = arr.join(' ')
      const hasHeaders = /RAZ[ÓO]N\s+SOCIAL|NOMBRES\s*\/|TIPO\s+INTERVINIENTE|NACIONALIDAD|CALIDAD/i.test(joined)
      if (arr.length === 1 && (arr[0].length > 40 || hasHeaders)) {
        const direct = extractFromBlock(arr[0])
        if (direct && direct.length) return direct.map(n => ({ nombre: n }))
        const names = PdfExtractorService.cleanPersonNames(arr[0])
        return names.map(n => ({ nombre: n }))
      }
      return arr.map(n => ({ nombre: n }))
    }

    const guessTipoPersona = (name) => {
      const s = String(name || '').toUpperCase()
      const keys = [' CIA', 'CIA.', ' LTDA', ' S.A', ' S.A.', ' BANCO', ' FIDEICOMISO', ' CONSTRUCTORA', ' CORPORACION', ' COMPAÑIA', ' COMPAÑÍA', ' GRUPO']
      return keys.some(k => s.includes(k)) ? 'Jurídica' : 'Natural'
    }
    const normalizeCompareciente = (c) => {
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const nombre = String(c.nombre || c.fullname || c.text || '').trim()
        const tipo_persona = c.tipo_persona || c.tipoPersona || c.tipo || guessTipoPersona(nombre)
        const representante = c.representante || c.apoderado || undefined
        return { ...c, nombre, tipo_persona, representante }
      }
      const nombre = String(c || '').trim()
      return { nombre, tipo_persona: guessTipoPersona(nombre) }
    }

    const actsData = Array.isArray(acts) && acts.length > 0
      ? acts
      : [{ tipoActo: tipoActo, otorgantes, beneficiarios }]

    console.log('📊 [concuerdos] Procesando actos:', actsData.length)
    actsData.forEach((act, index) => {
      console.log(`🎭 [concuerdos] Acto ${index + 1}:`, {
        tipoActo: act?.tipoActo || act?.tipo,
        otorgantes: Array.isArray(act?.otorgantes) ? `Array[${act.otorgantes.length}]` : typeof act?.otorgantes,
        beneficiarios: Array.isArray(act?.beneficiarios) ? `Array[${act.beneficiarios.length}]` : typeof act?.beneficiarios
      })
    })

    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const ots = safeArray(a?.otorgantes)
      console.log(`✅ [concuerdos] Validando acto: tipo="${tipo}", otorgantes=${ots.length}`)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      console.error('❌ [concuerdos] generate-documents: validación fallida', { actsData })
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios', details: { actsData } })
    }
    console.log('✅ [concuerdos] Validación de actos exitosa')

    const engineActs = actsData.map((a) => ({
      tipo: PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo),
      otorgantes: expandComparecientes(a?.otorgantes).map(normalizeCompareciente),
      beneficiarios: expandComparecientes(a?.beneficiarios).map(normalizeCompareciente)
    }))
    console.log('🔧 [concuerdos] engineActs procesados:', JSON.stringify(engineActs, null, 2))

    const engineDataBase = {
      notario,
      notarioNombre: notario,
      notarioSuplente: Boolean(notarioSuplente),
      notaria: notariaNumero || req.body?.notaria,
      notariaNumero: notariaNumero || req.body?.notaria,
      actos: []
    }
    console.log('🏗️ [concuerdos] engineDataBase calculado:', JSON.stringify(engineDataBase, null, 2))

    // Asociar representantes si vienen del frontend
    const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
    const actsPrepared = engineActs.map((act) => {
      const copy = JSON.parse(JSON.stringify(act))
      if (repsRaw) {
        const reps = Array.isArray(repsRaw) ? repsRaw : String(repsRaw).split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
        const ots = copy.otorgantes
        const findJuridicaIdx = ots.findIndex(o => /JUR[IÍ]DICA/i.test(o?.tipo_persona || ''))
        const idx = findJuridicaIdx !== -1 ? findJuridicaIdx : 0
        if (ots[idx]) ots[idx].representantes = reps
      }
      return copy
    })

    const copies = Math.max(1, Math.min(10, parseInt(numCopias || 2)))
    const documents = []
    const engineInfo = { template: 'poder-universal', acto: actsPrepared?.[0]?.tipo, actosCount: actsPrepared.length }
    const ordinalWord = (n) => {
      const map = {
        1: 'PRIMERA', 2: 'SEGUNDA', 3: 'TERCERA', 4: 'CUARTA', 5: 'QUINTA',
        6: 'SEXTA', 7: 'SÉPTIMA', 8: 'OCTAVA', 9: 'NOVENA', 10: 'DÉCIMA',
        11: 'UNDÉCIMA', 12: 'DUODÉCIMA',
        13: 'DÉCIMA TERCERA', 14: 'DÉCIMA CUARTA', 15: 'DÉCIMA QUINTA', 16: 'DÉCIMA SEXTA',
        17: 'DÉCIMA SÉPTIMA', 18: 'DÉCIMA OCTAVA', 19: 'DÉCIMA NOVENA',
        20: 'VIGÉSIMA',
        21: 'VIGÉSIMA PRIMERA', 22: 'VIGÉSIMA SEGUNDA', 23: 'VIGÉSIMA TERCERA', 24: 'VIGÉSIMA CUARTA', 25: 'VIGÉSIMA QUINTA',
        26: 'VIGÉSIMA SEXTA', 27: 'VIGÉSIMA SÉPTIMA', 28: 'VIGÉSIMA OCTAVA', 29: 'VIGÉSIMA NOVENA',
        30: 'TRIGÉSIMA'
      }
      return map[n] || String(n)
    }
    console.log(`📄 [concuerdos] Generando ${copies} copias de documentos`)
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rotuloPalabra = ordinalWord(n)
      console.log(`📝 [concuerdos] Procesando copia ${n}/${copies}: ${rotuloPalabra}`)
      let combined
      try {
        if (Array.isArray(actsPrepared) && actsPrepared.length > 1 && req.body?.combine) {
          console.log('🔀 [concuerdos] Modo combinado activado para múltiples actos')
          // Construir frases por acto sin encabezado repetido usando variables del engine
          const phrases = []
          let footerNotario = ''
          let footerNotaria = ''
          for (const act of actsPrepared) {
            const engineData = { ...engineDataBase, actos: [act] }
            console.log(`🎯 [concuerdos] Renderizando acto con ExtractoTemplateEngine:`, JSON.stringify(engineData, null, 2))
            const { variables } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, { NUMERO_COPIA: rotuloPalabra })
            console.log(`✅ [concuerdos] Variables generadas por engine:`, JSON.stringify(variables, null, 2))
            const v = variables || {}
            footerNotario = v.NOMBRE_NOTARIO || footerNotario
            footerNotaria = v.NOTARIA || footerNotaria
            const isRev = /REVOCATORIA/i.test(v.TIPO_ACTO || '')
            let phrase
            if (isRev) {
              phrase = `**${v.TIPO_ACTO || ''}** otorgado por ${v.TRATAMIENTO_OTORGANTES || ''} **${v.NOMBRES_OTORGANTES || ''}**${v.FRASE_REPRESENTACION || ''}, ${v.CONTRACCION_A_FAVOR || ''} ${v.TRATAMIENTO_BENEFICIARIOS || ''} **${v.NOMBRES_BENEFICIARIOS || ''}**`
            } else {
              phrase = `**${v.TIPO_ACTO || ''}** que ${v.VERBO_OTORGAR || ''} ${v.TRATAMIENTO_OTORGANTES || ''} **${v.NOMBRES_OTORGANTES || ''}**${v.FRASE_REPRESENTACION || ''} ${v.CONTRACCION_A_FAVOR || ''} ${v.TRATAMIENTO_BENEFICIARIOS || ''} **${v.NOMBRES_BENEFICIARIOS || ''}**`
            }
            phrase = phrase.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim()
            phrases.push(phrase)
          }
          const connector = phrases.slice(1).map(p => `y de ${p}`).join('; ')
          const body = phrases.length > 1 ? `${phrases[0]}; ${connector}` : phrases[0]
          combined = `Se otorgó ante mí, en fe de ello confiero esta **${rotuloPalabra} COPIA CERTIFICADA** de la escritura pública de ${body}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.\n\n${footerNotario}\n${footerNotaria}\n`
        } else {
          console.log('📋 [concuerdos] Modo clásico: render individual por acto')
          // Render clásico por acto y concatenado con separador
          const rendered = []
          for (const act of actsPrepared) {
            const engineData = { ...engineDataBase, actos: [act] }
            console.log(`🎯 [concuerdos] Renderizando acto individual:`, JSON.stringify(engineData, null, 2))
            const { text } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, { NUMERO_COPIA: rotuloPalabra })
            console.log(`✅ [concuerdos] Texto generado (primeros 200 chars):`, text?.substring(0, 200) + '...')
            rendered.push(text)
          }
          combined = rendered.join('\n\n—\n\n')
        }
        console.log(`✅ [concuerdos] Documento ${n} generado exitosamente (${combined?.length || 0} caracteres)`)
      } catch (templateError) {
        console.error(`❌ [concuerdos] Error al generar documento ${n}:`, templateError?.stack || templateError)
        throw templateError
      }
      const filename = `CONCUERDO_${rotuloPalabra}_COPIA.txt`
      const mimeType = 'text/plain; charset=utf-8'
      const contentBase64 = Buffer.from(combined, 'utf8').toString('base64')
      documents.push({ index: n, title: `${rotuloPalabra} COPIA`, filename, mimeType, contentBase64 })
    }

    console.log(`🎉 [concuerdos] ¡Generación completada exitosamente! ${documents.length} documentos creados`)
    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { documents, engine: engineInfo } })
  } catch (error) {
    console.error('💥 [concuerdos] Error generando documentos de concuerdo:', error?.stack || error)
    console.error('💥 [concuerdos] Error name:', error?.name)
    console.error('💥 [concuerdos] Error message:', error?.message)
    if (error?.cause) {
      console.error('💥 [concuerdos] Error cause:', error.cause)
    }
    return res.status(500).json({
      success: false,
      message: 'Error generando documentos',
      errorType: error?.name || 'Unknown',
      details: process.env.NODE_ENV !== 'production' ? (error?.stack || error?.message || String(error)) : undefined
    })
  }
}

export { generateDocuments }


