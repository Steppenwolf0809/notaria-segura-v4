import apiClient from './api-client';

/**
 * Servicio para el Centro de Notificaciones WhatsApp
 */
const notificationService = {
    /**
     * Obtener cola de notificaciones pendientes
     * @param {string} tab - 'pending' | 'reminders' | 'sent'
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
    },

    /**
     * Actualizar teléfono de cliente en documentos
     * @param {Object} data - { documentIds: string[], clientPhone: string }
     */
    async updateClientPhone(data) {
        try {
            const response = await apiClient.put('/notifications/update-phone', data);
            return response.data;
        } catch (error) {
            console.error('Error updating client phone:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Error al actualizar teléfono'
            };
        }
    }
};

export default notificationService;
