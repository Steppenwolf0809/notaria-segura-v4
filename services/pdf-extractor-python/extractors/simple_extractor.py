from __future__ import annotations

import re
from typing import List, Dict, Any, Tuple, Optional


COMPANY_TOKENS = re.compile(r"\b(S\.A\.?|LTDA\.?|C[ÍI]A\.?|CORP\.?|FUNDACI[ÓO]N|EMPRESA|SAS|S\.A\.S|EP|MUNICIPIO|GAD)\b", re.I)


def guess_tipo(nombre: str) -> str:
    return "JURIDICA" if COMPANY_TOKENS.search(nombre or "") else "NATURAL"


def _block_between(text: str, start: re.Pattern, end: re.Pattern) -> str:
    m = start.search(text)
    if not m:
        return ""
    s = text[m.end():]
    e = end.search(s)
    return s[: e.start()] if e else s


STOP_TOKENS = set(
    [
        # Campos genéricos
        "PERSONA",
        "NATURAL",
        "JURIDICA",
        "JURÍDICA",
        "DOCUMENTO",
        "IDENTIDAD",
        "NACIONALIDAD",
        "CALIDAD",
        "RUC",
        "CÉDULA",
        "CEDULA",
        # Marcadores de secciones
        "A",
        "FAVOR",
        "DE",
        "OTORGADO",
        "OTORGANTES",
        "COMPARECIENTE",
        "COMPARECIENTES",
        "BENEFICIARIO",
        "BENEFICIARIOS",
        "NOTARIO",
        # Ruido frecuente en PDFs
        "IDENTIFICACION",
        "IDENTIFICACIÓN",
        "REPRESENTA",
        "REPRESENTADO",
        "REPRESENTADA",
        "MANDANTE",
        "MANDATARIO",
        "DERECHOS",
        "ECUATORIANO",
        "ECUATORIANA",
        # Ubicaciones/encabezados
        "UBICACION",
        "UBICACIÓN",
        "PROVINCIA",
        "CANTON",
        "CANTÓN",
        "PARROQUIA",
    ]
)


NAME_RE = re.compile(r"([A-ZÁÉÍÓÚÑ]{2,}(?:[ \.-]+[A-ZÁÉÍÓÚÑ]{2,}){1,6})")


# Frases que suelen venir pegadas a nombres y deben filtrarse
TRAILING_NOISE_PHRASES = [
    "POR SUS PROPIOS DERECHOS",
    "POR SUS DERECHOS",
    "POR SUS",
    "POR DERECHO PROPIO",
]


def _strip_trailing_noise(text: str) -> str:
    t = text.strip()
    for ph in TRAILING_NOISE_PHRASES:
        if t.endswith(" " + ph):
            t = t[: -len(ph)].strip()
    return t


def _valid_name_tokens(tokens: List[str]) -> bool:
    # Debe tener al menos 2 palabras y no ser solo conectores/ruido
    if len(tokens) < 2:
        return False
    valid = [t for t in tokens if t not in STOP_TOKENS and len(t) >= 2]
    return len(valid) >= 2


def _clean_candidate(cand: str) -> Optional[str]:
    """Limpia y valida un candidato de nombre.
    - Elimina frases de arrastre comunes.
    - Rechaza candidatos que contengan demasiado ruido.
    - Normaliza espacios.
    """
    if not cand:
        return None
    t = " ".join(cand.upper().split())
    t = _strip_trailing_noise(t)
    tokens = t.split()
    # Filtrar si cualquier token es ruido fuerte al inicio o si la proporción de ruido es alta
    if tokens and tokens[0] in STOP_TOKENS:
        return None
    noise_ratio = sum(1 for x in tokens if x in STOP_TOKENS) / max(1, len(tokens))
    if noise_ratio > 0.4:
        return None
    # Validación de tokens
    if not _valid_name_tokens(tokens):
        return None
    return t


def find_names(raw: str) -> List[str]:
    text = " ".join((raw or "").upper().split())
    out: List[str] = []
    for m in NAME_RE.finditer(text):
        cand = m.group(1).strip()
        # permitir empresas, pero filtrar ruido
        cleaned = _clean_candidate(cand)
        if not cleaned:
            # si parece empresa, permitir sin limpieza estricta
            if COMPANY_TOKENS.search(cand):
                cleaned = " ".join(cand.split())
            else:
                continue
        if len(cleaned) < 6:
            continue
        if cleaned not in out:
            out.append(cleaned)
    return out[:10]


