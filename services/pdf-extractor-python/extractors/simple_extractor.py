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
        "PERSONAS",
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
        "NUMERO",
        "NÚMERO",
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
        "NOMBRES",
        "RAZON",
        "RAZÓN",
        "SOCIAL",
        # Ruido frecuente en PDFs notariales
        "IDENTIFICACION",
        "IDENTIFICACIÓN",
        "REPRESENTA",
        "REPRESENTADO",
        "REPRESENTADA",
        "REPRESENTANTE",
        "MANDANTE",
        "MANDATARIO",
        "DERECHOS",
        "PROPIOS",
        "ECUATORIANO",
        "ECUATORIANA",
        "ECUATORIA",
        "COACTIVA",
        "CUANTÍA",
        "CUANTIA",
        "ACTO",
        "CONTRATO",
        "INDETERMINADA",
        "DEL",
        "PERSONA",
        "QUE",
        "LE",
        "SUS",
        "POR",
        "NA",
        # Ubicaciones/encabezados
        "UBICACION",
        "UBICACIÓN",
        "PROVINCIA",
        "CANTON",
        "CANTÓN",
        "PARROQUIA",
        "QUITO",
        "PICHINCHA",
        "ECUADOR",
        # Headers de tabla
        "PÁGINA",
        "PAGINA",
        "ESCRITURA",
        "PÚBLICA",
        "PUBLICA",
        "EXTRACTO",
        "MATRIZ",
    ]
)


# Regex mejorado para nombres - captura nombres más largos y maneja conectores
NAME_RE = re.compile(r"([A-ZÁÉÍÓÚÑ]{2,}(?:[ \.-]+(?:DEL?|DE\s+LA|LOS|LAS|Y|[A-ZÁÉÍÓÚÑ]{2,})){1,8})")

# Regex específico para detectar fragmentos de nombres que pueden estar separados
FRAGMENT_RE = re.compile(r"([A-ZÁÉÍÓÚÑ]{3,})")

# Frases que suelen venir pegadas a nombres y deben filtrarse
TRAILING_NOISE_PHRASES = [
    "POR SUS PROPIOS DERECHOS",
    "POR SUS DERECHOS", 
    "POR SUS",
    "POR DERECHO PROPIO",
    "PERSONA NATURAL",
    "PERSONA JURÍDICA",
    "PERSONA JURIDICA",
    "MANDATARIO JUDICIAL",
    "REPRESENTANTE LEGAL",
]

# Patrones mejorados para detección de secciones
SECTION_PATTERNS = {
    'otorgantes': [
        re.compile(r"(?:OTORGAD[OA]\s+POR|OTORGANTES?|COMPARECIENTE[S]?)\s*[:\-]?\s*", re.I),
        re.compile(r"NOMBRES?\s*/?(?:\s*RAZ[ÓO]N\s+SOCIAL)?\s*[:\-]?\s*", re.I),
        re.compile(r"INTERVINIENTE[S]?\s*[:\-]?\s*", re.I),
    ],
    'beneficiarios': [
        re.compile(r"A\s+FAVOR\s+DE\s*[:\-]?\s*", re.I),
        re.compile(r"BENEFICIARIOS?\s*[:\-]?\s*", re.I),
        re.compile(r"PARA\s+(?:LA|EL|LOS|LAS)?\s*[:\-]?\s*", re.I),
    ],
    'notario': [
        re.compile(r"NOTARIO\s*[:\-]?\s*", re.I),
        re.compile(r"ANTE\s+M[ÍI]\s*[:\-]?\s*", re.I),
    ]
}


def _reconstruct_fragmented_names(text: str) -> str:
    """Intenta reconstruir nombres que están fragmentados en líneas separadas."""
    lines = text.split('\n')
    reconstructed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        # Si la línea actual termina en una palabra que parece apellido/nombre
        # y la siguiente línea empieza con otra palabra similar, unirlas
        if (i + 1 < len(lines) and 
            len(line.split()) >= 1 and 
            re.match(r'^[A-ZÁÉÍÓÚÑ]{2,}', lines[i + 1].strip())):
            
            next_line = lines[i + 1].strip()
            # Verificar que no sean headers o ruido
            combined_tokens = (line + " " + next_line).upper().split()
            noise_count = sum(1 for token in combined_tokens if token in STOP_TOKENS)
            
            # Si hay poco ruido, combinar las líneas
            if noise_count / len(combined_tokens) < 0.5:
                reconstructed_lines.append(line + " " + next_line)
                i += 2
                continue
        
        reconstructed_lines.append(line)
        i += 1
    
    return '\n'.join(reconstructed_lines)


