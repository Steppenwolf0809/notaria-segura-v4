import fs from 'fs-extra';
import path from 'path';

export class RetryManager {
  constructor({ folders, uploader, logger, config }) {
    this.folders = folders;
    this.uploader = uploader;
    this.logger = logger;
    this.config = config;
    this.retryConfig = config.settings.autoRetry || {
      enabled: false,
      intervalHours: 6,
      maxAttempts: 3,
      deleteAfterMaxAttempts: false
    };
  }

  /**
   * Inicia el sistema de reintentos automáticos
   */
  start() {
    if (!this.retryConfig.enabled) {
      this.logger.info('Sistema de reintentos automáticos deshabilitado');
      return;
    }

    this.logger.info(
      `Sistema de reintentos iniciado - Intervalo: ${this.retryConfig.intervalHours}h, Máx intentos: ${this.retryConfig.maxAttempts}`
    );

    // Ejecutar inmediatamente al inicio
    this._executeRetry();

    // Programar ejecución periódica
    const intervalMs = this.retryConfig.intervalHours * 60 * 60 * 1000;
    setInterval(() => {
      this._executeRetry();
    }, intervalMs);
  }

  /**
   * Ejecuta el proceso de reintento
   * @private
   */
  async _executeRetry() {
    try {
      this.logger.info('Iniciando proceso de reintento automático...');

      // Buscar archivos XML en la carpeta de errores
      const errorFiles = await this._findErrorFiles();

      if (errorFiles.length === 0) {
        this.logger.info('No hay archivos en la carpeta de errores para reintentar');
        return;
      }

      this.logger.info(`Encontrados ${errorFiles.length} archivo(s) en errors para reintentar`);

      // Procesar cada archivo
      let retried = 0;
      let succeeded = 0;
      let failed = 0;
      let maxAttemptsReached = 0;

      for (const filePath of errorFiles) {
        try {
          const result = await this._retryFile(filePath);
          retried++;

          if (result.success) {
            succeeded++;
            this.logger.info(`✓ Reintento exitoso: ${path.basename(filePath)}`);
          } else if (result.maxAttemptsReached) {
            maxAttemptsReached++;
            this.logger.warn(`✗ Máximo de intentos alcanzado: ${path.basename(filePath)}`);
          } else {
            failed++;
            this.logger.warn(`✗ Reintento fallido: ${path.basename(filePath)} - ${result.error}`);
          }
        } catch (err) {
          failed++;
          this.logger.error(`Error reintentando ${path.basename(filePath)}: ${err.message}`);
        }
      }

      this.logger.info(
        `Reintento completado - Total: ${retried}, Exitosos: ${succeeded}, Fallidos: ${failed}, Máx intentos: ${maxAttemptsReached}`
      );
    } catch (err) {
      this.logger.error(`Error en proceso de reintento: ${err.message}`);
    }
  }

  /**
   * Busca archivos XML en la carpeta de errores
   * @private
   */
  async _findErrorFiles() {
    const files = [];
    const errorsBase = this.folders.errors;

    try {
      const exists = await fs.pathExists(errorsBase);
      if (!exists) {
        return files;
      }

      // Buscar recursivamente en subdirectorios por fecha
      await this._scanDirectory(errorsBase, files);
    } catch (err) {
      this.logger.error(`Error buscando archivos en errors: ${err.message}`);
    }

    return files;
  }

  /**
   * Escanea directorio recursivamente
   * @private
   */
  async _scanDirectory(dir, files) {
    try {
      const entries = await fs.readdir(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await this._scanDirectory(fullPath, files);
        } else if (entry.toLowerCase().endsWith('.xml')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      this.logger.error(`Error escaneando directorio ${dir}: ${err.message}`);
    }
  }

  /**
   * Reintenta procesar un archivo
   * @private
   */
  async _retryFile(filePath) {
    const metadataPath = filePath + '.retry.json';
    const processedBase = this.folders.processed;
    const dateDir = new Date().toISOString().slice(0, 10);
    const processedDir = path.join(processedBase, dateDir);
    await fs.ensureDir(processedDir);

    try {
      // Leer metadata de reintentos
      let metadata = { attempts: 0, lastAttempt: null, errors: [] };
      if (await fs.pathExists(metadataPath)) {
        try {
          metadata = await fs.readJson(metadataPath);
        } catch (err) {
          this.logger.warn(`Error leyendo metadata de ${path.basename(filePath)}, creando nueva`);
        }
      }

      // Verificar si ya alcanzó el máximo de intentos
      if (metadata.attempts >= this.retryConfig.maxAttempts) {
        if (this.retryConfig.deleteAfterMaxAttempts) {
          await fs.remove(filePath);
          await fs.remove(metadataPath);
          if (await fs.pathExists(filePath + '.error.txt')) {
            await fs.remove(filePath + '.error.txt');
          }
          this.logger.info(`Archivo eliminado después de ${metadata.attempts} intentos: ${path.basename(filePath)}`);
        }
        return { success: false, maxAttemptsReached: true };
      }

      // Incrementar contador de intentos
      metadata.attempts++;
      metadata.lastAttempt = new Date().toISOString();

      // Intentar subir el archivo
      try {
        const result = await this.uploader.uploadSingle(filePath);

        // Éxito - mover a processed
        const dest = path.join(processedDir, path.basename(filePath));
        await fs.move(filePath, dest, { overwrite: true });

        // Limpiar archivos de metadata
        await fs.remove(metadataPath).catch(() => {});
        await fs.remove(filePath + '.error.txt').catch(() => {});

        return { success: true, attempts: metadata.attempts };
      } catch (uploadErr) {
        // Error - actualizar metadata
        metadata.errors.push({
          attempt: metadata.attempts,
          date: new Date().toISOString(),
          error: uploadErr.message
        });

        await fs.writeJson(metadataPath, metadata, { spaces: 2 });

        return {
          success: false,
          maxAttemptsReached: false,
          error: uploadErr.message,
          attempts: metadata.attempts
        };
      }
    } catch (err) {
      this.logger.error(`Error procesando reintento de ${path.basename(filePath)}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Obtiene estadísticas de reintentos
   */
  async getStats() {
    const errorFiles = await this._findErrorFiles();
    const stats = {
      totalFiles: errorFiles.length,
      byAttempts: {},
      oldestFile: null,
      newestFile: null
    };

    for (const filePath of errorFiles) {
      const metadataPath = filePath + '.retry.json';
      let attempts = 0;

      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await fs.readJson(metadataPath);
          attempts = metadata.attempts || 0;
        } catch (err) {
          // Ignorar errores de lectura
        }
      }

      stats.byAttempts[attempts] = (stats.byAttempts[attempts] || 0) + 1;

      // Obtener fecha del archivo
      try {
        const stat = await fs.stat(filePath);
        if (!stats.oldestFile || stat.mtime < stats.oldestFile.date) {
          stats.oldestFile = { file: path.basename(filePath), date: stat.mtime };
        }
        if (!stats.newestFile || stat.mtime > stats.newestFile.date) {
          stats.newestFile = { file: path.basename(filePath), date: stat.mtime };
        }
      } catch (err) {
        // Ignorar errores
      }
    }

    return stats;
  }
}
