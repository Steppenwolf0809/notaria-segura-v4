import axios from 'axios';

// Reutilizar patrón de obtención baseURL
const getApiBaseUrl = () => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para token (igual a document-service)
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
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const concuerdoService = {
  async uploadPDF(file, { ocrFirst = true } = {}) {
    try {
      if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        return { success: false, error: 'Seleccione un archivo PDF válido' };
      }
      if (file.size > 10 * 1024 * 1024) {
        return { success: false, error: 'El archivo supera 10MB' };
      }
      const formData = new FormData();
      formData.append('pdfFile', file);

      const response = await api.post(`/concuerdos/upload-pdf?ocrFirst=${ocrFirst ? '1' : '0'}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error subiendo PDF';
      return { success: false, error: message };
    }
  },

  async extractData(text, buffer = null) {
    try {
      const payload = { text }
      if (buffer) {
        payload.buffer = buffer
      }
      const response = await api.post('/concuerdos/extract-data', payload);
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error extrayendo datos';
      return { success: false, error: message };
    }
  },

  async previewConcuerdo(data) {
    try {
      const response = await api.post('/concuerdos/preview', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error generando vista previa';
      return { success: false, error: message };
    }
  },

  async generateDocuments(data) {
    try {
      const response = await api.post('/concuerdos/generate-documents', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error generando documentos';
      return { success: false, error: message };
    }
  },

  async applyAutoFixes(data) {
    try {
      const response = await api.post('/concuerdos/apply-fixes', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error aplicando correcciones';
      return { success: false, error: message };
    }
  },
};

export default concuerdoService;
