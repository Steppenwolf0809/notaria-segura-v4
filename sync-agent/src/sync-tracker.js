import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import config from './config.js';
import logger from './logger.js';

const TRACKER_FILE = resolve(config.ROOT_DIR, 'last-sync.json');

/**
 * Lee la información de la última sincronización exitosa.
 * @returns {{ lastSuccessfulSync: string, lastSyncId: string, totalSynced: number } | null}
 */
export function getLastSync() {
  try {
    const raw = readFileSync(TRACKER_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data;
  } catch {
    return null;
  }
}

/**
 * Actualiza la información de la última sincronización exitosa.
 * @param {string} syncDate - ISO date de la última modificación más reciente sincronizada.
 * @param {string} syncId - ID de la sync retornado por Railway.
 * @param {number} count - Cantidad de registros sincronizados en esta ejecución.
 */
export function updateLastSync(syncDate, syncId, count) {
  const prev = getLastSync();
  const totalSynced = (prev?.totalSynced || 0) + count;

  const data = {
    lastSuccessfulSync: syncDate,
    lastSyncId: syncId,
    totalSynced,
    updatedAt: new Date().toISOString(),
  };

  try {
    writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`Tracker actualizado: lastSync=${syncDate}, total acumulado=${totalSynced}`);
  } catch (err) {
    logger.error(`Error escribiendo tracker: ${err.message}`);
  }
}
