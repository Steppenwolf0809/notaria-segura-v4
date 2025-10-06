/**
 * Servicio de generación de códigos QR para escrituras notariales
 * Genera códigos QR dinámicos con URLs de verificación
 */

import QRCode from 'qrcode';

/**
 * Configuración base para la generación de QR
 */
const QR_CONFIG = {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.92,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  width: 256
};

/**
 * Obtiene la URL base para verificación según el entorno
 * @returns {string} URL base
 */
function getBaseURL() {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    // URL de producción en Railway
    return process.env.PUBLIC_URL || 'https://notaria-segura-production.up.railway.app';
  } else if (env === 'staging') {
    // URL de staging en Railway
    return process.env.PUBLIC_URL || 'https://notaria-segura-staging.up.railway.app';
  } else {
    // Desarrollo local
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }
}

/**
 * Genera la URL de verificación para un token
 * @param {string} token - Token único de la escritura
 * @returns {string} URL completa de verificación
 */
export function generateVerificationURL(token) {
  const baseURL = getBaseURL();
  const env = process.env.NODE_ENV;
  
  // En producción, usar el dominio oficial de la notaría con ruta en español
  if (env === 'production') {
    const publicURL = process.env.PUBLIC_URL || 'https://www.notaria18quito.com.ec';
    console.log(`[QR] Generando URL de verificación con PUBLIC_URL: ${publicURL}`);
    const url = `${publicURL}/verificar.html?token=${token}`;
    console.log(`[QR] URL generada: ${url}`);
    return url;
  }
  
  // En desarrollo/staging, mantener ruta en inglés para consistencia con backend
  return `${baseURL}/verify/${token}`;
}

/**
 * Genera un código QR como buffer de imagen PNG
 * @param {string} token - Token único de la escritura
 * @param {Object} options - Opciones adicionales para el QR
 * @returns {Promise<Buffer>} Buffer de la imagen PNG del QR
 */
export async function generateQRBuffer(token, options = {}) {
  try {
    const url = generateVerificationURL(token);
    const config = { ...QR_CONFIG, ...options };
    
    const qrBuffer = await QRCode.toBuffer(url, config);
    return qrBuffer;
  } catch (error) {
    console.error('Error generando QR buffer:', error);
    throw new Error(`Error generando código QR: ${error.message}`);
  }
}

/**
 * Genera un código QR como string base64
 * @param {string} token - Token único de la escritura
 * @param {Object} options - Opciones adicionales para el QR
 * @returns {Promise<string>} String base64 de la imagen PNG
 */
export async function generateQRBase64(token, options = {}) {
  try {
    const url = generateVerificationURL(token);
    const config = { ...QR_CONFIG, ...options };
    
    const qrDataURL = await QRCode.toDataURL(url, config);
    // Remover el prefijo "data:image/png;base64," para obtener solo el base64
    return qrDataURL.replace(/^data:image\/png;base64,/, '');
  } catch (error) {
    console.error('Error generando QR base64:', error);
    throw new Error(`Error generando código QR: ${error.message}`);
  }
}

/**
 * Genera un código QR como SVG string
 * @param {string} token - Token único de la escritura
 * @param {Object} options - Opciones adicionales para el QR
 * @returns {Promise<string>} String SVG del código QR
 */
export async function generateQRSVG(token, options = {}) {
  try {
    const url = generateVerificationURL(token);
    const config = { 
      ...QR_CONFIG, 
      ...options,
      type: 'svg'
    };
    
    const qrSVG = await QRCode.toString(url, config);
    return qrSVG;
  } catch (error) {
    console.error('Error generando QR SVG:', error);
    throw new Error(`Error generando código QR: ${error.message}`);
  }
}

/**
 * Valida que un token sea válido para generar QR
 * @param {string} token - Token a validar
 * @returns {boolean} True si el token es válido
 */
export function validateTokenForQR(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Debe ser exactamente 8 caracteres alfanuméricos
  const tokenRegex = /^[A-Za-z0-9]{8}$/;
  return tokenRegex.test(token);
}

/**
 * Genera información completa del QR para respuesta de API
 * @param {string} token - Token único de la escritura
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Objeto con información del QR
 */
export async function generateQRInfo(token, options = {}) {
  try {
    if (!validateTokenForQR(token)) {
      throw new Error('Token inválido para generar QR');
    }
    
    const verificationURL = generateVerificationURL(token);
    const qrBase64 = await generateQRBase64(token, options);
    
    return {
      token: token,
      verificationURL: verificationURL,
      qrBase64: qrBase64,
      qrDataURL: `data:image/png;base64,${qrBase64}`,
      generatedAt: new Date().toISOString(),
      config: {
        size: options.width || QR_CONFIG.width,
        format: 'PNG',
        errorCorrection: options.errorCorrectionLevel || QR_CONFIG.errorCorrectionLevel
      }
    };
  } catch (error) {
    console.error('Error generando información de QR:', error);
    throw error;
  }
}

/**
 * Configuraciones predefinidas para diferentes usos
 */
export const QR_PRESETS = {
  // Para mostrar en pantalla
  display: {
    width: 256,
    margin: 2,
    errorCorrectionLevel: 'M'
  },
  
  // Para imprimir
  print: {
    width: 512,
    margin: 4,
    errorCorrectionLevel: 'H'
  },
  
  // Para web (más pequeño)
  web: {
    width: 128,
    margin: 1,
    errorCorrectionLevel: 'L'
  },
  
  // Para documentos oficiales
  official: {
    width: 400,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#1A5799', // Color azul de la notaría
      light: '#FFFFFF'
    }
  }
};

/**
 * Genera múltiples formatos de QR para diferentes usos
 * @param {string} token - Token único de la escritura
 * @returns {Promise<Object>} Objeto con múltiples formatos
 */
export async function generateMultiFormatQR(token) {
  try {
    if (!validateTokenForQR(token)) {
      throw new Error('Token inválido para generar QR');
    }
    
    const verificationURL = generateVerificationURL(token);
    
    const [displayQR, printQR, webQR, officialQR] = await Promise.all([
      generateQRBase64(token, QR_PRESETS.display),
      generateQRBase64(token, QR_PRESETS.print),
      generateQRBase64(token, QR_PRESETS.web),
      generateQRBase64(token, QR_PRESETS.official)
    ]);
    
    return {
      token: token,
      verificationURL: verificationURL,
      formats: {
        display: `data:image/png;base64,${displayQR}`,
        print: `data:image/png;base64,${printQR}`,
        web: `data:image/png;base64,${webQR}`,
        official: `data:image/png;base64,${officialQR}`
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generando QR multi-formato:', error);
    throw error;
  }
}