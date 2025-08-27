import { bulkMarkReady } from '../services/bulk-status-service.js';

/**
 * Controlador: Cambio masivo de estado a LISTO
 * Body: { documentIds: string[], sendNotifications?: boolean }
 */
export async function bulkStatusChange(req, res) {
  try {
    const { documentIds, sendNotifications = true } = req.body || {};
    const result = await bulkMarkReady({
      documentIds,
      actor: req.user,
      sendNotifications
    });

    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      data: result.data || null
    });
  } catch (error) {
    console.error('Error en bulkStatusChange:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export default { bulkStatusChange };


