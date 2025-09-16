import { GoogleGenerativeAI } from '@google/generative-ai'
import { generarConcuerdos } from './concuerdo-service.js'
import { getConfig } from '../config/environment.js'
import { logConcuerdoAudit } from './audit-service.js'
import crypto from 'crypto'

// Template de prompt optimizado para nombres separados (Ecuador)
const PROMPT_TEMPLATE = `Eres un experto en documentos notariales ecuatorianos.

TAREA: Extraer información del extracto notarial y devolver JSON con formato específico para nombres.

FORMATO EXACTO REQUERIDO (SOLO JSON):
{
  "acto_o_contrato": "PODER ESPECIAL",
  "otorgantes": [
    {
      "apellidos": "APELLIDO1 APELLIDO2",
      "nombres": "NOMBRE1 NOMBRE2", 
      "genero": "M",
      "calidad": "MANDANTE",
      "tipo_persona": "Natural"
    }
  ],
  "beneficiarios": [
    {
      "apellidos": "APELLIDO1 APELLIDO2",
      "nombres": "NOMBRE1 NOMBRE2",
      "genero": "F", 
      "calidad": "MANDATARIO",
      "tipo_persona": "Natural"
    }
  ],
  "notario": "NOMBRES APELLIDOS NOTARIO",
  "notaria": "NOTARÍA COMPLETA"
}

REGLAS NOMBRES ECUATORIANOS:
- Formato típico: APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2
- Ejemplo: "BELLO GONZALEZ VICTOR HUGO" → apellidos: "BELLO GONZALEZ", nombres: "VICTOR HUGO"
- Si dudas en la separación, coloca todo en "apellidos" y deja "nombres" como ""
- Infiere género por nombres típicos (ej: VICTOR=M, MARIA=F). Si no hay certeza, usa null
- Mantén mayúsculas como aparecen en el documento

REGLAS GENERALES:
- Responde SOLO el JSON, sin texto extra
- Si no encuentras algo, usa null
- NO inventes datos que no estén en el texto

EXTRACTO A PROCESAR:
{texto_del_pdf}`

const enabled = () => String(process.env.GEMINI_ENABLED || '').toLowerCase() === 'true'

// Configuraciones de timeout y retry
const CONFIG = {
  maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
  baseDelay: parseInt(process.env.GEMINI_RETRY_DELAY || '1000'), // ms
  maxDelay: parseInt(process.env.GEMINI_MAX_RETRY_DELAY || '10000'), // ms
  timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000'), // ms
  circuitBreakerThreshold: parseInt(process.env.GEMINI_CIRCUIT_THRESHOLD || '5'),
  circuitBreakerTimeout: parseInt(process.env.GEMINI_CIRCUIT_TIMEOUT || '60000') // ms
};

// Estado del circuit breaker
let circuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
};

/**
 * Implementa backoff exponencial con jitter
 * @param {number} attempt - Número de intento (0-based)
 * @returns {number} - Delay en ms
 */
function calculateBackoffDelay(attempt) {
  const exponentialDelay = CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // ±10% jitter
  return Math.min(exponentialDelay + jitter, CONFIG.maxDelay);
}

/**
 * Verifica estado del circuit breaker
 * @returns {boolean} - true si puede proceder
 */
