/**
 * Script para crear usuarios reales del sistema
 * Elimina usuarios de prueba y crea usuarios reales de la notaría
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const REAL_USERS = [
  {
    email: 'mayra.corella@notaria.com',
    password: 'mat001',
    firstName: 'MAYRA CRISTINA',
    lastName: 'CORELLA PARRA',
    role: 'MATRIZADOR',
    code: 'MAT001'
  },
  {
    email: 'jose.zapata@notaria.com', 
    password: 'mat002',
    firstName: 'JOSE LUIS',
    lastName: 'ZAPATA SILVA',
    role: 'MATRIZADOR',
    code: 'MAT002'
  },
  {
    email: 'gissela.velastegui@notaria.com',
    password: 'mat003', 
    firstName: 'GISSELA VANESSA',
    lastName: 'VELASTEGUI CADENA',
    role: 'MATRIZADOR',
    code: 'MAT003'
  },
  {
    email: 'karol.velastegui@notaria.com',
    password: 'mat004',
    firstName: 'KAROL DANIELA', 
    lastName: 'VELASTEGUI CADENA',
    role: 'MATRIZADOR',
    code: 'MAT004'
  },
  {
    email: 'francisco.proano@notaria.com',
    password: 'mat005',
    firstName: 'FRANCISCO ESTEBAN',
    lastName: 'PROAÑO ASTUDILLO', 
    role: 'MATRIZADOR',
    code: 'MAT005'
  },
  {
    email: 'maria.diaz@notaria.com',
    password: 'archivo001',
    firstName: 'MARIA LUCINDA',
    lastName: 'DIAZ PILATASIG',
    role: 'ARCHIVO',
    code: 'ARCHIVO001'
  },
  // Usuario administrador
  {
    email: 'admin@notaria.com',
    password: 'admin123',
    firstName: 'Administrador',
    lastName: 'Sistema',
    role: 'ADMIN',
    code: 'ADMIN'
  },
  // Usuario caja para cargar XMLs
  {
    email: 'caja@notaria.com',
    password: 'caja123', 
    firstName: 'Usuario',
    lastName: 'Caja',
    role: 'CAJA',
    code: 'CAJA001'
  },
  // Usuario recepción
  {
    email: 'recepcion@notaria.com',
    password: 'recepcion123',
    firstName: 'Usuario',
    lastName: 'Recepción', 
    role: 'RECEPCION',
    code: 'RECEPCION001'
  }
];

async function createRealUsers() {
  try {
    console.log('🧹 ELIMINANDO USUARIOS DE PRUEBA...');
    
    // Eliminar todos los usuarios existentes
    await prisma.user.deleteMany({});
    console.log('✅ Usuarios anteriores eliminados');
    
    console.log('\n👥 CREANDO USUARIOS REALES...');
    
    const createdUsers = [];
    
    for (const userData of REAL_USERS) {
      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        }
      });
      
      createdUsers.push({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        code: userData.code,
        password: userData.password // Solo para mostrar las credenciales
      });
      
      console.log(`✅ ${user.firstName} ${user.lastName} (${userData.code}) - ${user.role}`);
    }
    
    console.log('\n🎉 USUARIOS REALES CREADOS EXITOSAMENTE');
    console.log('\n📋 CREDENCIALES DE ACCESO:');
    console.log('=====================================');
    
    createdUsers.forEach(user => {
      console.log(`${user.code}: ${user.email} / ${user.password}`);
    });
    
    console.log('\n🚀 INSTRUCCIONES:');
    console.log('1. Ir a http://localhost:5175');
    console.log('2. Usar cualquiera de las credenciales de arriba');
    console.log('3. Los XMLs reconocerán automáticamente a los matrizadores por nombre');
    console.log('4. María Díaz será reconocida tanto en XMLs de archivo como matrizador');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRealUsers();