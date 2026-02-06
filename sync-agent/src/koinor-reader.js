import sql from 'mssql';
import config from './config.js';
import logger from './logger.js';

const sqlConfig = {
  server: config.KOINOR_SERVER,
  port: config.KOINOR_PORT,
  database: config.KOINOR_DATABASE,
  user: config.KOINOR_USER,
  password: config.KOINOR_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 5,
    min: 1,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 60000,
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

/**
 * Verifica conectividad con SQL Server.
 */
export async function testConnection() {
  try {
    const p = await getPool();
    await p.request().query('SELECT 1 AS test');
    return true;
  } catch (err) {
    logger.error(`Error conectando a SQL Server: ${err.message}`);
    return false;
  }
}

/**
 * Limpia trailing spaces y convierte numéricos.
 */
function cleanRow(row) {
  return {
    numero_factura: (row.numero_factura || '').trim(),
    cliente_cedula: (row.cliente_cedula || '').trim(),
    cliente_nombre: (row.cliente_nombre || '').trim(),
    fecha_emision: row.fecha_emision,
    fecha_vencimiento: row.fecha_vencimiento,
    total_factura: parseFloat(row.total_factura) || 0,
    numero_protocolo: (row.numero_protocolo || '').trim(),
    condicion_pago: (row.condicion_pago || '').trim(),
    pago_efectivo: parseFloat(row.pago_efectivo) || 0,
    pago_cheque: parseFloat(row.pago_cheque) || 0,
    pago_tarjeta: parseFloat(row.pago_tarjeta) || 0,
    pago_deposito: parseFloat(row.pago_deposito) || 0,
    pago_directo: parseFloat(row.pago_directo) || 0,
    monto_pagado_cxc: parseFloat(row.monto_pagado_cxc) || 0,
    fecha_ultimo_pago: row.fecha_ultimo_pago,
    monto_nota_credito: parseFloat(row.monto_nota_credito) || 0,
    total_pagado: parseFloat(row.total_pagado) || 0,
    saldo_pendiente: parseFloat(row.saldo_pendiente) || 0,
    estado_pago: (row.estado_pago || '').trim(),
    tiene_nota_credito: (row.tiene_nota_credito || '').trim(),
    ultima_modificacion: row.ultima_modificacion,
  };
}

/**
 * Lee cambios desde la VIEW v_estado_facturas.
 * @param {Date|null} lastSyncDate - Fecha de última sync exitosa, null para primera vez.
 * @returns {Array} Registros limpios.
 */
export async function readChanges(lastSyncDate) {
  const p = await getPool();
  const request = p.request();
  let query;

  if (lastSyncDate) {
    request.input('lastSync', sql.DateTime, lastSyncDate);
    query = `
      SELECT * FROM v_estado_facturas
      WHERE ultima_modificacion > @lastSync
      ORDER BY ultima_modificacion ASC
    `;
  } else {
    query = `
      SELECT * FROM v_estado_facturas
      WHERE fecha_emision >= DATEADD(YEAR, -2, GETDATE())
      ORDER BY ultima_modificacion ASC
    `;
  }

  const result = await request.query(query);
  return result.recordset.map(cleanRow);
}

/**
 * Lee TODA la cartera pendiente (facturas con saldo > 0) para CXC.
 * @returns {Array} Registros de CXC formateados para el endpoint /api/sync/cxc.
 */
export async function readCxc() {
  const p = await getPool();
  const request = p.request();

  const query = `
    SELECT
        numero_factura,
        cliente_cedula,
        cliente_nombre,
        total_factura,
        total_pagado,
        saldo_pendiente,
        estado_pago,
        fecha_emision,
        fecha_vencimiento,
        fecha_ultimo_pago,
        tiene_nota_credito,
        CASE
            WHEN fecha_vencimiento < GETDATE() AND saldo_pendiente > 0
            THEN DATEDIFF(DAY, fecha_vencimiento, GETDATE())
            ELSE 0
        END AS dias_mora
    FROM v_estado_facturas
    WHERE saldo_pendiente > 0
    ORDER BY saldo_pendiente DESC
  `;

  const result = await request.query(query);

  return result.recordset.map((row) => ({
    invoiceNumberRaw: (row.numero_factura || '').trim(),
    clientTaxId: (row.cliente_cedula || '').trim(),
    clientName: (row.cliente_nombre || '').trim(),
    totalAmount: parseFloat(row.total_factura) || 0,
    totalPaid: parseFloat(row.total_pagado) || 0,
    balance: parseFloat(row.saldo_pendiente) || 0,
    status: (row.estado_pago || '').trim(),
    issueDate: row.fecha_emision || null,
    dueDate: row.fecha_vencimiento || null,
    lastPaymentDate: row.fecha_ultimo_pago || null,
    hasCreditNote: (row.tiene_nota_credito || '').trim() === 'SI',
    daysOverdue: parseInt(row.dias_mora) || 0,
  }));
}

/**
 * Cierra el pool de conexiones.
 */
export async function close() {
  if (pool) {
    try {
      await pool.close();
    } catch {
      // Ignorar errores al cerrar
    }
    pool = null;
  }
}
