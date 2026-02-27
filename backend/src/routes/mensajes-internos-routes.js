import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { requireModule } from '../middleware/require-module.js';
import {
    enviarMensaje,
    enviarMensajeMasivo,
    contarNoLeidos,
    listarMensajes,
    marcarLeido,
    marcarTodosLeidos,
    marcarResuelto,
    obtenerEstadisticas,
    listarMensajesEnviados,
    obtenerEstadisticasEnviados
} from '../controllers/mensajes-internos-controller.js';

const router = express.Router();
router.use(authenticateToken);
router.use(requireModule('MENSAJES_INTERNOS'));

/**
 * RUTAS DE MENSAJES INTERNOS
 * Sistema de comunicación interna Admin -> Trabajadores
 *
 * IMPORTANTE: Las rutas estáticas DEBEN definirse ANTES de las rutas con parámetros
 * para evitar que Express interprete palabras como "estadisticas" como un :id
 */

// ============================================================================
// RUTAS ESTÁTICAS (SIN PARÁMETROS DINÁMICOS) - DEBEN IR PRIMERO
// ============================================================================

/**
 * @route GET /api/mensajes-internos/estadisticas
 * @desc Obtener estadísticas de mensajes del usuario
 * @access Private (Todos los roles)
 */
router.get('/estadisticas',
    obtenerEstadisticas
);

/**
 * @route GET /api/mensajes-internos/todos/estadisticas
 * @desc Obtener estadísticas globales de todos los mensajes
 * @access Private (ADMIN only)
 */
router.get('/todos/estadisticas',
    requireRoles(['ADMIN']),
    obtenerEstadisticasGlobales
);

/**
 * @route GET /api/mensajes-internos/todos
 * @desc Listar todos los mensajes del sistema (vista global Admin)
 * @access Private (ADMIN only)
 * @query page, limit, estado, remitenteId, destinatarioId
 */
router.get('/todos',
    requireRoles(['ADMIN']),
    listarTodosMensajes
);

/**
 * @route GET /api/mensajes-internos/enviados/estadisticas
 * @desc Obtener estadísticas de mensajes enviados
 * @access Private (ADMIN only)
 */
router.get('/enviados/estadisticas',
    requireRoles(['ADMIN']),
    obtenerEstadisticasEnviados
);

/**
 * @route GET /api/mensajes-internos/enviados
 * @desc Listar mensajes enviados por el usuario (seguimiento para Admin)
 * @access Private (ADMIN only)
 * @query page, limit, resuelto, estado
 */
router.get('/enviados',
    requireRoles(['ADMIN']),
    listarMensajesEnviados
);

/**
 * @route GET /api/mensajes-internos/no-leidos/count
 * @desc Obtener contador de mensajes no leídos del usuario
 * @access Private (Todos los roles)
 */
router.get('/no-leidos/count',
    contarNoLeidos
);

/**
 * @route PUT /api/mensajes-internos/leer-todos
 * @desc Marcar todos los mensajes como leídos
 * @access Private (Todos los roles)
 */
router.put('/leer-todos',
    marcarTodosLeidos
);

/**
 * @route POST /api/mensajes-internos/masivo
 * @desc Enviar mensajes masivos agrupados por matrizador
 * @access Private (ADMIN only)
 */
router.post('/masivo',
    requireRoles(['ADMIN']),
    enviarMensajeMasivo
);

// ============================================================================
// RUTAS BASE (/ para GET y POST)
// ============================================================================

/**
 * @route GET /api/mensajes-internos
 * @desc Listar mensajes del usuario con paginación
 * @access Private (Todos los roles)
 * @query page, limit, leido, estado
 */
router.get('/',
    listarMensajes
);

/**
 * @route POST /api/mensajes-internos
 * @desc Enviar mensaje individual a un usuario
 * @access Private (ADMIN only)
 */
router.post('/',
    requireRoles(['ADMIN', 'CAJA']),
    enviarMensaje
);

// ============================================================================
// RUTAS CON PARÁMETROS DINÁMICOS (:id) - DEBEN IR AL FINAL
// ============================================================================

/**
 * @route PUT /api/mensajes-internos/:id/leer
 * @desc Marcar un mensaje específico como leído
 * @access Private (Todos los roles)
 */
router.put('/:id/leer',
    marcarLeido
);

/**
 * @route PUT /api/mensajes-internos/:id/resolver
 * @desc Marcar un mensaje como resuelto/procesado
 * @access Private (Todos los roles)
 * @body { notaResolucion?: string }
 */
router.put('/:id/resolver',
    marcarResuelto
);

export default router;

