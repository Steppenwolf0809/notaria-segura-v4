/**
 * RUTA PROXY PARA PDFs
 * 
 * Permite cargar PDFs desde el servidor FTP remoto (www.notaria18quito.com.ec)
 * sin problemas de CORS. El backend actúa como intermediario seguro.
 * 
 * Uso: /api/proxy-pdf?url=https://www.notaria18quito.com.ec/fotos-escrituras/archivo.pdf
 */

import express from 'express';
import fetch from 'node-fetch';
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
 */
router.get('/proxy-pdf', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    
    // Validación 1: URL debe existir
    if (!rawUrl) {
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
    }

    // Hacer request al servidor remoto
    const response = await fetch(remoteUrl.href, { 
      method: 'GET', 
      headers,
      timeout: 30000 // 30 segundos timeout
    });

    // Verificar respuesta exitosa
    if (!response.ok) {
      console.error(`❌ PROXY-PDF: Error del servidor remoto: ${response.status}`);
      return res.status(response.status).json({ 
        success: false, 
        error: `Remote server error: ${response.status}` 
      });
    }

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
      }
    }

    // Reenviar Content-Length si está disponible
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream del PDF al cliente
    // Convertir a buffer si el body no es un stream
    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);
    } else {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }

    console.log(`✅ PROXY-PDF: Enviado exitosamente ${remoteUrl.pathname}`);

  } catch (err) {
    console.error('💥 PROXY-PDF: Error:', err);
    
    // Manejar timeout específicamente
    if (err.type === 'request-timeout') {
      return res.status(504).json({ 
        success: false, 
        error: 'Request timeout - El servidor remoto no respondió a tiempo' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Proxy error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

export default router;

