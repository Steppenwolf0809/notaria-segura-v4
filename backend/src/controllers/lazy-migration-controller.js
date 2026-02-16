import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Este endpoint es llamado ÚNICAMENTE por el script "Login" de Auth0 (Custom Database)
// Debe estar protegido por una API Key secreta en los headers para evitar abuso público
export const verifyLegacyUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const migrationSecret = req.headers['x-migration-secret'];

        // 1. Verificar secreto de migración (seguridad crítica)
        if (migrationSecret !== process.env.AUTH0_MIGRATION_SECRET) {
            console.warn(`[LazyMigration] Intento de acceso no autorizado para: ${email}`);
            return res.status(401).json({ error: 'Unauthorized migration request' });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // 2. Buscar usuario en base de datos legacy
        const user = await prisma.user.findUnique({
            where: { email },
            include: { notary: true } // Incluir datos de notaría para mapeo
        });

        if (!user || user.status === 'INACTIVE') {
            return res.status(401).json({ error: 'Invalid credentials or inactive user' });
        }

        // 3. Verificar contraseña (bcrypt)
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 4. Retornar perfil de usuario para Auth0
        // Auth0 usará esto para crear el usuario en su base de datos
        const userProfile = {
            user_id: user.id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            given_name: user.firstName,
            family_name: user.lastName,
            email_verified: true, // Asumimos verificado si ya usaba el sistema
            app_metadata: {
                role: user.role,
                notary_id: user.notaryId,
                notary_slug: user.notary?.slug
            }
        };

        console.log(`[LazyMigration] Usuario verificado y listo para migración: ${email}`);
        return res.json(userProfile);

    } catch (error) {
        console.error('[LazyMigration] Error verificando usuario:', error);
        return res.status(500).json({ error: 'Internal migration error' });
    }
};
