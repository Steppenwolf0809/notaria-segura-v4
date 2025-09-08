from __future__ import annotations

from typing import List, Dict, Any, Tuple
import io
import pdfplumber


def reconstruct_tabular_lines(lines: List[str]) -> List[str]:
    """
    Reconstruye líneas que fueron partidas (p.ej., nombres en 2 líneas contiguas tipo tabla).
    Estrategia simple: si dos líneas consecutivas tienen 2 palabras cada una, combinarlas.
    """
    out: List[str] = []
    i = 0
    while i < len(lines):
        cur = (lines[i] or "").strip()
        nxt = (lines[i + 1] or "").strip() if i + 1 < len(lines) else ""
        if cur and nxt:
            if _two_words(cur) and _two_words(nxt):
                out.append(f"{cur} {nxt}")
                i += 2
                continue
        if cur:
            out.append(cur)
        i += 1
    return out


def _two_words(s: str) -> bool:
    parts = [p for p in s.split() if p]
    return len(parts) == 2 and all(len(p) >= 2 for p in parts)


def parse_tables_with_coords(pdf_bytes: bytes, max_pages: int = 3) -> List[Dict[str, Any]]:
    """
    Usa pdfplumber para detectar filas y columnas mediante bordes/celdas y reagrupa texto que
    esté cortado entre líneas contiguas. Retorna una lista de secciones con entidades detectadas.
    Formato de salida sugerido:
      [{ type: 'otorgantes'|'beneficiarios'|'general', entities: [{ nombre, tipo_persona, representantes? }] }]
    """
    results: List[Dict[str, Any]] = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            num_pages = min(len(pdf.pages), max_pages)
            for i in range(num_pages):
                page = pdf.pages[i]
                # Detectar tablas con heurística de líneas
                tables = page.find_tables(table_settings={
                    "intersection_tolerance": 5,
                    "join_tolerance": 5,
                    "snap_tolerance": 3,
                    "edge_min_length": 15,
                })
                for t in tables or []:
                    try:
                        table = t.extract()
                    except Exception:
                        table = None
                    if not table:
                        continue
                    # Normalizar filas: concatenar celdas por fila y limpiar
                    for row in table:
                        cells = [(c or "").strip() for c in row]
                        if not any(cells):
                            continue
                        row_text = " ".join([c for c in cells if c]).replace("  ", " ").strip()
                        if not row_text or len(row_text) < 4:
                            continue
                        # Clasificar fila por etiqueta fuerte
                        up = row_text.upper()
                        section_type = 'general'
                        if 'OTORGANTE' in up or 'COMPARECIENTE' in up or 'INTERVINIENTE' in up:
                            section_type = 'otorgantes'
                        elif 'A FAVOR DE' in up or 'BENEFICIARIO' in up:
                            section_type = 'beneficiarios'

                        # Heurística: detectar nombres tipo persona natural/jurídica en la fila
                        name_candidates = _extract_name_candidates(up)
                        if not name_candidates:
                            continue
                        entities = []
                        for name in name_candidates:
                            entities.append({
                                "nombre": name,
                                "tipo_persona": _guess_tipo_persona(name)
                            })
                        results.append({
                            "type": section_type,
                            "entities": entities
                        })
    except Exception:
        return []

    return results


def _extract_name_candidates(upper_text: str) -> List[str]:
    # Quitar encabezados típicos
    headers = [
        'PERSONA', 'NOMBRES', 'RAZON', 'RAZÓN', 'SOCIAL', 'TIPO', 'INTERVINIENTE', 'DOCUMENTO', 'IDENTIDAD', 'NACIONALIDAD',
        'CALIDAD', 'REPRESENTA', 'UBICACION', 'UBICACIÓN', 'PROVINCIA', 'CANTON', 'CANTÓN', 'PARROQUIA', 'DESCRIPCION', 'DESCRIPCIÓN',
        'CUANTIA', 'CUANTÍA', 'NATURAL', 'IDENTIFICACION', 'IDENTIFICACIÓN'
    ]
    import re
    txt = upper_text
    for h in headers:
        txt = re.sub(rf"\b{h}\b", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()

    # Empresas o personas: capturar secuencias de 2-7 tokens mayúscula
    name_re = re.compile(r"([A-ZÁÉÍÓÚÑ]{2,}(?:[\s\.-]+[A-ZÁÉÍÓÚÑ]{2,}){1,6})")
    out: List[str] = []
    for m in name_re.finditer(txt):
        cand = m.group(1).replace("  ", " ").strip()
        if not cand or any(x in cand for x in ["A FAVOR", "BENEFICIARIO", "NOTARIO"]):
            continue
        if cand not in out:
            out.append(cand)
    return out[:6]


def _guess_tipo_persona(name: str) -> str:
    import re
    # Patrones con límites de palabra para evitar falsos positivos (p.ej., 'PATRICIA' no matchea 'CIA')
    patrones = [
        r"\bFUNDACI[ÓO]N\b",
        r"\bS\.?A\.?\b|\bSA\b|\bSAS\b|S\.A\.S\b",
        r"\bLTDA\.?\b",
        r"\bC[ÍI]A\.?\b|\bCOMPAÑ[ÍI]A\b",
        r"\bCORP\.?\b|\bCORPORACI[ÓO]N\b",
        r"\bEMPRESA\b",
        r"\bUNIVERSIDAD\b|\bMUNICIPIO\b|\bCOOPERATIVA\b|\bGAD\b|\bEP\b",
    ]
    up = (name or "").upper()
    for p in patrones:
        if re.search(p, up, re.I):
            return 'Jurídica'
    return 'Natural'

