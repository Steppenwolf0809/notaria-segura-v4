# Test Plan: Group Status Button Fix

## ✅ CAMBIOS REALIZADOS

### 1. KanbanView.jsx (Matrizador)
- ✅ Agregada detección de grupos en `handleAdvanceStatus`
- ✅ Uso correcto de `documentService.updateDocumentGroupStatus`
- ✅ Logging detallado para debugging
- ✅ Manejo tanto para confirmación como sin confirmación

### 2. KanbanArchivo.jsx (Archivo)
- ✅ Agregada detección de grupos en `handleAdvanceStatus`
- ✅ Uso correcto de `documentService.updateDocumentGroupStatus`
- ✅ Actualizado `handleConfirmStatusChange` para grupos
- ✅ Información de grupo pasada al modal de confirmación

### 3. Backend (document-controller.js)
- ✅ Error 500 corregido en `updateDocumentGroupStatus`
- ✅ Logging detallado añadido
- ✅ Referencia incorrecta `result.group` → `updatedDocuments[0]` arreglada

## 📋 CASOS DE PRUEBA REQUERIDOS

### Test 1: Botón "Marcar Listo" en Documento Individual
**Input:** Click en botón "Marcar Listo" en documento NO agrupado
**Expected:** Solo ese documento cambia de estado
**Log esperado:** "Lógica individual"

### Test 2: Botón "Marcar Listo" en Documento de Grupo
**Input:** Click en botón "Marcar Listo" en documento agrupado
**Expected:** TODOS los documentos del grupo cambian de estado
**Log esperado:** "🔗 Ejecutando cambio de grupo"

### Test 3: Drag and Drop de Grupo
**Input:** Arrastrar documento de grupo a otra columna
**Expected:** TODOS los documentos del grupo se mueven
**Log esperado:** Lógica de grupo en drag and drop

### Test 4: Modal de Detalle con Grupo
**Input:** Cambiar estado desde modal de documento agrupado
**Expected:** TODOS los documentos del grupo cambian

### Test 5: Consistencia UI
**Input:** Cambio de estado de grupo
**Expected:** 
- Todas las tarjetas del grupo muestran nuevo estado
- Indicador de grupo se mantiene
- Contadores de estado se actualizan correctamente

## 🔍 VERIFICACIONES DE CONSOLA

### Logs Esperados para Documento Individual:
```
🚀 handleAdvanceStatus: DOCUMENTO_INDIVIDUAL → LISTO
🔗 Información de agrupación desde botón: { isGrouped: false, groupId: null, groupSize: 1 }
✅ Cambio no requiere confirmación, ejecutando directamente
📊 Resultado de updateDocumentStatusWithConfirmation: { success: true }
```

### Logs Esperados para Documento de Grupo:
```
🚀 handleAdvanceStatus: DOCUMENTO_GRUPO → LISTO  
🔗 Información de agrupación desde botón: { isGrouped: true, groupId: "GROUP_ID", groupSize: 3 }
✅ Cambio no requiere confirmación, ejecutando directamente
🔗 Ejecutando cambio de grupo sin confirmación
🔗 Llamando updateDocumentGroupStatus (sin confirmación) con: { groupId: "GROUP_ID", newStatus: "LISTO" }
✅ Cambio de grupo exitoso sin confirmación
```

### Logs Esperados en Backend:
```
🔄 updateDocumentGroupStatus iniciado: { documentGroupId: "GROUP_ID", newStatus: "LISTO" }
🔍 Buscando documentos del grupo: GROUP_ID
📄 Documentos encontrados: { count: 3, documents: [...] }
📝 Actualizando documentos con datos: { status: "LISTO", verificationCode: "1234" }
✅ Documentos actualizados: { count: 3, newStatus: "LISTO" }
```

## 🚨 ERRORES A EVITAR

1. **❌ Error 500** - Ya corregido en backend
2. **❌ Solo un documento cambia** - Ya corregido con detección de grupos  
3. **❌ UI no se actualiza** - Store debe recibir todos los documentos actualizados
4. **❌ Separación de grupos** - Nunca debe ocurrir con la nueva lógica

## 🎯 RESULTADO ESPERADO

- ✅ Botón "Marcar Listo" funciona igual que drag and drop
- ✅ Grupos se mantienen siempre juntos
- ✅ UI consistente en todos los métodos de cambio de estado
- ✅ No más errores 500 en grupo endpoints