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

  const { Document, Packer, Paragraph, TextRun, AlignmentType } = lib

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
  const paragraphs = []
  // Título discreto (no Heading), Arial 16 negrita
  paragraphs.push(
    new Paragraph({ children: [new TextRun({ text: String(title || ''), bold: true, font: 'Arial', size: 32 })] })
  )
  // Cuerpo Arial 14, justificado, 1.5
  lines.forEach((line) => {
    paragraphs.push(
      new Paragraph({
        children: parseRuns(line),
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 360, lineRule: 'auto' },
      })
    )
  })

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export async function generateDocxFromCopies({ copies = [], headerTitle, footerText } = {}) {
  if (!Array.isArray(copies) || copies.length === 0) {
    return generateDocxFromText({ title: 'Documento', bodyText: '' })
  }
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

  const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, Header, Footer } = lib

  const parseRuns = (line) => {
    const segments = String(line || '').split(/(\*\*[^*]+\*\*)/)
    const runs = []
    for (const seg of segments) {
      if (!seg) continue
      const m = seg.match(/^\*\*(.+)\*\*$/)
      if (m) {
        runs.push(new TextRun({ text: m[1], bold: true, font: 'Arial', size: 28 }))
      } else {
        runs.push(new TextRun({ text: seg, font: 'Arial', size: 28 }))
      }
    }
    return runs
  }

  const paragraphs = []
  copies.forEach((entry, idx) => {
    const isFirst = idx === 0
    // Título con salto de página antes (excepto la primera copia)
    const titlePara = new Paragraph({
      children: [
        ...(isFirst ? [] : [new PageBreak()]),
        new TextRun({ text: String(entry.title || ''), bold: true, font: 'Arial', size: 30 }),
      ],
      // Título discreto (sin estilo de encabezado)
    })
    paragraphs.push(titlePara)
    const lines = String(entry.text || '').split(/\r?\n/)
    lines.forEach((line) => {
      paragraphs.push(
        new Paragraph({
          children: parseRuns(line),
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360, lineRule: 'auto' },
        })
      )
    })
  })

  const doc = new Document({
    sections: [{
      headers: headerTitle ? { default: new Header({ children: [ new Paragraph({ children: [ new TextRun({ text: String(headerTitle), font: 'Arial', size: 24 }) ] }) ] }) } : undefined,
      footers: footerText ? { default: new Footer({ children: [ new Paragraph({ children: [ new TextRun({ text: String(footerText), font: 'Arial', size: 20 }) ] }) ] }) } : undefined,
      properties: {},
      children: paragraphs,
    }]
  })
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export default { generateDocxFromText }
