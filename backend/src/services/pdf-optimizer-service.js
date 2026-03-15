/**
 * Servicio de optimización de PDFs con Ghostscript
 * Comprime PDFs y estampa marca de agua en un solo paso
 *
 * Requiere Ghostscript instalado en el sistema:
 *   - Linux/Railway: apt install ghostscript  (o nixpacks.toml)
 *   - Windows: choco install ghostscript
 *   - macOS: brew install ghostscript
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

const execFileAsync = promisify(execFile);

// ── Configuración ────────────────────────────────────────────────

/**
 * Niveles de compresión disponibles.
 * Se prueban con escrituras reales para elegir el óptimo.
 */
export const COMPRESSION_LEVELS = {
  screen:  { setting: '/screen',  dpi: 72,  description: 'Solo pantalla (~500KB-1MB)' },
  ebook:   { setting: '/ebook',   dpi: 150, description: 'Lectura en pantalla (~1-3MB)' },
  printer: { setting: '/printer', dpi: 300, description: 'Calidad impresión (~3-5MB)' },
};

/** Nivel de compresión por defecto (se ajusta tras pruebas) */
const DEFAULT_LEVEL = process.env.PDF_COMPRESSION_LEVEL || 'ebook';

/** Timeout para Ghostscript (ms) */
const GS_TIMEOUT = 30000;

/** Tamaño máximo de entrada (20MB) */
const MAX_INPUT_SIZE = 20 * 1024 * 1024;

/** Texto de marca de agua por defecto */
const DEFAULT_WATERMARK = 'COPIA VALIDA PARA VERIFICACION SIN VALOR LEGAL';

// ── Detección de Ghostscript ─────────────────────────────────────

/**
 * Detecta el ejecutable de Ghostscript según el sistema operativo
 * @returns {string} Ruta o nombre del ejecutable
 */
function getGhostscriptCommand() {
  if (process.env.GS_PATH) return process.env.GS_PATH;

  if (process.platform === 'win32') {
    // Buscar en ruta estándar de instalación de Ghostscript en Windows
    try {
      const gsDir = 'C:/Program Files/gs';
      if (existsSync(gsDir)) {
        const versions = readdirSync(gsDir).sort().reverse();
        for (const ver of versions) {
          const fullPath = `${gsDir}/${ver}/bin/gswin64c.exe`;
          if (existsSync(fullPath)) return fullPath;
        }
      }
    } catch { /* ignorar */ }
    return 'gswin64c';
  }
  // Linux/macOS
  return 'gs';
}

/**
 * Verifica que Ghostscript esté instalado y accesible
 * @returns {Promise<{available: boolean, version: string|null, command: string}>}
 */
export async function checkGhostscript() {
  const command = getGhostscriptCommand();
  try {
    const { stdout } = await execFileAsync(command, ['--version'], { timeout: 5000 });
    return {
      available: true,
      version: stdout.trim(),
      command,
    };
  } catch (error) {
    // En Windows, intentar también gswin32c
    if (process.platform === 'win32' && command === 'gswin64c') {
      try {
        const { stdout } = await execFileAsync('gswin32c', ['--version'], { timeout: 5000 });
        return {
          available: true,
          version: stdout.trim(),
          command: 'gswin32c',
        };
      } catch {
        // Continuar al return de abajo
      }
    }
    return {
      available: false,
      version: null,
      command,
      error: error.message,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Crea un directorio temporal único para operaciones de Ghostscript
 * @returns {Promise<string>} Ruta al directorio temporal
 */
async function createTempDir() {
  const prefix = path.join(tmpdir(), 'gs-');
  return mkdtemp(prefix);
}

/**
 * Estampa marca de agua en un PDF usando pdf-lib.
 * Respeta la rotación de cada página (funciona con PDFs escaneados).
 * Dibuja el texto 3 veces en diagonal, semitransparente.
 *
 * @param {Buffer} pdfBuffer - PDF al que agregar marca de agua
 * @param {string} text - Texto de la marca de agua
 * @returns {Promise<Buffer>} PDF con marca de agua
 */
async function addWatermark(pdfBuffer, text) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 30;
  const color = rgb(0.7, 0.7, 0.7); // gris claro
  const opacity = 0.35;

  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;

    // Calcular dimensiones visuales y posiciones según rotación
    // pdf-lib dibuja en el sistema de coordenadas RAW del PDF,
    // hay que ajustar según la rotación de la página
    let positions;
    let wmAngle;

    if (rotation === 270) {
      // Página landscape rotada 270°: visual portrait (842x595 raw → 595x842 visual)
      // raw x: 0=visual bottom, width=visual top
      // raw y: 0=visual left, height=visual right
      // Texto debe ir diagonal de lower-left a upper-right visualmente
      wmAngle = -55;
      positions = [
        { x: width * 0.75, y: height * 0.72 },
        { x: width * 0.50, y: height * 0.72 },
        { x: width * 0.25, y: height * 0.72 },
      ];
    } else if (rotation === 90) {
      // Página rotada 90°
      wmAngle = 135;
      positions = [
        { x: width * 0.20, y: height * 0.95 },
        { x: width * 0.50, y: height * 0.95 },
        { x: width * 0.80, y: height * 0.95 },
      ];
    } else if (rotation === 180) {
      // Página rotada 180°
      wmAngle = -45;
      positions = [
        { x: width * 0.95, y: height * 0.80 },
        { x: width * 0.95, y: height * 0.50 },
        { x: width * 0.95, y: height * 0.20 },
      ];
    } else {
      // Sin rotación (0°)
      wmAngle = 45;
      positions = [
        { x: width * 0.05, y: height * 0.20 },
        { x: width * 0.05, y: height * 0.50 },
        { x: width * 0.05, y: height * 0.80 },
      ];
    }

    for (const pos of positions) {
      page.drawText(text, {
        x: pos.x,
        y: pos.y,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: degrees(wmAngle),
      });
    }
  }

  const resultBytes = await pdfDoc.save();
  return Buffer.from(resultBytes);
}

/**
 * Limpia archivos temporales de forma segura
 * @param {string[]} files - Rutas de archivos a eliminar
 */
async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await unlink(file);
    } catch {
      // Ignorar errores de limpieza
    }
  }
}

