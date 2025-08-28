import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';

/**
 * Servicio OCR basado en Tesseract (CLI) con conversión opcional de PDF a imágenes via pdftoppm/pdftocairo.
 * - Requiere herramientas instaladas en el sistema para mejor desempeño.
 * - Si no están disponibles, intenta usar tesseract.js si se instaló como dependencia.
 * - Siempre degrada de forma segura y nunca rompe el flujo (devuelve null en caso de indisponibilidad).
 */
class OcrService {
  constructor() {
    this.enabled = (process.env.OCR_ENABLED || 'false') !== 'false';
    this.lang = process.env.OCR_LANGS || 'spa';
    this.psm = process.env.OCR_PSM || '6';
    this.dpi = parseInt(process.env.PDF_OCR_DPI || '300', 10);
    this.maxPages = parseInt(process.env.OCR_MAX_PAGES || '5', 10);
    this.cacheTtlMs = parseInt(process.env.OCR_CACHE_TTL_MS || String(6 * 60 * 60 * 1000), 10); // 6h por defecto
    this.tmpDir = path.join(process.cwd(), 'backend', 'tmp');
    this.toolsChecked = false;
    this.hasTesseract = false;
    this.hasPdftoppm = false;
    this.hasPdftocairo = false;
    this.cache = new Map(); // key -> { value, expiresAt }
  }

  async ensureTmpDir() {
    try { await fs.mkdir(this.tmpDir, { recursive: true }); } catch {}
  }

  async checkTools() {
    if (this.toolsChecked) return;
    this.toolsChecked = true;
    const check = async (cmd, args) => new Promise((resolve) => {
      try {
        const p = spawn(cmd, args, { stdio: 'ignore' });
        p.on('error', () => resolve(false));
        p.on('close', (code) => resolve(code === 0 || code === 1));
      } catch {
        resolve(false);
      }
    });
    this.hasTesseract = await check('tesseract', ['--version']);
    this.hasPdftoppm = await check('pdftoppm', ['-v']);
    this.hasPdftocairo = await check('pdftocairo', ['-v']);
  }

  async isAvailable() {
    if (!this.enabled) return false;
    await this.checkTools();
    if (this.hasTesseract && (this.hasPdftoppm || this.hasPdftocairo)) return true;
    // Intento tesseract.js si está instalado
    try {
      const mod = await import('tesseract.js');
      return !!mod;
    } catch {
      return false;
    }
  }

