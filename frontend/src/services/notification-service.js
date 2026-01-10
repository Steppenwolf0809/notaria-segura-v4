import apiClient from './api-client';

/**
 * Servicio para el Centro de Notificaciones WhatsApp
 */
const notificationService = {
    /**
     * Obtener cola de notificaciones pendientes
     * @param {string} tab - 'pending' | 'reminders'
     * @param {number} reminderDays - Días para considerar recordatorio
     */
    async getQueue(tab = 'pending', reminderDays = 3) {
        try {
            const response = await apiClient.get('/notifications/queue', {
                params: { tab, reminderDays }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching notification queue:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Error al cargar cola de notificaciones',
                data: []
            };
        }
    },

    /**
     * Notificar documentos en lote (genera código, abre wa.me)
     * @param {Object} data - { documentIds, clientId, clientPhone, clientName }
     */
    async bulkNotify(data) {
        try {
            const response = await apiClient.put('/documents/bulk-notify', data);
            return response.data;
        } catch (error) {
            console.error('Error in bulk notify:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Error al enviar notificación'
            };
        }
    }
};

export default notificationService;
