#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('🚨 DEPLOY DE EMERGENCIA - RESOLVIENDO P3009');

try {
  console.log('1. Generando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('2. Reset completo de migraciones...');
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
  
  console.log('3. Aplicando schema actual...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('4. Iniciando servidor...');
  execSync('node server.js', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error en deploy de emergencia:', error);
  process.exit(1);
}