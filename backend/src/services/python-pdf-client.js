/**
 * Cliente para el microservicio Python de extracción de PDFs
 * Este archivo es un stub - el servicio Python real no está implementado
 */

class PythonPdfClient {
  constructor() {
    // Stub implementation
  }

  async healthCheck() {
    return {
      ok: false,
      status: 503,
      message: 'Python PDF service not available'
    }
  }

  async extractFromPdf(pdfBuffer, filename, options = {}) {
    // Always fail gracefully to allow fallback to other methods
    throw new Error('Python PDF extraction service not implemented')
  }
}

export default PythonPdfClient