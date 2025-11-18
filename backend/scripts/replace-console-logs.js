#!/usr/bin/env node

/**
 * Script para reemplazar console.log/warn/error con logger profesional
 *
 * Uso: node scripts/replace-console-logs.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patrones a reemplazar
const replacements = [
  // console.log → logger.debug
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug(',
    type: 'debug'
  },
  // console.info → logger.info
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    type: 'info'
  },
  // console.warn → logger.warn
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    type: 'warn'
  },
  // console.error → logger.error
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    type: 'error'
  }
];

// Archivos a excluir
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/*.test.js',
  '**/*.spec.js',
  '**/scripts/**'
];

async function main() {
  console.log('🔍 Buscando archivos JavaScript...\n');

  // Buscar todos los archivos .js en src/
  const files = await glob('src/**/*.js', {
    cwd: path.join(__dirname, '..'),
    ignore: excludePatterns,
    absolute: true
  });

  console.log(`📁 Encontrados ${files.length} archivos\n`);

  let totalReplacements = 0;
  const fileStats = [];

  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      const originalContent = content;
      let fileReplacements = 0;

      // Verificar si ya tiene el import de logger
      const hasLoggerImport = content.includes("from '../utils/logger.js'") ||
                             content.includes("from '../../utils/logger.js'") ||
                             content.includes("from '../../../utils/logger.js'");

      // Aplicar reemplazos
      for (const { pattern, replacement } of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          fileReplacements += matches.length;
        }
      }

      // Si hubo reemplazos y no tiene el import, agregarlo
      if (fileReplacements > 0 && !hasLoggerImport) {
        // Calcular la ruta relativa correcta
        const fileDir = path.dirname(file);
        const utilsPath = path.join(__dirname, '..', 'src', 'utils', 'logger.js');
        const relativePath = path.relative(fileDir, utilsPath);
        const importPath = relativePath.replace(/\\/g, '/');

        // Agregar import al inicio del archivo (después de otros imports)
        const lines = content.split('\n');
        let insertIndex = 0;

        // Buscar el último import
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            insertIndex = i + 1;
          }
        }

        lines.splice(insertIndex, 0, `import logger from '${importPath}';`);
        content = lines.join('\n');
      }

      // Solo escribir si hubo cambios
      if (content !== originalContent) {
        writeFileSync(file, content, 'utf-8');
        totalReplacements += fileReplacements;
        fileStats.push({
          file: path.relative(path.join(__dirname, '..'), file),
          replacements: fileReplacements
        });
      }
    } catch (error) {
      console.error(`❌ Error procesando ${file}:`, error.message);
    }
  }

  // Mostrar resumen
  console.log('\n✅ PROCESO COMPLETADO\n');
  console.log('=' .repeat(60));
  console.log(`Total de reemplazos: ${totalReplacements}`);
  console.log(`Archivos modificados: ${fileStats.length}`);
  console.log('=' .repeat(60));
  console.log('\n📊 ARCHIVOS MODIFICADOS:\n');

  fileStats
    .sort((a, b) => b.replacements - a.replacements)
    .forEach(({ file, replacements }) => {
      console.log(`  • ${file} (${replacements} reemplazos)`);
    });

  console.log('\n💡 PRÓXIMOS PASOS:\n');
  console.log('  1. Revisar los cambios con: git diff');
  console.log('  2. Probar que la aplicación funcione correctamente');
  console.log('  3. Commit los cambios');
  console.log('');
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