  async writeTempFile(prefix, ext, buffer) {
    await this.ensureTmpDir();
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 10);
    const filename = path.join(this.tmpDir, `${prefix}-${hash}-${Date.now()}.${ext}`);
    await fs.writeFile(filename, buffer);
    return filename;
  }

  async runCmd(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { ...opts });
      let stdout = '';
      let stderr = '';
      if (p.stdout) p.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
      if (p.stderr) p.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
      p.on('error', reject);
      p.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr, code });
        else resolve({ stdout, stderr, code }); // No lanzar para permitir fallback
      });
    });
  }

  async pdfToPngPages(pdfPath, outPrefix) {
    // Preferir pdftoppm; fallback a pdftocairo
    if (this.hasPdftoppm) {
      const args = ['-png', '-r', String(this.dpi), '-f', '1', '-l', String(this.maxPages), pdfPath, outPrefix];
      await this.runCmd('pdftoppm', args);
      return 'pdftoppm';
    }
    if (this.hasPdftocairo) {
      const args = ['-png', '-r', String(this.dpi), '-f', '1', '-l', String(this.maxPages), pdfPath, outPrefix];
      await this.runCmd('pdftocairo', args);
      return 'pdftocairo';
    }
    throw new Error('No hay conversor PDF→PNG disponible');
  }

  async listGeneratedImages(outPrefix) {
    const dir = path.dirname(outPrefix);
    const base = path.basename(outPrefix);
    const files = await fs.readdir(dir);
    // pdftoppm: base-1.png ...; pdftocairo: base-1.png ...
    const images = files
      .filter(f => f.startsWith(base) && f.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return images.map(f => path.join(dir, f));
  }

  async ocrImageToTsv(imagePath) {
    const args = [imagePath, 'stdout', '-l', this.lang, '--psm', this.psm, 'tsv'];
    const { stdout } = await this.runCmd('tesseract', args);
    return stdout || '';
  }

  parseTsvToText(tsv) {
    if (!tsv) return '';
    const lines = tsv.split(/\r?\n/).slice(1) // drop header
      .map(l => l.split('\t'))
      .filter(cols => cols.length >= 12)
      .filter(cols => cols[0] === '5' && cols[11] && cols[11].trim()); // level 5 = word
    // Agrupar por (page, block, par, line)
    const key = (c) => `${c[1]}-${c[2]}-${c[3]}-${c[4]}`;
    const grouped = new Map();
    for (const cols of lines) {
      const k = key(cols);
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k).push(cols[11]);
    }
    const textLines = [];
    for (const [, words] of grouped.entries()) {
      textLines.push(words.join(' '));
    }
    return textLines.join(os.EOL);
  }

  async ocrPdf(buffer) {
    if (!this.enabled) return null;
    await this.checkTools();
    const key = crypto.createHash('sha1').update(buffer).digest('hex');
    const now = Date.now();
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > now) {
      return entry.value;
    } else if (entry) {
      this.cache.delete(key);
    }
    // Preferir pipeline CLI: pdftoppm/pdftocairo + tesseract
    if (this.hasTesseract && (this.hasPdftoppm || this.hasPdftocairo)) {
      const pdfPath = await this.writeTempFile('ocr', 'pdf', buffer);
      const outPrefix = path.join(this.tmpDir, `png-${path.basename(pdfPath, '.pdf')}`);
      try {
        await this.pdfToPngPages(pdfPath, outPrefix);
        const images = await this.listGeneratedImages(outPrefix);
        let allTsv = '';
        for (const img of images.slice(0, this.maxPages)) {
          const tsv = await this.ocrImageToTsv(img);
          allTsv += tsv + '\n';
        }
        const text = this.parseTsvToText(allTsv);
        const value = { text, tsv: allTsv, pages: images.length };
        this.cache.set(key, { value, expiresAt: now + this.cacheTtlMs });
        return value;
      } finally {
        // best effort cleanup
        try {
          const dir = path.dirname(outPrefix);
          const base = path.basename(outPrefix);
          const files = await fs.readdir(dir);
          await Promise.all(files.filter(f => f.startsWith(base)).map(f => fs.unlink(path.join(dir, f)).catch(() => {})));
          await fs.unlink(pdfPath).catch(() => {});
        } catch {}
      }
    }

    // Fallback a tesseract.js si existe y si el PDF es una imagen en sí (no soportado directamente).
    // Nota: tesseract.js requiere imágenes; en esta fase devolvemos null si no hay conversor.
    try {
      const tj = await import('tesseract.js');
      // Sin conversor a imagen, no procedemos para PDFs.
      return null;
    } catch {
      const value = null;
      this.cache.set(key, { value, expiresAt: now + this.cacheTtlMs });
      return value;
    }
  }

  async getHealth() {
    await this.checkTools();
    const backend = this.hasTesseract ? 'tesseract-cli' : 'none';
    return {
      enabled: this.enabled,
      backend,
      tools: {
        tesseract: this.hasTesseract,
        pdftoppm: this.hasPdftoppm,
        pdftocairo: this.hasPdftocairo
      },
      config: {
        lang: this.lang,
        psm: this.psm,
        dpi: this.dpi,
        maxPages: this.maxPages,
        cacheTtlMs: this.cacheTtlMs
      },
      cache: {
        size: this.cache.size
      }
    };
  }
}

const ocrService = new OcrService();
export default ocrService;
