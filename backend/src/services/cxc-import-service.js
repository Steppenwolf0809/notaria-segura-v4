/**
 * CXC Import Service
 * Servicio de importación de Cartera por Cobrar (CXC) desde XML Koinor
 * 
 * Características:
 * - Upsert de clientes por RUC/Cédula
 * - Upsert de facturas (vinculación o creación)
 * - Marca facturas como origen MIGRACION
 * - Manejo de errores granular (continúa si una factura falla)
 */

import { db as prisma } from '../db.js';
import { parseCxcXML } from './xml-cxc-parser.js';
import { normalizeInvoiceNumber, cleanTaxId } from '../utils/billing-utils.js';

// Normalización de nombres de matrizadores para evitar duplicados visuales
const MATRIZADOR_NAME_NORMALIZATION = {
  // Mayra Corella
  'Mayra Cristina Corella Parra': 'Mayra Corella',
  'Mayra Corella Parra': 'Mayra Corella',
  'Mayra Cristina': 'Mayra Corella',
  'Mayra': 'Mayra Corella',
  
  // Karol Velastegui
  'Karol Daniela Velastegui Cadena': 'Karol Velastegui',
  'Karol Daniela': 'Karol Velastegui',
  'Karol': 'Karol Velastegui',
  
  // Jose Zapata
  'Jose Luis Zapata Silva': 'Jose Zapata',
  'Jose Luis': 'Jose Zapata',
  'Jose': 'Jose Zapata',
  
  // Gissela Velastegui
  'Gissela': 'Gissela Velastegui',
  
  // Maria Diaz
  'Maria Lucinda': 'Maria Diaz',
  'Maria': 'Maria Diaz',
  
  // Esteban Proaño
  'Francisco Esteban': 'Esteban Proaño',
  'Francisco': 'Esteban Proaño',
  'Esteban': 'Esteban Proaño'
};

/**
 * Normaliza el nombre del matrizador a un formato estándar
 * @param {string} name - Nombre del matrizador
 * @returns {string} - Nombre normalizado
 */
function normalizeMatrizadorName(name) {
  if (!name) return 'Sin asignar';
  const normalized = MATRIZADOR_NAME_NORMALIZATION[name.trim()] || name.trim();
  return normalized;
}

/**
 * Importa archivo XML de CXC (Cartera por Cobrar)
 * @param {Buffer} fileBuffer - Buffer del archivo XML
 * @param {string} fileName - Nombre del archivo
 * @param {number} userId - ID del usuario ejecutando la importación
 * @returns {Promise<Object>} - Resultado de la importación
 */
