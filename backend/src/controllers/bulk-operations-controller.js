import { bulkMarkReady, bulkDeliverDocuments } from '../services/bulk-status-service.js';

/**
 * Controlador: Cambio masivo de estado a LISTO
 * Body: { documentIds: string[], sendNotifications?: boolean }
 */
export async function bulkStatusChange(req, res) {
  try {
    const { documentIds, sendNotifications = true, toStatus, ...options } = req.body || {};

    let result;

    if (toStatus === 'ENTREGADO') {
      // Flujo de Entrega
      result = await bulkDeliverDocuments({
        documentIds,
        actor: req.user,
        deliveryData: options, // deliveredTo, receptorId, etc.
        sendNotifications
      });
    } else {
      // Flujo por defecto (Marcar Listo)
      // Nota: Si se agregan más estados, usar switch
      result = await bulkMarkReady({
        documentIds,
        actor: req.user,
        sendNotifications
      });
    }

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