// ── API Pública ──────────────────────────────────────────────────

/**
 * Comprime un PDF con Ghostscript (sin marca de agua)
 *
 * @param {Buffer} inputBuffer - PDF original
 * @param {Object} [options]
 * @param {string} [options.level='ebook'] - Nivel: 'screen', 'ebook', 'printer'
 * @returns {Promise<{buffer: Buffer, originalSize: number, compressedSize: number, ratio: string, level: string}>}
 * @throws {Error} Si Ghostscript no está disponible o falla
 */
export async function optimizePDF(inputBuffer, options = {}) {
  const level = options.level || DEFAULT_LEVEL;

  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    throw new Error('inputBuffer debe ser un Buffer válido con contenido');
  }

  if (inputBuffer.length > MAX_INPUT_SIZE) {
    throw new Error(`PDF demasiado grande (${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_INPUT_SIZE / 1024 / 1024}MB`);
  }

  const config = COMPRESSION_LEVELS[level];
  if (!config) {
    throw new Error(`Nivel de compresión no válido: ${level}. Usar: ${Object.keys(COMPRESSION_LEVELS).join(', ')}`);
  }

  const gsCheck = await checkGhostscript();
  if (!gsCheck.available) {
    throw new Error(`Ghostscript no está disponible: ${gsCheck.error}`);
  }

  const tempDir = await createTempDir();
  const uid = crypto.randomBytes(6).toString('hex');
  const inputPath = path.join(tempDir, `input-${uid}.pdf`);
  const outputPath = path.join(tempDir, `output-${uid}.pdf`);

  try {
    await writeFile(inputPath, inputBuffer);

    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${config.setting}`,
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    console.log(`[PDF-Optimizer] Comprimiendo con nivel ${level} (${config.description})...`);

    await execFileAsync(gsCheck.command, args, { timeout: GS_TIMEOUT });

    const outputBuffer = await readFile(outputPath);
    const ratio = ((1 - outputBuffer.length / inputBuffer.length) * 100).toFixed(1);

    // Si el resultado es más grande que el original, devolver el original
    if (outputBuffer.length >= inputBuffer.length) {
      console.log(`[PDF-Optimizer] Compresión no efectiva (${(inputBuffer.length / 1024).toFixed(0)}KB → ${(outputBuffer.length / 1024).toFixed(0)}KB). Usando original.`);
      return {
        buffer: inputBuffer,
        originalSize: inputBuffer.length,
        compressedSize: inputBuffer.length,
        ratio: '0%',
        level,
        skipped: true,
      };
    }

    console.log(`[PDF-Optimizer] Compresión: ${(inputBuffer.length / 1024).toFixed(0)}KB → ${(outputBuffer.length / 1024).toFixed(0)}KB (${ratio}% reducción)`);

    return {
      buffer: outputBuffer,
      originalSize: inputBuffer.length,
      compressedSize: outputBuffer.length,
      ratio: `${ratio}%`,
      level,
    };
  } finally {
    await cleanupFiles([inputPath, outputPath]);
    // Intentar eliminar directorio temporal
    try { await unlink(tempDir); } catch { /* rmdir en algunos OS */ }
  }
}

/**
 * Comprime un PDF con Ghostscript Y estampa marca de agua con pdf-lib.
 * Dos pasos separados para evitar problemas de rotación de páginas.
 *
 * @param {Buffer} inputBuffer - PDF original
 * @param {Object} [options]
 * @param {string} [options.level='ebook'] - Nivel de compresión
 * @param {string} [options.watermarkText] - Texto de la marca de agua
 * @returns {Promise<{buffer: Buffer, originalSize: number, compressedSize: number, ratio: string, level: string, watermark: boolean}>}
 */
export async function optimizeAndWatermark(inputBuffer, options = {}) {
  const level = options.level || DEFAULT_LEVEL;
  const watermarkText = options.watermarkText || DEFAULT_WATERMARK;

  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    throw new Error('inputBuffer debe ser un Buffer válido con contenido');
  }

  if (inputBuffer.length > MAX_INPUT_SIZE) {
    throw new Error(`PDF demasiado grande (${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_INPUT_SIZE / 1024 / 1024}MB`);
  }

  console.log(`[PDF-Optimizer] Paso 1: Comprimiendo con Ghostscript (${level})...`);

  // Paso 1: Comprimir con Ghostscript (sin marca de agua)
  let compressedBuffer;
  try {
    const result = await optimizePDF(inputBuffer, { level });
    compressedBuffer = result.buffer;
    console.log(`[PDF-Optimizer] Compresión: ${(inputBuffer.length / 1024).toFixed(0)}KB → ${(compressedBuffer.length / 1024).toFixed(0)}KB`);
  } catch (gsError) {
    console.warn(`[PDF-Optimizer] Ghostscript falló, usando original: ${gsError.message}`);
    compressedBuffer = inputBuffer;
  }

  // Paso 2: Estampar marca de agua con pdf-lib
  console.log(`[PDF-Optimizer] Paso 2: Estampando marca de agua con pdf-lib...`);
  const watermarkedBuffer = await addWatermark(compressedBuffer, watermarkText);

  const ratio = ((1 - watermarkedBuffer.length / inputBuffer.length) * 100).toFixed(1);
  console.log(`[PDF-Optimizer] Final: ${(inputBuffer.length / 1024).toFixed(0)}KB → ${(watermarkedBuffer.length / 1024).toFixed(0)}KB (${ratio}% reducción) + marca de agua`);

  return {
    buffer: watermarkedBuffer,
    originalSize: inputBuffer.length,
    compressedSize: watermarkedBuffer.length,
    ratio: `${ratio}%`,
    level,
    watermark: true,
  };
}

/**
 * Prueba todos los niveles de compresión con un PDF dado.
 * Útil para comparar calidad vs tamaño y decidir el nivel óptimo.
 *
 * @param {Buffer} inputBuffer - PDF de prueba
 * @returns {Promise<Object[]>} Resultados de cada nivel
 */
export async function testAllLevels(inputBuffer) {
  const results = [];

  for (const [level, config] of Object.entries(COMPRESSION_LEVELS)) {
    try {
      const result = await optimizePDF(inputBuffer, { level });
      results.push({
        level,
        description: config.description,
        dpi: config.dpi,
        originalSizeKB: Math.round(result.originalSize / 1024),
        compressedSizeKB: Math.round(result.compressedSize / 1024),
        ratio: result.ratio,
      });
    } catch (error) {
      results.push({
        level,
        description: config.description,
        dpi: config.dpi,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Prueba todos los niveles con marca de agua y guarda los PDFs resultantes.
 * Permite comparar visualmente la calidad de cada nivel.
 *
 * @param {Buffer} inputBuffer - PDF de prueba
 * @param {string} outputDir - Directorio donde guardar los PDFs resultantes
 * @param {string} [baseName='test'] - Nombre base para los archivos
 * @returns {Promise<Object[]>} Resultados con rutas a los archivos generados
 */
export async function testAllLevelsWithOutput(inputBuffer, outputDir, baseName = 'test') {
  const results = [];

  for (const [level, config] of Object.entries(COMPRESSION_LEVELS)) {
    try {
      const result = await optimizeAndWatermark(inputBuffer, { level });
      const outputPath = path.join(outputDir, `${baseName}_${level}.pdf`);
      await writeFile(outputPath, result.buffer);

      results.push({
        level,
        description: config.description,
        dpi: config.dpi,
        originalSizeMB: (result.originalSize / 1024 / 1024).toFixed(2),
        compressedSizeMB: (result.compressedSize / 1024 / 1024).toFixed(2),
        ratio: result.ratio,
        outputPath,
        watermark: true,
      });

      console.log(`[Test] ${level}: ${result.ratio} reducción → ${outputPath}`);
    } catch (error) {
      results.push({
        level,
        description: config.description,
        error: error.message,
      });
    }
  }

  return results;
}

export default {
  checkGhostscript,
  optimizePDF,
  optimizeAndWatermark,
  testAllLevels,
  testAllLevelsWithOutput,
  COMPRESSION_LEVELS,
};
