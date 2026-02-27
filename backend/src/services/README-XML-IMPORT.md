# Parser XML de Pagos Koinor - README de Implementación

**Fecha de creación:** 28 de enero de 2026  
**Rama:** `feature/xml-payment-parser`  
**Estado:** Implementación completa - Pendiente migración BD y dependencias

---

## ✅ ARCHIVOS IMPLEMENTADOS

### Servicios Principales
- ✅ [`xml-koinor-parser.js`](./xml-koinor-parser.js) - Parser XML por streaming
- ✅ [`import-koinor-xml-service.js`](./import-koinor-xml-service.js) - Orquestador de importación
- (Eliminado) `import-koinor-service.legacy.js` - Sistema XLS eliminado, reemplazado por Sync Agent

### Controladores y Rutas
- ✅ [`../controllers/billing-controller.js`](../controllers/billing-controller.js) - Endpoint `importXmlFile()` agregado
- ✅ [`../routes/billing-routes.js`](../routes/billing-routes.js) - Ruta `/import-xml` creada
- ✅ [`../utils/billing-utils.js`](../utils/billing-utils.js) - Funciones XML agregadas

### Base de Datos
- ✅ [`../../prisma/schema.prisma`](../../prisma/schema.prisma) - Modificado (ver cambios abajo)

### Documentación
- ✅ [`../../../plans/parser-xml-koinor-plan.md`](../../../plans/parser-xml-koinor-plan.md) - Plan completo
- ✅ [`../../../plans/ACLARACION-NORMALIZACION-FACTURAS.md`](../../../plans/ACLARACION-NORMALIZACION-FACTURAS.md) - Aclaración de normalización

---

## 🔴 PENDIENTES CRÍTICOS

### 1. Instalar Dependencias

```bash
cd backend
npm install sax iconv-lite
```

**Dependencias (Pure JavaScript - sin compilación nativa):**
- `sax@^1.4.1` - Parser XML por streaming (Pure JS, sin node-gyp)
- `iconv-lite@^0.6.3` - Decodificación UTF-16LE (Pure JS)

**Nota:** Se usa `sax` en lugar de `xml-stream` porque `sax` es pure JavaScript
y no requiere compilación con node-gyp, lo que facilita el despliegue en Windows
y en producción.

### 2. Ejecutar Migración de Base de Datos

**Cambios en schema.prisma:**

#### Invoice - Agregar campo `paidAmount`
```prisma
model Invoice {
  // ... campos existentes ...
  totalAmount       Decimal       @db.Decimal(12, 2)
  paidAmount        Decimal?      @db.Decimal(12, 2) @default(0)  // 🆕 NUEVO
  // ...
}
```

#### Payment - Remover constraint unique
```prisma
model Payment {
  id              String      @id @default(uuid())
  receiptNumber   String      // 🔄 Sin @unique (antes era @unique)
  // ...
  @@index([receiptNumber])  // 🆕 Índice no-único
}
```

**Comando para aplicar:**

```bash
# Opción 1: Crear migración formal
cd backend
npx prisma migrate dev --name add_paidAmount_remove_payment_unique

# Opción 2: Push directo (desarrollo)
npx prisma db push

# Regenerar cliente Prisma
npx prisma generate
```

**⚠️ IMPORTANTE:** Aplicar primero en staging/desarrollo, validar, luego en producción.

---

## 📋 CAMBIOS REALIZADOS

### Modelo de Datos

**Invoice:**
- Campo `paidAmount` para tracking incremental de pagos
- Elimina necesidad de calcular suma de payments cada vez

**Payment:**
- `receiptNumber` ya NO es único
- Permite múltiples registros Payment con mismo receiptNumber (pagos multi-factura)
- Índice agregado para búsquedas eficientes

### API Endpoints

**NUEVO:** `POST /api/billing/import-xml`
- Acepta archivos XML (hasta 50MB)
- Procesa pagos por streaming
- Idempotencia estricta
- Retorna estadísticas detalladas

**DEPRECADO:** `POST /api/billing/import`
- Sistema XLS legacy
- Mantener 1 mes para transición
- Comentar después del 28 de febrero de 2026

### Estrategia de Búsqueda

**CRÍTICO - Entender la normalización:**

```javascript
// XML Koinor trae numtra en formato RAW
const numtraXML = "001002-00123341"; // <numtra>

// ✅ CORRECTO: Buscar por invoiceNumberRaw
const invoice = await prisma.invoice.findFirst({
  where: { invoiceNumberRaw: numtraXML }
});

// ❌ INCORRECTO: NO normalizar antes de buscar
const normalized = normalizeInvoiceNumber(numtraXML);
const invoice = await prisma.invoice.findFirst({
  where: { invoiceNumber: normalized } // Más lento
});
```

**Por qué:**
- `invoiceNumberRaw` mantiene formato original del sistema Koinor
- Búsqueda directa sin conversiones
- Campo indexado para performance

---

## 🧪 TESTING

### Pruebas Manuales Recomendadas

1. **Archivo pequeño (50 registros)**
   ```bash
   # Crear XML de prueba desde el grande
   # Probar endpoint /import-xml
   # Verificar que no hay duplicados al subir 2 veces
   ```

