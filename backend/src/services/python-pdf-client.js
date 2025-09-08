import { getConfig } from '../config/environment.js'

// Cliente para comunicarse con el microservicio Python PDF Extractor
class PythonPdfClient {
  constructor() {
    const config = getConfig()
    this.baseUrl = config?.pdfExtractor?.baseUrl || 'http://localhost:8001'
    this.token = config?.pdfExtractor?.token || ''
    this.timeout = config?.pdfExtractor?.timeout || 30000
    console.log('🐍 PYTHON CLIENT - Configuración inicial:')
    console.log(`- baseUrl: ${this.baseUrl || '[NO CONFIGURADA]'}`)
    console.log(`- token: ${this.token ? '[CONFIGURADO]' : '[FALTANTE]'}`)
    console.log(`- timeout: ${this.timeout}ms`)
  }

  async extractFromPdf(pdfBuffer, filename = 'document.pdf', options = {}) {
    if (!pdfBuffer || !(pdfBuffer instanceof Buffer)) {
      throw new Error('pdfBuffer inválido: se requiere Buffer')
    }
    if (!this.baseUrl) {
      throw new Error('PDF_EXTRACTOR_BASE_URL no configurado')
    }
    if (!this.token) {
      const err = new Error('PDF_EXTRACTOR_TOKEN no configurado')
      err.code = 'CONFIG_TOKEN_MISSING'
      throw err
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.max(1000, options.timeout || this.timeout))
    try {
      console.log('🐍 PYTHON CLIENT - Iniciando extractFromPdf')
      const base = this.baseUrl.replace(/\/$/, '')
      const url = `${base}/extract`
      console.log(`- URL base: ${base}`)
      console.log(`- URL completa: ${url}`)
      console.log(`- Filename: ${filename}`)
      console.log(`- Buffer size: ${pdfBuffer.length} bytes`)
      console.log(`- Token configurado: ${this.token ? 'SÍ' : 'NO'}`)

      // Construir multipart/form-data manualmente para evitar dependencias extra
      console.log('📦 Preparando cuerpo multipart (form-data)...')
      const boundary = '----NSForm' + Math.random().toString(16).slice(2)
      const crlf = '\r\n'
      const parts = []

      const push = (chunk) => parts.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk)

      // Campo de archivo
      push(`--${boundary}${crlf}`)
      push(`Content-Disposition: form-data; name="file"; filename="${(filename || 'document.pdf').replace(/"/g, '')}"${crlf}`)
      push(`Content-Type: application/pdf${crlf}${crlf}`)
      push(pdfBuffer)
      push(crlf)

      // Opcionales
      if (options.debug != null) {
        push(`--${boundary}${crlf}`)
        push(`Content-Disposition: form-data; name="debug"${crlf}${crlf}`)
        push(String(options.debug ? 1 : 0))
        push(crlf)
      }

      // Cierre
      push(`--${boundary}--${crlf}`)
      const bodyBuffer = Buffer.concat(parts)
      console.log('📦 FormData (multipart) creado exitosamente')

      // Preparar headers
      const headers = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'User-Agent': 'Notaria-Backend/1.0'
      }

      console.log('📡 Preparando request HTTP...')
      console.log(`- Method: POST`)
      console.log(`- URL: ${url}`)
      console.log(`- Headers: ${JSON.stringify(headers, null, 2)}`)
      console.log(`- Timeout: ${Math.max(1000, options.timeout || this.timeout)}ms`)

