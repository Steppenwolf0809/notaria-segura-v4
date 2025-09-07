from __future__ import annotations

import io
from typing import List, Tuple, Optional

import pdfplumber
from pdfminer.high_level import extract_text as pdfminer_extract_text


class PdfReader:
    """
    Lector robusto de PDFs usando pdfplumber con fallback a pdfminer.six.
    Aplica límites de páginas y tamaño desde el servicio que lo invoque.
    """

    def __init__(self, max_pages: int = 8):
        self.max_pages = max_pages

    def extract_text(self, data: bytes) -> Tuple[str, int]:
        """
        Devuelve (texto, paginas_leidas).
        Intenta pdfplumber y, si falla o devuelve muy poco texto, usa pdfminer.six.
        """
        text = ""
        pages_read = 0

        # Primer intento: pdfplumber
        try:
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                num = min(len(pdf.pages), self.max_pages)
                for i in range(num):
                    page = pdf.pages[i]
                    page_text = page.extract_text() or ""
                    text += (page_text.strip() + "\n")
                pages_read = num
        except Exception:
            text = ""

        # Fallback: pdfminer.six si no hay texto suficiente
        if len(text.strip()) < 20:
            try:
                # pdfminer no respeta límite de páginas fácilmente; aceptar completo
                text = (pdfminer_extract_text(io.BytesIO(data)) or "").strip()
                if text:
                    pages_read = max(pages_read, 1)
            except Exception:
                pass

        # Normalización básica
        text = (
            text.replace("\u0000", " ")
            .replace("\r", "")
            .replace("\t", " ")
        )
        return text, pages_read


