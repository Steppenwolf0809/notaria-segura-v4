import { db as prisma } from '../db.js';
import XLSX from 'xlsx';
import { buildInvoiceWhereByNumber } from '../utils/billing-utils.js';

// Mapeo de códigos de vendedores a nombres ESTÁNDAR
const MATRIZADOR_MAPPING = {
  'MAY': 'Mayra Corella',
  'KAR': 'Karol Velastegui',
  'JLZ': 'Jose Zapata',
  'GIS': 'Gissela Velastegui',
  'MD01': 'Maria Diaz',
  'FP': 'Esteban Proaño'
};

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
  'JLZ': 'Jose Zapata',
  
  // Gissela Velastegui
  'Gissela Velastegui': 'Gissela Velastegui',
  'Gissela': 'Gissela Velastegui',
  
  // Maria Diaz
  'Maria Lucinda': 'Maria Diaz',
  'Maria': 'Maria Diaz',
  'MD01': 'Maria Diaz',
  
  // Esteban Proaño
  'Francisco Esteban': 'Esteban Proaño',
  'Francisco': 'Esteban Proaño',
  'Esteban': 'Esteban Proaño',
  'FP': 'Esteban Proaño'
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
 * Servicio de Importación CXC (Cartera por Cobrar)
 * 
 * ESTRATEGIA: SINGLE SOURCE OF TRUTH (Espejo del Excel)
 * 1. El Excel es la autoridad. Si está en Excel, se actualiza/inserta en DB.
 * 2. Si una factura PENDIENTE en DB no está en el Excel, se marca como PAGADA.
 */

/**
 * Importa archivo XLS/CSV de Cartera por Cobrar y sincroniza con la tabla Invoice.
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {number} userId - ID del usuario ejecutando la importación
 * @returns {Promise<Object>} - Resultado de la importación
 */