def extract_entities(text_upper: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    # Otorgantes
    start_ot = re.compile(r"(OTORGAD[OA]\s+POR|OTORGANTES?|COMPARECIENTE[S]?|NOMBRES\s*/?\s*RAZ[ÓO]N\s+SOCIAL)\s*[:\-]?", re.I)
    start_be = re.compile(r"(A\s+FAVOR\s+DE|BENEFICIARIOS?)\s*[:\-]?", re.I)
    end_common = re.compile(r"(A\s+FAVOR\s+DE|BENEFICIARIOS?|NOTARIO|ACTO\s+O\s+CON|EXTRACTO|ESCRITURA)\b", re.I)

    ot_block = _block_between(text_upper, start_ot, end_common)
    be_block = _block_between(text_upper, start_be, re.compile(r"(NOTARIO|ACTO\s+O\s+CON|EXTRACTO|ESCRITURA)\b", re.I))

    # Representantes: ventana local
    rep_block = _block_between(text_upper, re.compile(r"REPRESENTAD[OA]\s+POR|PERSONA\s+QUE\s+LE\s+REPRESENTA", re.I), end_common)
    reps = [n for n in find_names(rep_block) if not COMPANY_TOKENS.search(n)]

    otorgantes: List[Dict[str, Any]] = []
    for n in find_names(ot_block):
        entidad = {"nombre": n, "tipo": guess_tipo(n)}
        if entidad["tipo"] == "JURIDICA" and reps:
            entidad["representantes"] = [{"nombre": r, "tipo": "NATURAL"} for r in reps]
        otorgantes.append(entidad)

    beneficiarios: List[Dict[str, Any]] = []
    for n in find_names(be_block):
        beneficiarios.append({"nombre": n, "tipo": guess_tipo(n)})

    return otorgantes, beneficiarios, reps


def extract_entities_with_sections(text_upper: str, sections: Optional[Dict[str, Tuple[int, int]]] = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str], Dict[str, str]]:
    """
    Variante que usa ventanas de secciones (spaCy) si están disponibles.
    Retorna otorgantes, beneficiarios, reps, y raw_sections.
    """
    raw_sections: Dict[str, str] = {}
    reps: List[str] = []
    if sections:
        ot_window = sections.get("otorgantes")
        be_window = sections.get("beneficiarios")
        notario_window = sections.get("notario")
        ot_block = text_upper[ot_window[0]:ot_window[1]] if ot_window else ""
        be_block = text_upper[be_window[0]:be_window[1]] if be_window else ""
        rep_block = ""
        # Heurística para reps dentro de la ventana de otorgantes
        if ot_block:
            m = re.search(r"REPRESENTAD[OA]\s+POR|PERSONA\s+QUE\s+LE\s+REPRESENTA", ot_block, re.I)
            if m:
                rep_block = ot_block[m.end(): ot_window[1] - (ot_window[0] if ot_window else 0)]
        reps = [n for n in find_names(rep_block) if not COMPANY_TOKENS.search(n)]
        raw_sections = {
            "otorgantes_raw": ot_block[:1000],
            "beneficiarios_raw": be_block[:1000],
            "notario_raw": (text_upper[notario_window[0]:notario_window[1]] if notario_window else "")[:1000],
        }
        otorgantes: List[Dict[str, Any]] = []
        for n in find_names(ot_block):
            entidad = {"nombre": n, "tipo": guess_tipo(n)}
            if entidad["tipo"] == "JURIDICA" and reps:
                entidad["representantes"] = [{"nombre": r, "tipo": "NATURAL"} for r in reps]
            otorgantes.append(entidad)

        beneficiarios: List[Dict[str, Any]] = []
        for n in find_names(be_block):
            beneficiarios.append({"nombre": n, "tipo": guess_tipo(n)})
        return otorgantes, beneficiarios, reps, raw_sections
    # Fallback a la versión básica
    ots, bes, reps = extract_entities(text_upper)
    return ots, bes, reps, {"otorgantes_raw": "", "beneficiarios_raw": "", "notario_raw": ""}


def extract_notary(text_upper: str, sections: Optional[Dict[str, Tuple[int, int]]] = None) -> Dict[str, str]:
    """Extrae información del notario si hay ventana detectada."""
    if not sections or "notario" not in sections:
        return {}
    s, e = sections["notario"]
    block = text_upper[s:e]
    names = find_names(block)
    notaria_text = None
    # Buscar una frase de notaría
    m = re.search(r"NOTAR(IA|ÍA)[^\n]{0,120}", block, re.I)
    if m:
        notaria_text = " ".join(block[m.start(): m.end()].split())
    return {"nombre": names[0] if names else None, "notaria": notaria_text}


def guess_act_type(text_upper: str) -> str:
    if "REVOCATORIA" in text_upper:
        return "REVOCATORIA DE PODER"
    if "COMPRAVENTA" in text_upper:
        return "COMPRAVENTA"
    if "PODER GENERAL" in text_upper:
        return "PODER GENERAL"
    if "PODER ESPECIAL" in text_upper or "PODER" in text_upper:
        return "PODER ESPECIAL"
    return "ACTO_GENERICO"


