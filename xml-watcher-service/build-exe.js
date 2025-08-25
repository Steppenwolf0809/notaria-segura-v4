#!/usr/bin/env node
import { execSync } from 'child_process';

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  run('npm run clean');
  // Intentar pkg primero
  run('npm run build:pkg');
  console.log('Ejecutable creado en dist/xml-service.exe');
} catch (e) {
  console.warn('Fallo pkg, intentando nexe...');
  run('npm run build:nexe');
  console.log('Ejecutable creado en dist/xml-service.exe');
}


