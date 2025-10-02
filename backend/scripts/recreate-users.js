import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
  {
    email: 'admin@notaria.com',
    firstName: 'Jose Luis',
    lastName: 'Zapata',
    role: 'ADMIN'
  },
  {
    email: 'edgar.chalan@notaria.com',
    firstName: 'Edgar',
    lastName: 'Chalan',
    role: 'RECEPCION'
  },
  {
    email: 'sistema-caja@notaria.local',
    firstName: 'Sistema',
    lastName: 'Caja',
    role: 'CAJA'
  },
  {
    email: 'gisserecepcion@notaria.com',
    firstName: 'Gisse',
    lastName: 'Velastegui',
    role: 'RECEPCION'
  },
  {
    email: 'mauricio.quinga@notaria.com',
    firstName: 'Mauricio',
    lastName: 'Quinga',
    role: 'CAJA'
  },
  {
    email: 'maria.diaz@notaria.com',
    firstName: 'María Lucinda',
    lastName: 'Díaz Pilatasig',
    role: 'ARCHIVO'
  },
  {
    email: 'recepcion@notaria.com',
    firstName: 'Usuario',
    lastName: 'Recepción',
    role: 'RECEPCION'
  },
  {
    email: 'francisco.proano@notaria.com',
    firstName: 'Francisco Esteban',
    lastName: 'Proaño Astudillo',
    role: 'MATRIZADOR'
  },
  {
    email: 'gissela.velastegui@notaria.com',
    firstName: 'Gissela Vanessa',
    lastName: 'Velastegui Cadena',
    role: 'MATRIZADOR'
  },
  {
    email: 'jose.zapata@notaria.com',
    firstName: 'Jose Luis',
    lastName: 'Zapata Silva',
    role: 'MATRIZADOR'
  },
  {
    email: 'karol.velastegui@notaria.com',
    firstName: 'Karol Daniela',
    lastName: 'Velastegui Cadena',
    role: 'MATRIZADOR'
  },
  {
    email: 'mayra.corella@notaria.com',
    firstName: 'Mayra Cristina',
    lastName: 'Corella Parra',
    role: 'MATRIZADOR'
  },
  {
    email: 'cindy.pazmino@notaria.com',
    firstName: 'Cindy',
    lastName: 'Pazmiño Naranjo',
    role: 'CAJA'
  }
];

async function createAllUsers() {
  // Contraseña temporal para todos
  const tempPassword = 'Notaria2025.';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  console.log('\n🔄 Creando usuarios...\n');

  for (const userData of users) {
    try {
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });
      console.log(`✓ ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`✗ Error creando ${userData.email}:`, error.message);
    }
  }

  console.log('\n✓ Proceso completado');
  console.log(`\n📝 CONTRASEÑA TEMPORAL PARA TODOS: ${tempPassword}`);
  console.log('\n⚠️  IMPORTANTE: Comparte esta contraseña de forma segura con cada usuario');
  console.log('Los usuarios deben cambiarla en su primer login.\n');
}

createAllUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());