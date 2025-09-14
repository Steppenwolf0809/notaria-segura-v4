import { GoogleGenerativeAI } from '@google/generative-ai'

// Template de prompt optimizado para extractos notariales ecuatorianos
const PROMPT_TEMPLATE = `Eres un experto en documentos notariales ecuatorianos.

TAREA: Extraer información estructurada del extracto notarial.

FORMATO DE SALIDA REQUERIDO (SOLO JSON, SIN TEXTO EXTRA):
{
  "acto_o_contrato": "PODER GENERAL",
  "otorgantes": [
    {
      "nombre": "APELLIDOS NOMBRES COMPLETOS",
      "genero": "M",
      "calidad": "MANDANTE"
    }
  ],
  "beneficiarios": [
    {
      "nombre": "APELLIDOS NOMBRES COMPLETOS", 
      "genero": "F",
      "calidad": "MANDATARIO"
    }
  ],
  "notario": "NOMBRES APELLIDOS DEL NOTARIO"
}

REGLAS ESPECÍFICAS:
- Mantén nombres EXACTOS como aparecen en el documento
- Infiere género por nombres ecuatorianos típicos (MARÍA=F, CARLOS=M)
- Para calidades usa términos del documento: MANDANTE, MANDATARIO, VENDEDOR, COMPRADOR, etc.
- Si no encuentras información específica, usa null
- NO inventes datos que no estén en el texto
- Responde ÚNICAMENTE el JSON, sin explicaciones

EXTRACTO A PROCESAR:
{texto_del_pdf}`

const enabled = () => String(process.env.GEMINI_ENABLED || '').toLowerCase() === 'true'

let genAIInstance = null
function getClient() {
  const key = process.env.GOOGLE_API_KEY
  if (!key) return null
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(key)
  }
  return genAIInstance
}

function safeParseJsonFromText(text) {
  try {
    if (!text) return null
    const match = String(text).match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch (_) {
    return null
  }
}

export async function extractDataWithGemini(pdfText) {
  if (!enabled()) return null
  const client = getClient()
  if (!client) return null

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT || '10000', 10)
    const debugExtraction = String(process.env.DEBUG_EXTRACTION_METHOD || '').toLowerCase() === 'true'
    const model = client.getGenerativeModel({ model: modelName })

    const prompt = `${PROMPT_TEMPLATE}\n\n${pdfText}`
    const exec = async () => {
      const t0 = Date.now()
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      const elapsed = Date.now() - t0
      if (debugExtraction) {
        console.log(`⏱️  GEMINI tiempo total: ${elapsed}ms (modelo=${modelName}, timeout=${timeoutMs}ms)`) 
      }
      return text
    }

    const text = await Promise.race([
      exec(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT_EXCEEDED')), timeoutMs))
    ])

    const parsed = safeParseJsonFromText(text)
    if (parsed && typeof parsed === 'object') {
      if (debugExtraction) {
        console.log('🔎 GEMINI parse OK:', {
          acto: parsed.acto_o_contrato || null,
          otorgantes: Array.isArray(parsed.otorgantes) ? parsed.otorgantes.length : 0,
          beneficiarios: Array.isArray(parsed.beneficiarios) ? parsed.beneficiarios.length : 0
        })
      }
      return parsed
    }
    return null
  } catch (error) {
    console.error('Error en extracción Gemini:', error?.message || error)
    return null
  }
}

export default { extractDataWithGemini }

// Prueba de conectividad simple con Gemini
export async function testGeminiConnection() {
  try {
    const keyPresent = Boolean(process.env.GOOGLE_API_KEY)
    console.log('API Key configurada:', keyPresent)
    if (!keyPresent) return false

    const client = getClient()
    if (!client) return false
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' })
    const result = await model.generateContent('Responde solo: "OK"')
    const response = await result.response
    const text = response.text()
    console.log('Prueba Gemini respuesta:', text)
    return typeof text === 'string' && text.toUpperCase().includes('OK')
  } catch (error) {
    console.error('Prueba Gemini falló:', error?.message || error)
    return false
  }
}