def _is_valid_name_structure(tokens: List[str]) -> bool:
    """Valida que la estructura del nombre sea coherente."""
    if len(tokens) < 2:
        return False
    
    # Filtrar tokens de ruido
    clean_tokens = [t for t in tokens if t not in STOP_TOKENS and len(t) >= 2]
    
    if len(clean_tokens) < 2:
        return False
    
    # Verificar que no sea solo conectores y ruido
    meaningful_tokens = [t for t in clean_tokens if t not in {"DE", "DEL", "LA", "LOS", "LAS", "Y"}]
    
    return len(meaningful_tokens) >= 2


def _clean_name_candidate(candidate: str) -> Optional[str]:
    """Limpia un candidato de nombre más exhaustivamente."""
    if not candidate:
        return None
    
    # Normalizar espacios y mayúsculas
    normalized = " ".join(candidate.upper().split())
    
    # Remover frases de arrastre
    for phrase in TRAILING_NOISE_PHRASES:
        normalized = normalized.replace(phrase, "").strip()
    
    # Dividir en tokens y filtrar
    tokens = normalized.split()
    
    # Eliminar tokens de ruido del principio y final
    while tokens and tokens[0] in STOP_TOKENS:
        tokens.pop(0)
    
    while tokens and tokens[-1] in STOP_TOKENS:
        tokens.pop()
    
    if not tokens:
        return None
    
    # Verificar estructura válida
    if not _is_valid_name_structure(tokens):
        # Permitir si parece empresa
        if COMPANY_TOKENS.search(" ".join(tokens)):
            return " ".join(tokens)
        return None
    
    # Calcular ratio de ruido
    noise_count = sum(1 for t in tokens if t in STOP_TOKENS)
    noise_ratio = noise_count / len(tokens)
    
    if noise_ratio > 0.3:  # Máximo 30% de ruido
        return None
    
    result = " ".join(tokens)
    
    # Verificar longitud mínima
    if len(result) < 4:
        return None
    
    return result


def _strip_trailing_noise(text: str) -> str:
    """Función legacy mantenida para compatibilidad."""
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
    """Función legacy que usa la nueva lógica de limpieza."""
    return _clean_name_candidate(cand)


def find_names(raw: str) -> List[str]:
    """Función mejorada para encontrar nombres con reconstrucción de fragmentos."""
    if not raw:
        return []
    
    # Primero reconstruir nombres fragmentados
    text = _reconstruct_fragmented_names(raw)
    text = " ".join(text.upper().split())
    
    out: List[str] = []
    candidates = set()  # Para evitar duplicados durante el proceso
    
    # Usar el regex principal mejorado
    for m in NAME_RE.finditer(text):
        cand = m.group(1).strip()
        candidates.add(cand)
    
    # También buscar fragmentos individuales que puedan formar nombres
    fragments = FRAGMENT_RE.findall(text)
    
    # Intentar combinar fragmentos consecutivos
    for i in range(len(fragments) - 1):
        combined = f"{fragments[i]} {fragments[i + 1]}"
        candidates.add(combined)
        
        # También probar combinaciones de tres fragmentos
        if i < len(fragments) - 2:
            triple = f"{fragments[i]} {fragments[i + 1]} {fragments[i + 2]}"
            candidates.add(triple)
    
    # Limpiar y validar todos los candidatos
    for cand in candidates:
        cleaned = _clean_name_candidate(cand)
        if not cleaned:
            continue
            
        # Verificar longitud mínima más flexible para nombres complejos
        if len(cleaned) < 4:
            continue
            
        # Evitar duplicados
        if cleaned not in out:
            out.append(cleaned)
    
    # Ordenar por longitud (nombres más completos primero) y limitar resultado
    out.sort(key=len, reverse=True)
    return out[:15]  # Aumentamos el límite para capturar más nombres


def _find_best_section_match(text: str, section_type: str) -> Optional[Tuple[int, int]]:
    """Encuentra la mejor coincidencia para una sección usando múltiples patrones."""
    patterns = SECTION_PATTERNS.get(section_type, [])
    best_match = None
    
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            start_pos = match.end()
            # Buscar donde termina la sección
            end_pos = len(text)
            
            # Buscar patrones de fin de sección
            end_patterns = []
            if section_type == 'otorgantes':
                end_patterns = SECTION_PATTERNS['beneficiarios'] + SECTION_PATTERNS['notario']
            elif section_type == 'beneficiarios':
                end_patterns = SECTION_PATTERNS['notario']
            
            for end_pattern in end_patterns:
                end_match = end_pattern.search(text, start_pos)
                if end_match:
                    end_pos = end_match.start()
                    break
            
            # Verificar que la sección tenga contenido útil
            section_text = text[start_pos:end_pos].strip()
            if len(section_text) > 10:  # Mínimo de contenido
                best_match = (start_pos, end_pos)
                break
    
    return best_match


