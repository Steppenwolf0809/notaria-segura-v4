/**
 * Script de prueba para pdf-optimizer-service
 *
 * Uso:
 *   node tests/test-pdf-optimizer.mjs <ruta-al-pdf>
 *
 * Ejemplo:
 *   node tests/test-pdf-optimizer.mjs "D:/tmp/escritura-ejemplo.pdf"
 *
 * Genera 3 archivos en D:/tmp/ para comparación visual:
 *   - escritura_screen.pdf   (72 DPI, muy comprimido)
 *   - escritura_ebook.pdf    (150 DPI, balance calidad/tamaño)
 *   - escritura_printer.pdf  (300 DPI, alta calidad)
 *
 * Todos con marca de agua: "COPIA VALIDA PARA VERIFICACION SIN VALOR LEGAL"
 */

import { readFile } from 'fs/promises';
import path from 'path';
import {
  checkGhostscript,
  testAllLevelsWithOutput,
} from '../src/services/pdf-optimizer-service.js';

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('');
  console.error('Uso: node tests/test-pdf-optimizer.mjs <ruta-al-pdf>');
  console.error('');
  console.error('Ejemplo:');
  console.error('  node tests/test-pdf-optimizer.mjs "D:/tmp/escritura-ejemplo.pdf"');
  console.error('');
  process.exit(1);
}

async function main() {
  console.log('=== Test de PDF Optimizer (Ghostscript) ===\n');

  // 1. Verificar Ghostscript
  console.log('1. Verificando Ghostscript...');
  const gsInfo = await checkGhostscript();
  if (!gsInfo.available) {
    console.error(`   ❌ Ghostscript NO disponible: ${gsInfo.error}`);
    console.error('');
    console.error('   Para instalar:');
    console.error('     Windows: choco install ghostscript -y  (como Admin)');
    console.error('     Linux:   sudo apt install ghostscript');
    console.error('     macOS:   brew install ghostscript');
    process.exit(1);
  }
  console.log(`   ✅ Ghostscript v${gsInfo.version} (${gsInfo.command})`);

  // 2. Leer PDF de entrada
  console.log(`\n2. Leyendo PDF: ${pdfPath}`);
  let inputBuffer;
  try {
    inputBuffer = await readFile(pdfPath);
  } catch (err) {
    console.error(`   ❌ No se pudo leer: ${err.message}`);
    process.exit(1);
  }
  const sizeMB = (inputBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`   ✅ Tamaño original: ${sizeMB} MB (${inputBuffer.length.toLocaleString()} bytes)`);

  // 3. Probar todos los niveles
  const outputDir = 'D:/tmp';
  const baseName = path.basename(pdfPath, '.pdf');

  console.log(`\n3. Probando 3 niveles de compresión + marca de agua...\n`);
  console.log('   Nivel      | DPI | Original  | Comprimido | Reducción | Archivo');
  console.log('   -----------|-----|-----------|------------|-----------|--------');

  const results = await testAllLevelsWithOutput(inputBuffer, outputDir, baseName);

  for (const r of results) {
    if (r.error) {
      console.log(`   ${r.level.padEnd(10)} | ${String(r.dpi).padEnd(3)} | ERROR: ${r.error}`);
    } else {
      console.log(
        `   ${r.level.padEnd(10)} | ${String(r.dpi).padEnd(3)} | ${r.originalSizeMB.padStart(6)} MB | ${r.compressedSizeMB.padStart(7)} MB | ${r.ratio.padStart(8)} | ${r.outputPath}`
      );
    }
  }

  console.log('\n4. Resultados guardados en D:/tmp/');
  console.log('   Abre cada PDF y compara la legibilidad del texto de la escritura.');
  console.log('   La marca de agua debe verse diagonal en cada página.\n');

  // Resumen
  const best = results
    .filter(r => !r.error)
    .sort((a, b) => parseFloat(a.compressedSizeMB) - parseFloat(b.compressedSizeMB));

  if (best.length > 0) {
    console.log(`   📊 Más comprimido: ${best[0].level} (${best[0].compressedSizeMB} MB)`);
    console.log(`   📊 Mejor balance:  ebook (recomendado como default)`);
    console.log(`   📊 Más fiel:       printer (${best[best.length - 1].compressedSizeMB} MB)`);
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
