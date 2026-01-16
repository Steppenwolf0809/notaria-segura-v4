#!/usr/bin/env node
import path from 'path';
import fs from 'fs-extra';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { AuthClient } from './auth.js';
import { XmlUploader } from './uploader.js';
import { XmlWatcher } from './watcher.js';
import { Organizer } from './organizer.js';
import { SourceWatcher } from './source-watcher.js';
import { SequenceTracker } from './sequence-tracker.js';

async function main() {
  const config = loadConfig();

  // Asegurar que todas las carpetas existan
  await fs.ensureDir(config.folders.source);
  await fs.ensureDir(config.folders.watch);
  await fs.ensureDir(config.folders.processed);
  await fs.ensureDir(config.folders.errors);
  await fs.ensureDir(config.folders.archived);
  if (config.folders.ignored) {
    await fs.ensureDir(config.folders.ignored);
  }

  const logDir = config.folders.watch; // log en la carpeta raíz vigilada
  const logger = createLogger(logDir, config.settings.logLevel || 'INFO');

  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   XML Watcher Service UNIFICADO - Notaría');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`API: ${config.apiUrl}`);
  logger.info(`Carpeta fuente (SRI): ${config.folders.source}`);
  logger.info(`Carpeta procesamiento: ${config.folders.watch}`);

  // Inicializar tracker de secuencias
  const sequenceTracker = new SequenceTracker({
    config,
    logger,
    watchDir: config.folders.watch
  });

  const auth = new AuthClient({
    apiUrl: config.apiUrl,
    email: config.credentials.email,
    password: config.credentials.password,
    logger
  });

  // Login inicial
  try {
    await auth.login();
  } catch (err) {
    logger.warn('No se pudo autenticar al inicio. Reintentos ocurrirán al subir.');
  }

  const uploader = new XmlUploader({ apiUrl: config.apiUrl, auth, config, logger });
  const organizer = new Organizer({ folders: config.folders, settings: config.settings, logger });

  // === SOURCE WATCHER ===
  // Vigila C:\SRI\Comprobantes_generados y copia a xmlcopiados
  let sourceWatcher = null;
  if (config.sourceWatcher?.enabled) {
    sourceWatcher = new SourceWatcher({
      sourceDir: config.folders.source,
      targetDir: config.folders.watch,
      copyDelay: config.sourceWatcher.copyDelay,
      deleteAfterCopy: config.sourceWatcher.deleteAfterCopy,
      logger,
      onFileCopied: async (filename, targetPath) => {
        // Verificar secuencia cuando se copia un archivo
        sequenceTracker.track(filename);
      }
    });
    await sourceWatcher.start();
    logger.info('✅ SourceWatcher iniciado - vigilando carpeta SRI');
  } else {
    logger.info('⚠️ SourceWatcher deshabilitado');
  }

  // === MAIN WATCHER ===
  // Vigila xmlcopiados y sube a la API
  const watcher = new XmlWatcher({
    watchDir: config.folders.watch,
    delayMs: config.settings.watchDelay,
    logger,
    onFilesReady: async (files) => {
      try {
        logger.info(`Procesando ${files.length} archivo(s)...`);
        await uploader.processAndMove(files);
      } catch (err) {
        logger.error(`Error en procesamiento: ${err.message}`);
      }
    }
  });

  await watcher.start();
  logger.info('✅ MainWatcher iniciado - procesando y subiendo XMLs');


  // Programar limpieza diaria a la hora indicada
  if (config.settings.cleanup.enabled) {
    scheduleDailyCleanup(config.settings.cleanup.cleanupHour, async () => {
      try {
        await organizer.cleanup();
      } catch (err) {
        logger.error(`Error en limpieza: ${err.message}`);
      }
    });
  }

  // Reporte semanal simple (cada domingo 08:00)
  scheduleWeeklyReport(8, async () => {
    try {
      const stats = await collectStats(config);
      logger.info('=== REPORTE SEMANAL ===');
      logger.info(`XMLs procesados: ${stats.processedCount}`);
      logger.info(`XMLs con error: ${stats.errorsCount} (${stats.errorRate}%)`);
      logger.info(`Espacio usado: processed (${stats.processedSize}), errors (${stats.errorsSize})`);
    } catch (err) {
      logger.error(`Error generando reporte: ${err.message}`);
    }
  });
}

function scheduleDailyCleanup(hour, task) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    task();
    setInterval(task, 24 * 60 * 60 * 1000);
  }, delay);
}

function scheduleWeeklyReport(hour, task) {
  const check = async () => {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    if (isSunday && now.getHours() === hour) {
      await task();
    }
  };
  setInterval(check, 60 * 60 * 1000); // cada hora
}

async function collectStats(config) {
  const formatBytes = (n) => (n / (1024 * 1024) > 1 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`);
  let processedCount = 0;
  let errorsCount = 0;
  let processedBytes = 0;
  let errorsBytes = 0;
  const scan = async (base, counter, bytes) => {
    const walk = async (dir) => {
      const entries = await fs.readdir(dir).catch(() => []);
      for (const name of entries) {
        const full = path.join(dir, name);
        const st = await fs.stat(full).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) await walk(full);
        else {
          if (base === config.folders.processed) processedCount += 1; else errorsCount += 1;
          if (base === config.folders.processed) processedBytes += st.size; else errorsBytes += st.size;
        }
      }
    };
    await walk(base);
  };
  await scan(config.folders.processed);
  await scan(config.folders.errors);
  return {
    processedCount,
    errorsCount,
    errorRate: processedCount ? ((errorsCount / (processedCount + errorsCount)) * 100).toFixed(1) : '0.0',
    processedSize: formatBytes(processedBytes),
    errorsSize: formatBytes(errorsBytes)
  };
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fallo crítico del servicio:', err);
  process.exit(1);
});


