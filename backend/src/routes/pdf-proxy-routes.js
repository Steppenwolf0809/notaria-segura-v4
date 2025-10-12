/**
 * RUTA PROXY PARA PDFs
 * 
 * Permite cargar PDFs desde el servidor FTP remoto (www.notaria18quito.com.ec)
 * sin problemas de CORS. El backend actúa como intermediario seguro.
 * 
 * Uso: /api/proxy-pdf?url=https://www.notaria18quito.com.ec/fotos-escrituras/archivo.pdf
 */

import express from 'express';
import { URL } from 'url';

const router = express.Router();

// Dominio permitido para proxying (seguridad contra SSRF)
const ALLOWED_DOMAIN = 'www.notaria18quito.com.ec';

/**
 * GET /api/proxy-pdf/health
 * Endpoint de diagnóstico para verificar configuración FTP
 * 
 * Retorna:
 * - Estado de las variables FTP
 * - Si el sistema está listo para proxear PDFs
 * 
 * NOTA: No expone credenciales, solo indica si están configuradas
 */
router.get('/proxy-pdf/health', (req, res) => {
  const ftpConfigured = Boolean(process.env.FTP_USER && process.env.FTP_PASSWORD);
  const ftpHost = process.env.FTP_HOST || 'NOT_SET';
  
  const status = {
    service: 'PDF Proxy',
    status: ftpConfigured ? 'ready' : 'not_configured',
    timestamp: new Date().toISOString(),
    configuration: {
      ftpHost: ftpHost !== 'NOT_SET' ? ftpHost : null,
      ftpUser: process.env.FTP_USER ? '✓ Configured' : '✗ Missing',
      ftpPassword: process.env.FTP_PASSWORD ? '✓ Configured' : '✗ Missing',
      ftpPort: process.env.FTP_PORT || '21 (default)',
      allowedDomain: ALLOWED_DOMAIN
    },
    message: ftpConfigured 
      ? 'PDF proxy is ready to serve authenticated requests'
      : 'FTP credentials not configured. Proxy may fail with 401 errors.'
  };
  
  // Log para debugging
  if (!ftpConfigured) {
    console.warn('⚠️ PROXY-PDF HEALTH: FTP credentials not configured');
  }
  
  res.json(status);
});

/**
 * HELPER: Función auxiliar para hacer petición HTTP con/sin autenticación
 * 
 * @param {string} url - URL completa del PDF
 * @param {string|null} credentials - Credenciales Base64 (null = sin auth)
 * @param {object} extraHeaders - Headers adicionales (ej: Range)
 * @param {AbortSignal} signal - Signal para cancelar la petición
 * @returns {Promise<Response>} Respuesta de fetch
 */
async function fetchPDFWithAuth(url, credentials = null, extraHeaders = {}, signal) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; NotariaProxy/1.0)',
    'Accept': 'application/pdf,*/*',
    ...extraHeaders
  };
  
  // Solo agregar auth si se proporciona
  if (credentials) {
    headers['Authorization'] = `Basic ${credentials}`;
  }
  
  console.log(`📡 Intentando fetch a: ${url}`);
  console.log(`🔐 Con autenticación: ${credentials ? 'SÍ' : 'NO'}`);
  
  const response = await fetch(url, { 
    method: 'GET',
    headers,
    signal,
    redirect: 'follow'
  });
  
  console.log(`📊 Respuesta: ${response.status} ${response.statusText}`);
  
  return response;
}

/**
 * GET /api/proxy-pdf
 * Proxy seguro para PDFs desde el servidor remoto
 * 
 * Query params:
 * - url: URL completa del PDF a proxear
 * 
 * Seguridad:
 * - Solo permite PDFs (.pdf)
 * - Solo permite dominio específico (www.notaria18quito.com.ec)
 * - Valida URL antes de hacer request
 * 
 * Nota: Usa fetch global de Node.js 18+ (no necesita node-fetch)
 */
