#!/usr/bin/env python3
"""
Script de prueba para validar las mejoras del extractor PDF.
Ejecutar desde el directorio del microservicio Python.
"""

import sys
import os
import json
from pathlib import Path

# Agregar el directorio actual al path para importar módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from extractors.pdf_reader import PdfReader
from extractors.text_normalizer import normalize_text
from extractors.simple_extractor import extract_entities, find_names, _clean_name_candidate
from extractors.semantic_analyzer import normalize_person_name, detectar_tipo_persona
from validators.confidence_scorer import score_act
from validators.quality_validator import validate_act


def test_name_cleaning():
    """Prueba la limpieza de nombres mejorada."""
    print("=== PRUEBA DE LIMPIEZA DE NOMBRES ===")
    
    # Casos problemáticos identificados por el usuario
    test_cases = [
        "IDENTIFICACIÓN REPRESENTA MATA CARRILLO ANDREA POR SUS",
        "MANDANTE PATRICIA DERECHOS NA", 
        "CUANTÍA DEL ACTO",
        "INDETERMINADA CONTRATO",
        "LE PERSONA NOMBRES",
        "DERECHOS NA",
        "ECUATORIA MANDATARIO",
        "MATA CARRILLO ANDREA POR SUS PROPIOS DERECHOS",
        "MOROCHO RIGOBERTO DE JESUS",
        "PATRICIA ALEXANDRA MORALES",
    ]
    
    for i, case in enumerate(test_cases, 1):
        cleaned = _clean_name_candidate(case)
        print(f"{i:2d}. Original: '{case}'")
        print(f"    Limpio:   '{cleaned}' {'✅' if cleaned else '❌ FILTRADO'}")
        print()


def test_name_finding():
    """Prueba la función de búsqueda de nombres mejorada."""
    print("=== PRUEBA DE BÚSQUEDA DE NOMBRES ===")
    
    # Texto simulado problemático
    text_sample = """
    OTORGADO POR:
    IDENTIFICACIÓN REPRESENTA MATA CARRILLO ANDREA POR SUS 
    PROPIOS DERECHOS ECUATORIANA
    MANDANTE PATRICIA
    DERECHOS NA
    
    A FAVOR DE:
    MOROCHO RIGOBERTO DE JESUS
    ECUATORIANO
    """
    
    names = find_names(text_sample)
    print("Texto de prueba:")
    print(text_sample)
    print("\nNombres encontrados:")
    for i, name in enumerate(names, 1):
        tipo = detectar_tipo_persona(name)
        print(f"{i:2d}. '{name}' ({tipo})")


def analyze_pdf_sample():
    """Analiza el PDF de muestra si está disponible."""
    print("=== ANÁLISIS DE PDF DE MUESTRA ===")
    
    pdf_path = Path("tests/test_pdfs/ActoNotarial-47179730.pdf")
    if not pdf_path.exists():
        print(f"❌ No se encontró el PDF de muestra en: {pdf_path}")
        return
    
    print(f"✅ Analizando PDF: {pdf_path}")
    
    try:
        # Leer PDF
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()
        
        reader = PdfReader(max_pages=8)
        text, pages_read, method = reader.extract_text(pdf_data)
        
        print(f"Páginas leídas: {pages_read}")
        print(f"Método: {method}")
        print(f"Longitud texto: {len(text)} caracteres")
        
        # Normalizar texto
        text_norm = normalize_text(text)
        text_upper = text_norm.upper()
        
        print(f"Longitud después de normalización: {len(text_norm)}")
        
        # Mostrar preview del texto
        print("\n--- PREVIEW DEL TEXTO NORMALIZADO ---")
        print(text_norm[:500] + "..." if len(text_norm) > 500 else text_norm)
        
        # Extraer entidades
        otorgantes, beneficiarios, reps = extract_entities(text_upper)
        
        print(f"\n--- RESULTADOS DE EXTRACCIÓN ---")
        print(f"Otorgantes encontrados: {len(otorgantes)}")
        for i, ot in enumerate(otorgantes, 1):
            nombre = ot.get('nombre', '')
            tipo = ot.get('tipo', '')
            print(f"  {i}. {nombre} ({tipo})")
        
        print(f"\nBeneficiarios encontrados: {len(beneficiarios)}")
        for i, ben in enumerate(beneficiarios, 1):
            nombre = ben.get('nombre', '')
            tipo = ben.get('tipo', '')
            print(f"  {i}. {nombre} ({tipo})")
        
        if reps:
            print(f"\nRepresentantes: {len(reps)}")
            for i, rep in enumerate(reps, 1):
                print(f"  {i}. {rep}")
        
        # Crear acto simulado para scoring
        acto = {
            "tipo_acto": "PODER ESPECIAL",
            "otorgantes": otorgantes,
            "beneficiarios": beneficiarios,
            "tiene_beneficiarios": bool(beneficiarios),
        }
        
        # Calcular confianza
        scoring = score_act(acto)
        validation = validate_act(acto)
        
        print(f"\n--- EVALUACIÓN DE CALIDAD ---")
        print(f"Score global: {scoring['score']}")
        print("Confianza por campo:")
        for campo, conf in scoring['confianza_campos'].items():
            print(f"  {campo}: {conf}")
        
        if validation['issues']:
            print(f"\nProblemas detectados:")
            for issue in validation['issues']:
                print(f"  - {issue['message']} (confidence: {issue['confidence']})")
        else:
            print("\n✅ No se detectaron problemas críticos")
            
    except Exception as e:
        print(f"❌ Error al procesar PDF: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Ejecuta todas las pruebas."""
    print("🔧 PRUEBAS DE MEJORAS DEL EXTRACTOR PDF")
    print("=" * 50)
    
    test_name_cleaning()
    print("\n" + "="*50 + "\n")
    
    test_name_finding() 
    print("\n" + "="*50 + "\n")
    
    analyze_pdf_sample()
    
    print("\n" + "="*50)
    print("✅ Pruebas completadas")


if __name__ == "__main__":
    main()
