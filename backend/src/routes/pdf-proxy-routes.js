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

    // Preparar headers para el request remoto
    const headers = {};
    
    // Reenviar Range header si viene (importante para streaming de PDFs grandes)
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
      console.log(`📊 PROXY-PDF: Range request: ${req.headers.range}`);
    }

    // Hacer request al servidor remoto usando fetch global de Node.js
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    let response;
    try {
      response = await fetch(remoteUrl.href, { 
        method: 'GET', 
        headers,
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ PROXY-PDF: Timeout después de 30 segundos');
        return res.status(504).json({ 
          success: false, 
          error: 'Request timeout - El servidor remoto no respondió a tiempo' 
        });
      }
      
      console.error('❌ PROXY-PDF: Error en fetch:', fetchError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al conectar con el servidor remoto',
        details: process.env.NODE_ENV === 'development' ? fetchError.message : undefined
      });
    }

    clearTimeout(timeoutId);

    // Verificar respuesta exitosa
    if (!response.ok) {
      console.error(`❌ PROXY-PDF: Error del servidor remoto: ${response.status} ${response.statusText}`);
      
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
        error: `Remote server error: ${response.status} ${response.statusText}` 
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
