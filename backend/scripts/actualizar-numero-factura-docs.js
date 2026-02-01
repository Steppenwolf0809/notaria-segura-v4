import { db } from '../src/db.js';

/**
 * Actualiza el campo numeroFactura en documentos que tienen facturas vinculadas
 * pero no tienen el número de factura asignado
 */
async function actualizarNumeroFacturaDocs() {
  console.log('=== ACTUALIZACIÓN DE NÚMERO DE FACTURA EN DOCUMENTOS ===\n');
  
  let actualizados = 0;
  let yaConNumero = 0;
  let sinFactura = 0;
  let errores = 0;
  
  try {
    // 1. Obtener documentos que tienen facturas vinculadas
    const documentos = await db.document.findMany({
      where: {
        invoices: { some: {} } // Tiene al menos una factura
      },
      select: {
        id: true,
        protocolNumber: true,
        numeroFactura: true,
        invoices: {
          select: {
            invoiceNumber: true,
            invoiceNumberRaw: true
          },
          take: 1 // Solo la primera factura
        }
      }
    });
    
    console.log(`Documentos con facturas vinculadas: ${documentos.length}\n`);
    
    // 2. Actualizar cada documento
    for (const doc of documentos) {
      if (doc.invoices.length === 0) {
        sinFactura++;
        continue;
      }
      
      const factura = doc.invoices[0];
      const numeroFactura = factura.invoiceNumber || factura.invoiceNumberRaw;
      
      if (!numeroFactura) {
        sinFactura++;
        continue;
      }
      
      // Si ya tiene el mismo número, saltar
      if (doc.numeroFactura === numeroFactura) {
        yaConNumero++;
        continue;
      }
      
      try {
        await db.document.update({
          where: { id: doc.id },
          data: { numeroFactura }
        });
        
        actualizados++;
        
        if (actualizados <= 20) {
          console.log(`✅ ${doc.protocolNumber} → ${numeroFactura}`);
        }
      } catch (err) {
        errores++;
        console.error(`❌ Error en ${doc.protocolNumber}:`, err.message);
      }
    }
    
    console.log('\n=== RESUMEN ===');
    console.log(`✅ Documentos actualizados: ${actualizados}`);
    console.log(`📋 Ya tenían número correcto: ${yaConNumero}`);
    console.log(`⚠️ Sin factura válida: ${sinFactura}`);
    console.log(`❌ Errores: ${errores}`);
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await db.$disconnect();
  }
}

actualizarNumeroFacturaDocs();
