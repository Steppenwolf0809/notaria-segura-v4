from __future__ import annotations

from typing import Dict, Any


def score_act(act: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calcula un score de confianza por campos.
    """
    conf = {
        "tipo_acto": 0.0,
        "otorgantes": 0.0,
        "beneficiarios": 0.0,
        "notario": 0.0,
        "fecha": 0.0,
    }

    if act.get("tipo_acto"):
        conf["tipo_acto"] = 0.95 if len(act["tipo_acto"]) >= 3 else 0.2

    ots = act.get("otorgantes") or []
    conf["otorgantes"] = min(0.95, 0.5 + 0.15 * len(ots)) if ots else 0.0

    bes = act.get("beneficiarios") or []
    conf["beneficiarios"] = min(0.9, 0.3 + 0.1 * len(bes)) if bes else 0.1

    if act.get("autoridad_notarial", {}).get("nombre"):
        conf["notario"] = 0.9

    if act.get("fecha_otorgamiento", {}).get("fecha_texto"):
        conf["fecha"] = 0.88

    score = round((conf["tipo_acto"] + conf["otorgantes"] + conf["beneficiarios"] + conf["notario"] + conf["fecha"]) / 5, 2)
    return {"score": score, "confianza_campos": conf}


