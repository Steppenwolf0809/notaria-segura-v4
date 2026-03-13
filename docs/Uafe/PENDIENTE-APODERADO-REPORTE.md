# Pendiente: Apoderado/Mandante en Reporte UAFE INTERVINIENTE

**Fecha:** 2026-03-07
**Estado:** RESUELTO (2026-03-09) - Mandante se reporta con misma calidad del contrato

## Problema

Cuando una persona comparece "por sus propios derechos" Y como "mandataria" de otra persona,
no esta claro como se reporta en el archivo INTERVINIENTE.xlsx de la UAFE.

## Ejemplo real

Minuta de promesa de compraventa protocolo P00170:

> ANA LUCIA SANCHEZ JARRIN (1706544929), por sus propios y personales derechos,
> y como Mandataria de NORMA BEATRIZ SANCHEZ JARRIN, conforme consta del Poder General.

### Lo que aparece en el reporte INTERVINIENTE real (enero 2026):

```
codigo_transaccion         tipo_id  cedula          nombre                        nac  rol  papel  secuencial
20261701018P00170          C        1704637709      MYRIAN ROCIO SANCHEZ JARRIN    ECU  01   55     7866
20261701018P00170          C        1705642674      FRANCISCO ORLANDO SANCHEZ...   ECU  01   55     7866
20261701018P00170          C        1706544929      ANA LUCIA SANCHEZ JARRIN       ECU  01   55     7866
20261701018P00170          R        1792534534001   CENTRO DE APOYO...SURKUNA      ECU  02   52     7866
```

- Ana Lucia aparece UNA sola vez con papel 55 (PROMITENTE VENDEDOR)
- Norma Beatriz NO aparece en el reporte
- Papel 55 = PROMITENTE VENDEDOR(A), Rol 01 = Otorgado por

## Preguntas para el responsable UAFE

1. Norma Beatriz deberia aparecer en el reporte? Si es asi, con que papel?
   - Opcion A: Como MANDANTE (codigo 42)
   - Opcion B: Como PROMITENTE VENDEDOR (codigo 55) porque es parte de la transaccion
   - Opcion C: No se reporta (solo firma el mandatario)

2. Ana Lucia deberia aparecer dos veces? (una por propios derechos, otra como mandataria)
   O solo una vez como en el reporte actual?

3. El campo "actuaPor" (PROPIOS_DERECHOS, APODERADO_GENERAL, etc.) se necesita en algun
   campo del reporte xlsx, o es solo registro interno?

## Catalogo Papel Interviniente (codigos relevantes)

- 09: APODERADO(A)
- 10: APODERADO(A) ESPECIAL
- 11: APODERADO(A) GENERAL
- 42: MANDANTE
- 43: MANDATARIO(A)
- 52: PROMITENTE COMPRADOR(A)
- 55: PROMITENTE VENDEDOR(A)
- 57: REPRESENTANTE LEGAL
- 63: VENDEDOR(A)
- 20: COMPRADOR(A)

## Decision final (2026-03-09)

Confirmado con responsable UAFE: el mandante (persona representada) SÍ debe reportarse.
- Ambos (mandatario y mandante) aparecen con la misma calidad del contrato
- Ejemplo: Ana Lucía (mandataria) → papel 55, Norma (mandante) → papel 55
- Implementado en `reporte-uafe-generator-service.js`: fila extra automática cuando `actuaPor !== PROPIOS_DERECHOS` y existe `mandanteCedula`
