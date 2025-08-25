import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';
import PQueue from 'p-queue';

export class XmlWatcher {
  constructor({ watchDir, delayMs, logger, onFilesReady, batchWindowMs = 1500 }) {
    this.watchDir = watchDir;
    this.delayMs = delayMs;
    this.logger = logger;
    this.onFilesReady = onFilesReady; // async (filePaths) => {}
    this.pending = new Map(); // file -> timeoutId
    this.queue = new PQueue({ concurrency: 1 });
    this.watcher = null;
    this.batch = new Set();
    this.batchTimer = null;
    this.batchWindowMs = batchWindowMs;
  }

  async start() {
    await fs.ensureDir(this.watchDir);
    this.logger.info(`Servicio iniciado - Vigilando: ${this.watchDir}`);
    this.watcher = chokidar.watch('**/*.xml', {
      cwd: this.watchDir,
      persistent: true,
      ignoreInitial: false,
      depth: 1,
      awaitWriteFinish: { stabilityThreshold: this.delayMs, pollInterval: 200 }
    });

    const scheduleProcess = (fullPath) => {
      clearTimeout(this.pending.get(fullPath));
      const id = setTimeout(() => {
        this.batch.add(fullPath);
        clearTimeout(this.batchTimer);
        this.batchTimer = setTimeout(() => {
          const files = Array.from(this.batch);
          this.batch.clear();
          this.queue.add(async () => {
            try {
              await this.onFilesReady(files);
            } catch (err) {
              this.logger.error(`Error procesando lote (${files.length}): ${err.message}`);
            }
          });
        }, this.batchWindowMs);
      }, this.delayMs);
      this.pending.set(fullPath, id);
    };

    this.watcher.on('add', (relative) => {
      const fullPath = path.join(this.watchDir, relative);
      this.logger.info(`Archivo detectado: ${relative}`);
      scheduleProcess(fullPath);
    });

    this.watcher.on('change', (relative) => {
      const fullPath = path.join(this.watchDir, relative);
      this.logger.info(`Archivo modificado: ${relative}`);
      scheduleProcess(fullPath);
    });

    this.watcher.on('error', (error) => {
      this.logger.error(`Watcher error: ${error.message}`);
    });
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}


