#!/usr/bin/env node

/**
 * Script para verificar usuarios en la base de datos
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

async function verifyUsers() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      console.log('💡 Ejecutar: npm run db:seed para crear usuarios');
    } else {
      console.log(`✅ Encontrados ${users.length} usuarios:\n`);
      
      users.forEach((user, index) => {
        const status = user.isActive ? '🟢 ACTIVO' : '🔴 INACTIVO';
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Rol: ${user.role}`);
        console.log(`   ${status}`);
        console.log(`   📅 Creado: ${user.createdAt.toLocaleDateString()}`);
        console.log('');
      });

      console.log('🔑 Contraseña temporal para todos: Notaria123.');
      console.log('💡 Los usuarios deben cambiar la contraseña en el primer login');
    }

  } catch (error) {
    console.error('❌ Error verificando usuarios:', error.message);
    if (error.code === 'P2021') {
      console.log('💡 La tabla users no existe. Ejecutar migraciones primero.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyUsers();