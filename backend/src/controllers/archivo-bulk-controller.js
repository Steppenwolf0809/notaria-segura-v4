import { bulkMarkReady } from '../services/bulk-status-service.js';

/**
 * Controlador: Archivo - cambio masivo a LISTO con notificación por cliente
 */
export async function marcarVariosListosArchivo(req, res) {
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
    console.error('Error en marcarVariosListosArchivo (ARCHIVO):', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export default { marcarVariosListosArchivo };