2. **Archivo real (7000+ registros)**
   ```bash
   # Usar: docs/112025-012026 (1).xml
   # Medir tiempo de procesamiento
   # Validar memoria estable
   ```

3. **Idempotencia**
   ```bash
   # Subir mismo archivo 3 veces
   # Verificar que paymentsSkipped aumenta
   # Verificar que NO hay duplicados en BD
   ```

4. **Pagos multi-factura**
   ```bash
   # Buscar en XML pagos con mismo receiptNumber
   # Verificar que se crean múltiples Payment
   # Verificar que cada Invoice se actualiza correctamente
   ```

### Queries de Validación

```sql
-- Verificar campo paidAmount agregado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'paidAmount';

-- Verificar que receiptNumber ya NO es único
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'payments' AND constraint_name LIKE '%receiptNumber%';

-- Verificar índice creado
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'payments' AND indexname LIKE '%receiptNumber%';

-- Buscar pagos multi-factura
SELECT "receiptNumber", COUNT(*) as count
FROM payments
GROUP BY "receiptNumber"
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;
```

---

## 🚀 DEPLOYMENT

### Staging

1. Merge a rama `staging`
2. Deploy automático (Railway)
3. Ejecutar migración en BD staging
4. Instalar dependencias
5. Probar con XML real

### Producción

1. Validar en staging mínimo 1 semana
2. Backup de base de datos producción
3. Merge a `main`
4. Deploy en ventana de mantenimiento
5. Ejecutar migración en BD producción
6. Monitorear logs primeras 24h

### Rollback Plan

Si hay problemas:
1. Revertir commit de migración
2. Ejecutar migración inversa
3. Reactivar endpoint XLS
4. Investigar causa raíz

---

## 📊 MONITOREO

### Logs a Revisar

```bash
# Ver importaciones recientes
SELECT * FROM import_logs 
WHERE "fileType" = 'XML_KOINOR' 
ORDER BY "startedAt" DESC 
LIMIT 10;

# Ver errores
SELECT * FROM import_logs 
WHERE status = 'FAILED' OR status = 'COMPLETED_WITH_ERRORS'
ORDER BY "startedAt" DESC;

# Ver estadísticas de pagos
SELECT 
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  COUNT(DISTINCT "receiptNumber") as unique_receipts
FROM payments
WHERE "importedAt" > NOW() - INTERVAL '7 days';
```

### Métricas Esperadas

- **Tiempo de procesamiento:** < 2 min para 7000 registros
- **Memoria:** < 500MB durante import
- **Idempotencia:** 0 duplicados en 2da importación
- **Éxito:** > 99% de pagos procesados

---

## 🔧 TROUBLESHOOTING

### Error: "Invoice not found"

**Causa:** Factura no existe en sistema  
**Solución:** Importar facturas primero desde XLS/XML

### Error: "Cannot read properties of null"

**Causa:** Estructura XML inesperada  
**Solución:** Validar formato XML con una inspeccion manual del archivo (nodos `factura/infoTributaria`).

### Error: "Timeout de transacción"

**Causa:** Archivo muy grande o BD lenta  
**Solución:** Dividir archivo en períodos menores

### Error: "Encoding detection error"

**Causa:** Archivo no está en UTF-16LE o UTF-8  
**Solución:** Verificar encoding del archivo, convertir si es necesario

---

## 📚 RECURSOS ADICIONALES

### Documentos de Referencia

- [Plan Completo](../../../plans/parser-xml-koinor-plan.md)
- [Aclaración Normalización](../../../plans/ACLARACION-NORMALIZACION-FACTURAS.md)
- [Billing Utils](../utils/billing-utils.js)

### Ejemplos de Uso

```javascript
// Importar desde código
import { importKoinorXMLFile } from './services/import-koinor-xml-service.js';

const buffer = fs.readFileSync('path/to/file.xml');
const result = await importKoinorXMLFile(buffer, 'file.xml', userId);

console.log(result.stats);
// {
//   totalTransactions: 6926,
//   paymentsCreated: 3200,
//   paymentsSkipped: 150,
//   invoicesUpdated: 3200,
//   documentsUpdated: 2800,
//   errors: 12
// }
```

---

## 👥 CONTACTO Y SOPORTE

**Desarrollador:** Sistema implementado en modo Code  
**Fecha:** 28 de enero de 2026  
**Rama:** `feature/xml-payment-parser`

**Para dudas o problemas:**
1. Revisar logs de importación en BD
2. Ver `errorDetails` en `import_logs`
3. Consultar documentación en `/plans`

---

## ✅ CHECKLIST FINAL

Antes de considerar la implementación completa:

- [ ] Dependencias instaladas (xml-stream, iconv-lite)
- [ ] Migración de BD ejecutada y validada
- [ ] Cliente Prisma regenerado
- [ ] Tests manuales exitosos
- [ ] Archivo XML real procesado correctamente
- [ ] Idempotencia verificada (subir 2 veces mismo archivo)
- [ ] Logs de importación revisados
- [ ] Performance validado (< 2 min para 7000 registros)
- [ ] Memoria estable durante procesamiento
- [ ] Documentación actualizada
- [ ] Equipo notificado del nuevo endpoint

---

**Última actualización:** 28 de enero de 2026  
**Estado:** ✅ Código implementado - ⏳ Pendiente dependencias y migración BD
