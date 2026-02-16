import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando semilla multi-tenant...');

    // 1. Crear Notaría 18 si no existe
    const notaryData = {
        name: 'Notaría 18 del Cantón Quito',
        code: 'N18',
        slug: 'n18',
        ruc: '1768038930001',
        address: 'Av. Amazonas y Naciones Unidas',
        city: 'Quito',
        province: 'Pichincha',
        phone: '0999999999',
        email: 'info@notaria18.com.ec',
        isActive: true,
        config: {
            s3Prefix: 'n18',
            whatsapp: { enabled: true },
            auth0: { orgId: 'org_n18abc' }
        }
    };

    const notary = await prisma.notary.upsert({
        where: { code: 'N18' },
        update: {},
        create: notaryData,
    });

    console.log(`✅ Notaría creada/verificada: ${notary.name} (${notary.id})`);

    // 2. Asignar todos los usuarios existentes a esta notaría (si no tienen)
    const usersUpdate = await prisma.user.updateMany({
        where: { notaryId: null },
        data: { notaryId: notary.id }
    });

    console.log(`👥 Usuarios asignados a N18: ${usersUpdate.count}`);

    // 3. Crear usuarios base si no existen
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    // Super Admin
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@notariasegura.com' },
        update: {},
        create: {
            email: 'superadmin@notariasegura.com',
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            isActive: true,
            // Super Admin no pertenece a ninguna notaría específica (o null)
            notaryId: null
        }
    });

    console.log(`🦸 Super Admin creado: ${superAdmin.email}`);

    // Admin Notaría 18
    const notaryAdmin = await prisma.user.upsert({
        where: { email: 'admin@notaria18.com.ec' },
        update: { notaryId: notary.id },
        create: {
            email: 'admin@notaria18.com.ec',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'Notaría 18',
            role: 'ADMIN',
            isActive: true,
            notaryId: notary.id
        }
    });

    console.log(`👤 Admin Notaría 18 creado: ${notaryAdmin.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
