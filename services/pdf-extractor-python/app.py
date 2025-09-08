import os
import time
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from extractors.pdf_reader import PdfReader
from extractors.text_normalizer import normalize_text
from extractors.simple_extractor import extract_entities as simple_extract_entities, guess_act_type
from extractors.spacy_extractor import extract_entities as spacy_extract_entities
from extractors.semantic_analyzer import analyze_semantics, normalize_person_name, detectar_tipo_persona
from extractors.simple_extractor import find_names as simple_find_names
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

logger = logging.getLogger("pdf_extractor")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")

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
    logger.info(f"Texto crudo extraído: {text[:200].replace('\n', ' ')}...")

    # Pipeline: spaCy → análisis semántico → reconstrucción tabular (fallback)
    spa_debug = {}
    try:
        spa = spacy_extract_entities(text_norm)
        spa_debug = {"entities": spa.get("entities", []), "sections": spa.get("sections", {})}
    except Exception:
        spa = {"sections": {}}

    # Extracción básica por regex como base
    otorgantes, beneficiarios, reps = simple_extract_entities(text_upper)
    logger.info(f"Otorgantes antes procesamiento: {[o.get('nombre') for o in otorgantes]}")
    logger.info(f"Beneficiarios antes procesamiento: {[b.get('nombre') for b in beneficiarios]}")
    tipo_acto = guess_act_type(text_upper)

    # Análisis semántico híbrido
    sem = analyze_semantics(text_upper, spa)

    # Enriquecer entidades con normalización y tipo robusto
    def _enrich_list(items: list) -> list:
        out = []
        for e in items or []:
            nombre = e.get("nombre")
            norm = normalize_person_name(nombre)
            tipo_robusto = detectar_tipo_persona(nombre)
            enriched = dict(e)
            enriched["tipo"] = tipo_robusto
            enriched["apellidos"] = norm.get("apellidos")
            enriched["nombres"] = norm.get("nombres")
            enriched["orden_detectada"] = norm.get("orden_detectada")
            enriched["nombre_normalizado"] = norm.get("nombre_normalizado")
            out.append(enriched)
        return out

    otorgantes = _enrich_list(otorgantes)
    beneficiarios = _enrich_list(beneficiarios)
    logger.info(f"Otorgantes después procesamiento: {[o.get('nombre_normalizado') for o in otorgantes]}")
    logger.info(f"Tipo detectado para cada persona: {[o.get('tipo') for o in otorgantes + beneficiarios]}")

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


@app.post("/debug-extract")
async def debug_extract(
    file: UploadFile = File(...),
    _authorized: bool = Depends(auth),
):
    start = time.perf_counter()
    if file.content_type not in ("application/pdf", "application/octet-stream") and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Formato inválido. Solo PDF")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_PDF_MB:
        raise HTTPException(status_code=400, detail=f"El archivo PDF es demasiado grande (máximo {int(MAX_PDF_MB)}MB)")

    reader = PdfReader(max_pages=MAX_PAGES)
    text, pages_read = reader.extract_text(data)
    if not text or len(text) < 5:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto legible del PDF")

    text_norm = normalize_text(text)
    text_upper = text_norm.upper()

    # spaCy
    spa = {}
    try:
        spa = spacy_extract_entities(text_norm)
    except Exception:
        spa = {"sections": {}, "entities": []}

    # Secciones snippets
    section_snippets = {}
    for key, (s, e) in (spa.get("sections") or {}).items():
        try:
            section_snippets[key] = text_norm[s:e][:500]
        except Exception:
            section_snippets[key] = ""

    # Extracciones simples
    otorgantes_raw, beneficiarios_raw, reps = simple_extract_entities(text_upper)

    # Listas de solo nombres crudos
    otorgantes_nombres_raw = [o.get("nombre") for o in otorgantes_raw]
    beneficiarios_nombres_raw = [b.get("nombre") for b in beneficiarios_raw]

    # Normalización persona + tipo robusto
    def _enrich_debug(names: list) -> list:
        out = []
        for n in names:
            norm = normalize_person_name(n)
            tipo = detectar_tipo_persona(n)
            out.append({
                "original": n,
                "apellidos": norm.get("apellidos"),
                "nombres": norm.get("nombres"),
                "orden_detectada": norm.get("orden_detectada"),
                "nombre_normalizado": norm.get("nombre_normalizado"),
                "tipo_detectado": tipo,
            })
        return out

    otorgantes_debug = _enrich_debug(otorgantes_nombres_raw)
    beneficiarios_debug = _enrich_debug(beneficiarios_nombres_raw)

    # Análisis semántico y scoring/validación
    sem = analyze_semantics(text_upper, spa)
    acto_tmp = {
        "tipo_acto": guess_act_type(text_upper),
        "otorgantes": [{"nombre": n} for n in otorgantes_nombres_raw],
        "beneficiarios": [{"nombre": n} for n in beneficiarios_nombres_raw],
        "perfil_acto": sem.get("perfil_acto"),
    }
    scoring = score_act(acto_tmp)
    validation = validate_act(acto_tmp)

    processing_time = round(time.perf_counter() - start, 3)
    return {
        "success": True,
        "processing_time": processing_time,
        "pages_read": pages_read,
        "text_raw_preview": text[:800],
        "text_normalized_preview": text_norm[:800],
        "spacy": {
            "entities": spa.get("entities", [])[:150],
            "sections": spa.get("sections", {}),
            "section_snippets": section_snippets,
        },
        "names": {
            "otorgantes": otorgantes_debug,
            "beneficiarios": beneficiarios_debug,
            "representantes": reps,
        },
        "semantics": sem,
        "confidence": scoring,
        "validation": validation,
    }


