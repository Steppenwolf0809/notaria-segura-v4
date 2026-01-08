import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Obtener estadísticas de supervisión con filtros
 * @param {Object} filters - Filtros: { thresholdDays, matrixerId, startDate, endDate }
 * @returns {Promise<Object>} Datos de estadísticas
 */
export const getSupervisionStats = async (filters = {}) => {
    try {
        const token = localStorage.getItem('token');

        // Construir query params
        const params = new URLSearchParams();
        if (filters.thresholdDays) params.append('thresholdDays', filters.thresholdDays);
        if (filters.matrixerId) params.append('matrixerId', filters.matrixerId);
        if (filters.startDate) {
            const date = typeof filters.startDate === 'string' ? filters.startDate : filters.startDate.toISOString();
            params.append('startDate', date);
        }
        if (filters.endDate) {
            const date = typeof filters.endDate === 'string' ? filters.endDate : filters.endDate.toISOString();
            params.append('endDate', date);
        }

        // Nuevos filtros
        if (filters.status) params.append('status', filters.status);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.billedTimeRange) params.append('billedTimeRange', filters.billedTimeRange);
        if (filters.performanceTimeRange) params.append('performanceTimeRange', filters.performanceTimeRange);

        const response = await axios.get(`${API_URL}/admin/dashboard/stats?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message);
    } catch (error) {
        console.error('Error fetching supervision stats:', error);
        throw error;
    }
};

/**
 * Obtener lista de matrizadores para el filtro
 */
export const getMatrizadores = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/admin/users?role=MATRIZADOR`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching matrizadores:', error);
        return [];
    }
}
