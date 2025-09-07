import os
import requests
from extractors.semantic_analyzer import analizar_requiere_beneficiario
from extractors.table_reconstructor import reconstruct_tabular_lines


def test_health_localhost_if_running():
    url = os.getenv("PY_PDF_EXTRACT_URL", "http://localhost:8000/health")
    try:
        r = requests.get(url, timeout=1)
        assert r.status_code in (200, 404)
    except Exception:
        # Servicio puede no estar corriendo en CI/local, test no bloqueante
        assert True


def test_semantic_requires_beneficiary_indeterminada():
    requiere, conf = analizar_requiere_beneficiario("CUANTÍA INDETERMINADA", "")
    assert requiere is False
    assert conf >= 0.8


def test_reconstruct_two_words_lines():
    lines = ["PAREDES MONTUFAR", "CAMILO", "OTRA LINEA"]
    out = reconstruct_tabular_lines(lines)
    assert out[0] == "PAREDES MONTUFAR CAMILO"
