import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function createUsers() {
  console.log('🔐 Creando usuarios reales del sistema...');
  
  const users = [
    {
      firstName: 'MAYRA CRISTINA',
      lastName: 'CORELLA PARRA',
      email: 'mayra.corella@notaria.com',
      password: 'Notaria123.',
      role: 'MATRIZADOR'
    },
    {
      firstName: 'KAROL',
      lastName: 'VELASTEGUI',
      email: 'karolrecepcion@notaria.com',
      password: 'Notaria123.',
      role: 'RECEPCION'
    },
    {
      firstName: 'MARIA LUCINDA',
      lastName: 'DIAZ PILATASIG',
      email: 'maria.diaz@notaria.com',
      password: 'Notaria123.',
      role: 'ARCHIVO'
    },
    {
      firstName: 'KAROL DANIELA',
      lastName: 'VELASTEGUI CADENA',
      email: 'karol.velastegui@notaria.com',
      password: 'Notaria123.',
      role: 'MATRIZADOR'
    },
    {
      firstName: 'JOSE LUIS',
      lastName: 'ZAPATA SILVA',
      email: 'jose.zapata@notaria.com',
      password: 'Notaria123.',
      role: 'MATRIZADOR'
    },
    {
      firstName: 'GISSELA VANESSA',
      lastName: 'VELASTEGUI CADENA',
      email: 'gissela.velastegui@notaria.com',
      password: 'Notaria123.',
      role: 'MATRIZADOR'
    },
    {
      firstName: 'FRANCISCO ESTEBAN',
      lastName: 'PROAÑO ASTUDILLO',
      email: 'francisco.proano@notaria.com',
      password: 'Notaria123.',
      role: 'MATRIZADOR'
    },
    {
      firstName: 'CINDY',
      lastName: 'PAZMIÑO NARANJO',
      email: 'cindy.pazmino@notaria.com',
      password: 'Notaria123.',
      role: 'CAJA'
    },
    {
      firstName: 'Jose Luis',
      lastName: 'Zapata',
      email: 'admin@notaria.com',
      password: 'Notaria123.',
      role: 'ADMIN'
    }
  ];

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      const newUser = await prisma.user.create({
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          isActive: true
        }
      });
      
      console.log(`✅ Usuario creado: ${user.email} - Rol: ${user.role}`);
    } catch (error) {
      console.log(`❌ Error creando ${user.email}:`, error.message);
    }
  }
  
  console.log('🎉 Proceso de creación de usuarios completado');
  await prisma.$disconnect();
}

createUsers().catch(console.error);
