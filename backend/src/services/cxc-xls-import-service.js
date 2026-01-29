/**
 * CXC XLS Import Service
 * Servicio de importación de Cartera por Cobrar desde archivos XLS/CSV
 * 
 * Características:
 * - Importa a tabla separada pending_receivables
 * - Upsert por invoiceNumberRaw + reportDate
 * - Calcula estados automáticamente
 * - Limpieza de datos antiguos
 */

import { db as prisma } from '../db.js';
import { parseCxcFile } from './xls-cxc-parser.js';

/**
 * Importa archivo XLS/CSV de Cartera por Cobrar
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {number} userId - ID del usuario ejecutando la importación
 * @param {Date} reportDate - Fecha del reporte (opcional, se usa fecha actual si no se provee)
 * @returns {Promise<Object>} - Resultado de la importación
 */
export async function importCxcXlsFile(fileBuffer, fileName, userId, reportDate = null) {
  const startTime = Date.now();
  console.log(`[cxc-xls-import] Starting import of ${fileName} by user ${userId}`);

  const effectiveReportDate = reportDate || extractDateFromFileName(fileName) || new Date();
  effectiveReportDate.setHours(0, 0, 0, 0);

  const importLog = await prisma.importLog.create({
    data: {
      fileName,
      fileType: 'CXC_XLS',
      totalRows: 0,
      status: 'PROCESSING',
      executedBy: userId
    }
  });

  const stats = {
    totalRecords: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  };

  try {
    console.log('[cxc-xls-import] Parsing file...');
    const parsed = await parseCxcFile(fileBuffer, fileName);
    
    stats.totalRecords = parsed.receivables.length;

    console.log(`[cxc-xls-import] Processing ${parsed.receivables.length} receivables...`);

    for (const receivable of parsed.receivables) {
      try {
        const result = await upsertReceivable(receivable, fileName, effectiveReportDate);
        
        if (result.created) {
          stats.created++;
        } else if (result.updated) {
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        stats.errors++;
        stats.errorDetails.push({
          invoiceNumberRaw: receivable.invoiceNumberRaw,
          clientName: receivable.clientName,
          error: error.message
        });
        console.error(`[cxc-xls-import] Error processing receivable ${receivable.invoiceNumberRaw}:`, error);
      }
    }

    await prisma.importLog.update({
      where: { id: importLog.id },
      data: {
        totalRows: stats.totalRecords,
        invoicesCreated: stats.created,
        invoicesUpdated: stats.updated,
        errors: stats.errors,
        status: stats.errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        errorDetails: stats.errorDetails.length > 0 ? stats.errorDetails : null,
        completedAt: new Date()
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[cxc-xls-import] Import completed in ${duration}s`);
    console.log(`[cxc-xls-import] Stats:`, stats);

    return {
      success: true,
      importLogId: importLog.id,
      reportDate: effectiveReportDate,
      stats: {
        totalRecords: stats.totalRecords,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        errors: stats.errors,
        totalBalance: parsed.summary.totalBalance,
        totalOverdue: parsed.summary.totalOverdue,
        clientsCount: parsed.summary.clientsCount
      },
      duration: `${duration}s`,
      warnings: parsed.warnings
    };

  } catch (error) {
    console.error('[cxc-xls-import] Import failed:', error);

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
 * Upsert de un receivable en la base de datos
 * @param {Object} receivable - Datos del receivable
 * @param {string} sourceFile - Nombre del archivo origen
 * @param {Date} reportDate - Fecha del reporte
 * @returns {Promise<Object>} - {created, updated}
 */
async function upsertReceivable(receivable, sourceFile, reportDate) {
  const existing = await prisma.pendingReceivable.findUnique({
    where: {
      invoiceNumberRaw_reportDate: {
        invoiceNumberRaw: receivable.invoiceNumberRaw,
        reportDate: reportDate
      }
    }
  });

  const data = {
    clientTaxId: receivable.clientTaxId,
    clientName: receivable.clientName,
    invoiceNumberRaw: receivable.invoiceNumberRaw,
    invoiceNumber: receivable.invoiceNumber,
    totalAmount: receivable.totalAmount,
    balance: receivable.balance,
    paidAmount: receivable.paidAmount,
    issueDate: receivable.issueDate,
    dueDate: receivable.dueDate,
    status: receivable.status,
    daysOverdue: receivable.daysOverdue,
    sourceFile,
    reportDate
  };

  if (existing) {
    await prisma.pendingReceivable.update({
      where: { id: existing.id },
      data: {
        ...data,
        importedAt: new Date()
      }
    });
    
    console.log(`[cxc-xls-import] Updated: ${receivable.invoiceNumberRaw}`);
    return { created: false, updated: true };
  } else {
    await prisma.pendingReceivable.create({
      data
    });
    
    console.log(`[cxc-xls-import] Created: ${receivable.invoiceNumberRaw}`);
    return { created: true, updated: false };
  }
}

/**
 * Extrae fecha del nombre del archivo
 * Formatos soportados: cxc_20260128.xls, cartera_2026-01-28.xlsx, etc.
 * @param {string} fileName - Nombre del archivo
 * @returns {Date|null} - Fecha extraída o null
 */
function extractDateFromFileName(fileName) {
  const patterns = [
    /(\d{4})(\d{2})(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})(\d{2})(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/
  ];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      let year, month, day;
      
      if (pattern === patterns[0] || pattern === patterns[1]) {
        [, year, month, day] = match;
      } else {
        [, day, month, year] = match;
      }

      const date = new Date(year, month - 1, day);
      
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Obtiene cartera pendiente con filtros
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} - Lista de receivables
 */
export async function getCarteraPendiente(filters = {}) {
  const where = {};

  if (filters.clientTaxId) {
    where.clientTaxId = filters.clientTaxId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.reportDate) {
    where.reportDate = new Date(filters.reportDate);
  }

  if (filters.minBalance) {
    where.balance = {
      gte: parseFloat(filters.minBalance)
    };
  }

  const receivables = await prisma.pendingReceivable.findMany({
    where,
    orderBy: [
      { daysOverdue: 'desc' },
      { balance: 'desc' }
    ],
    take: filters.limit || 1000
  });

  return receivables;
}

/**
 * Obtiene resumen de cartera agrupado por cliente
 * @param {Date} reportDate - Fecha del reporte (opcional, usa el más reciente)
 * @returns {Promise<Object>} - Resumen agrupado
 */
export async function getCarteraPendienteResumen(reportDate = null) {
  let effectiveReportDate = reportDate;

  if (!effectiveReportDate) {
    const latest = await prisma.pendingReceivable.findFirst({
      orderBy: { reportDate: 'desc' },
      select: { reportDate: true }
    });
    
    if (!latest) {
      return {
        clientes: [],
        resumen: {
          totalClientes: 0,
          totalBalance: 0,
          totalOverdue: 0,
          reportDate: null
        }
      };
    }
    
    effectiveReportDate = latest.reportDate;
  }

  const receivables = await prisma.pendingReceivable.findMany({
    where: {
      reportDate: effectiveReportDate
    },
    orderBy: [
      { clientName: 'asc' }
    ]
  });

  const clientesMap = new Map();

  for (const r of receivables) {
    if (!clientesMap.has(r.clientTaxId)) {
      clientesMap.set(r.clientTaxId, {
        clientTaxId: r.clientTaxId,
        clientName: r.clientName,
        totalBalance: 0,
        invoicesCount: 0,
        oldestDueDate: null,
        maxDaysOverdue: 0,
        invoices: []
      });
    }

    const cliente = clientesMap.get(r.clientTaxId);
    cliente.totalBalance += parseFloat(r.balance);
    cliente.invoicesCount++;
    cliente.maxDaysOverdue = Math.max(cliente.maxDaysOverdue, r.daysOverdue);
    
    if (!cliente.oldestDueDate || (r.dueDate && r.dueDate < cliente.oldestDueDate)) {
      cliente.oldestDueDate = r.dueDate;
    }

    cliente.invoices.push({
      invoiceNumberRaw: r.invoiceNumberRaw,
      invoiceNumber: r.invoiceNumber,
      totalAmount: parseFloat(r.totalAmount),
      balance: parseFloat(r.balance),
      paidAmount: parseFloat(r.paidAmount),
      issueDate: r.issueDate,
      dueDate: r.dueDate,
      status: r.status,
      daysOverdue: r.daysOverdue
    });
  }

  const clientes = Array.from(clientesMap.values())
    .sort((a, b) => b.totalBalance - a.totalBalance);

  const totalBalance = clientes.reduce((sum, c) => sum + c.totalBalance, 0);
  const totalOverdue = receivables
    .filter(r => r.status === 'OVERDUE')
    .reduce((sum, r) => sum + parseFloat(r.balance), 0);

  return {
    clientes,
    resumen: {
      totalClientes: clientes.length,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      totalOverdue: parseFloat(totalOverdue.toFixed(2)),
      reportDate: effectiveReportDate
    }
  };
}

/**
 * Limpia reportes antiguos (más de N días)
 * @param {number} daysToKeep - Días a mantener (default: 60)
 * @returns {Promise<Object>} - Resultado de la limpieza
 */
export async function limpiarCarteraAntigua(daysToKeep = 60) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  cutoffDate.setHours(0, 0, 0, 0);

  const deleted = await prisma.pendingReceivable.deleteMany({
    where: {
      reportDate: {
        lt: cutoffDate
      }
    }
  });

  console.log(`[cxc-xls-import] Deleted ${deleted.count} old receivables (before ${cutoffDate.toISOString()})`);

  return {
    success: true,
    deletedCount: deleted.count,
    cutoffDate
  };
}

/**
 * Obtiene fechas de reportes disponibles
 * @returns {Promise<Array>} - Lista de fechas de reportes
 */
export async function getAvailableReportDates() {
  const dates = await prisma.pendingReceivable.findMany({
    select: {
      reportDate: true
    },
    distinct: ['reportDate'],
    orderBy: {
      reportDate: 'desc'
    }
  });

  return dates.map(d => d.reportDate);
}

export default {
  importCxcXlsFile,
  getCarteraPendiente,
  getCarteraPendienteResumen,
  limpiarCarteraAntigua,
  getAvailableReportDates
};
