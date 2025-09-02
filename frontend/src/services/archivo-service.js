import axios from 'axios';

/**
 * SERVICIO DE ARCHIVO
 * Maneja las peticiones al backend para el rol ARCHIVO
 * Funcionalidad dual: documentos propios + supervisión global
 */

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Configurar headers con token de autorización
 */
const getAuthHeaders = (token) => ({
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

/**
 * ============================================================================
 * SECCIÓN 1: DOCUMENTOS PROPIOS (FUNCIONALIDAD MATRIZADOR)
 * ============================================================================
 */

/**
 * Obtener dashboard con documentos propios
 */
const getDashboard = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/archivo/dashboard`,
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo dashboard archivo:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Listar documentos propios con filtros
 */
const getMisDocumentos = async (token, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.estado) queryParams.append('estado', params.estado);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await axios.get(
      `${API_BASE_URL}/archivo/mis-documentos?${queryParams.toString()}`,
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo mis documentos:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 
 */
const cambiarEstadoDocumento = async (token, documentoId, nuevoEstado) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/archivo/documentos/${documentoId}/estado`,
      { nuevoEstado },
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error cambiando estado:', error);
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
    const response = await api.post(`/archivo/documentos/${documentoId}/revertir-estado`, {
      newStatus,
      reversionReason
    });
    return {
      success: response.data?.success === true,
      data: response.data?.data,
      message: response.data?.message
    };
  } catch (error) {
    console.error('Error revirtiendo estado (archivo):', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Procesar entrega de documento (nueva funcionalidad ARQUIVO = RECEPCIÓN)
 */
/**
 * Crear instancia configurada de axios con interceptor
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('notaria-auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.state && parsed.state.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (error) {
        // Fallback al token directo
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } else {
      // Fallback al token directo
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const procesarEntrega = async (documentoId, entregaData) => {
  try {
    const response = await api.post(`/archivo/documentos/${documentoId}/entregar`, entregaData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error procesando entrega:', error);
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
const getSupervisionGeneral = async (token, params = {}) => {
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

    const response = await axios.get(
      `${API_BASE_URL}/archivo/supervision/todos?${queryParams.toString()}`,
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo supervisión general:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Obtener resumen general del sistema
 */
const getResumenGeneral = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/archivo/supervision/resumen`,
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo resumen general:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error de conexión'
    };
  }
};

/**
 * Obtener lista de matrizadores para filtros
 */
const getMatrizadores = async (token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/archivo/supervision/matrizadores`,
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo matrizadores:', error);
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
const getDetalleDocumento = async (token, documentoId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/archivo/documentos/${documentoId}`,
      getAuthHeaders(token)
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo detalle documento:', error);
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