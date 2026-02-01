/**
 * XLS/CSV CXC Parser
 * Parser para archivos Excel/CSV de Cartera por Cobrar (CXC) de Koinor
 * 
 * Dependencias: xlsx
 * 
 * Soporta múltiples formatos:
 * - .xls (Excel 97-2003)
 * - .xlsx (Excel 2007+)
 * - .csv (Comma Separated Values)
 */

import XLSX from 'xlsx';

const COLUMN_MAPPINGS = {
  clientTaxId: ['CODCLI', 'codcli', 'Código Cliente', 'CODIGO_CLIENTE', 'RUC', 'CEDULA', 'Cedula', 'Cédula'],
  clientName: ['NOMCLI', 'nomcli', 'Cliente', 'NOMBRE_CLIENTE', 'Nombre', 'NOMBRE'],
  invoiceNumberRaw: ['NUMTRA', 'numtra', 'Nº Factura', 'NUM_FACTURA', 'Factura', 'FACTURA', 'No. Factura', 'Numero Factura'],
  totalAmount: ['VALCOB', 'valcob', 'Valor', 'VALOR', 'Total', 'TOTAL', 'Valor Total', 'VALOR_TOTAL'],
  balance: ['CSALDO', 'csaldo', 'Saldo', 'SALDO', 'POR_COBRAR', 'Por Cobrar', 'Saldo Pendiente'],
  issueDate: ['FECEMI', 'fecemi', 'F. Emisión', 'FECHA_EMISION', 'FechaEmision', 'Fecha Emisión', 'Fecha'],
  dueDate: ['FECVEN', 'fecven', 'F. Vencimiento', 'FECHA_VENCIMIENTO', 'Vencimiento', 'Fecha Vencimiento'],
  matrizadorName: ['MATRIZADOR', 'matrizador', 'Responsable', 'RESPONSABLE', 'Asignado', 'ASIGNADO', 'Usuario']
};

/**
 * Parsea archivo XLS/CSV de Cartera por Cobrar
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo para logging
 * @returns {Promise<Object>} Resultado del parsing con receivables y summary
 */
