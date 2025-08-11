#!/usr/bin/env node

/**
 * SCRIPT DE POBLACIÓN DE USUARIOS REALES - ALTERNATIVO
 * 
 * Este script es una versión alternativa que usa los controladores existentes
 * del sistema para crear usuarios, evitando problemas de configuración de DB.
 * 
 * Uso:
 *   node scripts/populate-users.js
 * 
 * IMPORTANTE:
 * - Usa el endpoint /auth/init-users existente si no hay usuarios
 * - Contraseña temporal para todos: "Notaria123."
 * - Los usuarios deben cambiar la contraseña en el primer login
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

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
 * Función para crear usuario usando consulta directa a la base de datos
 */
async function createUserDirectly() {
  // Importar prisma dinámicamente para manejar errores de conexión
  try {
    const { getPrismaClient } = await import('../src/db.js');
    const prisma = getPrismaClient();
    
    console.log('🌱 Iniciando población de usuarios de la notaría...\n');
    console.log('📊 Verificando estado actual de la base de datos...');
    
    // Verificar usuarios existentes
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      console.log(`❌ Ya existen ${userCount} usuarios en la base de datos.`);
      console.log('   Para recrear usuarios, elimine primero los existentes.\n');
      
      const existingUsers = await prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      });
      
      console.log('👥 Usuarios existentes:');
      existingUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - ${user.role}`);
      });
      
      return { success: false, message: 'Usuarios ya existen' };
    }

    console.log('✅ Base de datos sin usuarios. Procediendo con la población...\n');

    // Crear usuarios uno por uno
    const usuariosCreados = [];
    let errores = [];

    for (const userData of USUARIOS_NOTARIA) {
      try {
        console.log(`👤 Creando usuario: ${userData.firstName} ${userData.lastName} (${userData.email})`);
        
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

    // Mostrar resumen
    console.log('\n🎉 POBLACIÓN COMPLETADA');
    console.log('========================');
    console.log(`✅ Usuarios creados exitosamente: ${usuariosCreados.length}`);
    console.log(`❌ Errores encontrados: ${errores.length}`);
    
    if (errores.length > 0) {
      console.log('\n🚨 Errores durante la creación:');
      errores.forEach(error => console.log(`   - ${error}`));
    }

    // Mostrar usuarios por rol
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

    // Instrucciones finales
    console.log('\n📋 INSTRUCCIONES DE USO:');
    console.log('========================');
    console.log('1. Todos los usuarios tienen la contraseña temporal: "Notaria123."');
    console.log('2. Al hacer el primer login, se recomienda cambiar la contraseña');
    console.log('3. Los usuarios pueden acceder al sistema inmediatamente');
    console.log('\n🔗 URLs de acceso:');
    console.log('   - Desarrollo: http://localhost:5173');
    console.log('   - Producción: https://notaria-segura.up.railway.app');

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

    return { 
      success: true, 
      users: usuariosCreados, 
      errors: errores,
      message: `${usuariosCreados.length} usuarios creados exitosamente` 
    };

  } catch (error) {
    console.error('\n💥 ERROR DE CONEXIÓN:', error.message);
    console.log('\n🔧 POSIBLES SOLUCIONES:');
    console.log('1. Verificar que PostgreSQL esté ejecutándose');
    console.log('2. Verificar que DATABASE_URL esté correctamente configurado');
    console.log('3. Ejecutar migraciones: npm run db:migrate');
    console.log('4. Para desarrollo, usar: npm run start para levantar el servidor');
    
    return { success: false, error: error.message };
  }
}

/**
 * Función alternativa usando el servidor HTTP
 */
async function createUsersViaHTTP() {
  console.log('🌐 Intentando crear usuarios via servidor HTTP...');
  
  try {
    const response = await fetch('http://localhost:3001/auth/init-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Usuarios creados via HTTP exitosamente!');
      console.log(data);
      return { success: true, data };
    } else {
      console.log('❌ Error del servidor:', data.message);
      return { success: false, error: data.message };
    }
    
  } catch (error) {
    console.log('❌ Error conectando al servidor:', error.message);
    console.log('💡 Asegúrate de que el servidor esté ejecutándose en puerto 3001');
    return { success: false, error: error.message };
  }
}

/**
 * Función principal que intenta ambos métodos
 */
async function main() {
  console.log('🚀 CREADOR DE USUARIOS REALES DE LA NOTARÍA');
  console.log('===========================================\n');
  
  // Método 1: Conexión directa a base de datos
  console.log('📡 Método 1: Conexión directa a base de datos');
  const directResult = await createUserDirectly();
  
  if (directResult.success) {
    console.log('✨ ¡Población completada exitosamente!');
    process.exit(0);
  }
  
  // Método 2: Via servidor HTTP (si el servidor está ejecutándose)
  console.log('\n📡 Método 2: Intentando via servidor HTTP...');
  const httpResult = await createUsersViaHTTP();
  
  if (httpResult.success) {
    console.log('✨ ¡Usuarios creados via servidor exitosamente!');
    process.exit(0);
  }
  
  // Si ambos métodos fallan
  console.log('\n💥 AMBOS MÉTODOS FALLARON');
  console.log('=======================');
  console.log('\n🔧 INSTRUCCIONES MANUALES:');
  console.log('1. Verificar configuración de base de datos en .env');
  console.log('2. Levantar servidor: npm run dev');
  console.log('3. Ir a http://localhost:5173');
  console.log('4. Crear usuarios manualmente desde el panel admin');
  console.log('\n📧 Usuarios a crear:');
  
  USUARIOS_NOTARIA.forEach(user => {
    console.log(`- ${user.email} | ${user.firstName} ${user.lastName} | ${user.role}`);
  });
  
  console.log('\n🔑 Contraseña temporal para todos: Notaria123.');
  
  process.exit(1);
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

export { USUARIOS_NOTARIA, createUserDirectly, createUsersViaHTTP };