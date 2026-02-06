import config from './config.js';
import logger from './logger.js';

const AGENT_VERSION = '1.0.0';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000];
const REQUEST_TIMEOUT = 30000;

/**
 * Fetch con timeout.
 */
async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifica que el endpoint de Railway esté accesible.
 */
export async function checkStatus() {
  try {
    const url = `${config.RAILWAY_SYNC_URL}/status`;
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'X-Sync-Api-Key': config.SYNC_API_KEY },
    });

    if (!res.ok) {
      logger.warn(`Railway status check retornó ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    logger.warn(`No se pudo verificar Railway: ${err.message}`);
    return null;
  }
}

/**
 * Envía datos al endpoint de Railway con reintentos.
 * @param {Array} data - Registros a sincronizar.
 * @param {string} syncStartedAt - ISO timestamp del inicio de la sync.
 * @returns {Object} Respuesta JSON del servidor.
 */
export async function sendData(data, syncStartedAt) {
  const body = JSON.stringify({
    agentVersion: AGENT_VERSION,
    syncStartedAt,
    data,
  });

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES - 1; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.info(`Reintento ${attempt}/${MAX_RETRIES - 1} en ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const res = await fetchWithTimeout(config.RAILWAY_SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Api-Key': config.SYNC_API_KEY,
        },
        body,
      });

      if (res.status === 401) {
        const errMsg = 'API Key inválida. Verificar SYNC_API_KEY en .env';
        logger.error(`ERROR CRÍTICO: ${errMsg}`);
        throw new Error(errMsg);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Railway respondió ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      // No reintentar si es error de autenticación
      if (err.message.includes('API Key inválida')) {
        throw err;
      }
      logger.warn(`Intento ${attempt + 1} falló: ${err.message}`);
    }
  }

  throw lastError;
}

/**
 * Envía datos de CXC (cartera pendiente) al endpoint de Railway con reintentos.
 * @param {Array} data - Registros de cartera pendiente.
 * @param {boolean} fullSync - true si se envió toda la cartera (no solo delta).
 * @returns {Object} Respuesta JSON del servidor.
 */
export async function sendCxcData(data, fullSync = true) {
  // Build CXC URL: replace /billing with /cxc in the base sync URL
  const cxcUrl = config.RAILWAY_SYNC_URL.replace(/\/billing$/, '/cxc');

  const body = JSON.stringify({
    type: 'cxc',
    fullSync,
    timestamp: new Date().toISOString(),
    data,
  });

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES - 1; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.info(`[CXC] Reintento ${attempt}/${MAX_RETRIES - 1} en ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const res = await fetchWithTimeout(cxcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Api-Key': config.SYNC_API_KEY,
        },
        body,
      });

      if (res.status === 401) {
        const errMsg = 'API Key inválida. Verificar SYNC_API_KEY en .env';
        logger.error(`ERROR CRÍTICO: ${errMsg}`);
        throw new Error(errMsg);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Railway CXC respondió ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      if (err.message.includes('API Key inválida')) {
        throw err;
      }
      logger.warn(`[CXC] Intento ${attempt + 1} falló: ${err.message}`);
    }
  }

  throw lastError;
}
