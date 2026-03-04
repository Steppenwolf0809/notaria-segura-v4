import apiClient from './api-client';

/**
 * Obtener estadísticas de supervisión con filtros
 * @param {Object} filters - Filtros: { thresholdDays, matrixerId, startDate, endDate }
 * @returns {Promise<Object>} Datos de estadísticas
 */
export const getSupervisionStats = async (filters = {}) => {
    try {
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

        const response = await apiClient.get(`/admin/dashboard/stats?${params.toString()}`);

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
 * Obtener lista de matrizadores y archivadores para el filtro
 * Incluye usuarios con rol MATRIZADOR y ARCHIVO
 */
export const getMatrizadores = async () => {
    try {
        const [matRes, archRes] = await Promise.all([
            apiClient.get('/admin/users?role=MATRIZADOR'),
            apiClient.get('/admin/users?role=ARCHIVO')
        ]);

        const matrizadores = matRes.data.success ? matRes.data.data : [];
        const archivadores = archRes.data.success ? archRes.data.data : [];

        // Combinar ambas listas
        return [...matrizadores, ...archivadores];
    } catch (error) {
        console.error('Error fetching matrizadores/archivadores:', error);
        return [];
    }
}