router.get('/proxy-pdf', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    
    // Validación 1: URL debe existir
    if (!rawUrl) {
      console.warn('⚠️ PROXY-PDF: Petición sin parámetro URL');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing url parameter' 
      });
    }

    // Validación 2: URL debe ser válida
    let remoteUrl;
    try {
      remoteUrl = new URL(rawUrl);
    } catch (err) {
      console.warn('⚠️ PROXY-PDF: URL inválida:', rawUrl);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid URL format' 
      });
    }

    // Validación 3: Solo permitir dominio específico (seguridad)
    if (remoteUrl.hostname !== ALLOWED_DOMAIN) {
      console.warn(`🚫 PROXY-PDF: Intento de acceso a dominio no permitido: ${remoteUrl.hostname}`);
      return res.status(403).json({ 
        success: false, 
        error: `Only ${ALLOWED_DOMAIN} is allowed` 
      });
    }

    // Validación 4: Solo permitir archivos PDF
    if (!/\.pdf$/i.test(remoteUrl.pathname)) {
      console.warn(`🚫 PROXY-PDF: Intento de acceso a archivo no-PDF: ${remoteUrl.pathname}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Only PDF files are allowed' 
      });
    }

    console.log(`📄 PROXY-PDF: Solicitando ${remoteUrl.href}`);

    // Preparar credenciales (pero no usarlas aún)
    let credentials = null;
    if (process.env.FTP_USER && process.env.FTP_PASSWORD) {
      credentials = Buffer.from(
        `${process.env.FTP_USER}:${process.env.FTP_PASSWORD}`
      ).toString('base64');
      console.log(`🔑 PROXY-PDF: Credenciales disponibles (usuario: ${process.env.FTP_USER})`);
    } else {
      console.warn(`⚠️ PROXY-PDF: Variables FTP_USER/FTP_PASSWORD no configuradas`);
    }
    
    // Preparar headers adicionales (ej: Range para streaming)
    const extraHeaders = {};
    if (req.headers.range) {
      extraHeaders['Range'] = req.headers.range;
      console.log(`📊 PROXY-PDF: Range request: ${req.headers.range}`);
    }

    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    let response;
    try {
      // ════════════════════════════════════════════════════════════
      // ESTRATEGIA DE FALLBACK: Primero sin auth, luego con auth
      // ════════════════════════════════════════════════════════════
      
      // 🔓 INTENTO 1: Sin autenticación (acceso público)
      console.log('🔓 INTENTO 1: Sin autenticación (acceso público)');
      response = await fetchPDFWithAuth(remoteUrl.href, null, extraHeaders, controller.signal);
      
      // 🔐 Si recibe 401 y hay credenciales, INTENTO 2: Con autenticación
      if (response.status === 401 && credentials) {
        console.log('🔐 INTENTO 2: Con autenticación HTTP Basic (primera petición rechazada)');
        response = await fetchPDFWithAuth(remoteUrl.href, credentials, extraHeaders, controller.signal);
      }
      
      clearTimeout(timeoutId);
      
      // ════════════════════════════════════════════════════════════
      // VERIFICAR RESULTADO DE LOS INTENTOS
      // ════════════════════════════════════════════════════════════
      
      // Si SIGUE siendo 401, retornar error detallado
      if (response.status === 401) {
        console.error('❌ Ambos intentos fallaron con 401');
        console.error(`🔍 PROXY-PDF: Credenciales usadas: ${credentials ? 'SÍ' : 'NO'}`);
        
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: credentials 
            ? 'El servidor rechazó las credenciales proporcionadas'
            : 'El servidor requiere autenticación pero no hay credenciales configuradas',
          hint: 'Verifica que la URL sea correcta y accesible públicamente',
          helpUrl: remoteUrl.href
        });
      }
      
      // Verificar otros errores HTTP
      if (!response.ok) {
        console.error(`❌ PROXY-PDF: Error HTTP ${response.status}: ${response.statusText}`);
        
        // Intentar leer el cuerpo de la respuesta para más detalles
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error(`❌ PROXY-PDF: Respuesta del servidor: ${errorBody.substring(0, 200)}`);
        } catch (e) {
          // Ignorar si no se puede leer el body
        }
        
        return res.status(response.status).json({
          success: false,
          error: `HTTP ${response.status}`,
          message: response.statusText,
          details: errorBody ? errorBody.substring(0, 200) : undefined
        });
      }
      
      // ✅ Si todo está bien, continuar con el streaming
      console.log('✅ PDF obtenido exitosamente');
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ PROXY-PDF: Timeout después de 30 segundos');
        return res.status(504).json({ 
          success: false, 
          error: 'Request timeout',
          message: 'El servidor remoto no respondió a tiempo'
        });
      }
      
      console.error('❌ PROXY-PDF: Error en fetch:', fetchError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Connection error',
        message: 'Error al conectar con el servidor remoto',
        details: process.env.NODE_ENV === 'development' ? fetchError.message : undefined
      });
    }

    // Verificar que el Content-Type sea PDF (o vacío)
    const contentType = response.headers.get('content-type');
    console.log(`📋 PROXY-PDF: Content-Type recibido: ${contentType}`);
    
    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permitir acceso desde cualquier origen
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 hora

    // Si la respuesta es parcial (206), mantener el status
    if (response.status === 206) {
      res.status(206);
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
        console.log(`📊 PROXY-PDF: Content-Range: ${contentRange}`);
      }
    }

    // Reenviar Content-Length si está disponible
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
      console.log(`📊 PROXY-PDF: Content-Length: ${contentLength} bytes`);
    }

    // Stream del PDF al cliente
    // En Node.js 18+, response.body es un ReadableStream web
    if (response.body) {
      // Convertir Web Stream a Node Stream
      const reader = response.body.getReader();
      
      // Función para leer y enviar chunks
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              console.log(`✅ PROXY-PDF: Streaming completado para ${remoteUrl.pathname}`);
              break;
            }
            if (!res.write(value)) {
              // Si el buffer está lleno, esperar el evento 'drain'
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        } catch (streamError) {
          console.error('❌ PROXY-PDF: Error en streaming:', streamError);
          if (!res.headersSent) {
            res.status(500).end();
          }
        }
      };

      await pump();
    } else {
      // Fallback: leer todo el buffer y enviarlo
      console.log('⚠️ PROXY-PDF: Sin stream, usando arrayBuffer');
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
      console.log(`✅ PROXY-PDF: Enviado ${buffer.byteLength} bytes para ${remoteUrl.pathname}`);
    }

  } catch (err) {
    console.error('💥 PROXY-PDF: Error inesperado:', err);
    
    // No enviar respuesta si ya se enviaron headers
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Proxy error', 
        details: process.env.NODE_ENV === 'development' ? err.message : undefined 
      });
    }
  }
});

export default router;
