import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Obtener estadísticas del dashboard
 * @returns {Promise<Object>} Datos de estadísticas
 */
export const getDashboardStats = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            return response.data.data;
        }
        throw new Error(response.data.message);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};
