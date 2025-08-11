#!/usr/bin/env node

/**
 * SCRIPT DE POBLACIÓN DE BASE DE DATOS - USUARIOS REALES NOTARÍA
 * 
 * Este script crea los usuarios reales de la notaría con sus datos específicos.
 * 
 * Uso:
 *   node prisma/seed.js
 *   npm run db:seed (si se agrega al package.json)
 * 
 * IMPORTANTE:
 * - Contraseña temporal para todos: "Notaria123."
 * - Los usuarios deben cambiar la contraseña en el primer login
 * - Solo funciona si no existen usuarios en la base de datos
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});

/**
 * Usuarios reales de la notaría con datos específicos
 */
const USUARIOS_NOTARIA = [
  {
    email: 'admin@notaria.com',
    password: 'Notaria123.',
    firstName: 'Jose Luis',
    lastName: 'Zapata',
    role: 'ADMIN'
  },
  {
    email: 'cindy.pazmino@notaria.com', 
    password: 'Notaria123.',
    firstName: 'Cindy',
    lastName: 'Pazmiño Naranjo',
    role: 'CAJA'
  },
  {
    email: 'mayra.corella@notaria.com',
    password: 'Notaria123.',
    firstName: 'Mayra Cristina',
    lastName: 'Corella Parra',
    role: 'MATRIZADOR'
  },
  {
    email: 'karol.velastegui@notaria.com',
    password: 'Notaria123.',
    firstName: 'Karol Daniela', 
    lastName: 'Velastegui Cadena',
    role: 'MATRIZADOR'
  },
  {
    email: 'jose.zapata@notaria.com',
    password: 'Notaria123.',
    firstName: 'Jose Luis',
    lastName: 'Zapata Silva',
    role: 'MATRIZADOR'
  },
  {
    email: 'gissela.velastegui@notaria.com',
    password: 'Notaria123.',
    firstName: 'Gissela Vanessa',
    lastName: 'Velastegui Cadena', 
    role: 'MATRIZADOR'
  },
  {
    email: 'francisco.proano@notaria.com',
    password: 'Notaria123.',
    firstName: 'Francisco Esteban',
    lastName: 'Proaño Astudillo',
    role: 'MATRIZADOR'
  },
  {
    email: 'karolrecepcion@notaria.com',
    password: 'Notaria123.',
    firstName: 'Karol',
    lastName: 'Velastegui',
    role: 'RECEPCION'
  },
  {
    email: 'maria.diaz@notaria.com',
    password: 'Notaria123.',
    firstName: 'Maria Lucinda',
    lastName: 'Diaz Pilatasig',
    role: 'ARCHIVO'
  }
];

/**
 * Función principal de seeding
 */
async function seed() {
  try {
    console.log('🌱 Iniciando población de usuarios de la notaría...\n');

    // 1. Verificar estado actual de la base de datos
    console.log('📊 Verificando estado actual de la base de datos...');
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      console.log(`❌ Ya existen ${userCount} usuarios en la base de datos.`);
      console.log('   Este script solo funciona con una base de datos vacía.');
      console.log('   Para recrear usuarios, primero elimine todos los usuarios existentes.\n');
      
      const existingUsers = await prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      });
      
      console.log('👥 Usuarios existentes:');
      existingUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - ${user.role}`);
      });
      
      return;
    }

    console.log('✅ Base de datos sin usuarios. Procediendo con la población...\n');

    // 2. Crear usuarios uno por uno con información detallada
    const usuariosCreados = [];
    let errores = [];

    for (const userData of USUARIOS_NOTARIA) {
      try {
        console.log(`👤 Creando usuario: ${userData.firstName} ${userData.lastName} (${userData.email})`);
        
        // Validar que el email no exista (verificación adicional)
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`   ⚠️  Email ${userData.email} ya existe. Saltando...`);
          continue;
        }

        // Hashear contraseña con el mismo factor usado en producción (12)
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Crear usuario en base de datos
        const nuevoUsuario = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            isActive: true
          }
        });

        usuariosCreados.push({
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
          firstName: nuevoUsuario.firstName,
          lastName: nuevoUsuario.lastName,
          role: nuevoUsuario.role,
          createdAt: nuevoUsuario.createdAt
        });

        console.log(`   ✅ Usuario creado exitosamente (ID: ${nuevoUsuario.id})`);

      } catch (error) {
        const errorMsg = `Error creando ${userData.email}: ${error.message}`;
        console.log(`   ❌ ${errorMsg}`);
        errores.push(errorMsg);
      }
    }

    // 3. Resumen de resultados
    console.log('\n🎉 POBLACIÓN COMPLETADA');
    console.log('========================');
    console.log(`✅ Usuarios creados exitosamente: ${usuariosCreados.length}`);
    console.log(`❌ Errores encontrados: ${errores.length}`);
    
    if (errores.length > 0) {
      console.log('\n🚨 Errores durante la creación:');
      errores.forEach(error => console.log(`   - ${error}`));
    }

    // 4. Mostrar usuarios creados por rol
    console.log('\n👥 USUARIOS CREADOS POR ROL:');
    console.log('============================');
    
    const rolesSummary = usuariosCreados.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    Object.entries(rolesSummary).forEach(([role, users]) => {
      console.log(`\n📋 ${role} (${users.length} usuario${users.length > 1 ? 's' : ''}):`);
      users.forEach(user => {
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}`);
      });
    });

    // 5. Instrucciones de uso
    console.log('\n📋 INSTRUCCIONES DE USO:');
    console.log('========================');
    console.log('1. Todos los usuarios tienen la contraseña temporal: "Notaria123."');
    console.log('2. Al hacer el primer login, se recomienda cambiar la contraseña');
    console.log('3. Los usuarios pueden acceder al sistema inmediatamente');
    console.log('\n🔗 URLs de acceso:');
    console.log('   - Desarrollo: http://localhost:5173');
    console.log('   - Producción: https://notaria-segura.up.railway.app');

    // 6. Ejemplos de login para pruebas
    console.log('\n🧪 EJEMPLOS DE LOGIN PARA PRUEBAS:');
    console.log('==================================');
    const ejemplosLogin = [
      { email: 'admin@notaria.com', role: 'ADMIN', name: 'Jose Luis Zapata' },
      { email: 'cindy.pazmino@notaria.com', role: 'CAJA', name: 'Cindy Pazmiño' },
      { email: 'mayra.corella@notaria.com', role: 'MATRIZADOR', name: 'Mayra Corella' },
      { email: 'karolrecepcion@notaria.com', role: 'RECEPCION', name: 'Karol Velastegui' },
      { email: 'maria.diaz@notaria.com', role: 'ARCHIVO', name: 'Maria Diaz' }
    ];

    ejemplosLogin.forEach(user => {
      console.log(`${user.role}: ${user.email} / Notaria123. (${user.name})`);
    });

    console.log('\n✨ ¡Usuarios de la notaría creados exitosamente!');

  } catch (error) {
    console.error('\n💥 ERROR FATAL durante la población:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Función de limpieza para cerrar conexiones
 */
async function cleanup() {
  await prisma.$disconnect();
  console.log('\n🔌 Conexión a base de datos cerrada.');
}

/**
 * Ejecutor principal con manejo de errores
 */
async function main() {
  try {
    await seed();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Error ejecutando seed script:', error);
    await cleanup();
    process.exit(1);
  }
}

// Manejo de señales para limpieza correcta
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default seed;