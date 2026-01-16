import chokidar from 'chokidar';
import fs from 'fs-extra';
import path from 'path';

/**
 * SourceWatcher - Vigila la carpeta fuente (SRI) y copia XMLs a la carpeta de procesamiento
 * IMPORTANTE: Copia en lugar de mover porque el software de facturación borra el original
 */
export class SourceWatcher {
    constructor({ sourceDir, targetDir, copyDelay, deleteAfterCopy, logger, onFileCopied }) {
        this.sourceDir = sourceDir;
        this.targetDir = targetDir;
        this.copyDelay = copyDelay || 2000;
        this.deleteAfterCopy = deleteAfterCopy || false;
        this.logger = logger;
        this.onFileCopied = onFileCopied; // callback: async (filename, targetPath) => {}
        this.watcher = null;
        this.processing = new Set(); // Evitar procesar el mismo archivo múltiples veces
    }

    async start() {
        await fs.ensureDir(this.sourceDir);
        await fs.ensureDir(this.targetDir);

        this.logger.info(`[SourceWatcher] Vigilando carpeta fuente: ${this.sourceDir}`);
        this.logger.info(`[SourceWatcher] Copiando a: ${this.targetDir}`);

        this.watcher = chokidar.watch('**/*.xml', {
            cwd: this.sourceDir,
            persistent: true,
            ignoreInitial: false, // Procesar archivos existentes al iniciar
            depth: 2,
            awaitWriteFinish: {
                stabilityThreshold: this.copyDelay,
                pollInterval: 300
            }
        });

        this.watcher.on('add', async (relative) => {
            const fullPath = path.join(this.sourceDir, relative);

            // Evitar procesamiento duplicado
            if (this.processing.has(fullPath)) return;
            this.processing.add(fullPath);

            try {
                await this.copyFile(fullPath, relative);
            } finally {
                // Limpiar después de un tiempo para permitir re-procesamiento si es necesario
                setTimeout(() => this.processing.delete(fullPath), 10000);
            }
        });

        this.watcher.on('error', (error) => {
            this.logger.error(`[SourceWatcher] Error: ${error.message}`);
        });
    }

    async copyFile(sourcePath, relativePath) {
        const filename = path.basename(sourcePath);
        let targetPath = path.join(this.targetDir, filename);

        try {
            // Si el archivo ya existe en destino, agregar timestamp
            if (await fs.pathExists(targetPath)) {
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                const timestamp = Date.now();
                targetPath = path.join(this.targetDir, `${base}_${timestamp}${ext}`);
            }

            // Copiar archivo (no mover, porque el software de facturación lo borrará)
            await fs.copy(sourcePath, targetPath);
            this.logger.info(`[SourceWatcher] Copiado: ${filename} -> ${path.basename(targetPath)}`);

            // Callback para tracking de secuencia
            if (this.onFileCopied) {
                await this.onFileCopied(filename, targetPath);
            }

            // Opcionalmente borrar el original (normalmente NO, lo borra el otro software)
            if (this.deleteAfterCopy) {
                await fs.remove(sourcePath);
                this.logger.info(`[SourceWatcher] Eliminado original: ${filename}`);
            }

        } catch (err) {
            this.logger.error(`[SourceWatcher] Error copiando ${filename}: ${err.message}`);
        }
    }

    async stop() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
            this.logger.info('[SourceWatcher] Detenido');
        }
    }
}
