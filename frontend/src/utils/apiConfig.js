// Configuración unificada de base de API
// Evitamos fallbacks a localhost en producción. La URL final se inyecta por Vite.
// Si no existe VITE_API_URL, usamos '/api' que funciona tanto en dev con proxy como en prod detrás del mismo dominio.
export const API_BASE = (import.meta.env?.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) || '/api';

// Log de arranque único para diagnóstico
// Debe verse una sola vez en DevTools al iniciar la app o primer import
console.info('[HTTP]', { API_BASE });