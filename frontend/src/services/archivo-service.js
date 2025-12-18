import apiClient from './api-client';

/**
 * SERVICIO DE ARCHIVO
 * Maneja las peticiones al backend para el rol ARCHIVO
 * Funcionalidad dual: documentos propios + supervisión global
 */

/**
 * ============================================================================
 * SECCIÓN 1: DOCUMENTOS PROPIOS (FUNCIONALIDAD MATRIZADOR)
 * ============================================================================
 */

/**
 * Obtener dashboard con documentos propios
 */
const getDashboard = async () => {
  try {
    const response = await apiClient.get('/archivo/dashboard');
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Listar documentos propios con filtros
 */
const getMisDocumentos = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.estado) queryParams.append('estado', params.estado);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await apiClient.get(`/archivo/mis-documentos?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Cambiar estado de documento
 */
const cambiarEstadoDocumento = async (documentoId, nuevoEstado, options = {}) => {
  try {
    const response = await apiClient.post(
      `/archivo/documentos/${documentoId}/estado`,
      { nuevoEstado, ...options }
    );
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Revertir estado de documento (ARCHIVO)
 * Propaga a documentos del mismo grupo asignados al mismo usuario
 */
const revertirEstadoDocumento = async (documentoId, newStatus, reversionReason) => {
  try {
    const response = await apiClient.post(`/archivo/documentos/${documentoId}/revertir-estado`, {
      newStatus,
      reversionReason
    });
    return {
      success: response.data?.success === true,
      data: response.data?.data,
      message: response.data?.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Procesar entrega de documento (nueva funcionalidad ARQUIVO = RECEPCIÓN)
 */
const procesarEntrega = async (documentoId, entregaData) => {
  try {
    const response = await apiClient.post(`/archivo/documentos/${documentoId}/entregar`, entregaData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * ============================================================================
 * SECCIÓN 2: SUPERVISIÓN GLOBAL (SOLO LECTURA)
 * ============================================================================
 */

/**
 * Obtener todos los documentos del sistema para supervisión
 */
const getSupervisionGeneral = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.matrizador) queryParams.append('matrizador', params.matrizador);
    if (params.estado) queryParams.append('estado', params.estado);
    if (params.alerta) queryParams.append('alerta', params.alerta);
    if (params.sortDias) queryParams.append('sortDias', params.sortDias);
    if (params.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await apiClient.get(`/archivo/supervision/todos?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Obtener resumen general del sistema
 */
const getResumenGeneral = async () => {
  try {
    const response = await apiClient.get('/archivo/supervision/resumen');
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Obtener lista de matrizadores para filtros
 */
const getMatrizadores = async () => {
  try {
    const response = await apiClient.get('/archivo/supervision/matrizadores');
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * ============================================================================
 * SECCIÓN 3: DOCUMENTOS INDIVIDUALES
 * ============================================================================
 */

/**
 * Obtener detalle de documento (propio o ajeno)
 */
const getDetalleDocumento = async (documentoId) => {
  try {
    const response = await apiClient.get(`/archivo/documentos/${documentoId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * ============================================================================
 * UTILIDADES Y HELPERS
 * ============================================================================
 */

/**
 * Formatear estado para mostrar
 */
const formatearEstado = (estado) => {
  const estados = {
    'PENDIENTE': { texto: 'Pendiente', color: 'warning' },
    'EN_PROCESO': { texto: 'En Proceso', color: 'info' },
    'LISTO': { texto: 'Listo', color: 'success' },
    'ENTREGADO': { texto: 'Entregado', color: 'default' }
  };
  return estados[estado] || { texto: estado, color: 'default' };
};

/**
 * Formatear nivel de alerta
 */
const formatearAlerta = (alerta) => {
  if (!alerta || alerta.nivel === 'normal') {
    return { texto: 'Normal', color: 'success', icono: '' };
  }

  const alertas = {
    'amarilla': { texto: 'Atención', color: 'warning', icono: '⚠️' },
    'roja': { texto: 'Crítico', color: 'error', icono: '🔥' }
  };

  return alertas[alerta.nivel] || { texto: 'Normal', color: 'success', icono: '' };
};


/**
 * ============================================================================
 * EXPORTAR TODAS LAS FUNCIONES
 * ============================================================================
 */

const archivoService = {
  // Documentos propios
  getDashboard,
  getMisDocumentos,
  cambiarEstadoDocumento,
  revertirEstadoDocumento,
  procesarEntrega,

  // Supervisión global
  getSupervisionGeneral,
  getResumenGeneral,
  getMatrizadores,

  // Documentos individuales
  getDetalleDocumento,

  // Utilidades
  formatearEstado,
  formatearAlerta
};

export default archivoService;