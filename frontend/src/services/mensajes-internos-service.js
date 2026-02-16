import apiClient from './api-client';

/**
 * Servicio de Mensajes Internos
 * Maneja la comunicación interna entre admin y trabajadores
 *
 * NOTA: El apiClient ya maneja la autenticación automáticamente via interceptors,
 * no es necesario agregar headers de Authorization manualmente.
 */
const mensajesInternosService = {
  /**
   * Enviar mensaje individual
   * @param {Object} data - Datos del mensaje
   * @param {number} data.destinatarioId - ID del destinatario
   * @param {string} data.documentoId - ID del documento (opcional)
   * @param {string} data.tipo - Tipo de mensaje
   * @param {string} data.urgencia - Nivel de urgencia
   * @param {string} data.mensaje - Mensaje personalizado (opcional)
   * @returns {Promise<Object>} Mensaje creado
   */
  enviarMensaje: async (data) => {
    try {
      const response = await apiClient.post('/mensajes-internos', data);
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error enviando mensaje:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Enviar mensajes masivos
   * @param {Object} data - Datos del mensaje masivo
   * @param {Array} data.documentoIds - Array de IDs de documentos
   * @param {string} data.tipo - Tipo de mensaje
   * @param {string} data.urgencia - Nivel de urgencia
   * @param {string} data.mensaje - Mensaje personalizado (opcional)
   * @returns {Promise<Object>} Resultado de envío masivo
   */
  enviarMensajeMasivo: async (data) => {
    try {
      const response = await apiClient.post('/mensajes-internos/masivo', data);
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error enviando mensaje masivo:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Obtener contador de mensajes no leídos
   * @returns {Promise<Object>} Contador de mensajes
   */
  contarNoLeidos: async () => {
    try {
      const response = await apiClient.get('/mensajes-internos/no-leidos/count');
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error contando no leídos:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Listar mensajes del usuario
   * @param {Object} params - Parámetros de consulta
   * @param {number} params.page - Página
   * @param {number} params.limit - Límite por página
   * @param {string} params.estado - Filtrar por estado (pendientes, resueltos, todos)
   * @returns {Promise<Object>} Lista de mensajes con paginación
   */
  listarMensajes: async (params = {}) => {
    try {
      const response = await apiClient.get('/mensajes-internos', { params });
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error listando mensajes:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Marcar mensaje como leído
   * @param {number} mensajeId - ID del mensaje
   * @returns {Promise<Object>} Mensaje actualizado
   */
  marcarLeido: async (mensajeId) => {
    try {
      const response = await apiClient.put(`/mensajes-internos/${mensajeId}/leer`, {});
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error marcando como leído:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Marcar todos los mensajes como leídos
   * @returns {Promise<Object>} Resultado de la operación
   */
  marcarTodosLeidos: async () => {
    try {
      const response = await apiClient.put('/mensajes-internos/leer-todos', {});
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error marcando todos como leídos:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Marcar mensaje como resuelto/procesado
   * @param {number} mensajeId - ID del mensaje
   * @param {string} notaResolucion - Nota opcional sobre qué se hizo
   * @returns {Promise<Object>} Mensaje actualizado
   */
  marcarResuelto: async (mensajeId, notaResolucion = null) => {
    try {
      const response = await apiClient.put(`/mensajes-internos/${mensajeId}/resolver`, { notaResolucion });
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error marcando como resuelto:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Obtener estadísticas de mensajes del usuario
   * @returns {Promise<Object>} Estadísticas
   */
  obtenerEstadisticas: async () => {
    try {
      const response = await apiClient.get('/mensajes-internos/estadisticas');
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error obteniendo estadísticas:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Listar mensajes enviados (para seguimiento del Admin)
   * @param {Object} params - Parámetros de consulta
   * @returns {Promise<Object>} Lista de mensajes enviados
   */
  listarMensajesEnviados: async (params = {}) => {
    try {
      const response = await apiClient.get('/mensajes-internos/enviados', { params });
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error listando mensajes enviados:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Obtener estadísticas de mensajes enviados (Admin)
   * @returns {Promise<Object>} Estadísticas de enviados
   */
  obtenerEstadisticasEnviados: async () => {
    try {
      const response = await apiClient.get('/mensajes-internos/enviados/estadisticas');
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error obteniendo estadísticas de enviados:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Listar todos los mensajes del sistema (Admin - vista global)
   * @param {Object} params - Parámetros de consulta
   * @param {number} params.page - Página
   * @param {number} params.limit - Límite por página
   * @param {string} params.estado - Filtrar por estado
   * @param {number} params.remitenteId - Filtrar por remitente
   * @param {number} params.destinatarioId - Filtrar por destinatario
   * @returns {Promise<Object>} Lista de mensajes con paginación
   */
  listarTodosMensajes: async (params = {}) => {
    try {
      const response = await apiClient.get('/mensajes-internos/todos', { params });
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error listando todos los mensajes:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Obtener estadísticas globales de mensajes (Admin)
   * @returns {Promise<Object>} Estadísticas globales
   */
  obtenerEstadisticasGlobales: async () => {
    try {
      const response = await apiClient.get('/mensajes-internos/todos/estadisticas');
      return response.data;
    } catch (error) {
      console.error('[MensajesInternos] Error obteniendo estadísticas globales:', error.response?.data || error.message);
      throw mensajesInternosService.handleError(error);
    }
  },

  /**
   * Obtener tipos de mensaje disponibles
   * @returns {Array} Lista de tipos con labels e iconos
   */
  getTiposMensaje: () => [
    { value: 'SOLICITUD_ACTUALIZACION', label: 'Solicitar actualización de estado', icon: 'schedule', color: '#1976d2' },
    { value: 'PRIORIZAR', label: 'Priorizar este trámite', icon: 'priority_high', color: '#d32f2f' },
    { value: 'CLIENTE_ESPERANDO', label: 'Cliente preguntando', icon: 'person', color: '#ed6c02' },
    { value: 'COBRO', label: 'Recordatorio de cobro', icon: 'attach_money', color: '#2e7d32' },
    { value: 'OTRO', label: 'Otro', icon: 'message', color: '#757575' }
  ],

  /**
   * Obtener niveles de urgencia
   * @returns {Array} Lista de niveles con labels y colores
   */
  getNivelesUrgencia: () => [
    { value: 'NORMAL', label: 'Normal', color: '#757575' },
    { value: 'URGENTE', label: 'Urgente', color: '#ed6c02' },
    { value: 'CRITICO', label: 'Crítico', color: '#d32f2f' }
  ],

  /**
   * Formatear tipo de mensaje para mostrar
   * @param {string} tipo - Tipo de mensaje
   * @returns {Object} Objeto con label, icon y color
   */
  formatTipo: (tipo) => {
    const tipos = mensajesInternosService.getTiposMensaje();
    return tipos.find(t => t.value === tipo) || { value: tipo, label: tipo, icon: 'message', color: '#757575' };
  },

  /**
   * Formatear urgencia para mostrar
   * @param {string} urgencia - Nivel de urgencia
   * @returns {Object} Objeto con label y color
   */
  formatUrgencia: (urgencia) => {
    const niveles = mensajesInternosService.getNivelesUrgencia();
    return niveles.find(n => n.value === urgencia) || { value: urgencia, label: urgencia, color: '#757575' };
  },

  /**
   * Maneja errores de las peticiones HTTP
   * @param {Object} error - Error de axios
   * @returns {Object} Error procesado
   */
  handleError: (error) => {
    if (error.response) {
      return {
        message: error.response.data?.error || error.response.data?.message || 'Error del servidor',
        status: error.response.status,
        details: error.response.data
      };
    } else if (error.request) {
      return {
        message: 'Error de conexión - Verifique su internet o el servidor',
        status: 0,
        details: null
      };
    } else {
      return {
        message: error.message || 'Error inesperado',
        status: -1,
        details: null
      };
    }
  }
};

export default mensajesInternosService;