export async function importCxcFile(fileBuffer, fileName, userId) {
    const startTime = Date.now();
    console.log(`[cxc-import] Starting CXC import of ${fileName} by user ${userId}`);

    // Crear log de importación
    const importLog = await prisma.importLog.create({
        data: {
            fileName,
            fileType: 'XML_CXC',
            totalRows: 0,
            status: 'PROCESSING',
            executedBy: userId
        }
    });

    const stats = {
        totalFacturas: 0,
        clientesCreados: 0,
        facturasNuevas: 0,
        facturasVinculadas: 0,
        errors: 0,
        errorDetails: []
    };

    try {
        // 1. Parsear XML CXC (incluye sanitización automática)
        console.log('[cxc-import] Parsing CXC XML...');
        const parsed = await parseCxcXML(fileBuffer, fileName);

        // 2. Extraer facturas del XML parseado
        const facturas = parsed.invoices || [];
        
        stats.totalFacturas = facturas.length;
        console.log(`[cxc-import] Found ${facturas.length} invoices (FC) to process`);

        // 3. Procesar cada factura
        for (const factura of facturas) {
            try {
                const result = await processInvoiceUpsert(factura, fileName);
                
                if (result.clienteCreado) stats.clientesCreados++;
                if (result.facturaCreada) stats.facturasNuevas++;
                if (result.facturaVinculada) stats.facturasVinculadas++;
                
            } catch (error) {
                stats.errors++;
                stats.errorDetails.push({
                    type: 'INVOICE',
                    numeroFactura: factura.numeroFactura,
                    error: error.message
                });
                console.error(`[cxc-import] Error processing invoice ${factura.numeroFactura}:`, error);
            }
        }

        // 4. LIMPIEZA: Eliminar facturas del CXC que ya no están en el archivo XML
        const fileInvoiceNumbers = facturas.map(f => f.invoiceNumberRaw).filter(Boolean);
        
        if (fileInvoiceNumbers.length > 0) {
            const deletedInvoices = await prisma.invoice.deleteMany({
                where: {
                    status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
                    invoiceNumberRaw: { notIn: fileInvoiceNumbers },
                    sourceFile: { contains: 'CXC', mode: 'insensitive' }
                }
            });
            
            if (deletedInvoices.count > 0) {
                console.log(`[cxc-import] 🗑️ Eliminadas ${deletedInvoices.count} facturas que ya no están en el CXC XML`);
            }
        }

        // 5. Actualizar log con éxito
        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                totalRows: stats.totalFacturas,
                invoicesCreated: stats.facturasNuevas,
                invoicesUpdated: stats.facturasVinculadas,
                errors: stats.errors,
                status: stats.errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
                errorDetails: stats.errorDetails.length > 0 ? stats.errorDetails : null,
                completedAt: new Date()
            }
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[cxc-import] Import completed in ${duration}s`);
        console.log(`[cxc-import] Stats:`, stats);

        return {
            success: true,
            importLogId: importLog.id,
            stats: {
                totalProcesados: stats.totalFacturas,
                nuevos: stats.facturasNuevas,
                vinculados: stats.facturasVinculadas,
                clientesCreados: stats.clientesCreados,
                errores: stats.errorDetails
            },
            duration: `${duration}s`
        };

    } catch (error) {
        console.error('[cxc-import] Import failed:', error);

        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                status: 'FAILED',
                errorDetails: { 
                    message: error.message, 
                    stack: error.stack 
                },
                completedAt: new Date()
            }
        });

        throw error;
    }
}

/**
 * Procesa una factura: upsert de cliente y factura
 * @param {Object} factura - Datos de la factura del XML (parseados por parseInvoiceTransaction)
 * @param {string} sourceFile - Nombre del archivo origen
 * @returns {Promise<Object>} - {clienteCreado, facturaCreada, facturaVinculada}
 */
async function processInvoiceUpsert(factura, sourceFile) {
    const result = {
        clienteCreado: false,
        facturaCreada: false,
        facturaVinculada: false
    };

    // Paso A: Obtener datos del cliente del XML parseado
    const clientTaxId = cleanTaxId(factura.clientTaxId);
    const clientName = String(factura.clientName || '').trim();
    
    // Paso B: Buscar/crear factura
    const invoiceNumberRaw = String(factura.invoiceNumberRaw || factura.invoiceNumber || '').trim();
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw);
    
    if (!invoiceNumber) {
        throw new Error('Factura sin número válido');
    }

    const totalAmount = parseFloat(factura.totalAmount || 0);
    const balance = parseFloat(factura.balance || factura.totalAmount || 0);
    const issueDate = factura.issueDate ? new Date(factura.issueDate) : new Date();
    const dueDate = factura.dueDate ? new Date(factura.dueDate) : null;

    // Buscar factura existente
    let invoice = await prisma.invoice.findFirst({
        where: {
            OR: [
                { invoiceNumber },
                { invoiceNumberRaw }
            ]
        }
    });

    if (invoice) {
        // Escenario 1: Factura existe - actualizar datos del CXC
        // Calcular paidAmount basado en la diferencia entre totalAmount y balance
        const paidAmount = totalAmount - balance;
        const newStatus = balance <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING');
        
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                clientTaxId,
                clientName,
                totalAmount,
                paidAmount: paidAmount > 0 ? paidAmount : 0,
                dueDate,
                status: newStatus,
                sourceFile
            }
        });
        result.facturaVinculada = true;
        console.log(`[cxc-import] Factura actualizada: ${invoiceNumber} (total: ${totalAmount}, saldo: ${balance}, status: ${newStatus})`);
        
    } else {
        // Escenario 2: Factura no existe - crear como migración
        // Calcular paidAmount basado en la diferencia entre totalAmount y balance
        const paidAmount = totalAmount - balance;
        
        await prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceNumberRaw,
                clientTaxId,
                clientName,
                totalAmount,
                paidAmount: paidAmount > 0 ? paidAmount : 0,
                issueDate,
                dueDate,
                status: balance <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING'),
                isLegacy: true,
                sourceFile,
                concept: factura.concept || 'Factura importada de cartera'
            }
        });
        result.facturaCreada = true;
        console.log(`[cxc-import] Factura creada: ${invoiceNumber} (total: ${totalAmount}, saldo: ${balance})`);
    }

    return result;
}

export default {
    importCxcFile
};
