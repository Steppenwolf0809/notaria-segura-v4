// Generación de DOCX nativo sin dependencias obligatorias en build
// Intenta cargar la librería `docx` dinámicamente. Si no está instalada,
// el llamador puede capturar el error y hacer fallback a RTF/HTML.

export async function generateDocxFromText({ title = 'Documento', bodyText = '' } = {}) {
  let lib
  try {
    const mod = await import('docx')
    lib = mod?.default || mod
  } catch (e) {
    const err = new Error('La librería "docx" no está instalada. Ejecute: npm --workspace backend i docx')
    err.cause = e
    err.code = 'DOCX_LIB_MISSING'
    throw err
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = lib

  const parseRuns = (line) => {
    const segments = String(line || '').split(/(\*\*[^*]+\*\*)/)
    const runs = []
    for (const seg of segments) {
      if (!seg) continue
      const m = seg.match(/^\*\*(.+)\*\*$/)
      if (m) {
        runs.push(new TextRun({ text: m[1], bold: true }))
      } else {
        runs.push(new TextRun({ text: seg }))
      }
    }
    return runs
  }

  const lines = String(bodyText || '').split(/\r?\n/)
  const paragraphs = lines.map((line) => new Paragraph({ children: parseRuns(line) }))

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: String(title || ''), heading: HeadingLevel.HEADING_1 }),
          ...paragraphs,
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export default { generateDocxFromText }

