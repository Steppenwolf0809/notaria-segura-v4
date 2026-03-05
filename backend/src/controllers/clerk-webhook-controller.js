import { Webhook } from 'svix';
import prisma from '../db.js';

/**
 * Verifica la firma del webhook de Clerk usando svix
 */
function verifyWebhookSignature(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET no configurado');
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  const payload = JSON.stringify(req.body);
  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  return wh.verify(payload, headers);
}

/**
 * POST /api/webhooks/clerk
 * Recibe eventos de Clerk (user.created, user.updated, user.deleted)
 */
async function handleClerkWebhook(req, res) {
  try {
    let evt;
    try {
      evt = verifyWebhookSignature(req);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const eventType = evt.type;
    const data = evt.data;

    switch (eventType) {
      case 'user.created': {
        const email = data.email_addresses?.[0]?.email_address;
        if (!email) {
          console.warn('Clerk webhook user.created sin email, ignorando');
          break;
        }

        // Verificar si ya existe un usuario con este clerkId
        const existingByClerk = await prisma.user.findUnique({
          where: { clerkId: data.id }
        });

        if (existingByClerk) {
          console.log(`[Clerk Webhook] Usuario ya vinculado: ${email} (clerkId: ${data.id})`);
          break;
        }

        // Buscar por email para vincular usuario existente (migración legacy → Clerk)
        const existingByEmail = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        });

        if (existingByEmail) {
          await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              clerkId: data.id,
              firstName: data.first_name || existingByEmail.firstName,
              lastName: data.last_name || existingByEmail.lastName,
              isActive: true,
            }
          });
          console.log(`[Clerk Webhook] Usuario legacy vinculado a Clerk: ${email} (id: ${existingByEmail.id}, clerkId: ${data.id})`);
        } else {
          await prisma.user.create({
            data: {
              clerkId: data.id,
              email: email.toLowerCase(),
              firstName: data.first_name || 'Sin nombre',
              lastName: data.last_name || '',
              role: null,
              isOnboarded: false,
              isActive: true,
            }
          });
          console.log(`[Clerk Webhook] Usuario nuevo creado: ${email} (clerkId: ${data.id})`);
        }
        break;
      }

      case 'user.updated': {
        const email = data.email_addresses?.[0]?.email_address;
        const user = await prisma.user.findUnique({
          where: { clerkId: data.id }
        });

        if (user) {
          await prisma.user.update({
            where: { clerkId: data.id },
            data: {
              email: email ? email.toLowerCase() : user.email,
              firstName: data.first_name || user.firstName,
              lastName: data.last_name || user.lastName,
            }
          });
          console.log(`[Clerk Webhook] Usuario actualizado: ${email} (clerkId: ${data.id})`);
        }
        break;
      }

      case 'user.deleted': {
        const user = await prisma.user.findUnique({
          where: { clerkId: data.id }
        });

        if (user) {
          await prisma.user.update({
            where: { clerkId: data.id },
            data: { isActive: false }
          });
          console.log(`[Clerk Webhook] Usuario desactivado: ${user.email} (clerkId: ${data.id})`);
        }
        break;
      }

      default:
        console.log(`[Clerk Webhook] Evento no manejado: ${eventType}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error procesando webhook de Clerk:', error);
    res.status(500).json({ error: 'Error interno procesando webhook' });
  }
}

export { handleClerkWebhook };