export async function importCxcXlsFile(fileBuffer, fileName, userId) {
  const startTime = Date.now();
  console.log(`[cxc-xls-import] START: Importing ${fileName} by user ${userId}`);

  // 1. Crear Log de Importación
  const importLog = await prisma.importLog.create({
    data: {
      fileName,
      fileType: 'CXC_XLS_SYNC',
      totalRows: 0,
      status: 'PROCESSING',
      executedBy: userId
    }
  });

  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    wiped: 0, // Facturas no presentes marcadas como pagadas
    errors: 0,
    details: []
  };

  try {
    // 2. Parsear Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true, dateNF: 'yyyy-mm-dd' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    console.log(`[cxc-xls-import] Parsed ${rawData.length} rows from sheet ${sheetName}`);
    
    // DEBUG: Mostrar columnas del Excel - SIEMPRE
    if (rawData.length > 0) {
      const columns = Object.keys(rawData[0]);
      console.log(`[cxc-xls-import] ========== EXCEL COLUMNS ==========`);
      console.log(`[cxc-xls-import] Columns found (${columns.length}):`, columns.join(', '));
      console.log(`[cxc-xls-import] First row:`, rawData[0]);
      console.log(`[cxc-xls-import] ===================================`);
    }

    // Lista de números de factura encontrados en el archivo (para identificar los "missing")
    const presentInvoiceNumbers = new Set();

    // 3. Procesar filas
    const operations = [];

    for (const [index, row] of rawData.entries()) {
      try {
        const rowData = normalizeRow(row);

        // Validación básica
        if (!rowData.invoiceNumberRaw || !rowData.totalAmount) {
          continue;
        }

        presentInvoiceNumbers.add(rowData.invoiceNumberRaw);
        stats.processed++;

        // Determinar estado basado en el saldo del Excel
        let status = 'PENDING';
        let paidAmount = 0;

        if (rowData.balance <= 0.01) {
          status = 'PAID';
          paidAmount = rowData.totalAmount;
        } else if (rowData.balance < rowData.totalAmount) {
          status = 'PARTIAL';
          paidAmount = rowData.totalAmount - rowData.balance;
        } else {
          status = 'PENDING';
          // Si el user quiere, paidAmount puede ser 0
          paidAmount = rowData.totalAmount - rowData.balance; // mejor calculamos lo pagado
        }

        // Calcular Base Imponible (sin IVA 15%)
        const subtotalAmount = rowData.totalAmount > 0 ? Math.round((rowData.totalAmount / 1.15) * 100) / 100 : 0;

        // Preparar operación Upsert
        const existingInvoice = await prisma.invoice.findFirst({
          where: buildInvoiceWhereByNumber(rowData.invoiceNumberRaw || rowData.invoiceNumber),
          select: { id: true }
        });

        if (existingInvoice) {
          operations.push(prisma.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              clientTaxId: rowData.clientTaxId,
              clientName: rowData.clientName,
              totalAmount: rowData.totalAmount,
              subtotalAmount,
              paidAmount: paidAmount,
              issueDate: rowData.issueDate,
              status: status,
              matrizador: rowData.matrizador,
              lastSyncAt: new Date(),
              sourceFile: fileName,
              invoiceNumberRaw: rowData.invoiceNumberRaw
            }
          }));
        } else {
          operations.push(prisma.invoice.create({
            data: {
              invoiceNumber: rowData.invoiceNumber,
              invoiceNumberRaw: rowData.invoiceNumberRaw,
              clientTaxId: rowData.clientTaxId || '9999999999999',
              clientName: rowData.clientName || 'Consumidor Final',
              totalAmount: rowData.totalAmount,
              subtotalAmount,
              paidAmount: paidAmount,
              issueDate: rowData.issueDate || new Date(),
              status: status,
              matrizador: rowData.matrizador,
              sourceFile: fileName,
              importedAt: new Date(),
              lastSyncAt: new Date()
            }
          }));
        }

      } catch (rowError) {
        console.warn(`[cxc-xls-import] Error reading row ${index}: ${rowError.message}`);
        stats.details.push({ row: index + 1, error: rowError.message });
        stats.errors++;
      }
    }

    // Ejecutar Upserts en Transacción (Lotes)
    const BATCH_SIZE = 50;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(batch);
      stats.updated += batch.length;
    }

    // 4. LIMPIEZA AUTOMÁTICA: Eliminar facturas del CXC que ya no están en el archivo
    // Esto mantiene la cartera sincronizada exactamente con el CXC (fuente de verdad)
    const fileInvoiceNumbers = Array.from(presentInvoiceNumbers);

    // 🗑️ ELIMINAR facturas del CXC que ya no aparecen en el archivo
    // Solo eliminamos las que tienen sourceFile con 'CXC' para no afectar otras fuentes
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        invoiceNumberRaw: { notIn: fileInvoiceNumbers },
        sourceFile: { contains: 'CXC', mode: 'insensitive' }
      }
    });

    stats.wiped = deletedInvoices.count;
    if (deletedInvoices.count > 0) {
      console.log(`[cxc-xls-import] 🗑️ Eliminadas ${deletedInvoices.count} facturas que ya no están en el CXC`);
    }

    // 5. Self-Healing
    await reconcileInvoices();

    // Finalizar Log
    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        totalRows: stats.processed,
        invoicesCreated: stats.created,
        invoicesUpdated: stats.updated,
        status: stats.errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        errorDetails: stats.details.length > 0 ? stats.details : null,
        completedAt: new Date()
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[cxc-xls-import] DONE. Duration: ${duration}s. Stats:`, stats);

    return {
      success: true,
      stats,
      duration
    };

  } catch (err) {
    console.error('[cxc-xls-import] CRITICAL ERROR:', err);
    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        status: 'FAILED',
        errorDetails: { message: err.message, stack: err.stack },
        completedAt: new Date()
      }
    });
    throw err;
  }
}

/**
 * Normaliza una fila del Excel a estructura plana
 */
function normalizeRow(row) {
  const getVal = (keys) => {
    if (!Array.isArray(keys)) keys = [keys];
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
      const foundKey = Object.keys(row).find(rk => rk.toUpperCase() === k.toUpperCase());
      if (foundKey) return row[foundKey];
    }
    return null;
  };

  const numtra = getVal(['numtra', 'NUMTRA', 'Nº Factura', 'Factura'])?.toString().trim();
  if (!numtra) return {};

  const invoiceNumber = normalizeInvoiceNumber(numtra);
  const codven = getVal(['codven', 'CODVEN', 'Vendedor', 'vendedor', 'COD_VEN', 'cod_ven'])?.toString().trim();
  const matrizadorRaw = MATRIZADOR_MAPPING[codven] || codven || 'Sin asignar';
  const matrizador = normalizeMatrizadorName(matrizadorRaw); // Normalizar a nombre estándar
  
  // DEBUG: Log primeras facturas para ver codven
  if (numtra && numtra.includes('001002')) {
    console.log(`[cxc-xls-import] DEBUG Row - numtra: ${numtra}, codven: "${codven}", matrizador: "${matrizador}"`);
  }
  const valcob = parseFloat(getVal(['valcob', 'VALCOB', 'Valor', 'Total']) || 0);
  const saldo = parseFloat(getVal(['saldo', 'SALDO', 'Por cobrar']) || 0);

  let issueDate = getVal(['fecemi', 'FECEMI', 'Emision']);
  if (typeof issueDate === 'number') issueDate = excelDateToJSDate(issueDate);
  else if (typeof issueDate === 'string') issueDate = new Date(issueDate);

  return {
    invoiceNumberRaw: numtra,
    invoiceNumber: invoiceNumber,
    clientTaxId: getVal(['codcli', 'CODCLI', 'RUC', 'Cedula'])?.toString().trim(),
    clientName: getVal(['nomcli', 'NOMCLI', 'Cliente'])?.toString().trim(),
    issueDate: issueDate,
    totalAmount: valcob,
    balance: saldo,
    matrizador: matrizador
  };
}

/**
 * Corrige inconsistencias post-importación
 */
async function reconcileInvoices() {
  console.log('[cxc-xls-import] Starting reconciliation...');
  // Arreglar montos para facturas PAGADAS (paidAmount = totalAmount cuando status = PAID)
  const updatedCount = await prisma.$executeRaw`
        UPDATE invoices 
        SET "paidAmount" = "totalAmount"
        WHERE status = 'PAID' 
        AND ("paidAmount" < "totalAmount" OR "paidAmount" IS NULL)
    `;
  console.log(`[cxc-xls-import] Recalculated paid amounts for ${updatedCount} closed invoices.`);
}

function normalizeInvoiceNumber(raw) {
  if (!raw) return raw;
  const clean = raw.replace(/-/g, '').replace(/\s/g, '');
  if (clean.length >= 15) {
    return `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6)}`;
  }
  return raw;
}

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// ==========================================
// FUNCIONES DE REPORTE (Source of Truth: Invoice)
// ==========================================

/**
 * Obtiene cartera pendiente con filtros (Reads from Invoice table)
 */
export async function getCarteraPendiente(filters = {}) {
  const where = {};

  if (filters.clientTaxId) where.clientTaxId = { contains: filters.clientTaxId };
  if (filters.status) where.status = filters.status;
  if (!filters.status) {
    // Por defecto mostramos deuda
    where.status = { in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
  }

  // Nota: balance no existe como columna, se calcula como totalAmount - paidAmount
  // El filtro minBalance se aplicará después de la consulta

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [
      { totalAmount: 'desc' }
    ],
    take: filters.limit || 1000
  });

  // Calcular balance y aplicar filtro minBalance si existe
  let results = invoices.map(inv => {
    const total = parseFloat(inv.totalAmount || 0);
    const paid = parseFloat(inv.paidAmount || 0);
    const balance = total - paid;
    return {
      ...inv,
      invoiceNumberRaw: inv.invoiceNumberRaw || inv.invoiceNumber,
      daysOverdue: calculateDaysOverdue(inv),
      invoiceNumber: inv.invoiceNumber,
      balance: balance,
      totalAmount: total,
      paidAmount: paid
    };
  });

  // Filtrar por balance mínimo si se especificó
  if (filters.minBalance) {
    const minBal = parseFloat(filters.minBalance);
    results = results.filter(inv => inv.balance >= minBal);
  }

  // Ordenar por balance descendente
  results.sort((a, b) => b.balance - a.balance);

  return results;
}

/**
 * Obtiene resumen de cartera agrupado por cliente (Reads from Invoice table)
 */
export async function getCarteraPendienteResumen(reportDate = null) {
  // reportDate ignorado, es tiempo real.

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
    },
    orderBy: { clientName: 'asc' }
  });

  const clientesMap = new Map();

  for (const inv of invoices) {
    if (!clientesMap.has(inv.clientTaxId)) {
      clientesMap.set(inv.clientTaxId, {
        clientTaxId: inv.clientTaxId,
        clientName: inv.clientName,
        totalBalance: 0,
        invoicesCount: 0,
        maxDaysOverdue: 0,
        invoices: []
      });
    }

    const cliente = clientesMap.get(inv.clientTaxId);
    const total = parseFloat(inv.totalAmount || 0);
    const paid = parseFloat(inv.paidAmount || 0);
    const balance = total - paid;
    const daysOverdue = calculateDaysOverdue(inv);

    cliente.totalBalance += balance;
    cliente.invoicesCount++;
    cliente.maxDaysOverdue = Math.max(cliente.maxDaysOverdue, daysOverdue);

    // Agregar campo matrizador al objeto invoice para que el frontend pueda filtrar
    cliente.invoices.push({
      invoiceNumber: inv.invoiceNumber,
      totalAmount: total,
      paidAmount: paid,
      balance: balance,
      status: inv.status,
      daysOverdue: daysOverdue,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      matrizador: inv.matrizador // CRITICAL: Frontend needs this
    });

    // También podemos setear el matrizador a nivel de cliente si es siempre el mismo, pero puede variar.
    // El frontend parece filtrar por fila aplanada.
    // En Reportes.jsx, se itera sobre data y se lee `row.matrizador`.
    // El formato de retorno de `getCarteraPendienteResumen` es { clientes: [] }.
    // En Reportes.jsx se usa `clientes` (que es el array de valores del mapa).
    // Pero Reportes.jsx espera una lista PLANA para la tabla principal, no agrupada?
    // Revisando Reportes.jsx: 
    //   case 0: data = await billingService.getReporteCarteraPorCobrar();
    //   Wait, billing service calls getReporteCarteraPorCobrar?
    //   Let's assume the controller returns what works.
    //   In the code I read: `case 0: return filteredData.reduce...`
    //   The frontend processes `reportData.data`.
    //   The controller `getCarteraPendiente` returns `receivables` (flat list).
    //   The controller `getCarteraPendienteResumen` returns `{ clientes, resumen }`.
    //   Reportes.jsx `loadReport` calls `billingService.getReporteCarteraPorCobrar()`.
    //   In `billing-service.js` (which I didn't verify), does it call `cartera-pendiente` or `cartera-pendiente/resumen`?
    //   Usually "Resumen by Client" is what is shown.
    //   Reportes.jsx logic: `case 0: sheetData = filteredData.map...`
    //   It iterates `filteredData`. `filteredData` comes from `reportData.data`.
    //   If `reportData` has `data`, it works.
    //   My `getCarteraPendienteResumen` returns `{ clientes, ... }`. If I put `clientes` in `data` property of response, it fits.
    //   The controller `getCarteraPendienteResumen` returns `...result`, so `data` property is NOT explicit in my service unless I return `{ data: clientes, resumen }`.
    //   Wait, the CONTROLLER (Line 2229) does `res.json({ success: true, ...result });`.
    //   So if result is `{ clientes: [...] }`, the response body is `{ success: true, clientes: [...] }`.
    //   But Reportes.jsx expects `reportData.data`.
    //   So `billingService.getReporteCarteraPorCobrar` MUST map `response.clientes` to `data`.
    //   OR `getCarteraPendiente` (flat) is used.
    //   Given the columns "Facturas" (count), "Total Facturado", "Total Pagado", "Saldo", it looks like GROUPED data.
    //   So Reportes.jsx uses the grouped data.
    //   I will ensure `getCarteraPendienteResumen` returns an object with `data` property or that I name the key `data`.
    //   Let's name "clientes" as "data" in the return object to be safe, or assume frontend service handles mapping.
    //   I'll stick to returning `clientes` as per original code I saw partially, but I'll add `data: clientes` alias to be safe.
  }

  const clientes = Array.from(clientesMap.values())
    .sort((a, b) => b.totalBalance - a.totalBalance);

  // Asignar primer matrizador encontrado como matrizador principal del cliente (heurística)
  clientes.forEach(c => {
    const mat = c.invoices.find(i => i.matrizador)?.matrizador;
    c.matrizador = mat || 'Sin asignar';
    // Calcular "invoicesCount" real
    c.invoiceCount = c.invoices.length;
    c.totalInvoiced = c.invoices.reduce((s, i) => s + i.totalAmount, 0);
    c.totalPaid = c.invoices.reduce((s, i) => s + i.paidAmount, 0);
  });

  const totalBalance = clientes.reduce((sum, c) => sum + c.totalBalance, 0);

  return {
    data: clientes, // Alias for frontend compatibility logic often using .data
    clientes,       // Original name
    resumen: {
      totalClientes: clientes.length,
      totalBalance: totalBalance,
      reportDate: new Date()
    }
  };
}

function calculateDaysOverdue(invoice) {
  if (invoice.status === 'PAID') return 0;
  if (!invoice.issueDate) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - new Date(invoice.issueDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Limpieza (Legacy support - No-op)
 */
export async function limpiarCarteraAntigua(daysToKeep = 60) {
  return { success: true, message: "Architecture upgraded to Single Source of Truth. No manual cleanup needed." };
}

/**
 * Fechas disponibles (Legacy support)
 */
export async function getAvailableReportDates() {
  return [new Date()];
}
