import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Formato para consola (más legible en desarrollo)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Agregar metadata si existe
    if (Object.keys(metadata).length > 0) {
      const metadataStr = JSON.stringify(metadata, null, 2);
      msg += `\n${metadataStr}`;
    }

    return msg;
  })
);

// Directorio de logs
const logsDir = path.join(__dirname, '../../logs');

// Transports de Winston
const transports = [];

// Console transport (siempre activo)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: logLevel
  })
);

// File transports (solo en producción o si se especifica LOG_TO_FILE)
if (!isDevelopment || process.env.LOG_TO_FILE === 'true') {
  // Error logs - rotación diaria, mantener 14 días
  transports.push(
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: customFormat,
      zippedArchive: true
    })
  );

  // Combined logs - rotación diaria, mantener 7 días
  transports.push(
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: customFormat,
      zippedArchive: true
    })
  );

  // Security logs - rotación diaria, mantener 30 días (importante para auditoría)
  transports.push(
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
      zippedArchive: true
    })
  );
}

// Crear logger principal
const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports,
  // No salir en errores no manejados
  exitOnError: false
});

// Logger de seguridad dedicado
const securityLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: 'info'
    }),
    ...((!isDevelopment || process.env.LOG_TO_FILE === 'true') ? [
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'security-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: customFormat,
        zippedArchive: true
      })
    ] : [])
  ],
  exitOnError: false
});

// Logger de auditoría dedicado
const auditLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: 'info'
    }),
    ...((!isDevelopment || process.env.LOG_TO_FILE === 'true') ? [
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d', // 3 meses de auditoría
        format: customFormat,
        zippedArchive: true
      })
    ] : [])
  ],
  exitOnError: false
});

// Helpers para logging estructurado
export const log = {
  debug: (message, metadata = {}) => logger.debug(message, metadata),
  info: (message, metadata = {}) => logger.info(message, metadata),
  warn: (message, metadata = {}) => logger.warn(message, metadata),
  error: (message, error = null, metadata = {}) => {
    if (error && error.stack) {
      logger.error(message, { ...metadata, error: error.message, stack: error.stack });
    } else {
      logger.error(message, metadata);
    }
  }
};

// Helper para logs de seguridad
export const logSecurity = (event, metadata = {}) => {
  securityLogger.warn(event, {
    type: 'security',
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

// Helper para logs de auditoría
export const logAudit = (event, metadata = {}) => {
  auditLogger.info(event, {
    type: 'audit',
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

// Helper para requests HTTP
export const logRequest = (req, res, duration) => {
  const metadata = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown',
    userId: req.user?.id || null,
    userEmail: req.user?.email || null
  };

  if (res.statusCode >= 500) {
    logger.error(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, metadata);
  } else if (res.statusCode >= 400) {
    logger.warn(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, metadata);
  } else {
    logger.info(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, metadata);
  }
};

// Stream para Morgan (opcional)
export const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Información de inicio
logger.info('Logger initialized', {
  environment: process.env.NODE_ENV,
  logLevel,
  logsToFile: !isDevelopment || process.env.LOG_TO_FILE === 'true',
  logsDirectory: logsDir
});

export default logger;
