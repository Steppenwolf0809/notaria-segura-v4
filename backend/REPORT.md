# Informe de Diagnóstico de Extracción de Concuerdos

Este reporte se llenará tras ejecutar el endpoint de diagnóstico con los dos PDFs de prueba.

## Datos de Prueba

- tests/fixtures/ActoNotarial-48018343.pdf (PROCURACIÓN JUDICIAL persona natural)
- tests/fixtures/ActoNotarial-47179730.pdf (PODER ESPECIAL persona jurídica)

## Diferencias por parser

- Completar tras ejecución: comparar `parser_simple_output`, `parser_tabular_output`, `parser_universal_output`.

## Errores típicos observados

- Cortes de líneas en tablas
- Acentos en encabezados/ordinales de notaría
- "A FAVOR DE" no detectado o duplicado con otorgantes

## Reglas del validador más penalizantes

- Falta de otorgantes
- Nombres con texto de encabezado (PERSONA, DOCUMENTO, etc.)
- Inconsistencias de tipo de persona

## Recomendaciones inmediatas (Top 5)

1. Completar heurística de "A FAVOR DE" con ventana posicional y deduplicación agresiva.
2. Afinar `cleanPersonNames` para nombres partidos en saltos de línea.
3. Mejorar `identifyColumns` con clustering robusto por X y gaps adaptativos.
4. Capitalización adecuada de nombres largos en salida canónica.
5. Agregar extracción de `cuantía` e `ubicación` en `universal-pdf-parser` (pendiente).

---

Rellenar este archivo con ejemplos extraídos y capturas de `traces` tras ejecutar el script `node scripts/run-debug-extract.js`.
