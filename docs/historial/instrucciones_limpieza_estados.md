# 🧹 INSTRUCCIONES PARA CURSOR: Script de Limpieza de Estados Documentales

## 🎯 OBJETIVO
Crear un script Node.js que actualice el estado de documentos a `ENTREGADO`, exceptuando una lista específica de códigos de barras que deben mantener su estado actual (`EN_PROCESO` o `LISTO`).

---

## 📁 ARCHIVOS DE CONTEXTO REQUERIDOS

### 🔴 CRÍTICOS (analizar primero):
- `backend/prisma/schema.prisma` - Confirmar estructura de tabla Documento

### 🟡 IMPORTANTES:
- `backend/package.json` - Dependencias existentes

---

## 📋 ESPECIFICACIONES TÉCNICAS

### Tabla y Campos
- **Tabla**: `Documento` (verificar nombre exacto en schema)
- **Campo estado**: `status`
- **Valores posibles**: `EN_PROCESO`, `LISTO`, `ENTREGADO`
- **Campo identificador**: `codigoBarras`

### Filtro por Matrizador (MUY IMPORTANTE)
El script SOLO debe afectar documentos de estos dos matrizadores:

| ID | Nombre en BD (matrizadorName) |
|----|-------------------------------|
| 12 | MAYRA CRISTINA CORELLA PARRA |
| 8  | FRANCISCO ESTEBAN PROAÑO ASTUDILLO |

**Campo**: `matrizadorName` (texto) o `assignedToId` (ID numérico)

### Lógica del Script
```
SI documento.status IN ('EN_PROCESO', 'LISTO')
   Y documento.assignedToId IN (8, 12)  -- Solo estos matrizadores
   Y documento.codigoBarras NO ESTÁ en lista_excepciones
ENTONCES
   documento.status = 'ENTREGADO'
```

> ⚠️ **CRÍTICO**: Documentos de otros matrizadores NO deben tocarse bajo ninguna circunstancia.

---

## 🏗️ ESTRUCTURA DEL SCRIPT

Crear en: `scripts/limpieza-estados/`

```
scripts/
├── limpieza-estados/
│   ├── package.json
│   ├── .env.example
│   ├── excepciones.txt        # Lista de códigos a NO modificar
│   ├── index.js               # Script principal
│   └── README.md
```

---

## 📦 DEPENDENCIAS

```json
{
  "name": "limpieza-estados",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "preview": "node index.js --preview",
    "ejecutar": "node index.js --ejecutar"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "exceljs": "^4.4.0",
    "dotenv": "^16.3.0",
    "readline": "^1.3.0"
  }
}
```

---

## 🔧 FUNCIONALIDADES REQUERIDAS

### 1. Archivo de Excepciones (`excepciones.txt`)
Formato simple, un código por línea:
```
20251701018P02635
20251701018C02510
20261701018D00015
```

