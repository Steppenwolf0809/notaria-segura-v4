/**
 * Logger Profesional - Solo loguea en desarrollo
 *
 * Reemplaza todos los console.log/warn/error con un logger que:
 * - En producción: Solo errores críticos
 * - En desarrollo: Todos los logs con colores
 * - Sin degradación de performance en producción
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Colores para terminal (solo desarrollo)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Formatea timestamp para logs
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Logger que respeta el entorno
 */
const logger = {
  /**
   * Debug - Solo en desarrollo
   */
  debug: (...args) => {
    if (!isProduction && !isTest) {
      console.log(`${colors.gray}[${getTimestamp()}] [DEBUG]${colors.reset}`, ...args);
    }
  },

  /**
   * Info - Solo en desarrollo
   */
  info: (...args) => {
    if (!isProduction && !isTest) {
      console.log(`${colors.cyan}[${getTimestamp()}] [INFO]${colors.reset}`, ...args);
    }
  },

  /**
   * Success - Solo en desarrollo
   */
  success: (...args) => {
    if (!isProduction && !isTest) {
      console.log(`${colors.green}[${getTimestamp()}] [SUCCESS]${colors.reset}`, ...args);
    }
  },

  /**
   * Warn - En todos los entornos pero sin detalles en producción
   */
  warn: (...args) => {
    if (isProduction) {
      // En producción solo el mensaje, sin detalles
      console.warn(`[${getTimestamp()}] [WARN]`, args[0]);
    } else if (!isTest) {
      console.warn(`${colors.yellow}[${getTimestamp()}] [WARN]${colors.reset}`, ...args);
    }
  },

  /**
   * Error - En todos los entornos
   */
  error: (...args) => {
    if (isProduction) {
      // En producción solo mensaje y stack trace si es Error
      const [first, ...rest] = args;
      console.error(`[${getTimestamp()}] [ERROR]`, first);
      if (first instanceof Error) {
        console.error('Stack:', first.stack);
      }
    } else if (!isTest) {
      console.error(`${colors.red}[${getTimestamp()}] [ERROR]${colors.reset}`, ...args);
    }
  },

  /**
   * HTTP Request - Solo en desarrollo
   */
  http: (method, path, status, duration) => {
    if (!isProduction && !isTest) {
      const statusColor = status >= 500 ? colors.red :
                         status >= 400 ? colors.yellow :
                         status >= 300 ? colors.cyan :
                         colors.green;
      console.log(
        `${colors.blue}[${getTimestamp()}] [HTTP]${colors.reset}`,
        `${method} ${path}`,
        `${statusColor}${status}${colors.reset}`,
        `${duration}ms`
      );
    }
  },

  /**
   * Security - Siempre loguea (importante para auditoría)
   */
  security: (...args) => {
    if (isProduction) {
      console.log(`[${getTimestamp()}] [SECURITY]`, args[0]);
    } else if (!isTest) {
      console.log(`${colors.magenta}[${getTimestamp()}] [SECURITY]${colors.reset}`, ...args);
    }
  }
};

/**
 * Exportar logger por defecto y métodos individuales
 */
export default logger;
export const { debug, info, success, warn, error, http, security } = logger;
