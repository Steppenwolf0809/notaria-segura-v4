import ExtractionAggregator from '../src/services/extraction-aggregator.js'

class PythonStub {
  constructor(response) { this.response = response }
  async extractFromPdf() { return this.response }
}

async function main() {
  const rawText = `
EXTRACTO NOTARIAL
ACTO O CONTRATO: PODER GENERAL
OTORGADO POR:
PERSONA NATURAL  PATIÑO CHUNI JAVIER GUSTAVO  POR SUS PROPIOS DERECHOS
A FAVOR DE:
PERSONA NATURAL  PATIÑO MOROCHO RIGOBERTO DE JESUS  POR SUS PROPIOS DERECHOS
`

  const pythonResponse = {
    success: true,
    actos: [{
      tipo_acto: 'PODER GENERAL',
      otorgantes: [{ nombre: 'PATIÑO CHUNI JAVIER GUSTAVO', tipo: 'NATURAL' }],
      beneficiarios: [{ nombre: 'PATIÑO MOROCHO RIGOBERTO DE JESUS', tipo: 'NATURAL' }]
    }]
  }

  const stub = new PythonStub(pythonResponse)

  const result = await ExtractionAggregator.hybridExtract({
    pdfBuffer: Buffer.from('fake-pdf'),
    rawText,
    filename: 'sample.pdf',
    pythonClient: stub
  })

  console.log('=== HYBRID EXTRACTION RESULT ===')
  console.log(JSON.stringify(result, null, 2))
  const act = result.acts?.[0] || {}
  console.log('\nOtorgantes:', (act.otorgantes || []).map(o => o.nombre).join(' | '))
  console.log('Beneficiarios:', (act.beneficiarios || []).map(b => b.nombre).join(' | '))
  console.log('Tipo:', act.tipoActo, 'Fuente:', act.source, 'Confianza:', act.confidence)
}

main().catch(e => { console.error('Test error:', e); process.exit(1) })


