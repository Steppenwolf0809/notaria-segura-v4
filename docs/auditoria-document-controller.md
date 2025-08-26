# Auditoría de Código Muerto — document-controller.js

Fecha: 2025-08-26
Archivo auditado: `backend/src/controllers/document-controller.js`

## Resumen
- Se identificaron imports y funciones internas no utilizadas.
- Todas las funciones exportadas por el controlador están referenciadas en las rutas.
- Hay variables y parámetros definidos que no se usan (o su resultado no se utiliza), candidatos a limpieza.
- Se detectó un uso de variable no definida en una rama de ejecución (bug adyacente, no es “código muerto” pero conviene corregir).

## Metodología
- Búsqueda de referencias a funciones y símbolos dentro del archivo y en `backend/src/routes/document-routes.js`.
- Revisión manual de bloques para detectar resultados no utilizados y parámetros sin uso.

## Imports no utilizados
- `formatEventDate` importado desde `../utils/event-formatter.js` no presenta uso.
  - Ubicación: cabecera del archivo (aprox. línea 9).

## Funciones internas definidas pero no utilizadas ni exportadas
- `validateEditPermissions(user, document)`
  - Definida aprox. en línea 2893. No es exportada ni llamada en el controlador.
- `validateEditData(data, allowedFields)`
  - Definida aprox. en línea 2936. No es exportada ni llamada en el controlador.

Estas funciones parecen ser helpers planificados para la edición de documentos. Hoy no tienen efecto y pueden eliminarse o integrarse donde corresponda.

## Parámetros y variables no utilizados
- `createSmartDocumentGroup`: parámetro `skipValidation` (desestructurado) no se usa en la función.
  - Ubicación: definición de la función (aprox. línea 1540–1580).
- `updateDocumentStatus`:
  - Se calculan `currentIndex` y `newIndex` a partir de `STATUS_ORDER_LIST`, pero nunca se utilizan posteriormente.
  - Ubicación: aprox. líneas 462–470.

Estos casos son candidatos a eliminación para reducir ruido y mejorar claridad.

## Exportaciones y rutas (cobertura)
- Todas las funciones exportadas al final del archivo están importadas y utilizadas en `backend/src/routes/document-routes.js`:
  - Ejemplos: `uploadXmlDocument`, `uploadXmlDocumentsBatch`, `getAllDocuments`, `assignDocument`, `getMyDocuments`, `updateDocumentStatus`, `getDocumentById`, `getAvailableMatrizadores`, `detectGroupableDocuments`, `createDocumentGroup`, `deliverDocumentGroup`, `deliverDocument`, `getEditableDocumentInfo`, `updateDocumentInfo`, `createSmartDocumentGroup`, `undoDocumentStatusChange`, `getUndoableChanges`, `getDocumentHistory`, `updateDocumentGroupStatus`, `updateDocumentGroupInfo`, `markDocumentGroupAsReady`, `getGroupDocuments`, `ungroupDocument`, `revertDocumentStatus`.
- No se detectaron exportaciones “muertas”.

## Observaciones (no estrictamente “código muerto”, pero relevantes)
- `updateDocumentGroupStatus`: referencia a variable no definida `groupData` en el registro de evento WhatsApp para entrega grupal.
  - Bloque: dentro de la rama `newStatus === 'ENTREGADO'` al registrar un `documentEvent` (aprox. líneas 2155–2185). Usar `groupData.documents[0].id` producirá `ReferenceError` si se ejecuta esa rama. Debería apuntar a un documento existente (p. ej., `updatedDocuments[0].id`).
- Comentario residual: `// const WhatsAppService = require('../services/whatsapp-service.js');` — comentado, sin impacto.

## Recomendaciones
- Eliminar o utilizar las funciones internas `validateEditPermissions` y `validateEditData`.
- Eliminar el import no usado `formatEventDate`.
- Remover `skipValidation` de la firma de `createSmartDocumentGroup` o implementar su lógica.
- En `updateDocumentStatus`, eliminar los cálculos de `currentIndex`/`newIndex` si no se van a usar.
- Corregir la referencia a `groupData` en `updateDocumentGroupStatus` para evitar errores en ejecución.

## Notas
- No se realizaron cambios de código; este documento es solo informativo.
