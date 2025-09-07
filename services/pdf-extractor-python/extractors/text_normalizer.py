import re


def normalize_text(text: str) -> str:
    if not text:
        return ""
    t = text
    t = t.replace("\u0000", " ")
    t = t.replace("\r", "")
    t = re.sub(r"[\t\f]+", " ", t)
    # Compactar espacios sin perder saltos de línea
    t = re.sub(r" +", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    return t.strip()


def to_upper_keep_accents(text: str) -> str:
    return (text or "").upper()


