from __future__ import annotations

from typing import Dict, Any


def _evaluate_name_quality(nombre: str) -> float:
    """Evalúa la calidad de un nombre extraído."""
    if not nombre:
        return 0.0
    
    tokens = nombre.split()
    score = 0.3  # Base score
    
    # Puntos por número de palabras (hasta 4)
    score += min(0.2, len(tokens) * 0.05)
    
    # Bonus por longitud apropiada
    if 8 <= len(nombre) <= 50:
        score += 0.15
    
    # Bonus por estructura típica de nombres
    if len(tokens) >= 2:
        score += 0.1
    
    # Penalización por fragmentos sospechosos
    suspicious_fragments = ["IDENTIFICACION", "REPRESENTA", "MANDANTE", "DERECHOS", "NA", "LE"]
    for fragment in suspicious_fragments:
        if fragment in nombre:
            score -= 0.15
            break
    
    # Bonus por nombres que parecen reales
    if len(tokens) >= 2 and all(len(t) >= 2 for t in tokens):
        score += 0.1
    
    return max(0.0, min(1.0, score))


def _evaluate_entities_quality(entities: list) -> float:
    """Evalúa la calidad de una lista de entidades."""
    if not entities:
        return 0.0
    
    total_quality = 0.0
    for entity in entities:
        nombre = entity.get("nombre", "")
        name_quality = _evaluate_name_quality(nombre)
        
        # Bonus por confidence individual si existe
        individual_conf = entity.get("confidence", 0.5)
        combined_quality = (name_quality * 0.7) + (individual_conf * 0.3)
        
        total_quality += combined_quality
    
    return total_quality / len(entities)


def score_act(act: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calcula un score de confianza mejorado por campos.
    """
    conf = {
        "tipo_acto": 0.0,
        "otorgantes": 0.0,
        "beneficiarios": 0.0,
        "notario": 0.0,
        "fecha": 0.0,
    }

    # Evaluación de tipo de acto
    if act.get("tipo_acto"):
        tipo = act["tipo_acto"]
        if tipo and len(tipo) >= 3:
            # Bonus por tipos específicos vs genéricos
            if any(keyword in tipo.upper() for keyword in ["PODER", "COMPRAVENTA", "DONACION", "TESTAMENTO"]):
                conf["tipo_acto"] = 0.95
            else:
                conf["tipo_acto"] = 0.7
        else:
            conf["tipo_acto"] = 0.2

    # Evaluación mejorada de otorgantes
    ots = act.get("otorgantes") or []
    if ots:
        base_score = min(0.5, 0.2 + 0.1 * len(ots))  # Score base por cantidad
        quality_score = _evaluate_entities_quality(ots)
        conf["otorgantes"] = min(0.95, base_score + (quality_score * 0.45))
    else:
        conf["otorgantes"] = 0.0

    # Evaluación mejorada de beneficiarios
    bes = act.get("beneficiarios") or []
    if bes:
        base_score = min(0.4, 0.15 + 0.08 * len(bes))
        quality_score = _evaluate_entities_quality(bes)
        conf["beneficiarios"] = min(0.9, base_score + (quality_score * 0.5))
    else:
        # Verificar si el acto requiere beneficiarios
        perfil = act.get("perfil_acto", {})
        requiere_benef = perfil.get("requiere_beneficiario", False)
        conf["beneficiarios"] = 0.05 if not requiere_benef else 0.0

    # Evaluación de notario
    autoridad = act.get("autoridad_notarial") or {}
    if isinstance(autoridad, dict) and autoridad.get("nombre"):
        notario_quality = _evaluate_name_quality(autoridad["nombre"])
        conf["notario"] = 0.5 + (notario_quality * 0.4)
    else:
        conf["notario"] = 0.1

    # Evaluación de fecha
    fecha = act.get("fecha_otorgamiento") or {}
    if isinstance(fecha, dict) and fecha.get("fecha_texto"):
        conf["fecha"] = 0.88
    else:
        conf["fecha"] = 0.1

    # Calcular score global con pesos ajustados
    weights = {
        "tipo_acto": 0.25,
        "otorgantes": 0.35,  # Mayor peso a otorgantes
        "beneficiarios": 0.25,
        "notario": 0.10,
        "fecha": 0.05,
    }
    
    weighted_score = sum(conf[field] * weights[field] for field in weights)
    score = round(weighted_score, 2)
    
    return {"score": score, "confianza_campos": conf}


