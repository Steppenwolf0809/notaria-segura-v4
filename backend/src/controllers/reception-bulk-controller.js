import { getPrismaClient } from '../db.js';
import bulkStatusService from '../services/bulk-status-service.js';

/**
 * POST /api/reception/documentos/marcar-listos
 * Cambia a LISTO múltiples documentos. Agrupa por cliente y envía 1 WhatsApp por cliente.
 * Body: { documentIds: string[], sendNotifications?: boolean }
 */
export async function marcarVariosListos(req, res) {
  try {
    const { documentIds, sendNotifications = true } = req.body || {};

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una lista válida de IDs de documentos'
      });
    }

    // Actor desde JWT
    const actor = {
      id: req.user?.id,
      role: req.user?.role,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName
    };

    const result = await bulkStatusService.bulkMarkReady({
      documentIds,
      actor,
      sendNotifications
    });

    return res.status(result.status || 200).json({
      success: !!result.success,
      message: result.message || (result.success ? 'Cambio masivo realizado' : 'No se pudo completar el cambio masivo'),
      data: result.data || null,
      error: result.success ? null : (result.message || 'Error en cambio masivo')
    });
  } catch (error) {
    console.error('[RECEPTION][BULK_READY][ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor en cambio masivo LISTO',
      error: error?.message || 'Unknown error'
    });
  }
}

export default { marcarVariosListos };