function checkCircuitBreaker() {
  const now = Date.now();

  if (circuitBreakerState.state === 'OPEN') {
    if (now - circuitBreakerState.lastFailure > CONFIG.circuitBreakerTimeout) {
      circuitBreakerState.state = 'HALF_OPEN';
      console.log('🔄 Circuit breaker: HALF_OPEN (probando conexión)');
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Registra fallo en circuit breaker
 */
function recordFailure() {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailure = Date.now();

  if (circuitBreakerState.failures >= CONFIG.circuitBreakerThreshold) {
    circuitBreakerState.state = 'OPEN';
    console.log('🚫 Circuit breaker: OPEN (demasiados fallos)');
  }
}

/**
 * Registra éxito en circuit breaker
 */
function recordSuccess() {
  if (circuitBreakerState.state === 'HALF_OPEN') {
    circuitBreakerState.state = 'CLOSED';
    circuitBreakerState.failures = 0;
    console.log('✅ Circuit breaker: CLOSED (conexión recuperada)');
  } else if (circuitBreakerState.state === 'CLOSED') {
    circuitBreakerState.failures = Math.max(0, circuitBreakerState.failures - 1);
  }
}

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

  // Verificar circuit breaker
  if (!checkCircuitBreaker()) {
    console.log('🚫 Circuit breaker OPEN: saltando extracción Gemini')
    return null
  }

  const debugExtraction = String(process.env.DEBUG_EXTRACTION_METHOD || '').toLowerCase() === 'true'
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      if (debugExtraction) {
        console.log(`🔮 INTENTO ${attempt + 1}/${CONFIG.maxRetries + 1} - EXTRACCIÓN GEMINI...`)
      }

      const model = client.getGenerativeModel({ model: modelName })
      const prompt = `${PROMPT_TEMPLATE}\n\n${pdfText}`

      const exec = async () => {
        const t0 = Date.now()
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        const elapsed = Date.now() - t0

        if (debugExtraction) {
          console.log(`⏱️  GEMINI tiempo total: ${elapsed}ms (modelo=${modelName}, attempt=${attempt + 1})`)
        }

        return text
      }

      const text = await Promise.race([
        exec(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT_EXCEEDED')), CONFIG.timeout))
      ])

      const parsed = safeParseJsonFromText(text)
      if (parsed && typeof parsed === 'object') {
        // Éxito: reset circuit breaker
        recordSuccess();

        if (debugExtraction) {
          console.log('🔎 GEMINI parse OK:', {
            acto: parsed.acto_o_contrato || null,
            otorgantes: Array.isArray(parsed.otorgantes) ? parsed.otorgantes.length : 0,
            beneficiarios: Array.isArray(parsed.beneficiarios) ? parsed.beneficiarios.length : 0
          })
          try {
            const nombresExtract = {
              otorgantes: (parsed.otorgantes || []).map(o => `${o?.apellidos || ''} ${o?.nombres || ''}`.trim()),
              beneficiarios: (parsed.beneficiarios || []).map(b => `${b?.apellidos || ''} ${b?.nombres || ''}`.trim())
            }
            console.log('👥 NOMBRES EXTRAÍDOS:', nombresExtract)
          } catch {}
        }
        return parsed
      }

      // Si no es el último intento, esperar antes del retry
      if (attempt < CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt)
        if (debugExtraction) {
          console.log(`⏳ Esperando ${Math.round(delay)}ms antes del siguiente intento...`)
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error) {
      console.error(`❌ Error en intento ${attempt + 1}:`, error?.message || error)

      // Registrar fallo para circuit breaker
      recordFailure();

      // Si no es el último intento, esperar antes del retry
      if (attempt < CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt)
        console.log(`⏳ Reintentando en ${Math.round(delay)}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error('❌ Todos los intentos de extracción Gemini fallaron')
  return null
}

/**
 * Procesa texto completo del documento y genera concuerdos.
 * Integra extracción de datos + generación de concuerdos.
 *
 * @param {string} pdfText - Texto completo del documento
 * @param {Object} options - Opciones adicionales
 * @param {number} options.userId - ID del usuario que procesa
 * @param {string} options.docId - ID del documento fuente
 * @returns {Object} - Resultado con datos extraídos y concuerdos generados
 */
export async function processDocumentWithConcuerdos(pdfText, options = {}) {
  try {
    // 1) Extraer datos usando Gemini
    const extractedData = await extractDataWithGemini(pdfText);
    if (!extractedData) {
      return { success: false, error: 'No se pudieron extraer datos del documento' };
    }

    // 2) Preparar datos para concuerdos
    const dataForConcuerdos = {
      actos: [{
        tipo: extractedData.acto_o_contrato || 'ACTO GENERICO'
      }],
      notario: extractedData.notario || '',
      notaria: extractedData.notaria || '',
      otorgantes: extractedData.otorgantes || [],
      beneficiarios: extractedData.beneficiarios || [],
      source: pdfText // Para detección de estructura
    };

    // 3) Obtener configuración del sistema
    const config = getConfig();
    const settings = {
      PROMPT_FORCE_TEMPLATE: config.concuerdos?.promptForceTemplate || 'auto',
      TEMPLATE_MODE: config.concuerdos?.templateMode || 'structural'
    };

    // 4) Generar concuerdos
    const concuerdosResult = await generarConcuerdos({
      data: dataForConcuerdos,
      settings,
      userId: options.userId,
      docId: options.docId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // 5) Registrar auditoría en base de datos
    const auditData = {
      docId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      estructura: concuerdosResult.estructura,
      templateMode: settings.TEMPLATE_MODE,
      force: settings.PROMPT_FORCE_TEMPLATE,
      primera: concuerdosResult.primera,
      segunda: concuerdosResult.segunda,
      createdAt: new Date().toISOString()
    };

    // Registrar auditoría (con PII masking automático)
    await logConcuerdoAudit(auditData);

    // 6) Retornar resultado completo
    return {
      success: true,
      extraction: extractedData,
      concuerdos: concuerdosResult,
      audit: auditData,
      metadata: {
        processedAt: new Date().toISOString(),
        templateMode: settings.TEMPLATE_MODE,
        forceTemplate: settings.PROMPT_FORCE_TEMPLATE
      }
    };

  } catch (error) {
    console.error('Error procesando documento con concuerdos:', error);
    return {
      success: false,
      error: error.message || 'Error interno del servidor'
    };
  }
}

export default { extractDataWithGemini, processDocumentWithConcuerdos }

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


