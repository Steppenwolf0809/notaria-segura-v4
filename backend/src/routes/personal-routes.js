import express from 'express';
import {
  verificarCedula,
  registrarPersona,
  loginPersona,
  crearPinPropio,
  obtenerMiInformacion,
  actualizarMiInformacion,
  logoutPersona,
  buscarPersonaPorCedula,
  resetearPIN
} from '../controllers/personal-controller.js';
import { verifyPersonalSession } from '../middleware/verify-personal-session.js';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { personalLoginRateLimit, personalRegisterRateLimit } from '../middleware/rate-limiter.js';

const router = express.Router();

// ========================================
// RUTAS PÚBLICAS (Sin autenticación)
// ========================================

// 🔒 SECURITY: Debug endpoint removed (exposed PIN hashes without auth)

// Verificar si cédula existe
router.get('/verificar-cedula/:cedula', verificarCedula);

// Crear cuenta con PIN - 🔒 SECURITY FIX: Rate limited
router.post('/registrar', personalRegisterRateLimit, registrarPersona);

// Login con PIN - 🔒 SECURITY FIX: Rate limited to prevent brute force
router.post('/login', personalLoginRateLimit, loginPersona);

// Crear PIN propio (cambio de PIN temporal a personal) - 🔒 SECURITY FIX: Rate limited
router.post('/crear-pin', personalRegisterRateLimit, crearPinPropio);

// ========================================
// RUTAS PROTEGIDAS (Requieren sesión)
// ========================================

// Obtener mi información
router.get('/mi-informacion', verifyPersonalSession, obtenerMiInformacion);

// Actualizar mi información
router.put('/mi-informacion', verifyPersonalSession, actualizarMiInformacion);

// Cerrar sesión
router.post('/logout', verifyPersonalSession, logoutPersona);

// ========================================
// RUTAS ADMINISTRATIVAS (MATRIZADOR/ADMIN)
// ========================================

// Buscar persona por cédula (requiere MATRIZADOR o ADMIN)
router.get('/buscar/:cedula',
  authenticateToken,
  requireRoles(['ADMIN', 'MATRIZADOR']),
  buscarPersonaPorCedula
);

// Resetear PIN de un usuario (requiere MATRIZADOR o ADMIN)
router.post('/:personaId/resetear-pin',
  authenticateToken,
  requireRoles(['ADMIN', 'MATRIZADOR']),
  resetearPIN
);

export default router;
