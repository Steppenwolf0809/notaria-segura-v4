import express from 'express';
import { verifyLegacyUser } from '../controllers/lazy-migration-controller.js';

const router = express.Router();

// Ruta protegida por AUTH0_MIGRATION_SECRET (no por JWT)
// POST /api/auth/migration/login
router.post('/login', verifyLegacyUser);

export default router;
