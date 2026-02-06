import config from './config.js';
import logger from './logger.js';
import { testConnection, readChanges, readCxc, close } from './koinor-reader.js';
import { checkStatus, sendData, sendCxcData } from './railway-sender.js';
import { getLastSync, updateLastSync } from './sync-tracker.js';

const ONCE_MODE = process.argv.includes('--once');
let intervalId = null;
let isSyncing = false;

/**
 * Verifica si la hora actual está dentro del horario activo.
 */
function isActiveHours() {
  const hour = new Date().getHours();
  return hour >= config.SYNC_ACTIVE_HOUR_START && hour < config.SYNC_ACTIVE_HOUR_END;
}

/**
 * Ejecuta sincronización de PAGOS (billing) - incremental.
 */
async function runBillingSync() {
  const syncStartedAt = new Date().toISOString();

  // 1. Leer última sync
  const tracker = getLastSync();
  const lastSyncDate = tracker?.lastSuccessfulSync
    ? new Date(tracker.lastSuccessfulSync)
    : null;

  if (lastSyncDate) {
    logger.info(`[Billing] Sync incremental desde: ${tracker.lastSuccessfulSync}`);
  } else {
    logger.info('[Billing] Primera sincronización: leyendo últimos 2 años');
  }

  // 2. Leer cambios de Koinor
  const records = await readChanges(lastSyncDate);

  if (records.length === 0) {
    logger.info('[Billing] Sin cambios desde última sincronización');
    return;
  }

  logger.info(`[Billing] ${records.length} registros detectados con cambios`);

  // 3. Enviar a Railway (por lotes si excede BATCH_SIZE)
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let lastResponseSyncId = null;

  for (let i = 0; i < records.length; i += config.BATCH_SIZE) {
    const batch = records.slice(i, i + config.BATCH_SIZE);
    const batchNum = Math.floor(i / config.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / config.BATCH_SIZE);

    if (totalBatches > 1) {
      logger.info(`[Billing] Enviando lote ${batchNum}/${totalBatches} (${batch.length} registros)`);
    }

    const response = await sendData(batch, syncStartedAt);

    totalCreated += response.created || 0;
    totalUpdated += response.updated || 0;
    totalErrors += response.errors || 0;
    lastResponseSyncId = response.syncId || lastResponseSyncId;
  }

  // 4. Actualizar tracker con la última fecha de modificación
  const latestRecord = records[records.length - 1];
  const latestDate = latestRecord.ultima_modificacion instanceof Date
    ? latestRecord.ultima_modificacion.toISOString()
    : new Date(latestRecord.ultima_modificacion).toISOString();

  updateLastSync(latestDate, lastResponseSyncId || syncStartedAt, records.length);

  logger.info(
    `[Billing] Sync completada: ${records.length} enviados, ${totalCreated} creados, ${totalUpdated} actualizados, ${totalErrors} errores`
  );
}

/**
 * Ejecuta sincronización de CXC (cartera pendiente) - full sync.
 */
async function runCxcSync() {
  logger.info('[CXC] Leyendo cartera pendiente de Koinor...');

  const records = await readCxc();

  if (records.length === 0) {
    logger.info('[CXC] Sin facturas con saldo pendiente');
    return;
  }

  logger.info(`[CXC] ${records.length} facturas con saldo pendiente`);

  // Enviar toda la cartera como fullSync (un solo batch ya que son ~569 registros)
  const response = await sendCxcData(records, true);

  const created = response.data?.created || 0;
  const updated = response.data?.updated || 0;
  const markedAsPaid = response.data?.markedAsPaid || 0;
  const errors = response.data?.errors || 0;

  logger.info(
    `[CXC] Sync completada: ${records.length} enviados, ${created} creados, ${updated} actualizados, ${markedAsPaid} marcados como pagados, ${errors} errores`
  );
}

/**
 * Ejecuta un ciclo completo de sincronización (billing + CXC).
 */
async function runSync() {
  if (isSyncing) {
    logger.warn('Sync anterior aún en progreso, saltando este ciclo');
    return;
  }

  if (!ONCE_MODE && !isActiveHours()) {
    logger.info(
      `Fuera de horario activo (${config.SYNC_ACTIVE_HOUR_START}:00-${config.SYNC_ACTIVE_HOUR_END}:00), esperando...`
    );
    return;
  }

  isSyncing = true;

  try {
    // 1. Sync Pagos (incremental)
    try {
      await runBillingSync();
    } catch (err) {
      logger.error(`[Billing] Error en sincronización: ${err.message}`);
    }

    // 2. Sync CXC (full)
    try {
      await runCxcSync();
    } catch (err) {
      logger.error(`[CXC] Error en sincronización: ${err.message}`);
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Cierre limpio del servicio.
 */
async function shutdown(signal) {
  logger.info(`Señal ${signal} recibida, deteniendo servicio...`);
  if (intervalId) {
    clearInterval(intervalId);
  }
  await close();
  logger.info('Servicio detenido');
  process.exit(0);
}

/**
 * Arranque principal.
 */
async function main() {
  logger.info('=== Koinor Sync Agent v1.0.0 ===');
  logger.info(`Modo: ${ONCE_MODE ? 'ejecución única' : 'servicio continuo'}`);
  logger.info(`Endpoint: ${config.RAILWAY_SYNC_URL}`);
  logger.info(`Intervalo: cada ${config.SYNC_INTERVAL_MINUTES} minutos`);
  logger.info(`Horario activo: ${config.SYNC_ACTIVE_HOUR_START}:00 - ${config.SYNC_ACTIVE_HOUR_END}:00`);

  // Verificar SQL Server
  logger.info('Verificando conexión a SQL Server...');
  const sqlOk = await testConnection();
  if (!sqlOk) {
    logger.error('No se pudo conectar a SQL Server. Abortando.');
    process.exit(1);
  }
  logger.info('Conexión a SQL Server: OK');

  // Verificar Railway (no fatal)
  logger.info('Verificando conexión a Railway...');
  const railwayStatus = await checkStatus();
  if (railwayStatus) {
    logger.info('Conexión a Railway: OK');
  } else {
    logger.warn('No se pudo verificar Railway (puede estar temporalmente caído)');
  }

  // Ejecutar
  if (ONCE_MODE) {
    await runSync();
    await close();
    process.exit(0);
  }

  // Modo servicio: manejar señales
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Primera sync inmediata
  await runSync();

  // Scheduler
  const intervalMs = config.SYNC_INTERVAL_MINUTES * 60 * 1000;
  intervalId = setInterval(runSync, intervalMs);
  logger.info(`Scheduler activo: siguiente sync en ${config.SYNC_INTERVAL_MINUTES} minutos`);
}

main().catch((err) => {
  logger.error(`Error fatal: ${err.message}`);
  process.exit(1);
});
