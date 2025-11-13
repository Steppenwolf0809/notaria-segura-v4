import express from 'express';
import {
  verificarCedula,
  registrarPersona,
  loginPersona,
  obtenerMiInformacion,
  actualizarMiInformacion,
  logoutPersona
} from '../controllers/personal-controller.js';
import { verifyPersonalSession } from '../middleware/verify-personal-session.js';

const router = express.Router();

// ========================================
// RUTAS PÚBLICAS (Sin autenticación)
// ========================================

// Verificar si cédula existe
router.get('/verificar-cedula/:cedula', verificarCedula);

// Crear cuenta con PIN
router.post('/registrar', registrarPersona);

// Login con PIN
router.post('/login', loginPersona);

// ========================================
// RUTAS PROTEGIDAS (Requieren sesión)
// ========================================

// Obtener mi información
router.get('/mi-informacion', verifyPersonalSession, obtenerMiInformacion);

// Actualizar mi información
router.put('/mi-informacion', verifyPersonalSession, actualizarMiInformacion);

// Cerrar sesión
router.post('/logout', verifyPersonalSession, logoutPersona);

export default router;
