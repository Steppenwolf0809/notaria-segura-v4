import { logRequest } from '../utils/logger.js';

/**
 * Middleware para logging de requests HTTP
 * Registra método, URL, status code, duración, IP y usuario
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Guardar el método original res.json para interceptarlo
  const originalJson = res.json;
  const originalSend = res.send;

  // Interceptar la respuesta para calcular duración
  const logResponse = () => {
    const duration = Date.now() - startTime;
    logRequest(req, res, duration);
  };

  // Override res.json
  res.json = function(body) {
    logResponse();
    return originalJson.call(this, body);
  };

  // Override res.send
  res.send = function(body) {
    logResponse();
    return originalSend.call(this, body);
  };

  // También loggear si la respuesta termina sin json/send
  res.on('finish', () => {
    if (!res.headersSent) {
      return;
    }
    // Solo loggear si no se ha loggeado ya
    const duration = Date.now() - startTime;
    if (duration > 0) {
      logResponse();
    }
  });

  next();
}

/**
 * Middleware para logging de requests lentas
 * Configurable con SLOW_REQUEST_MS (default: 1000ms en desarrollo, 500ms en producción)
 */
export function slowRequestLogger(req, res, next) {
  const startTime = Date.now();
  const slowThreshold = process.env.SLOW_REQUEST_MS
    ? parseInt(process.env.SLOW_REQUEST_MS)
    : (process.env.NODE_ENV === 'production' ? 500 : 1000);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > slowThreshold) {
      const { log } = await import('../utils/logger.js');
      log.warn(`Slow request detected`, {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        threshold: `${slowThreshold}ms`,
        statusCode: res.statusCode,
        userId: req.user?.id || null
      });
    }
  });

  next();
}
