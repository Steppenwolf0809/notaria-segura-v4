import os
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from extractors.pdf_reader import PdfReader
from extractors.text_normalizer import normalize_text
from extractors.simple_extractor import extract_entities as simple_extract_entities, guess_act_type
from extractors.spacy_extractor import extract_entities as spacy_extract_entities
from extractors.semantic_analyzer import analyze_semantics
from extractors.table_reconstructor import parse_tables_with_coords
from validators.confidence_scorer import score_act
from validators.quality_validator import validate_act


API_TOKEN = os.getenv("PDF_EXTRACTOR_TOKEN") or os.getenv("API_TOKEN", "changeme")
MAX_PDF_MB = float(os.getenv("MAX_PDF_SIZE_MB") or os.getenv("MAX_PDF_MB", "10"))
MAX_PAGES = int(os.getenv("MAX_PAGES", "8"))
MAX_ACTS = int(os.getenv("MAX_ACTS", "10"))
TIMEOUT_SECONDS = int(os.getenv("TIMEOUT_SECONDS", "30"))


security = HTTPBearer(auto_error=True)


def auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials if credentials else None
    if not token or token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Token inválido")
    return True


class ExtractResponse(BaseModel):
    success: bool
    processing_time: float
    actos: list
    debug: dict | None = None


app = FastAPI(title="PDF Extractor Notarial (Python)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"success": True, "service": "pdf-extractor-python", "limits": {
        "max_pdf_mb": MAX_PDF_MB,
        "max_pages": MAX_PAGES,
        "max_acts": MAX_ACTS,
        "timeout": TIMEOUT_SECONDS,
    }}


@app.post("/extract", response_model=ExtractResponse)
async def extract(
    file: UploadFile = File(...),
    debug: int = Query(default=0, ge=0, le=1),
    _authorized: bool = Depends(auth),
):
    start = time.perf_counter()
    # Validaciones básicas
    if file.content_type not in ("application/pdf", "application/octet-stream") and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Formato inválido. Solo PDF")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_PDF_MB:
        raise HTTPException(status_code=400, detail=f"El archivo PDF es demasiado grande (máximo {int(MAX_PDF_MB)}MB)")

    # Lectura PDF
    reader = PdfReader(max_pages=MAX_PAGES)
    text, pages_read = reader.extract_text(data)
    if not text or len(text) < 5:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto legible del PDF")

    text_norm = normalize_text(text)
    text_upper = text_norm.upper()

    # Pipeline: spaCy → análisis semántico → reconstrucción tabular (fallback)
    spa_debug = {}
    try:
        spa = spacy_extract_entities(text_norm)
        spa_debug = {"entities": spa.get("entities", [])}
    except Exception:
        spa = {"sections": {}}

    # Extracción básica por regex como base
    otorgantes, beneficiarios, reps = simple_extract_entities(text_upper)
    tipo_acto = guess_act_type(text_upper)

    # Análisis semántico híbrido
    sem = analyze_semantics(text_upper, spa)

    acto = {
        "tipo_acto": tipo_acto,
        "otorgantes": otorgantes,
        "beneficiarios": beneficiarios,
        "autoridad_notarial": None,
        "fecha_otorgamiento": None,
        "perfil_acto": sem.get("perfil_acto"),
    }

    # Scoring y validación
    scoring = score_act(acto)
    validation = validate_act(acto)
    acto["validacion"] = {
        "score": scoring["score"],
        "issues": validation["issues"],
        "confianza_campos": scoring["confianza_campos"],
    }

    actos = [acto]

    # Fallback tabular si hay evidencia de tabla o si no hay otorgantes/beneficiarios
    need_tabular = (not otorgantes and not beneficiarios) or ("NOMBRES" in text_upper and "RAZON" in text_upper)
    if need_tabular:
        try:
            structured = parse_tables_with_coords(data, max_pages=MAX_PAGES)
            if structured:
                # simple consolidación: usar primera sección para otorgantes si aplica
                ot = []
                be = []
                for sec in structured:
                    if sec.get("type") == "otorgantes":
                        ot.extend(sec.get("entities", []))
                    elif sec.get("type") == "beneficiarios":
                        be.extend(sec.get("entities", []))
                if ot or be:
                    acto["otorgantes"] = [
                        {"nombre": e["nombre"], "tipo": "JURIDICA" if e.get("tipo_persona") == "Jurídica" else "NATURAL"}
                        for e in ot
                    ]
                    acto["beneficiarios"] = [
                        {"nombre": e["nombre"], "tipo": "JURIDICA" if e.get("tipo_persona") == "Jurídica" else "NATURAL"}
                        for e in be
                    ]
        except Exception:
            pass

    result_debug = {"pages_read": pages_read, "text_preview": text_norm[:500], "spacy": spa_debug}

    processing_time = round(time.perf_counter() - start, 3)
    return ExtractResponse(
        success=True,
        processing_time=processing_time,
        actos=actos,
        debug=result_debug if debug else None,
    )


