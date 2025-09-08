import { getConfig } from '../config/environment.js'

// Cliente para comunicarse con el microservicio Python PDF Extractor
class PythonPdfClient {
  constructor() {
    const config = getConfig()
    this.baseUrl = config?.pdfExtractor?.baseUrl || 'http://localhost:8001'
    this.token = config?.pdfExtractor?.token || ''
    this.timeout = config?.pdfExtractor?.timeout || 30000
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
      // Construir multipart/form-data manualmente para evitar dependencias extra
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

      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: Buffer.concat(parts),
        signal: controller.signal
      })

      if (!res.ok) {
        const isJson = res.headers.get('content-type')?.includes('application/json')
        const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
        const err = new Error(`Python extractor responded ${res.status}`)
        err.status = res.status
        err.response = body
        throw err
      }

      const data = await res.json()
      return data
    } catch (error) {
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
    if (!this.baseUrl) {
      throw new Error('PDF_EXTRACTOR_BASE_URL no configurado')
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.max(1000, this.timeout / 3))
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: controller.signal
      })
      const isJson = res.headers.get('content-type')?.includes('application/json')
      const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
      return { ok: res.ok, status: res.status, body }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { ok: false, status: 408, body: { error: 'timeout' } }
      }
      return { ok: false, status: 500, body: { error: error.message || String(error) } }
    } finally {
      clearTimeout(timer)
    }
  }
}

export default PythonPdfClient


