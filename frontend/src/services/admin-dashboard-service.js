import apiClient from './api-client';

/**
 * Obtener estadísticas del dashboard
 * @returns {Promise<Object>} Datos de estadísticas
 */
export const getDashboardStats = async () => {
    try {
        const response = await apiClient.get('/admin/dashboard/stats');

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};