def extract_entities(text_upper: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """Función mejorada de extracción de entidades."""
    
    # Usar la nueva función de detección de secciones
    ot_section = _find_best_section_match(text_upper, 'otorgantes')
    be_section = _find_best_section_match(text_upper, 'beneficiarios')
    
    # Extraer bloques de texto
    ot_block = text_upper[ot_section[0]:ot_section[1]] if ot_section else ""
    be_block = text_upper[be_section[0]:be_section[1]] if be_section else ""
    
    # Fallback a método anterior si no encontramos secciones
    if not ot_block:
        start_ot = re.compile(r"(OTORGAD[OA]\s+POR|OTORGANTES?|COMPARECIENTE[S]?|NOMBRES\s*/?\s*RAZ[ÓO]N\s+SOCIAL)\s*[:\-]?", re.I)
        end_common = re.compile(r"(A\s+FAVOR\s+DE|BENEFICIARIOS?|NOTARIO|ACTO\s+O\s+CON|EXTRACTO|ESCRITURA)\b", re.I)
        ot_block = _block_between(text_upper, start_ot, end_common)
    
    if not be_block:
        start_be = re.compile(r"(A\s+FAVOR\s+DE|BENEFICIARIOS?)\s*[:\-]?", re.I)
        be_block = _block_between(text_upper, start_be, re.compile(r"(NOTARIO|ACTO\s+O\s+CON|EXTRACTO|ESCRITURA)\b", re.I))

    # Representantes: buscar en sección de otorgantes
    rep_block = ""
    if ot_block:
        rep_match = re.search(r"REPRESENTAD[OA]\s+POR|PERSONA\s+QUE\s+LE\s+REPRESENTA", ot_block, re.I)
        if rep_match:
            rep_block = ot_block[rep_match.end():]
    
    reps = [n for n in find_names(rep_block) if not COMPANY_TOKENS.search(n)]

    # Extraer otorgantes con mejor validación
    otorgantes: List[Dict[str, Any]] = []
    for n in find_names(ot_block):
        # Validación adicional: no incluir nombres que sean claramente ruido
        if len(n.split()) >= 2:  # Al menos 2 palabras
            entidad = {"nombre": n, "tipo": guess_tipo(n)}
            if entidad["tipo"] == "JURIDICA" and reps:
                entidad["representantes"] = [{"nombre": r, "tipo": "NATURAL"} for r in reps]
            otorgantes.append(entidad)

    # Extraer beneficiarios con validación
    beneficiarios: List[Dict[str, Any]] = []
    for n in find_names(be_block):
        if len(n.split()) >= 2:  # Al menos 2 palabras
            beneficiarios.append({"nombre": n, "tipo": guess_tipo(n)})

    return otorgantes, beneficiarios, reps


def extract_entities_with_sections(text_upper: str, sections: Optional[Dict[str, Tuple[int, int]]] = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str], Dict[str, str]]:
    """
    Variante mejorada que usa ventanas de secciones (spaCy) si están disponibles.
    Retorna otorgantes, beneficiarios, reps, y raw_sections.
    """
    raw_sections: Dict[str, str] = {}
    reps: List[str] = []
    
    if sections:
        ot_window = sections.get("otorgantes")
        be_window = sections.get("beneficiarios")
        notario_window = sections.get("notario")
        
        # Extraer bloques de texto con validación
        ot_block = text_upper[ot_window[0]:ot_window[1]] if ot_window else ""
        be_block = text_upper[be_window[0]:be_window[1]] if be_window else ""
        
        # Buscar representantes en sección de otorgantes
        rep_block = ""
        if ot_block:
            rep_match = re.search(r"REPRESENTAD[OA]\s+POR|PERSONA\s+QUE\s+LE\s+REPRESENTA", ot_block, re.I)
            if rep_match:
                rep_block = ot_block[rep_match.end():]
        
        reps = [n for n in find_names(rep_block) if not COMPANY_TOKENS.search(n)]
        
        # Guardar secciones raw para debug
        raw_sections = {
            "otorgantes_raw": ot_block[:1000],
            "beneficiarios_raw": be_block[:1000],
            "notario_raw": (text_upper[notario_window[0]:notario_window[1]] if notario_window else "")[:1000],
        }
        
        # Extraer otorgantes con validación mejorada
        otorgantes: List[Dict[str, Any]] = []
        for n in find_names(ot_block):
            if len(n.split()) >= 2:  # Al menos 2 palabras para ser nombre válido
                entidad = {"nombre": n, "tipo": guess_tipo(n)}
                if entidad["tipo"] == "JURIDICA" and reps:
                    entidad["representantes"] = [{"nombre": r, "tipo": "NATURAL"} for r in reps]
                otorgantes.append(entidad)

        # Extraer beneficiarios con validación
        beneficiarios: List[Dict[str, Any]] = []
        for n in find_names(be_block):
            if len(n.split()) >= 2:  # Al menos 2 palabras para ser nombre válido
                beneficiarios.append({"nombre": n, "tipo": guess_tipo(n)})
                
        return otorgantes, beneficiarios, reps, raw_sections
    
    # Fallback a la versión básica mejorada
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