      console.log('🚀 ENVIANDO REQUEST A MICROSERVICIO PYTHON...')
      const tStart = Date.now()
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyBuffer,
        signal: controller.signal
      })
      const duration = Date.now() - tStart
      console.log('📥 RESPUESTA RECIBIDA DEL MICROSERVICIO PYTHON:')
      console.log(`- Status: ${res.status} ${res.statusText}`)
      try {
        const hdrs = Object.fromEntries(res.headers?.entries ? res.headers.entries() : [])
        console.log(`- Headers: ${JSON.stringify(hdrs, null, 2)}`)
      } catch {}
      console.log(`- Tiempo: ${duration}ms`)
      console.log(`- OK: ${res.ok}`)

      if (!res.ok) {
        const isJson = res.headers.get('content-type')?.includes('application/json')
        const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
        const err = new Error(`Python extractor responded ${res.status}`)
        err.status = res.status
        err.response = body
        console.log(`❌ ERROR HTTP DEL MICROSERVICIO PYTHON:`)
        console.log(`- Error body: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
        throw err
      }

      console.log('✅ Respuesta exitosa, parseando JSON...')
      const data = await res.json()
      console.log('📊 DATOS DEL MICROSERVICIO PYTHON:')
      console.log(`- Success: ${data?.success}`)
      console.log(`- Actos detectados: ${Array.isArray(data?.actos) ? data.actos.length : 0}`)
      if (data && data.processing_time != null) {
        console.log(`- Processing time: ${data.processing_time}ms`)
      }
      if (data?.success && Array.isArray(data?.actos) && data.actos.length > 0) {
        console.log('✅ MICROSERVICIO PYTHON RETORNÓ DATOS ÚTILES')
      } else {
        console.log('⚠️ MICROSERVICIO PYTHON NO RETORNÓ DATOS ÚTILES')
        try { console.log(`- Estructura respuesta: ${JSON.stringify(data, null, 2)}`) } catch {}
      }
      console.log('🐍 USANDO DATOS DEL MICROSERVICIO PYTHON')
      return data
    } catch (error) {
      const code = error?.code || error?.cause?.code || 'N/A'
      console.log('💥 EXCEPCIÓN EN COMUNICACIÓN CON MICROSERVICIO PYTHON:')
      console.log(`- Error type: ${error?.constructor?.name}`)
      console.log(`- Error message: ${error?.message}`)
      console.log(`- Error code: ${code}`)
      console.log(`- Stack trace: ${error?.stack}`)
      if (error.name === 'AbortError') {
        console.log('⏰ ERROR: TIMEOUT - Microservicio Python no responde')
      } else if (code === 'ECONNREFUSED') {
        console.log('🔌 ERROR: CONEXIÓN RECHAZADA - Microservicio Python no accesible')
      } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        console.log('🌐 ERROR: DNS - URL del microservicio Python no existe o resolver falló')
      } else {
        console.log('❓ ERROR: DESCONOCIDO')
      }
      console.log('🔄 EJECUTANDO FALLBACK A MÉTODO NODE.JS')
      if (error.name === 'AbortError') {
        const e = new Error('Timeout comunicando con Python PDF Extractor')
        e.code = 'PDF_EXTRACTOR_TIMEOUT'
        throw e
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async healthCheck() {
    console.log('🏥 VERIFICANDO SALUD MICROSERVICIO PYTHON')
    if (!this.baseUrl) {
      throw new Error('PDF_EXTRACTOR_BASE_URL no configurado')
    }
    const controller = new AbortController()
    const healthUrl = `${this.baseUrl.replace(/\/$/, '')}/health`
    console.log(`- Health URL: ${healthUrl}`)
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      })
      console.log(`- Health status: ${res.status}`)
      const isJson = res.headers.get('content-type')?.includes('application/json')
      const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
      if (res.ok) {
        try { console.log(`- Health data: ${JSON.stringify(body)}`) } catch {}
        console.log('✅ MICROSERVICIO PYTHON SALUDABLE')
      } else {
        console.log('❌ MICROSERVICIO PYTHON NO SALUDABLE')
      }
      return { ok: res.ok, status: res.status, body }
    } catch (error) {
      console.log(`❌ HEALTH CHECK FALLÓ: ${error?.message || error}`)
      if (error.name === 'AbortError') {
        return { ok: false, status: 408, body: { error: 'timeout' } }
      }
      const code = error?.code || error?.cause?.code
      return { ok: false, status: 500, body: { error: error.message || String(error), code } }
    } finally {
      clearTimeout(timer)
    }
  }
}

export default PythonPdfClient


