import { getPrismaClient } from '../db.js';
import { bulkMarkReady, bulkDeliverDocuments } from '../services/bulk-status-service.js';
import { withRequestTenantContext } from '../utils/tenant-context.js';

const prisma = getPrismaClient();

/**
 * Controlador: Cambio masivo de estado a LISTO
 * Body: { documentIds: string[], sendNotifications?: boolean }
 */
export async function bulkStatusChange(req, res) {
  try {
    const { documentIds, sendNotifications = true, toStatus, ...options } = req.body || {};

    const result = await withRequestTenantContext(prisma, req, async (tx) => {
      if (toStatus === 'ENTREGADO') {
        // Flujo de Entrega
        return bulkDeliverDocuments({
          documentIds,
          actor: req.user,
          deliveryData: options, // deliveredTo, receptorId, etc.
          sendNotifications,
          dbClient: tx
        });
      }

      // Flujo por defecto (Marcar Listo)
      // Nota: Si se agregan mas estados, usar switch
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
    console.error('Error en bulkStatusChange:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export default { bulkStatusChange };
