import PdfExtractorService from '../src/services/pdf-extractor-service.js'
import { previewConcuerdo } from '../src/controllers/concuerdo-controller.js'

function mockRes() {
  return {
    _status: 200,
    _json: null,
    set() {},
    status(code) { this._status = code; return this },
    json(obj) { this._json = obj; console.log('RES', this._status, JSON.stringify(obj, null, 2)); return this }
  }
}

async function run() {
  const sampleText = `
ACTO O CONTRATO: PODER GENERAL y REVOCATORIA DE PODER
OTORGADO POR: SUSAN MAGDALENA GUTIERREZ FABRE
A FAVOR DE: JUAN CARLOS PEREZ PEREZ
NOTARIO: (A) ABG. LUIS ALFARO
NOTARÍA DÉCIMA OCTAVA DEL CANTON QUITO
`

  console.log('\n== parseAdvancedData ==')
  const parsed = PdfExtractorService.parseAdvancedData(sampleText)
  console.log(JSON.stringify(parsed, null, 2))

  console.log('\n== extractNotaryInfo ==')
  const noti = PdfExtractorService.extractNotaryInfo(sampleText)
  console.log(noti)

  console.log('\n== previewConcuerdo ==')
  const req = { body: { acts: parsed.acts, notario: 'LUIS ALFARO', notariaNumero: 'DÉCIMA OCTAVA DEL CANTON QUITO', numeroCopias: 2 } }
  const res = mockRes()
  await previewConcuerdo(req, res)
}

run().catch(e => { console.error(e); process.exit(1) })

