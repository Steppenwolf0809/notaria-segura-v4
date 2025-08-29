/**
 * ActosExtractorService
 * - Segmenta múltiples actos en un texto de extracto/diligencia.
 * - Extrae tipo de acto completo (sin recortar palabras clave útiles).
 * - Identifica otorgantes/comparecientes y relaciones de representación.
 * - No depende de OCR: trabaja sobre texto plano ya obtenido.
 */

const HeadingPatterns = [
  /\bPRIMER\s+ACTO\b/i,
  /\bSEGUNDO\s+ACTO\b/i,
  /\bTERCER\s+ACTO\b/i,
  /\bCUARTO\s+ACTO\b/i,
  /\bACTO\s+\d+\b/i,
  /^I\.?\s+/m,
  /^II\.?\s+/m,
  /^III\.?\s+/m,
  /^IV\.?\s+/m,
  /^V\.?\s+/m,
  /\bACTO\s*:\s*[A-ZÁÉÍÓÚÑ\s]+/i,
];

const ActTypeIndicators = [
  'COMPRAVENTA', 'COMPRA VENTA', 'VENTA', 'TRANSFERENCIA DE DOMINIO',
  'HIPOTECA', 'DONACION', 'ARRENDAMIENTO', 'PERMUTA', 'ANTICRESIS',
  'CONSTITUCION DE SOCIEDAD', 'SOCIEDAD', 'CIA LTDA', 'S.A.',
  'FIDEICOMISO', 'CONSORCIO', 'AUMENTO DE CAPITAL', 'REFORMA DE ESTATUTOS',
  'RECONOCIMIENTO DE FIRMAS', 'DILIGENCIA', 'TESTIMONIO', 'ACTA',
];

const PartyBlockMarkers = [
  /\bCOMPARECIENTE(?:S)?\b/i,
  /\bCOMPARECEN\b/i,
  /\bCOMPARECE\b/i,
  /\bOTORGANTE(?:S)?\b/i,
  /\bOTORGA(?:N)?\b/i,
  /\bA\s+FAVOR\s+DE\b/i,
];

const RepresentationMarkers = [
  /\bREPRESENTADO\s+POR\b/i,
  /\bEN\s+REPRESENTACION\s+DE\b/i,
  /\bEN\s+CALIDAD\s+DE\s+REPRESENTANTE\s+LEGAL\s+DE\b/i,
  /\bAPODERADO\s+DE\b/i,
  /\bMANDATARIO\s+DE\b/i,
  /\bPOR\s+DERECHO\s+PROPIO\b/i,
];

const nameLike = /[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\.\s]{2,80}/;

function cleanSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function sliceByHeadings(text) {
  const t = String(text || '')
    .replace(/\r/g, '')
    .replace(/[\t\f]+/g, ' ');
  const indices = [];
  for (const re of HeadingPatterns) {
    let m;
    const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = rx.exec(t))) {
      indices.push({ index: m.index, label: m[0] });
    }
  }
  indices.sort((a, b) => a.index - b.index);
  if (indices.length === 0) {
    return [{ title: 'ACTO', start: 0, end: t.length, text: t }];
  }
  const sections = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index;
    const end = i + 1 < indices.length ? indices[i + 1].index : t.length;
    const seg = t.slice(start, end);
    sections.push({ title: indices[i].label, start, end, text: seg });
  }
  return sections;
}

function detectActType(sectionText) {
  const upper = String(sectionText || '').toUpperCase();
  // Intentar capturar título explícito "ACTO: <tipo>"
  const m = upper.match(/ACTO\s*:\s*([^\n]+)/);
  if (m && m[1]) return cleanSpaces(m[1]);
  // Buscar primera coincidencia de indicadores y expandir hasta fin de oración
  for (const word of ActTypeIndicators) {
    const idx = upper.indexOf(word);
    if (idx !== -1) {
      const tail = upper.slice(idx, Math.min(upper.length, idx + 140));
      const cut = tail.search(/[\.;\n]/);
      const piece = cut !== -1 ? tail.slice(0, cut) : tail;
      return cleanSpaces(piece);
    }
  }
  // Fallback: primera línea significativa
  const firstLine = upper.split(/\n+/).map(cleanSpaces).find((l) => l.length > 5);
  return firstLine || 'ACTO';
}

function extractPartyLines(sectionText) {
  const lines = String(sectionText || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (PartyBlockMarkers.some((re) => re.test(line))) {
      const start = i;
      let end = Math.min(lines.length, i + 8); // acotar bloque
      for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
        if (PartyBlockMarkers.some((re) => re.test(lines[j]))) { end = j; break; }
      }
      blocks.push(lines.slice(start, end).join(' '));
    }
  }
  if (blocks.length === 0) blocks.push(lines.slice(0, Math.min(6, lines.length)).join(' '));
  return blocks;
}

function splitNames(raw) {
  // Separar por conectores comunes sin romper nombres compuestos
  return String(raw || '')
    .replace(/\s+Y\s+/gi, ' | ')
    .replace(/\s*,\s*/g, ' | ')
    .split('|')
    .map((s) => cleanSpaces(s))
    .filter((s) => s.length >= 5);
}

function parseRepresentation(fragment) {
  const f = String(fragment || '');
  const res = { capacity: undefined, represents: undefined };
  if (/POR\s+DERECHO\s+PROPIO/i.test(f)) res.capacity = 'POR DERECHO PROPIO';
  const r1 = f.match(/REPRESENTADO\s+POR\s+(${nameLike.source})/i);
  if (r1 && r1[1]) res.represents = cleanSpaces(r1[1]);
  const r2 = f.match(/EN\s+REPRESENTACION\s+DE\s+(${nameLike.source})/i);
  if (r2 && r2[1]) res.represents = cleanSpaces(r2[1]);
  const r3 = f.match(/EN\s+CALIDAD\s+DE\s+REPRESENTANTE\s+LEGAL\s+DE\s+(${nameLike.source})/i);
  if (r3 && r3[1]) res.represents = cleanSpaces(r3[1]);
  const r4 = f.match(/APODERADO\s+DE\s+(${nameLike.source})/i);
  if (r4 && r4[1]) res.represents = cleanSpaces(r4[1]);
  const r5 = f.match(/MANDATARIO\s+DE\s+(${nameLike.source})/i);
  if (r5 && r5[1]) res.represents = cleanSpaces(r5[1]);
  return res;
}

function extractParties(sectionText) {
  const blocks = extractPartyLines(sectionText);
  const parties = [];
  for (const block of blocks) {
    const role = /OTORGANTE/i.test(block) ? 'OTORGANTE' : (/COMPAREC/i.test(block) ? 'COMPARECIENTE' : undefined);
    // Buscar posibles nombres (en mayúsculas)
    const names = splitNames(block)
      .map((frag) => frag.match(new RegExp(nameLike.source, 'i'))?.[0])
      .filter(Boolean);
    for (const nm of names) {
      const rep = parseRepresentation(block);
      parties.push({ name: cleanSpaces(nm), role, capacity: rep.capacity, represents: rep.represents });
    }
  }
  // Deduplicar por nombre
  const seen = new Set();
  return parties.filter((p) => {
    const k = `${p.name}|${p.role || ''}|${p.represents || ''}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

const ActosExtractorService = {
  extract(text) {
    const sections = sliceByHeadings(text);
    const acts = sections.map((sec) => ({
      title: cleanSpaces(sec.title),
      actType: detectActType(sec.text),
      parties: extractParties(sec.text),
      raw: sec.text,
    }));
    return {
      count: acts.length,
      acts,
    };
  },
};

export default ActosExtractorService;

