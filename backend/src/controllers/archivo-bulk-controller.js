import { getPrismaClient } from '../db.js';
import { bulkMarkReady } from '../services/bulk-status-service.js';
import { withRequestTenantContext } from '../utils/tenant-context.js';

const prisma = getPrismaClient();

/**
 * Controlador: Archivo - cambio masivo a LISTO con notificación por cliente
 */
export async function marcarVariosListosArchivo(req, res) {
  try {
    const { documentIds, sendNotifications = true } = req.body || {};
    const result = await withRequestTenantContext(prisma, req, async (tx) => {
      return bulkMarkReady({
        documentIds,
        actor: req.user,
        sendNotifications,
        dbClient: tx
      });
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

