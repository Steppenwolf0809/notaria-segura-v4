# Mods de plantillas (concuerdos)

Propósito:
- Alojar "modificadores" por familia de actos o reglas especiales que ajusten
  el texto base de las plantillas (A/B/C) sin duplicar lógica.

Concepto:
- Base estructural: `base_A_*`, `base_B_*`, `base_C_*` definen el esqueleto.
- Mods: funciones/fragmentos que alteran fraseo, conectores, formato de pies,
  y reglas específicas (e.g., pluralización, combinación de actos, firmas).

Ejemplos de futuras familias (orientativo):
- poderes/
- compraventas/
- donaciones/
- cancelaciones/

Reglas:
- Un mod nunca debe cambiar la estructura general; sólo refina el texto.
- Los mods deben ser idempotentes y predecibles.
- Evitar dependencias cíclicas entre mods y el engine.

Estado:
- T1: carpeta vacía con documentación.
- T2/T3: se agregarán archivos JS/HBS por familia.
