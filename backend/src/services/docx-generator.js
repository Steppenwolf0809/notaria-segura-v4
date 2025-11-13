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

  // Cuerpo Arial 14, justificado, 1.5
  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    // Detectar si es línea de firma (nombre del notario o notaría)
    // Buscar patrones: NOTARIO, NOTARIA, o última línea con texto en mayúsculas
    const isNotarioName = /^[A-ZÁÉÍÓÚÑ\s]+$/.test(trimmed) && trimmed.length > 10 && trimmed.length < 60
    const hasNotaria = /NOTAR[ÍI]A/i.test(trimmed)
    const hasSpaces = line.startsWith('                    ')
    const isSignatureLine = isNotarioName || hasNotaria || hasSpaces

    paragraphs.push(
      new Paragraph({
        children: parseRuns(line),
        alignment: isSignatureLine ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { line: 360, lineRule: 'auto' },
      })
    )
  })

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export async function generateDocxFromCopies({ copies = [] } = {}) {
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

  const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } = lib

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
    // Agregar salto de página antes (excepto la primera copia)
    if (!isFirst) {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
    }

    const lines = String(entry.text || '').split(/\r?\n/)
    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim()

      // Detectar si es línea de firma (nombre del notario o notaría)
      // Buscar patrones: NOTARIO, NOTARIA, o última línea con texto en mayúsculas
      const isNotarioName = /^[A-ZÁÉÍÓÚÑ\s]+$/.test(trimmed) && trimmed.length > 10 && trimmed.length < 60
      const hasNotaria = /NOTAR[ÍI]A/i.test(trimmed)
      const hasSpaces = line.startsWith('                    ')
      const isSignatureLine = isNotarioName || hasNotaria || hasSpaces

      paragraphs.push(
        new Paragraph({
          children: parseRuns(line),
          alignment: isSignatureLine ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
          spacing: { line: 360, lineRule: 'auto' },
        })
      )
    })
  })

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }]
  })
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

export default { generateDocxFromText }
