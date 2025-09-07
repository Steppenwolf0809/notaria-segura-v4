from __future__ import annotations

from typing import List, Optional, Literal, Dict
from pydantic import BaseModel, Field


class Representante(BaseModel):
    nombre: str
    tipo: Literal["NATURAL", "JURIDICA"] = Field(alias="tipo", default="NATURAL")
    tratamiento_auto: Optional[str] = None


class Entidad(BaseModel):
    nombre: str
    tipo: Literal["NATURAL", "JURIDICA"] = "NATURAL"
    tratamiento_auto: Optional[str] = None
    representantes: List[Representante] = []
    confidence: Optional[float] = None


class AutoridadNotarial(BaseModel):
    titulo: Optional[str] = None
    nombre: Optional[str] = None
    notaria_texto: Optional[str] = None
    notaria_numero: Optional[int] = None


class FechaOtorgamiento(BaseModel):
    fecha_texto: Optional[str] = None
    fecha_iso: Optional[str] = None


class PerfilActo(BaseModel):
    requiere_beneficiario: bool = False
    confidence_beneficiario: float = 0.0
    es_acto_generico: bool = False
    tipo_detectado: Optional[str] = None


class Issue(BaseModel):
    code: str
    message: str
    campo: Optional[str] = None
    confidence: float = 0.0


class ValidacionCampo(BaseModel):
    score: float = 0.0
    confianza_campos: Dict[str, float] = {}
    issues: List[Issue] = []


class Acto(BaseModel):
    tipo_acto: str
    otorgantes: List[Entidad] = []
    beneficiarios: List[Entidad] = []
    autoridad_notarial: Optional[AutoridadNotarial] = None
    fecha_otorgamiento: Optional[FechaOtorgamiento] = None
    perfil_acto: Optional[PerfilActo] = None
    validacion: Optional[ValidacionCampo] = None


class ExtractResult(BaseModel):
    success: bool = True
    processing_time: float
    actos: List[Acto] = []


