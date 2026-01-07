import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

export class XmlUploader {
  constructor({ apiUrl, auth, config, logger }) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.auth = auth; // AuthClient
    this.config = config;
    this.logger = logger;
    this.http = axios.create({ baseURL: this.apiUrl, timeout: 180000 });
  }

  /**
   * Verifica si el archivo XML es una factura válida.
   * Retorna false si es una Nota de Crédito u otro tipo de documento.
   */
  async isInvoiceXml(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Detectar etiquetas de factura vs nota de crédito
      const hasInvoiceTag = /<factura\b/i.test(content);
      const hasCreditNote = /<notaCredito\b/i.test(content) || /<notaDebito\b/i.test(content);

      if (hasCreditNote) {
        this.logger.info(`Archivo ignorado (Nota de Crédito/Débito): ${path.basename(filePath)}`);
        return false;
      }

      if (!hasInvoiceTag) {
        this.logger.info(`Archivo ignorado (no contiene etiqueta <factura>): ${path.basename(filePath)}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Error leyendo archivo para validación: ${filePath}: ${err.message}`);
      return false;
    }
  }

  /**
   * Mueve un archivo a la carpeta de ignorados
   */
  async moveToIgnored(filePath) {
    const ignoredBase = this.config.folders.ignored || path.join(this.config.folders.watch, 'ignored');
    const dateDir = new Date().toISOString().slice(0, 10);
    const ignoredDir = path.join(ignoredBase, dateDir);
    await fs.ensureDir(ignoredDir);
    const dest = path.join(ignoredDir, path.basename(filePath));
    await fs.move(filePath, dest, { overwrite: true });
    this.logger.info(`Archivo movido a ignorados: ${dest}`);
    return dest;
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
        timeout: 180000
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

    // Pre-filtrar: separar facturas de archivos ignorados
    const invoiceFiles = [];
    const ignoredFiles = [];

    for (const filePath of filePaths) {
      const isInvoice = await this.isInvoiceXml(filePath);
      if (isInvoice) {
        invoiceFiles.push(filePath);
      } else {
        ignoredFiles.push(filePath);
      }
    }

    // Mover archivos ignorados a su carpeta
    for (const filePath of ignoredFiles) {
      try {
        await this.moveToIgnored(filePath);
      } catch (err) {
        this.logger.error(`Error moviendo archivo ignorado: ${filePath}: ${err.message}`);
      }
    }

    if (ignoredFiles.length > 0) {
      this.logger.info(`${ignoredFiles.length} archivo(s) ignorado(s) (no son facturas)`);
    }

    const results = [];
    const toProcess = [...invoiceFiles];
    while (toProcess.length) {
      const chunk = toProcess.splice(0, this.config.settings.batchSize);
      try {
        const data = chunk.length === 1
          ? await this.uploadSingle(chunk[0])
          : await this.uploadBatch(chunk);
        this.logger.info(`Upload exitoso: ${chunk.length} archivo(s)`);
        for (const src of chunk) {
          const dest = path.join(processedDir, path.basename(src));
          try {
            const exists = await fs.pathExists(src);
            if (exists) {
              await fs.move(src, dest, { overwrite: true });
            }
          } catch (moveErr) {
            this.logger.warn(`No se pudo mover a processed: ${path.basename(src)}: ${moveErr.message}`);
          }
        }
        results.push({ files: chunk, success: true, data });
      } catch (err) {
        this.logger.error(`Error subiendo lote (${chunk.length}): ${err.message}`);
        for (const src of chunk) {
          const dest = path.join(errorsDir, path.basename(src));
          try {
            // Verificar si el archivo existe antes de intentar moverlo
            const exists = await fs.pathExists(src);
            if (exists) {
              await fs.move(src, dest, { overwrite: true });
            } else {
              this.logger.warn(`Archivo ya no existe (posiblemente ya procesado): ${path.basename(src)}`);
            }
          } catch (moveErr) {
            this.logger.error(`No se pudo mover a errors: ${src} -> ${dest}: ${moveErr.message}`);
          }
        }
        results.push({ files: chunk, success: false, error: err.message });
      }
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


