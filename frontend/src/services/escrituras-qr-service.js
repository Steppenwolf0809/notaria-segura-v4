/**
 * Servicio para comunicación con la API de escrituras QR
 * Maneja upload de PDFs, gestión de escrituras y generación de QR
 */

import apiClient from './api-client.js';

/**
 * Sube un PDF y genera la escritura QR
 * @param {File} pdfFile - Archivo PDF a procesar
 * @returns {Promise<Object>} Respuesta con datos de la escritura y QR
 */
export async function uploadEscritura(pdfFile) {
  try {
    const formData = new FormData();
    formData.append('pdfFile', pdfFile);
    
    const response = await apiClient.post('/escrituras/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading escritura:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al subir el archivo PDF'
    );
  }
}

/**
 * Obtiene la lista de escrituras del usuario actual
 * @param {Object} params - Parámetros de consulta
 * @param {number} params.page - Página actual
 * @param {number} params.limit - Elementos por página
 * @param {string} params.estado - Filtro por estado
 * @param {string} params.search - Término de búsqueda
 * @returns {Promise<Object>} Lista de escrituras con paginación
 */
export async function getEscrituras(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.estado) queryParams.append('estado', params.estado);
    if (params.search) queryParams.append('search', params.search);
    
    const response = await apiClient.get(`/escrituras?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching escrituras:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al obtener las escrituras'
    );
  }
}

/**
 * Obtiene una escritura específica por ID
 * @param {number} id - ID de la escritura
 * @returns {Promise<Object>} Datos de la escritura
 */
export async function getEscritura(id) {
  try {
    const response = await apiClient.get(`/escrituras/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching escritura:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al obtener la escritura'
    );
  }
}

/**
 * Actualiza los datos de una escritura
 * @param {number} id - ID de la escritura
 * @param {Object} data - Datos a actualizar
 * @param {string} data.datosCompletos - JSON con datos completos
 * @param {string} data.estado - Nuevo estado
 * @returns {Promise<Object>} Escritura actualizada
 */
export async function updateEscritura(id, data) {
  try {
    const response = await apiClient.put(`/escrituras/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating escritura:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al actualizar la escritura'
    );
  }
}

/**
 * Obtiene el código QR de una escritura
 * @param {number} id - ID de la escritura
 * @param {string} format - Formato del QR ('display', 'print', 'web', 'official', 'multi')
 * @returns {Promise<Object>} Información del código QR
 */
export async function getEscrituraQR(id, format = 'display') {
  try {
    const response = await apiClient.get(`/escrituras/${id}/qr?format=${format}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching QR:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al generar el código QR'
    );
  }
}

/**
 * Desactiva una escritura (soft delete)
 * @param {number} id - ID de la escritura
 * @returns {Promise<Object>} Confirmación de desactivación
 */
export async function deleteEscritura(id) {
  try {
    const response = await apiClient.delete(`/escrituras/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting escritura:', error);
    throw new Error(
      error.response?.data?.message || 
      'Error al desactivar la escritura'
    );
  }
}

/**
 * Verifica una escritura usando su token (público, sin autenticación)
 * @param {string} token - Token de verificación
 * @returns {Promise<Object>} Datos públicos de la escritura
 */
export async function verifyEscritura(token) {
  try {
    // Usar fetch directamente para evitar interceptores de autenticación
    const response = await fetch(`${apiClient.defaults.baseURL}/verify/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la verificación');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying escritura:', error);
    throw new Error(
      error.message || 'Error al verificar la escritura'
    );
  }
}

/**
 * Valida un archivo PDF antes de subirlo
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
export function validatePDFFile(file) {
  const errors = [];
  const warnings = [];
  
  // Verificar que sea un archivo
  if (!file) {
    errors.push('No se ha seleccionado ningún archivo');
    return { isValid: false, errors, warnings };
  }
  
  // Verificar tipo de archivo
  if (file.type !== 'application/pdf') {
    errors.push('El archivo debe ser un PDF');
  }
  
  // Verificar tamaño (máximo 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push('El archivo es demasiado grande (máximo 10MB)');
  }
  
  // Verificar tamaño mínimo (al menos 1KB)
  if (file.size < 1024) {
    errors.push('El archivo es demasiado pequeño');
  }
  
  // Advertencias
  if (file.size > 5 * 1024 * 1024) { // Mayor a 5MB
    warnings.push('El archivo es grande, el procesamiento puede tomar más tiempo');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formatea el tamaño de archivo para mostrar
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estados disponibles para escrituras
 */
export const ESTADOS_ESCRITURA = {
  ACTIVO: 'activo',
  REVISION_REQUERIDA: 'revision_requerida',
  INACTIVO: 'inactivo'
};

/**
 * Obtiene el color y etiqueta para un estado
 * @param {string} estado - Estado de la escritura
 * @returns {Object} Color y etiqueta del estado
 */
export function getEstadoInfo(estado) {
  const estadosInfo = {
    [ESTADOS_ESCRITURA.ACTIVO]: {
      color: 'success',
      label: 'Activo',
      description: 'Escritura verificable públicamente'
    },
    [ESTADOS_ESCRITURA.REVISION_REQUERIDA]: {
      color: 'warning',
      label: 'Revisión Requerida',
      description: 'Requiere revisión manual de datos'
    },
    [ESTADOS_ESCRITURA.INACTIVO]: {
      color: 'error',
      label: 'Inactivo',
      description: 'Escritura desactivada'
    }
  };
  
  return estadosInfo[estado] || {
    color: 'default',
    label: 'Desconocido',
    description: 'Estado no reconocido'
  };
}

/**
 * Genera la URL de verificación pública
 * @param {string} token - Token de la escritura
 * @returns {string} URL completa de verificación
 */
export function generateVerificationURL(token) {
  const baseURL = window.location.origin;
  return `${baseURL}/verify/${token}`;
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} True si se copió exitosamente
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Descarga un código QR como imagen
 * @param {string} dataURL - Data URL de la imagen QR
 * @param {string} filename - Nombre del archivo
 */
export function downloadQRImage(dataURL, filename = 'escritura-qr.png') {
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading QR image:', error);
    throw new Error('Error al descargar la imagen QR');
  }
}