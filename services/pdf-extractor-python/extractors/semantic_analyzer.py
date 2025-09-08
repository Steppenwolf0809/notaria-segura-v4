from __future__ import annotations

from typing import Dict, Any, List, Tuple
import re


# --- Utilidades de nombres (Ecuador) ---

_COMMON_GIVEN_NAMES = {
    # Frecuentes Ecuador/hispano (lista breve, conservadora)
    "MARIA", "MARÍA", "JOSE", "JOSÉ", "JUAN", "LUIS", "PEDRO", "ANA", "ANDREA",
    "PATRICIA", "CARLOS", "ROSA", "DIANA", "KARINA", "GABRIEL", "JORGE", "DAVID",
    "MIGUEL", "JAVIER", "PABLO", "SANTIAGO", "FERNANDO", "ERNESTO", "RICARDO",
    "EDUARDO", "ESTEBAN", "ANGEL", "ÁNGEL", "PAUL", "PAÚL", "PAULINA", "GUADALUPE",
    "ROCIO", "ROCÍO", "SANDRA", "NATALIA", "MARCELA", "MAYRA", "SOFIA", "SOFÍA",
}

_CONNECTORS = {"DE", "DEL", "LA", "LOS", "LAS"}


def _tokenize_upper(text: str) -> List[str]:
    return [t for t in (text or "").upper().replace("\u00A0", " ").split() if t]


def _combine_connector_chunks(tokens: List[str]) -> List[str]:
    """Combina conectores con el siguiente término (p.ej., "DEL POZO", "DE LA TORRE")."""
    out: List[str] = []
    i = 0
    n = len(tokens)
    while i < n:
        t = tokens[i]
        if t in {"DE", "DEL"}:
            # Posible: DE + LA/LOS/LAS + X  |  DEL + X
            if i + 1 < n and tokens[i + 1] in {"LA", "LOS", "LAS"}:
                if i + 2 < n:
                    out.append(" ".join([t, tokens[i + 1], tokens[i + 2]]))
                    i += 3
                    continue
            if i + 1 < n:
                out.append(" ".join([t, tokens[i + 1]]))
                i += 2
                continue
        out.append(t)
        i += 1
    return out


def separar_apellidos_nombres(nombre_completo: str) -> Dict[str, str]:
    """
    Separa apellidos y nombres según regla típica en Ecuador:
    - Preferir dos apellidos y el resto como nombres.
    - Detecta si el orden viene como NOMBRES APELLIDOS y normaliza a APELLIDOS NOMBRES.

    Retorna: { 'apellidos': str, 'nombres': str, 'orden_detectada': 'APELLIDOS_NOMBRES'|'NOMBRES_APELLIDOS'|'DESCONOCIDO' }
    """
    tokens = _combine_connector_chunks(_tokenize_upper(nombre_completo))
    if len(tokens) < 2:
        return {"apellidos": "", "nombres": " ".join(tokens), "orden_detectada": "DESCONOCIDO"}

    # Heurística conservadora: si hay >= 4 chunks y los 2 primeros parecen nombres comunes, asumir NOMBRES→APELLIDOS
    orden = "DESCONOCIDO"
    if len(tokens) >= 4:
        first_two_are_given = tokens[0] in _COMMON_GIVEN_NAMES or (len(tokens) > 1 and tokens[1] in _COMMON_GIVEN_NAMES)
        last_two_are_given = tokens[-1] in _COMMON_GIVEN_NAMES or (len(tokens) > 1 and tokens[-2] in _COMMON_GIVEN_NAMES)

        if first_two_are_given and not last_two_are_given:
            # NOMBRES primero => mover últimos 2 como apellidos
            apellidos = " ".join(tokens[-2:])
            nombres = " ".join(tokens[:-2])
            orden = "NOMBRES_APELLIDOS"
            return {"apellidos": apellidos, "nombres": nombres, "orden_detectada": orden}

        if last_two_are_given and not first_two_are_given:
            # Ya viene como APELLIDOS NOMBRES
            apellidos = " ".join(tokens[:2])
            nombres = " ".join(tokens[2:])
            orden = "APELLIDOS_NOMBRES"
            return {"apellidos": apellidos, "nombres": nombres, "orden_detectada": orden}

    # Fallback: si hay al menos 3 tokens, preferir 2 apellidos + resto nombres
    if len(tokens) >= 3:
        apellidos = " ".join(tokens[:2])
        nombres = " ".join(tokens[2:])
        return {"apellidos": apellidos, "nombres": nombres, "orden_detectada": "APELLIDOS_NOMBRES"}

    # Dos tokens: asumir 1 apellido + 1 nombre, mantener orden
    return {"apellidos": tokens[0], "nombres": tokens[1] if len(tokens) > 1 else "", "orden_detectada": "DESCONOCIDO"}


def normalize_person_name(nombre_completo: str) -> Dict[str, str]:
    sep = separar_apellidos_nombres(nombre_completo)
    apellidos = (sep.get("apellidos") or "").strip()
    nombres = (sep.get("nombres") or "").strip()
    nombre_norm = f"{apellidos} {nombres}".strip()
    return {"nombre_normalizado": nombre_norm, "apellidos": apellidos, "nombres": nombres, "orden_detectada": sep.get("orden_detectada")}


def detectar_tipo_persona(nombre: str) -> str:
    """Heurística robusta: evitar falsos positivos (p.ej., 'PATRICIA' no es 'CIA')."""
    if not nombre:
        return "NATURAL"
    txt = (nombre or "").upper()
    # Indicadores con límites de palabra/número/puntuación
    patrones = [
        r"\bS\.A\.?\b|\bSA\b|\bSAS\b|S\.A\.S\b",
        r"\bLTDA\.?\b",
        r"\bC[ÍI]A\.?\b|\bCOMPAÑ[ÍI]A\b",
        r"\bCORP\.?\b|\bCORPORACI[ÓO]N\b",
        r"\bFUNDACI[ÓO]N\b|\bASOCIACI[ÓO]N\b",
        r"\bBANCO\b|\bCOOPERATIVA\b|\bUNIVERSIDAD\b|\bMUNICIPIO\b|\bGAD\b|\bEP\b",
        r"\bEMPRESA\b",
    ]
    for p in patrones:
        if re.search(p, txt, re.I):
            return "JURIDICA"
    return "NATURAL"


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

    # Señales de múltiples actos (se repite ancla de secciones)
    anchors = [k for k in sections.keys() if k in {"otorgantes", "beneficiarios"}]
    multi_act_hint = len(anchors) >= 2 and "OTORGANTES" in text_upper and "A FAVOR DE" in text_upper

    return {
        "perfil_acto": {
            "requiere_beneficiario": requiere_benef,
            "confidence_beneficiario": conf_benef,
            "es_acto_generico": es_generico,
            "tipo_detectado": tipo_detectado,
            "posible_multiple_actos": multi_act_hint,
        }
    }


