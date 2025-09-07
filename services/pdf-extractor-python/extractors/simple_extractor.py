from __future__ import annotations

import re
from typing import List, Dict, Any, Tuple


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
        "A",
        "FAVOR",
        "DE",
        "OTORGADO",
        "OTORGANTES",
        "BENEFICIARIO",
        "BENEFICIARIOS",
    ]
)


NAME_RE = re.compile(r"([A-ZÁÉÍÓÚÑ]{2,}(?:[ \.-]+[A-ZÁÉÍÓÚÑ]{2,}){1,6})")


def find_names(raw: str) -> List[str]:
    text = " ".join((raw or "").upper().split())
    out: List[str] = []
    for m in NAME_RE.finditer(text):
        cand = m.group(1).strip()
        if any(tok in STOP_TOKENS for tok in cand.split()):
            # permitir empresas a pesar de tokens
            if not COMPANY_TOKENS.search(cand):
                continue
        if len(cand) < 6:
            continue
        if cand not in out:
            out.append(cand)
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


