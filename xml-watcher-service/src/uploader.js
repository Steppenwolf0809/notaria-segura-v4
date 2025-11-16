import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { XmlValidator } from './xml-validator.js';

export class XmlUploader {
  constructor({ apiUrl, auth, config, logger }) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.auth = auth; // AuthClient
    this.config = config;
    this.logger = logger;
    this.http = axios.create({ baseURL: this.apiUrl, timeout: 60000 });
    this.validator = new XmlValidator({ logger });
  }

  async uploadSingle(filePath) {
    const stats = await fs.stat(filePath);
    const maxBytes = this.config.settings.maxFileSizeMB * 1024 * 1024;
    if (stats.size > maxBytes) {
      throw new Error(`Archivo supera límite de ${this.config.settings.maxFileSizeMB}MB`);
    }

    const form = new FormData();
    form.append('xmlFile', fs.createReadStream(filePath));

    return await this._withRetry(async () => {
      const headers = await this.auth.getAuthHeader();
      const res = await this.http.post('/documents/upload-xml', form, {
        headers: { ...headers, ...form.getHeaders() }
      });
      return res.data;
    }, `single:${path.basename(filePath)}`);
  }

  async uploadBatch(filePaths) {
    if (!filePaths.length) return { success: true, message: 'Sin archivos' };
    if (filePaths.length > this.config.settings.batchSize) {
      throw new Error(`Máximo ${this.config.settings.batchSize} archivos por lote`);
    }
    const form = new FormData();
    for (const p of filePaths) {
      form.append('xmlFiles', fs.createReadStream(p));
    }
    return await this._withRetry(async () => {
      const headers = await this.auth.getAuthHeader();
      const res = await this.http.post('/documents/upload-xml-batch', form, {
        headers: { ...headers, ...form.getHeaders() },
        timeout: 120000
      });
      return res.data;
    }, `batch:${filePaths.length}`);
  }

  async processAndMove(filePaths) {
    const processedBase = this.config.folders.processed;
    const errorsBase = this.config.folders.errors;
    const dateDir = new Date().toISOString().slice(0, 10);
    const processedDir = path.join(processedBase, dateDir);
    const errorsDir = path.join(errorsBase, dateDir);
    await fs.ensureDir(processedDir);
    await fs.ensureDir(errorsDir);

    // PASO 1: Validar archivos antes de procesarlos
    const validFiles = [];
    const invalidFiles = [];

    for (const filePath of filePaths) {
      const validation = await this.validator.validateFile(filePath);
      if (validation.valid) {
        this.logger.info(`✓ Validación exitosa: ${path.basename(filePath)}`);
        validFiles.push(filePath);
      } else {
        this.logger.warn(`✗ Validación fallida: ${path.basename(filePath)} - ${validation.error}`);
        invalidFiles.push({ filePath, error: validation.error });
      }
    }

    // PASO 2: Mover archivos inválidos a carpeta de errores
    for (const { filePath, error } of invalidFiles) {
      const dest = path.join(errorsDir, path.basename(filePath));
      try {
        await fs.move(filePath, dest, { overwrite: true });
        // Crear archivo de log con el error
        await fs.writeFile(
          dest + '.error.txt',
          `Error de validación: ${error}\nFecha: ${new Date().toISOString()}\n`,
          'utf-8'
        );
        this.logger.info(`Archivo inválido movido a errors: ${path.basename(filePath)}`);
      } catch (moveErr) {
        this.logger.error(`No se pudo mover archivo inválido: ${filePath} -> ${moveErr.message}`);
      }
    }

    // PASO 3: Procesar solo archivos válidos
    const results = [];
    const toProcess = [...validFiles];
    while (toProcess.length) {
      const chunk = toProcess.splice(0, this.config.settings.batchSize);
      try {
        const data = chunk.length === 1
          ? await this.uploadSingle(chunk[0])
          : await this.uploadBatch(chunk);
        this.logger.info(`Upload exitoso: ${chunk.length} archivo(s)`);
        for (const src of chunk) {
          const dest = path.join(processedDir, path.basename(src));
          await fs.move(src, dest, { overwrite: true });
        }
        results.push({ files: chunk, success: true, data });
      } catch (err) {
        this.logger.error(`Error subiendo lote (${chunk.length}): ${err.message}`);
        for (const src of chunk) {
          const dest = path.join(errorsDir, path.basename(src));
          try {
            await fs.move(src, dest, { overwrite: true });
            // Crear archivo de log con el error
            await fs.writeFile(
              dest + '.error.txt',
              `Error de upload: ${err.message}\nFecha: ${new Date().toISOString()}\n`,
              'utf-8'
            );
          } catch (moveErr) {
            this.logger.error(`No se pudo mover a errors: ${src} -> ${dest}: ${moveErr.message}`);
          }
        }
        results.push({ files: chunk, success: false, error: err.message });
      }
    }

    // Agregar resultados de archivos inválidos
    for (const { filePath, error } of invalidFiles) {
      results.push({ files: [filePath], success: false, error: `Validación: ${error}` });
    }

    return results;
  }

  async _withRetry(fn, label) {
    const attempts = this.config.settings.retryAttempts || 3;
    const backoff = this.config.settings.retryBackoffMs || 1500;
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        if (i > 0) this.logger.warn(`Reintento ${i}/${attempts - 1} para ${label}`);
        return await this.auth.withAuth(fn);
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        // Errores de cliente 4xx distintos de 401: no reintentar
        if (status && status >= 400 && status < 500 && status !== 401) break;
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, i)));
      }
    }
    throw lastErr;
  }
}


