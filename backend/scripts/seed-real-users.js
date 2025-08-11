#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../src/db.js';

const prisma = getPrismaClient();

// Usuarios reales solicitados
const USERS = [
  { email: 'admin@notaria.com', firstName: 'Jose Luis', lastName: 'Zapata', role: 'ADMIN', password: 'Notaria123.' },
  { email: 'cindy.pazmino@notaria.com', firstName: 'Cindy', lastName: 'Pazmiño Naranjo', role: 'CAJA', password: 'Notaria123.' },
  { email: 'mayra.corella@notaria.com', firstName: 'Mayra Cristina', lastName: 'Corella Parra', role: 'MATRIZADOR', password: 'Notaria123.' },
  { email: 'karol.velastegui@notaria.com', firstName: 'Karol Daniela', lastName: 'Velastegui Cadena', role: 'MATRIZADOR', password: 'Notaria123.' },
  { email: 'jose.zapata@notaria.com', firstName: 'Jose Luis', lastName: 'Zapata Silva', role: 'MATRIZADOR', password: 'Notaria123.' },
  { email: 'gissela.velastegui@notaria.com', firstName: 'Gissela Vanessa', lastName: 'Velastegui Cadena', role: 'MATRIZADOR', password: 'Notaria123.' },
  { email: 'francisco.proano@notaria.com', firstName: 'Francisco Esteban', lastName: 'Proaño Astudillo', role: 'MATRIZADOR', password: 'Notaria123.' },
  { email: 'karolrecepcion@notaria.com', firstName: 'Karol', lastName: 'Velastegui', role: 'RECEPCION', password: 'Notaria123.' },
  { email: 'maria.diaz@notaria.com', firstName: 'Maria Lucinda', lastName: 'Diaz Pilatasig', role: 'ARCHIVO', password: 'Notaria123.' }
];

async function seedUsers() {
  console.log('🌱 Poblando/actualizando usuarios de la notaría (idempotente)...');

  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const u of USERS) {
    try {
      // Buscar si ya existe
      const existing = await prisma.user.findUnique({ where: { email: u.email } });

      if (!existing) {
        const hashed = await bcrypt.hash(u.password, 12);
        await prisma.user.create({
          data: {
            email: u.email,
            password: hashed,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            isActive: true
          }
        });
        summary.created += 1;
        console.log(`   ✅ Creado: ${u.email} (${u.role})`);
      } else {
        // Conservador: no sobreescribir password si ya existe
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            isActive: true
          }
        });
        summary.updated += 1;
        console.log(`   ✏️  Actualizado: ${u.email} (${u.role})`);
      }
    } catch (err) {
      console.error(`   ❌ Error con ${u.email}: ${err.message}`);
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   ➕ Creados: ${summary.created}`);
  console.log(`   🔄 Actualizados: ${summary.updated}`);
  console.log(`   ⏭️  Omitidos: ${summary.skipped}`);
}

async function main() {
  try {
    await seedUsers();
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar siempre que se invoque el script
main().catch((e) => {
  console.error('💥 Error ejecutando seed-real-users:', e);
  process.exit(1);
});


