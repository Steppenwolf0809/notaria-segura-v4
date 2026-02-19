import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { withLoginEmailContext } from '../utils/tenant-context.js';

const prisma = new PrismaClient();

// Endpoint usado en migracion legacy de autenticacion.
// Debe protegerse con AUTH0_MIGRATION_SECRET.
export const verifyLegacyUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const migrationSecret = req.headers['x-migration-secret'];

    if (migrationSecret !== process.env.AUTH0_MIGRATION_SECRET) {
      console.warn(`[LazyMigration] Intento de acceso no autorizado para: ${email}`);
      return res.status(401).json({ error: 'Unauthorized migration request' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await withLoginEmailContext(prisma, normalizedEmail, async (tx) => {
      return tx.user.findUnique({
        where: { email: normalizedEmail },
        include: { notary: true }
      });
    });

    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({ error: 'Invalid credentials or inactive user' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userProfile = {
      user_id: user.id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      given_name: user.firstName,
      family_name: user.lastName,
      email_verified: true,
      app_metadata: {
        role: user.role,
        notary_id: user.notaryId,
        notary_slug: user.notary?.slug || null,
        is_super_admin: user.role === 'SUPER_ADMIN'
      }
    };

    console.log(`[LazyMigration] Usuario verificado y listo para migracion: ${normalizedEmail}`);
    return res.json(userProfile);

  } catch (error) {
    console.error('[LazyMigration] Error verificando usuario:', error);
    return res.status(500).json({ error: 'Internal migration error' });
  }
};
