#!/usr/bin/env node

/**
 * SCRIPT DE CONFIGURACIÓN PARA PRODUCCIÓN RAILWAY
 * 
 * Este script se ejecuta después del deploy para configurar datos iniciales
 * Solo se ejecuta si la base de datos está vacía (primera instalación)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});

/**
 * Verificar si es la primera instalación
 */
async function isFirstInstallation() {
  try {
    const userCount = await prisma.user.count();
    return userCount === 0;
  } catch (error) {
    console.log('Error verificando base de datos:', error.message);
    return false;
  }
}

/**
 * Configuración principal
 */
async function setupProduction() {
  try {
    console.log('🚀 CONFIGURACIÓN RAILWAY - Notaría Segura');
    console.log('=========================================');
    
    // Verificar conexión a base de datos
    console.log('📡 Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión a base de datos exitosa');
    
    // Verificar si es primera instalación
    const isFirst = await isFirstInstallation();
    
    if (isFirst) {
      console.log('🌱 Primera instalación detectada - Poblando datos iniciales...');
      
      // Importar y ejecutar el seed
      const { default: seed } = await import('../prisma/seed.js');
      await seed();
      
      console.log('✅ Datos iniciales creados exitosamente');
    } else {
      console.log('ℹ️  Base de datos ya contiene datos - Saltando población inicial');
    }
    
    // Verificar configuración
    console.log('🔧 Verificando configuración del sistema...');
    
    const config = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      databaseUrl: process.env.DATABASE_URL ? 'CONFIGURADO' : 'NO CONFIGURADO',
      jwtSecret: process.env.JWT_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO',
      whatsappEnabled: process.env.WHATSAPP_ENABLED,
      twilioConfigured: process.env.TWILIO_ACCOUNT_SID ? 'SÍ' : 'NO'
    };
    
    console.log('📋 Configuración actual:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
    console.log('Sistema listo para recibir requests');
    
  } catch (error) {
    console.error('💥 ERROR EN CONFIGURACIÓN:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Ejecutor principal
 */
async function main() {
  try {
    await setupProduction();
    process.exit(0);
  } catch (error) {
    console.error('💥 Error fatal en setup:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default setupProduction;