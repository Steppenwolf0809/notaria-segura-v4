import { db } from '../src/db.js';

/**
 * Extrae el secuencial de un número de factura
 * "001-002-000123570" → "123570"
 * "001002-00123570" → "123570"
 */
function extractSecuencial(invoiceNumber) {
  if (!invoiceNumber) return '';
  const str = String(invoiceNumber);
  // Obtener los últimos dígitos después del último guión
  const parts = str.split('-');
  const lastPart = parts[parts.length - 1];
  // Remover ceros a la izquierda
  return lastPart.replace(/^0+/, '') || '0';
}

async function vincularFacturasDocumentos() {
  console.log('=== VINCULACIÓN DE FACTURAS CON DOCUMENTOS ===\n');
  
  let vinculadas = 0;
  let noEncontradas = 0;
  let yaVinculadas = 0;
  let errores = 0;
  
  try {
    // 1. Obtener todos los documentos con numeroFactura que NO tienen facturas vinculadas
    const documentos = await db.document.findMany({
      where: {
        numeroFactura: { not: null },
        invoices: { none: {} }
      },
      select: {
        id: true,
        protocolNumber: true,
        numeroFactura: true,
        clientName: true
      }
    });
    
    console.log(`Documentos con numeroFactura sin vincular: ${documentos.length}\n`);
    
    // 2. Crear mapa de secuencial → documento para búsqueda rápida
    const docsBySecuencial = new Map();
    for (const doc of documentos) {
      const seq = extractSecuencial(doc.numeroFactura);
      if (seq && seq.length >= 5) {
        if (!docsBySecuencial.has(seq)) {
          docsBySecuencial.set(seq, []);
        }
        docsBySecuencial.get(seq).push(doc);
      }
    }
    
    console.log(`Secuenciales únicos de documentos: ${docsBySecuencial.size}\n`);
    
    // 3. Obtener facturas sin documentId
    const facturas = await db.invoice.findMany({
      where: { documentId: null },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceNumberRaw: true,
        clientName: true
      }
    });
    
    console.log(`Facturas sin vincular: ${facturas.length}\n`);
    console.log('Procesando vinculaciones...\n');
    
    // 4. Vincular facturas con documentos por secuencial
    for (const factura of facturas) {
      const seqFromNumber = extractSecuencial(factura.invoiceNumber);
      const seqFromRaw = extractSecuencial(factura.invoiceNumberRaw);
      
      // Buscar documento por cualquiera de los secuenciales
      let docs = docsBySecuencial.get(seqFromNumber) || docsBySecuencial.get(seqFromRaw);
      
      if (docs && docs.length > 0) {
        // Tomar el primer documento que coincida
        const doc = docs[0];
        
        try {
          await db.invoice.update({
            where: { id: factura.id },
            data: { documentId: doc.id }
          });
          
          vinculadas++;
          
          // Remover documento del mapa para evitar duplicados
          const seqKey = docsBySecuencial.has(seqFromNumber) ? seqFromNumber : seqFromRaw;
          const remaining = docsBySecuencial.get(seqKey).filter(d => d.id !== doc.id);
          if (remaining.length > 0) {
            docsBySecuencial.set(seqKey, remaining);
          } else {
            docsBySecuencial.delete(seqKey);
          }
          
          if (vinculadas <= 20) {
            console.log(`✅ Vinculada: ${factura.invoiceNumber} → ${doc.protocolNumber}`);
          }
        } catch (err) {
          errores++;
          console.error(`❌ Error vinculando ${factura.invoiceNumber}:`, err.message);
        }
      } else {
        noEncontradas++;
      }
    }
    
    console.log('\n=== RESUMEN ===');
    console.log(`✅ Facturas vinculadas: ${vinculadas}`);
    console.log(`⚠️ Sin documento encontrado: ${noEncontradas}`);
    console.log(`❌ Errores: ${errores}`);
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await db.$disconnect();
  }
}

vincularFacturasDocumentos();
