import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Iniciando semilla multi-tenant...');

  const clerkOrgId = process.env.CLERK_N18_ORG_ID || null;

  const notary = await prisma.notary.upsert({
    where: { code: 'N18' },
    update: {
      slug: 'n18',
      name: 'Notaria 18 del Canton Quito',
      ruc: '1768038930001',
      address: 'Av. Amazonas y Naciones Unidas',
      city: 'Quito',
      province: 'Pichincha',
      phone: '0999999999',
      email: 'info@notaria18.com.ec',
      clerkOrgId,
      isActive: true,
      deletedAt: null,
      config: {
        tenantCode: 'N18',
        auth: {
          provider: 'clerk',
          pilot: true
        }
      }
    },
    create: {
      code: 'N18',
      slug: 'n18',
      name: 'Notaria 18 del Canton Quito',
      ruc: '1768038930001',
      address: 'Av. Amazonas y Naciones Unidas',
      city: 'Quito',
      province: 'Pichincha',
      phone: '0999999999',
      email: 'info@notaria18.com.ec',
      clerkOrgId,
      isActive: true,
      config: {
        tenantCode: 'N18',
        auth: {
          provider: 'clerk',
          pilot: true
        }
      }
    },
    select: {
      id: true,
      code: true,
      name: true
    }
  });

  console.log(`[seed] Notaria lista: ${notary.name} (${notary.code})`);

  const usersUpdate = await prisma.user.updateMany({
    where: {
      notaryId: null,
      role: {
        not: 'SUPER_ADMIN'
      }
    },
    data: { notaryId: notary.id }
  });

  console.log(`[seed] Usuarios asignados a N18: ${usersUpdate.count}`);

  const adminPassword = process.env.SEED_SUPERADMIN_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@notariasegura.com' },
    update: {
      role: 'SUPER_ADMIN',
      notaryId: null,
      isActive: true,
      deletedAt: null
    },
    create: {
      email: 'superadmin@notariasegura.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      notaryId: null
    },
    select: {
      id: true,
      email: true
    }
  });

  console.log(`[seed] Super admin listo: ${superAdmin.email}`);

  const notaryAdminPassword = process.env.SEED_NOTARY_ADMIN_PASSWORD || 'Admin123!';
  const notaryAdminHash = await bcrypt.hash(notaryAdminPassword, 10);

  const notaryAdmin = await prisma.user.upsert({
    where: { email: 'admin@notaria18.com.ec' },
    update: {
      role: 'ADMIN',
      notaryId: notary.id,
      isActive: true,
      deletedAt: null
    },
    create: {
      email: 'admin@notaria18.com.ec',
      password: notaryAdminHash,
      firstName: 'Admin',
      lastName: 'Notaria 18',
      role: 'ADMIN',
      isActive: true,
      notaryId: notary.id
    },
    select: {
      id: true,
      email: true
    }
  });

  console.log(`[seed] Admin N18 listo: ${notaryAdmin.email}`);
}

main()
  .catch((error) => {
    console.error('[seed] Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
