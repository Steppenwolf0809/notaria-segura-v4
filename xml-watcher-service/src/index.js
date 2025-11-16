#!/usr/bin/env node
import path from 'path';
import fs from 'fs-extra';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { AuthClient } from './auth.js';
import { XmlUploader } from './uploader.js';
import { XmlWatcher } from './watcher.js';
import { Organizer } from './organizer.js';
import { Notifier } from './notifier.js';
import { RetryManager } from './retry-manager.js';

async function main() {
  const config = loadConfig();
  await fs.ensureDir(config.folders.watch);
  await fs.ensureDir(config.folders.processed);
  await fs.ensureDir(config.folders.errors);
  await fs.ensureDir(config.folders.archived);

  const logDir = config.folders.watch; // log en la carpeta raíz vigilada
  const logger = createLogger(logDir, config.settings.logLevel || 'INFO');

  logger.info('XML Watcher Service - Notaría iniciado');
  logger.info(`API: ${config.apiUrl}`);

  // Inicializar notificador
  const notifier = new Notifier({ config, logger });

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
    await notifier.notifyError(err, {
      type: 'Autenticación inicial',
      stack: err.stack
    });
  }

  const uploader = new XmlUploader({ apiUrl: config.apiUrl, auth, config, logger });
  const organizer = new Organizer({ folders: config.folders, settings: config.settings, logger });

  // Contador de errores para alertas críticas
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  const watcher = new XmlWatcher({
    watchDir: config.folders.watch,
    delayMs: config.settings.watchDelay,
    logger,
    onFilesReady: async (files) => {
      // Si llegan varias detecciones casi simultáneas, agrupar por ventana de tiempo
      try {
        logger.info(`Procesando ${files.length} archivo(s)...`);
        const results = await uploader.processAndMove(files);

        // Verificar si hubo errores
        const hasErrors = results.some(r => !r.success);
        if (hasErrors && config.notifications?.email?.sendOnError) {
          consecutiveErrors++;
          const errorFiles = results.filter(r => !r.success);
          await notifier.notifyError(
            new Error(`${errorFiles.length} archivo(s) con error`),
            {
              type: 'Error de procesamiento',
              files: errorFiles.length,
              details: errorFiles.map(f => ({
                file: path.basename(f.files[0]),
                error: f.error
              }))
            }
          );

          // Alerta crítica si hay muchos errores consecutivos
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            await notifier.notifyCritical(
              `Se han detectado ${consecutiveErrors} errores consecutivos`,
              {
                'Errores consecutivos': consecutiveErrors,
                'Archivos afectados': errorFiles.length,
                'Última hora': new Date().toLocaleString('es-EC')
              }
            );
          }
        } else {
          consecutiveErrors = 0; // Resetear contador si fue exitoso
        }
      } catch (err) {
        logger.error(`Error en procesamiento: ${err.message}`);
        consecutiveErrors++;
        await notifier.notifyError(err, {
          type: 'Error crítico de procesamiento',
          files: files.length,
          stack: err.stack
        });
      }
    }
  });

  await watcher.start();

  // Inicializar sistema de reintentos automáticos
  const retryManager = new RetryManager({
    folders: config.folders,
    uploader,
    logger,
    config
  });
  retryManager.start();

  // Notificar que el servicio inició
  if (config.notifications?.email?.sendOnStartup) {
    await notifier.notifyServiceStarted();
  }

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


