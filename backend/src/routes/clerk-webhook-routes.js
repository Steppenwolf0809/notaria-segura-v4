import { Router } from 'express';
import { handleClerkWebhook } from '../controllers/clerk-webhook-controller.js';

const router = Router();

// Clerk envía webhooks como POST con body JSON
// No usar authenticateToken — los webhooks se verifican con firma svix
router.post('/', handleClerkWebhook);

export default router;
