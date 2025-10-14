/**
 * Servicio para endpoints de administración de escrituras QR
 * Solo accesible por usuarios con rol ADMIN
 */

import apiClient from './api-client.js';

/**
 * Obtiene todos los QR generados en el sistema (ADMIN)
 * @param {Object} params - Parámetros de consulta
 * @param {number} params.page - Página actual
 * @param {number} params.limit - Elementos por página
 * @param {string} params.estado - Filtro por estado
 * @param {number} params.createdBy - Filtro por usuario creador
 * @param {string} params.search - Término de búsqueda
 * @param {string} params.desde - Fecha desde (ISO string)
 * @param {string} params.hasta - Fecha hasta (ISO string)
 * @returns {Promise<Object>} Lista de todos los QR con paginación
 */
export async function getAllQRForAdmin(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.estado) queryParams.append('estado', params.estado);
    if (params.createdBy) queryParams.append('createdBy', params.createdBy);
    if (params.search) queryParams.append('search', params.search);
    if (params.desde) queryParams.append('desde', params.desde);
    if (params.hasta) queryParams.append('hasta', params.hasta);
    
    const response = await apiClient.get(`/escrituras/admin/all-qr?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all QR:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al obtener los códigos QR'
    );
  }
}

/**
 * Obtiene estadísticas de QR para el dashboard admin
 * @returns {Promise<Object>} Estadísticas completas de QR
 */
export async function getQRStats() {
  try {
    const response = await apiClient.get('/escrituras/admin/qr-stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching QR stats:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al obtener las estadísticas'
    );
  }
}

/**
 * Exporta los QR a CSV (función futura)
 * @param {Object} filters - Filtros a aplicar
 * @returns {Promise<Blob>} Archivo CSV
 */
export async function exportQRToCSV(filters = {}) {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await apiClient.get(
      `/escrituras/admin/export-csv?${queryParams.toString()}`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error('Error exporting QR:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al exportar los códigos QR'
    );
  }
}

// Re-exportar funciones útiles del servicio principal
export { getEstadoInfo, ESTADOS_ESCRITURA } from './escrituras-qr-service.js';

