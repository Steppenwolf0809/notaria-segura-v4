from __future__ import annotations

from typing import Dict, Any, List, Tuple


def analizar_requiere_beneficiario(tipo_acto: str, contenido_beneficiarios: str) -> Tuple[bool, float]:
    keywords_requiere = ["PODER", "COMPRAVENTA", "AUTORIZACIÓN", "AUTORIZACION", "MANDATO", "PROCURACIÓN", "PROCURACION"]
    keywords_no_requiere = ["DECLARACIÓN", "DECLARACION", "ACTA", "DILIGENCIA", "CUANTÍA INDETERMINADA", "CUANTIA INDETERMINADA"]

    tipo_up = (tipo_acto or "").upper()
    tiene_contenido_valido = bool((contenido_beneficiarios or "").strip() and len(contenido_beneficiarios.strip()) > 10)

    # Caso 1: señales fuertes de que NO requiere beneficiario
    if any(k in tipo_up for k in keywords_no_requiere):
        conf = 0.85 if not tiene_contenido_valido else 0.7
        return False, round(conf, 2)

    # Caso 2: señales de que SÍ requiere beneficiario
    if any(k in tipo_up for k in keywords_requiere):
        base = 0.75
        if tiene_contenido_valido:
            base += 0.15
        else:
            base -= 0.15
        base = max(0.4, min(0.95, base))
        return base >= 0.55, round(base, 2)

    # Caso 3: decisión híbrida neutra
    puntaje_semantico = 0.5
    conf = 0.7 * puntaje_semantico + 0.3 * (1.0 if tiene_contenido_valido else 0.0)
    return conf >= 0.55, round(conf, 2)


def detectar_tipo_acto(text_upper: str) -> str:
    # Detección sin reglas específicas: priorizar señales presentes
    if "REVOCATORIA" in text_upper and "PODER" in text_upper:
        return "REVOCATORIA DE PODER"
    if "COMPRAVENTA" in text_upper:
        return "COMPRAVENTA"
    if "PROCURACION" in text_upper or "PROCURACIÓN" in text_upper:
        return "PROCURACIÓN JUDICIAL"
    if "PODER GENERAL" in text_upper:
        return "PODER GENERAL"
    if "PODER ESPECIAL" in text_upper or "PODER" in text_upper:
        return "PODER ESPECIAL"
    if "TESTAMENTO" in text_upper:
        return "TESTAMENTO"
    if "DONACION" in text_upper or "DONACIÓN" in text_upper:
        return "DONACIÓN"
    return "ACTO_GENERICO"


def analyze_semantics(text_upper: str, tokens_info: Dict[str, Any]) -> Dict[str, Any]:
    tipo_detectado = detectar_tipo_acto(text_upper)

    # Usar posibles ventanas detectadas por spaCy para medir la evidencia en beneficiarios
    sections = (tokens_info or {}).get("sections") or {}
    benef_window = sections.get("beneficiarios")
    contenido_benef = ""
    if benef_window:
        start, end = benef_window
        try:
            contenido_benef = text_upper[start:end]
        except Exception:
            contenido_benef = ""

    requiere_benef, conf_benef = analizar_requiere_beneficiario(tipo_detectado, contenido_benef)

    es_generico = tipo_detectado == "ACTO_GENERICO" or ("PODER" in text_upper and not any(k in text_upper for k in ["COMPRAVENTA", "REVOCATORIA", "DONACION", "DONACIÓN", "TESTAMENTO"]))

    return {
        "perfil_acto": {
            "requiere_beneficiario": requiere_benef,
            "confidence_beneficiario": conf_benef,
            "es_acto_generico": es_generico,
            "tipo_detectado": tipo_detectado,
        }
    }


