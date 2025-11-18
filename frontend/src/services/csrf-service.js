import apiClient from './api-client';

/**
 * Servicio de CSRF Token para protección contra Cross-Site Request Forgery
 *
 * Este servicio maneja la obtención y uso del token CSRF en el frontend.
 */

class CSRFService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.requestPromise = null; // Para evitar requests duplicados
  }

  /**
   * Obtiene el token CSRF actual o solicita uno nuevo
   * @returns {Promise<string>} Token CSRF
   */
  async getToken() {
    // Si ya hay una request en progreso, esperar a que termine
    if (this.requestPromise) {
      return this.requestPromise;
    }

    // Si el token existe y no ha expirado, retornarlo
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Solicitar nuevo token
    this.requestPromise = this.fetchNewToken();

    try {
      const token = await this.requestPromise;
      return token;
    } finally {
      this.requestPromise = null;
    }
  }

  /**
   * Solicita un nuevo token CSRF al servidor
   * @returns {Promise<string>} Token CSRF
   * @private
   */
  async fetchNewToken() {
    try {
      console.log('[CSRF] Solicitando nuevo token...');

      const response = await apiClient.get('/csrf-token');

      if (response.data.success && response.data.csrfToken) {
        this.token = response.data.csrfToken;

        // Token expira en 1 hora, renovar 5 minutos antes
        this.tokenExpiry = Date.now() + 55 * 60 * 1000;

        console.log('[CSRF] Token obtenido exitosamente');

        return this.token;
      } else {
        throw new Error('Respuesta inválida del servidor al obtener token CSRF');
      }
    } catch (error) {
      console.error('[CSRF] Error obteniendo token:', error);

      // Limpiar token en caso de error
      this.token = null;
      this.tokenExpiry = null;

      throw error;
    }
  }

  /**
   * Invalida el token actual (forzar renovación)
   */
  invalidate() {
    console.log('[CSRF] Token invalidado, se solicitará uno nuevo');
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Verifica si el servicio está listo (tiene token válido)
   * @returns {boolean}
   */
  isReady() {
    return this.token !== null && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }
}

// Exportar instancia singleton
const csrfService = new CSRFService();

export default csrfService;
