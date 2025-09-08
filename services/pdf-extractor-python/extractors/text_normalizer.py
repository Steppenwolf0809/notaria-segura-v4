import re


def normalize_text(text: str) -> str:
    """Normalización mejorada de texto para documentos notariales."""
    if not text:
        return ""
    
    t = text
    # Limpiar caracteres problemáticos
    t = t.replace("\u0000", " ")
    t = t.replace("\u00A0", " ")  # Non-breaking space
    t = t.replace("\r", "")
    t = re.sub(r"[\t\f]+", " ", t)
    
    # Mejorar reconstrucción de nombres fragmentados
    # Patrón 1: Línea termina en palabra y siguiente empieza en mayúscula
    t = re.sub(r"(\S)\n([A-ZÁÉÍÓÚÑ]{2,})", r"\1 \2", t)
    
    # Patrón 2: Nombres que se cortan con guión al final de línea
    t = re.sub(r"([A-ZÁÉÍÓÚÑ]+)-\n([A-ZÁÉÍÓÚÑ]+)", r"\1\2", t)
    
    # Patrón 3: Fragmentos de nombres separados por saltos de línea cortos
    # Solo si la línea anterior es corta (probablemente fragmento)
    lines = t.split('\n')
    reconstructed = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        # Si es una línea corta (< 30 chars) con solo mayúsculas
        # y la siguiente también parece parte del nombre
        if (len(line) < 30 and 
            len(line.split()) <= 3 and
            re.match(r'^[A-ZÁÉÍÓÚÑ\s]{2,}$', line) and
            i + 1 < len(lines)):
            
            next_line = lines[i + 1].strip()
            if (next_line and 
                len(next_line) < 50 and
                re.match(r'^[A-ZÁÉÍÓÚÑ\s]{2,}', next_line)):
                
                # Combinar las líneas
                combined = f"{line} {next_line}"
                reconstructed.append(combined)
                i += 2
                continue
        
        reconstructed.append(line)
        i += 1
    
    t = '\n'.join(reconstructed)
    
    # Compactar espacios y limpiar saltos de línea
    t = re.sub(r" +", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    
    # Eliminar líneas excesivamente cortas que son probablemente ruido
    lines = t.split('\n')
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        # Mantener líneas que tengan contenido sustancial o sean parte de estructura
        if len(stripped) >= 3 or re.search(r'[A-ZÁÉÍÓÚÑ]{2,}', stripped):
            clean_lines.append(line)
    
    return '\n'.join(clean_lines).strip()


def to_upper_keep_accents(text: str) -> str:
    return (text or "").upper()


