import re


def normalize_text(text: str) -> str:
    if not text:
        return ""
    t = text
    t = t.replace("\u0000", " ")
    t = t.replace("\r", "")
    t = re.sub(r"[\t\f]+", " ", t)
    # Unir líneas quebradas de nombres: si una línea termina en palabra y la siguiente inicia en mayúscula, unir
    t = re.sub(r"(\S)\n([A-ZÁÉÍÓÚÑ]{2,})", r"\1 \2", t)
    # Compactar espacios sin perder saltos de línea remanentes
    t = re.sub(r" +", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    return t.strip()


def to_upper_keep_accents(text: str) -> str:
    return (text or "").upper()