El script debe:
- Leer este archivo al iniciar
- Ignorar líneas vacías y comentarios (líneas que empiecen con #)
- Mostrar cuántas excepciones se cargaron

### 2. Modo PREVIEW (--preview)
**NO modifica la base de datos**, solo muestra:

```
🔍 PREVIEW DE LIMPIEZA DE ESTADOS
==================================
📋 Excepciones cargadas: 23 códigos
👤 Matrizadores afectados: 
   - MAYRA CRISTINA CORELLA PARRA (ID: 12)
   - FRANCISCO ESTEBAN PROAÑO ASTUDILLO (ID: 8)

DOCUMENTOS DE ESTOS MATRIZADORES:
- EN_PROCESO: 145
- LISTO: 89
- ENTREGADO: 312

DESPUÉS DE LIMPIEZA:
- EN_PROCESO: 8 (en excepciones)
- LISTO: 15 (en excepciones)
- ENTREGADO: 523 (+211 nuevos)

⚠️  Documentos de OTROS matrizadores: 756 (NO SE TOCARÁN)

DETALLE DE CAMBIOS PENDIENTES:
┌──────────────────────┬─────────────┬──────────────┬─────────────────────┐
│ Código Barras        │ Estado Actual│ Nuevo Estado │ Matrizador          │
├──────────────────────┼─────────────┼──────────────┼─────────────────────┤
│ 20251701018P02630    │ EN_PROCESO  │ ENTREGADO    │ MAYRA CRISTINA...   │
│ 20251701018C02506    │ LISTO       │ ENTREGADO    │ FRANCISCO EST...    │
│ ...                  │ ...         │ ...          │ ...                 │
└──────────────────────┴─────────────┴──────────────┴─────────────────────┘

Total a modificar: 211 documentos (solo de Mayra y Francisco)

⚠️  Este es solo un PREVIEW. Para aplicar cambios ejecute:
    npm run ejecutar
```

### 3. Modo EJECUTAR (--ejecutar)
Aplica los cambios con confirmación:

```
🚨 MODO EJECUCIÓN - CAMBIOS EN PRODUCCIÓN
==========================================
📋 Excepciones cargadas: 23 códigos

Se modificarán 211 documentos:
- 145 de EN_PROCESO → ENTREGADO
- 66 de LISTO → ENTREGADO

⚠️  ¿Has verificado que tienes un backup reciente? (s/n): s
⚠️  ¿Confirmas ejecutar los cambios? (s/n): s

Ejecutando...
[████████████████████████████████] 100% | 211/211

✅ COMPLETADO
- Documentos actualizados: 211
- Tiempo: 2.3 segundos

📊 Generando reporte...
✅ Reporte guardado: cambios_20260114_163045.xlsx
```

### 4. Reporte Excel de Cambios
Generar archivo con los cambios realizados:

**Hoja 1: Resumen**
| Métrica | Valor |
|---------|-------|
| Fecha ejecución | 2026-01-14 16:30:45 |
| Matrizadores afectados | Mayra Corella (12), Francisco Proaño (8) |
| Total modificados | 211 |
| De EN_PROCESO a ENTREGADO | 145 |
| De LISTO a ENTREGADO | 66 |
| Excepciones respetadas | 23 |
| Docs de otros matrizadores (intactos) | 756 |

**Hoja 2: Documentos Modificados**
| Código Barras | Matrizador | Estado Anterior | Nuevo Estado | Tipo Documento | Cliente | Fecha Original |
|---------------|------------|-----------------|--------------|----------------|---------|----------------|

**Hoja 3: Excepciones (No Modificados)**
| Código Barras | Matrizador | Estado Actual | Tipo Documento | Cliente |
|---------------|------------|---------------|----------------|---------|

**Hoja 4: Resumen por Matrizador**
| Matrizador | EN_PROCESO → ENTREGADO | LISTO → ENTREGADO | Excepciones | Total Modificados |
|------------|------------------------|-------------------|-------------|-------------------|
| MAYRA CRISTINA CORELLA PARRA | 85 | 40 | 12 | 125 |
| FRANCISCO ESTEBAN PROAÑO ASTUDILLO | 60 | 26 | 11 | 86 |

---

## ⚙️ CONFIGURACIÓN (.env)

```env
# Conexión a Railway PostgreSQL (PRODUCCIÓN)
# ⚠️ CUIDADO: Este script MODIFICA datos
DATABASE_URL=postgresql://usuario:password@switchback.proxy.rlwy.net:25513/railway
```

---

## 🛡️ MEDIDAS DE SEGURIDAD

### Obligatorias:
1. **Confirmación doble** antes de ejecutar cambios
2. **Verificación de backup** preguntando al usuario
3. **Modo preview por defecto** si no se especifica flag
4. **Transacción SQL** para poder hacer rollback si hay error
5. **Reporte completo** de todos los cambios

### Query de Actualización (con transacción):
```sql
BEGIN;

UPDATE "Documento"
SET 
  "status" = 'ENTREGADO',
  "updatedAt" = NOW()
WHERE 
  "status" IN ('EN_PROCESO', 'LISTO')
  AND "assignedToId" IN (8, 12)  -- Solo Mayra y Francisco
  AND "codigoBarras" NOT IN (lista_excepciones);

-- Si todo OK:
COMMIT;

-- Si hay error:
ROLLBACK;
```

> **Nota**: Usar `assignedToId` (numérico) es más seguro que `matrizadorName` (texto) para evitar problemas de mayúsculas/espacios.

---

## 📝 ARCHIVO README.md

```markdown
# Script de Limpieza de Estados

## Uso

### 1. Configurar excepciones
Edita `excepciones.txt` con los códigos que NO deben modificarse:
```
# Documentos pendientes de María
20251701018P02635
20251701018C02510

# Documentos pendientes de Juan  
20261701018D00015
```

### 2. Configurar conexión
Copia `.env.example` a `.env` y configura las credenciales de la BD.

### 3. Ver preview (SIN modificar)
```bash
npm run preview
```

### 4. Ejecutar cambios
```bash
npm run ejecutar
```

## ⚠️ Importante
- SIEMPRE ejecuta `preview` antes de `ejecutar`
- SIEMPRE verifica que tienes un backup reciente
- Los cambios son IRREVERSIBLES (aunque tienes el reporte para referencia)
```

---

## 🎓 CONCEPTOS EDUCATIVOS

Al implementar, explicar:
1. **Transacciones SQL**: Por qué usamos BEGIN/COMMIT/ROLLBACK
2. **Modo dry-run**: Patrón común para scripts peligrosos
3. **Confirmación interactiva**: Usando readline en Node.js
4. **Prepared statements**: Prevención de SQL injection con la lista de excepciones

---

## ✅ CRITERIOS DE ACEPTACIÓN

- [ ] **CRÍTICO**: Solo afecta documentos de assignedToId IN (8, 12)
- [ ] Lee archivo de excepciones correctamente
- [ ] Modo preview muestra cambios sin modificar BD
- [ ] Preview muestra claramente cuántos docs de OTROS matrizadores NO se tocarán
- [ ] Modo ejecutar requiere doble confirmación
- [ ] Usa transacción SQL para seguridad
- [ ] Genera reporte Excel de cambios (4 hojas)
- [ ] Muestra progreso durante ejecución
- [ ] Maneja errores gracefully con rollback
- [ ] Funciona en Windows

---

## 🚀 COMANDO PARA CURSOR

"Crea un script de limpieza de estados documentales según las especificaciones del archivo. El script debe leer una lista de excepciones desde un archivo de texto, tener modo preview y modo ejecución con doble confirmación, usar transacciones SQL, y generar un reporte Excel de los cambios realizados."
