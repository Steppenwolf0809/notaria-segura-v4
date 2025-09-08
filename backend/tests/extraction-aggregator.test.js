import ExtractionAggregator from '../src/services/extraction-aggregator.js'
import PdfExtractorService from '../src/services/pdf-extractor-service.js'

// Stub simple de PythonPdfClient
class PythonStub {
  constructor(response) {
    this.response = response
  }
  async extractFromPdf() {
    return this.response
  }
}

function makeBufferFromText(s) {
  // Para el test, no necesitamos un PDF real; solo simulamos la presencia del buffer
  return Buffer.from(s, 'utf8')
}

describe('ExtractionAggregator - Hybrid Merge', () => {
  test('fusiona correctamente otorgantes y beneficiarios de Node + Python', async () => {
    const rawText = `
EXTRACTO NOTARIAL\n
ACTO O CONTRATO: PODER GENERAL\n
OTORGADO POR:\n
PERSONA NATURAL  PATIÑO CHUNI JAVIER GUSTAVO  POR SUS PROPIOS DERECHOS\n
A FAVOR DE:\n
PERSONA NATURAL  PATIÑO MOROCHO RIGOBERTO DE JESUS  POR SUS PROPIOS DERECHOS\n`

    // Node produce algo basado en su parser
    const nodeActs = await (async () => {
      const uni = new (await import('../src/services/universal-pdf-parser.js')).default()
      const res = await uni.parseDocument(null, rawText)
      return res.acts
    })()

    // Python stub con la forma que devuelve el microservicio
    const pythonResponse = {
      success: true,
      actos: [
        {
          tipo_acto: 'PODER GENERAL',
          otorgantes: [{ nombre: 'PATIÑO CHUNI JAVIER GUSTAVO', tipo: 'NATURAL' }],
          beneficiarios: [{ nombre: 'PATIÑO MOROCHO RIGOBERTO DE JESUS', tipo: 'NATURAL' }]
        }
      ]
    }

    const pythonStub = new PythonStub(pythonResponse)

    const result = await ExtractionAggregator.hybridExtract({
      pdfBuffer: makeBufferFromText('fake-pdf'),
      rawText,
      filename: 'sample.pdf',
      pythonClient: pythonStub
    })

    expect(result.acts).toBeDefined()
    expect(result.acts.length).toBeGreaterThan(0)
    const act = result.acts[0]
    expect(act.tipoActo).toMatch(/PODER/i)

    const ots = act.otorgantes.map(o => o.nombre)
    const bes = act.beneficiarios.map(b => b.nombre)
    expect(ots).toContain('PATIÑO CHUNI JAVIER GUSTAVO')
    expect(bes).toContain('PATIÑO MOROCHO RIGOBERTO DE JESUS')
  })
})


