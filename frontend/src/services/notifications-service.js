import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

class NotificationsService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/notifications`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Interceptor para agregar token de autenticación
    this.api.interceptors.request.use(
      (config) => {
        const authData = localStorage.getItem('notaria-auth-storage');
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            if (parsed.state && parsed.state.token) {
              config.headers.Authorization = `Bearer ${parsed.state.token}`;
            }
          } catch (error) {
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para manejar respuestas
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        throw error;
      }
    );
  }

  /**
   * Obtener notificaciones de un documento específico
   */
  async getDocumentNotifications(documentId) {
    try {
      const response = await this.api.get(`/?documentId=${documentId}&limit=10`);
      
      if (response.success) {
        return {
          success: true,
          data: response.data.notifications || []
        };
      } else {
        throw new Error(response.message || 'Error obteniendo notificaciones del documento');
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error de conexión',
        data: []
      };
    }
  }

  /**
   * Obtener historial de notificaciones
   */
  async getNotifications(params = {}) {
    try {
      const {
        page = 0,
        limit = 25,
        search = '',
        status = '',
        type = '',
        dateFrom = '',
        dateTo = '',
        sortBy = '',
        sortOrder = ''
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      if (search) queryParams.append('search', search);
      if (status) queryParams.append('status', status);
      if (type) queryParams.append('type', type);
      if (dateFrom) queryParams.append('dateFrom', dateFrom);
      if (dateTo) queryParams.append('dateTo', dateTo);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);

      const response = await this.api.get(`/?${queryParams.toString()}`);
      
      if (response.success) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.message || 'Error obteniendo notificaciones');
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error de conexión',
        error: error
      };
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getStats(days = 30) {
    try {
      const response = await this.api.get(`/stats?days=${days}`);
      
      if (response.success) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.message || 'Error obteniendo estadísticas');
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error de conexión',
        error: error
      };
    }
  }

  /**
   * Obtener conteo rápido de notificaciones por estado
   */
  async getQuickStats() {
    try {
      const response = await this.getNotifications({ limit: 1 });
      
      if (response.success) {
        return {
          success: true,
          stats: response.data.stats
        };
      } else {
        throw new Error('Error obteniendo estadísticas rápidas');
      }
    } catch (error) {
      return {
        success: false,
        stats: {
          total: 0,
          sent: 0,
          failed: 0,
          simulated: 0,
          pending: 0
        }
      };
    }
  }
}

const notificationsService = new NotificationsService();
export default notificationsService;