export async function parseCxcFile(fileBuffer, fileName) {
  console.log(`[xls-cxc-parser] Starting parse of ${fileName}`);
  
  const startTime = Date.now();
  const receivables = [];
  const warnings = [];
  let totalBalance = 0;
  let totalOverdue = 0;

  try {
    const workbook = XLSX.read(fileBuffer, { 
      type: 'buffer',
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('El archivo no contiene hojas de datos');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    console.log(`[xls-cxc-parser] Processing sheet: ${firstSheetName}`);

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });

    if (jsonData.length === 0) {
      throw new Error('La hoja de datos está vacía');
    }

    const headerRowIndex = findHeaderRow(jsonData);
    if (headerRowIndex === -1) {
      throw new Error('No se pudo detectar la fila de encabezados. Verifica que el archivo tenga columnas como CODCLI, NOMCLI, NUMTRA, SALDO');
    }

    const headers = jsonData[headerRowIndex];
    const columnMap = mapColumns(headers);

    console.log(`[xls-cxc-parser] Column mapping:`, columnMap);

    validateRequiredColumns(columnMap);

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (isEmptyRow(row)) {
        continue;
      }

      try {
        const receivable = parseReceivableRow(row, columnMap, i + 1);
        
        if (receivable) {
          receivables.push(receivable);
          totalBalance += parseFloat(receivable.balance);
          
          if (receivable.status === 'OVERDUE') {
            totalOverdue += parseFloat(receivable.balance);
          }
        }
      } catch (error) {
        warnings.push({
          row: i + 1,
          message: error.message,
          data: row
        });
        console.warn(`[xls-cxc-parser] Warning on row ${i + 1}:`, error.message);
      }
    }

    const clientsCount = new Set(receivables.map(r => r.clientTaxId)).size;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[xls-cxc-parser] Parsed in ${duration}s: ${receivables.length} receivables from ${clientsCount} clients`);

    return {
      receivables,
      summary: {
        totalRecords: receivables.length,
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        totalOverdue: parseFloat(totalOverdue.toFixed(2)),
        clientsCount,
        processedAt: new Date(),
        duration: `${duration}s`
      },
      warnings: warnings.slice(0, 50)
    };

  } catch (error) {
    console.error('[xls-cxc-parser] Fatal error:', error);
    throw new Error(`Error parseando archivo: ${error.message}`);
  }
}

/**
 * Encuentra la fila de encabezados en el archivo
 * @param {Array} jsonData - Datos del archivo en formato JSON
 * @returns {number} - Índice de la fila de encabezados o -1 si no se encuentra
 */
function findHeaderRow(jsonData) {
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    
    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    const rowStr = row.join('|').toUpperCase();
    
    if (rowStr.includes('CODCLI') || 
        rowStr.includes('NOMCLI') || 
        rowStr.includes('NUMTRA') ||
        rowStr.includes('SALDO') ||
        rowStr.includes('CLIENTE')) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Mapea las columnas del archivo a los campos estándar
 * @param {Array} headers - Fila de encabezados
 * @returns {Object} - Mapa de campo -> índice de columna
 */
function mapColumns(headers) {
  const columnMap = {};

  for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = String(headers[colIndex] || '').trim();
      
      if (possibleNames.some(name => 
        header.toUpperCase() === name.toUpperCase() ||
        header.toUpperCase().includes(name.toUpperCase())
      )) {
        columnMap[field] = colIndex;
        break;
      }
    }
  }

  return columnMap;
}

/**
 * Valida que existan las columnas obligatorias
 * @param {Object} columnMap - Mapa de columnas
 * @throws {Error} Si falta alguna columna obligatoria
 */
function validateRequiredColumns(columnMap) {
  const required = ['clientTaxId', 'invoiceNumberRaw', 'balance'];
  const missing = required.filter(field => columnMap[field] === undefined);

  if (missing.length > 0) {
    throw new Error(
      `Faltan columnas obligatorias: ${missing.join(', ')}. ` +
      `Verifica que el archivo tenga columnas como CODCLI, NUMTRA, SALDO`
    );
  }
}

/**
 * Verifica si una fila está vacía
 * @param {Array} row - Fila de datos
 * @returns {boolean}
 */
function isEmptyRow(row) {
  if (!Array.isArray(row) || row.length === 0) {
    return true;
  }

  return row.every(cell => {
    const value = String(cell || '').trim();
    return value === '' || value === '0' || value === '0.00';
  });
}

/**
 * Parsea una fila de datos a un objeto receivable
 * @param {Array} row - Fila de datos
 * @param {Object} columnMap - Mapa de columnas
 * @param {number} rowNumber - Número de fila (para logging)
 * @returns {Object|null} - Objeto receivable o null si es inválido
 */
function parseReceivableRow(row, columnMap, rowNumber) {
  const clientTaxId = String(row[columnMap.clientTaxId] || '').trim();
  const invoiceNumberRaw = String(row[columnMap.invoiceNumberRaw] || '').trim();
  const balanceStr = String(row[columnMap.balance] || '0').trim();

  if (!clientTaxId) {
    throw new Error('Falta cédula/RUC del cliente');
  }

  if (!invoiceNumberRaw) {
    throw new Error('Falta número de factura');
  }

  const balance = parseAmount(balanceStr);
  
  if (balance === null || balance < 0) {
    throw new Error(`Saldo inválido: ${balanceStr}`);
  }

  if (balance === 0) {
    return null;
  }

  const clientName = columnMap.clientName !== undefined
    ? String(row[columnMap.clientName] || 'Cliente Sin Nombre').trim()
    : 'Cliente Sin Nombre';

  const totalAmountStr = columnMap.totalAmount !== undefined
    ? String(row[columnMap.totalAmount] || balanceStr).trim()
    : balanceStr;
  
  const totalAmount = parseAmount(totalAmountStr) || balance;

  const paidAmount = Math.max(0, totalAmount - balance);

  const issueDate = columnMap.issueDate !== undefined
    ? parseDate(row[columnMap.issueDate])
    : null;

  const dueDate = columnMap.dueDate !== undefined
    ? parseDate(row[columnMap.dueDate])
    : null;

  const matrizadorName = columnMap.matrizadorName !== undefined
    ? String(row[columnMap.matrizadorName] || '').trim()
    : null;

  const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw);

  const { status, daysOverdue } = calculateStatus(balance, totalAmount, dueDate);

  return {
    clientTaxId,
    clientName,
    invoiceNumberRaw,
    invoiceNumber,
    totalAmount,
    balance,
    paidAmount,
    issueDate,
    dueDate,
    status,
    daysOverdue,
    matrizadorName
  };
}

/**
 * Parsea un monto desde string
 * @param {string} amountStr - String con el monto
 * @returns {number|null} - Monto parseado o null si es inválido
 */
function parseAmount(amountStr) {
  if (!amountStr) return null;

  let cleaned = String(amountStr)
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '.');

  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }

  const amount = parseFloat(cleaned);
  
  return isNaN(amount) ? null : amount;
}

/**
 * Parsea una fecha desde múltiples formatos posibles
 * @param {any} dateValue - Valor de fecha
 * @returns {Date|null} - Fecha parseada o null si es inválida
 */
function parseDate(dateValue) {
  if (!dateValue) return null;

  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue;
  }

  const dateStr = String(dateValue).trim();
  
  if (!dateStr || dateStr === '0' || dateStr === '') {
    return null;
  }

  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      
      if (format === formats[0]) {
        [, year, month, day] = match;
      } else {
        [, day, month, year] = match;
      }

      const date = new Date(year, month - 1, day);
      
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Normaliza número de factura al formato estándar
 * @param {string} invoiceNumberRaw - Número de factura raw
 * @returns {string} - Número normalizado
 */
function normalizeInvoiceNumber(invoiceNumberRaw) {
  if (!invoiceNumberRaw) return invoiceNumberRaw;

  const cleaned = invoiceNumberRaw.replace(/\s+/g, '');

  const match = cleaned.match(/^(\d{3})(\d{3})-?(\d+)$/);
  if (match) {
    const [, est, pto, seq] = match;
    return `${est}-${pto}-${seq.padStart(9, '0')}`;
  }

  return invoiceNumberRaw;
}

/**
 * Calcula el estado y días de mora
 * @param {number} balance - Saldo pendiente
 * @param {number} totalAmount - Monto total
 * @param {Date|null} dueDate - Fecha de vencimiento
 * @returns {Object} - {status, daysOverdue}
 */
function calculateStatus(balance, totalAmount, dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (balance <= 0) {
    return { status: 'PAID', daysOverdue: 0 };
  }
  
  if (balance < totalAmount) {
    if (dueDate && dueDate < today) {
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      return { status: 'OVERDUE', daysOverdue };
    }
    return { status: 'PARTIAL', daysOverdue: 0 };
  }
  
  if (dueDate && dueDate < today) {
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    return { status: 'OVERDUE', daysOverdue };
  }
  
  return { status: 'PENDING', daysOverdue: 0 };
}

export default {
  parseCxcFile
};
