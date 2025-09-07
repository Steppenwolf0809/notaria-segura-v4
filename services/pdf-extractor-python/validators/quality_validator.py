from __future__ import annotations

from typing import Dict, Any, List


def _issue(code: str, message: str, campo: str | None = None, confidence: float = 0.7) -> Dict[str, Any]:
    return {"code": code, "message": message, "campo": campo, "confidence": round(confidence, 2)}


def validate_act(act: Dict[str, Any]) -> Dict[str, Any]:
    issues: List[Dict[str, Any]] = []

    tipo = (act.get("tipo_acto") or "").strip()
    otorgantes = act.get("otorgantes") or []
    beneficiarios = act.get("beneficiarios") or []
    perfil = act.get("perfil_acto") or {}

    if not tipo:
        issues.append(_issue("TIPO_ACTO_VACIO", "Falta el tipo de acto.", "tipo_acto", 0.85))

    if not otorgantes:
        issues.append(_issue("FALTA_OTORGANTES", "No se detectaron otorgantes.", "otorgantes", 0.9))

    # Si se requiere beneficiario según perfil_acto, validar presencia
    requiere_benef = bool(perfil.get("requiere_beneficiario"))
    conf_benef = float(perfil.get("confidence_beneficiario", 0.6) or 0.6)
    if requiere_benef and len(beneficiarios) == 0:
        issues.append(_issue("FALTA_BENEFICIARIOS", "El acto requiere beneficiario pero no se detectó ninguno.", "beneficiarios", conf_benef))

    # Señalar actos demasiado genéricos
    if perfil.get("es_acto_generico") and not any(k in tipo.upper() for k in ["COMPRAVENTA", "REVOCATORIA", "DONACION", "DONACIÓN", "TESTAMENTO"]):
        issues.append(_issue("TIPO_ACTO_DEMASIADO_GENERICO", "El tipo de acto es muy genérico; verifique el título.", "tipo_acto", 0.6))

    return {"issues": issues}


