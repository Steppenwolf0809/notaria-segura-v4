/**
 * Middleware de Validación de Entrada
 *
 * Protege contra:
 * - Inyección SQL/NoSQL
 * - XSS
 * - Type coercion attacks
 * - DoS por payloads enormes
 */

import { z } from 'zod';

/**
 * Valida que un string sea un UUID v4 válido
 */
export const uuidSchema = z.string().uuid('ID debe ser un UUID válido');

/**
 * Valida que un string sea un número entero positivo
 */
export const positiveIntSchema = z.coerce
  .number()
  .int('Debe ser un número entero')
  .positive('Debe ser mayor a 0');

/**
 * Valida que un string sea un número entero no negativo
 */
export const nonNegativeIntSchema = z.coerce
  .number()
  .int('Debe ser un número entero')
  .nonnegative('No puede ser negativo');

/**
 * Esquema de paginación con límites seguros
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Límite máximo: 100').default(10),
  offset: z.coerce.number().int().nonnegative().optional()
});

/**
 * Esquema para búsqueda de texto
 */
export const searchSchema = z.object({
  query: z.string().max(200, 'Búsqueda demasiado larga').trim().optional(),
  search: z.string().max(200, 'Búsqueda demasiado larga').trim().optional()
});

/**
 * Esquema para filtros de fecha
 */
export const dateFilterSchema = z.object({
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).refine(
  (data) => {
    const desde = data.fechaDesde || data.startDate;
    const hasta = data.fechaHasta || data.endDate;
    if (desde && hasta) {
      return desde <= hasta;
    }
    return true;
  },
  { message: 'Fecha desde debe ser anterior a fecha hasta' }
);

/**
 * ============================================================================
 * BILLING MODULE SCHEMAS - OWASP Security Enhancement
 * ============================================================================
 */

/**
 * Esquema para invoice ID (UUID)
 */
export const invoiceIdSchema = z.object({
  id: uuidSchema
});

/**
 * Esquema para búsqueda de facturas con paginación
 */
export const invoiceQuerySchema = paginationSchema.merge(z.object({
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  clientTaxId: z.string().max(13).regex(/^[0-9]+$/, 'Cédula/RUC debe contener solo números').optional(),
  search: z.string().max(200).trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

/**
 * Esquema para búsqueda de pagos
 */
export const paymentQuerySchema = paginationSchema.merge(z.object({
  invoiceId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

/**
 * Esquema para búsqueda de clientes
 */
export const clientQuerySchema = paginationSchema.merge(z.object({
  search: z.string().max(200).trim().optional(),
  hasDebt: z.enum(['true', 'false']).optional()
}));

/**
 * Esquema para taxId de cliente (cédula/RUC ecuatoriano)
 */
export const taxIdSchema = z.object({
  taxId: z.string()
    .min(10, 'Cédula/RUC debe tener mínimo 10 dígitos')
    .max(13, 'Cédula/RUC debe tener máximo 13 dígitos')
    .regex(/^[0-9]+$/, 'Cédula/RUC debe contener solo números')
});

/**
 * Esquema para documentId (UUID)
 */
export const documentIdParamSchema = z.object({
  documentId: uuidSchema
});

/**
 * Esquema para portfolio query
 */
export const portfolioQuerySchema = paginationSchema.merge(z.object({
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  groupByClient: z.enum(['true', 'false']).default('true')
}));

/**
 * Esquema para clientTaxId en collection reminder
 */
export const clientTaxIdParamSchema = z.object({
  clientTaxId: z.string()
    .min(10, 'Cédula/RUC debe tener mínimo 10 dígitos')
    .max(13, 'Cédula/RUC debe tener máximo 13 dígitos')
    .regex(/^[0-9]+$/, 'Cédula/RUC debe contener solo números')
});

/**
 * Esquema para reportes de billing con filtros de fecha
 */
export const billingReportQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return data.dateFrom <= data.dateTo;
    }
    return true;
  },
  { message: 'Fecha desde debe ser anterior a fecha hasta' }
);

/**
 * Middleware factory para validar parámetros de ruta
 */
export function validateParams(schema) {
  return async (req, res, next) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError && Array.isArray(error.errors)) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros inválidos',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      // Handle non-Zod errors or malformed Zod errors
      console.error('Error en validateParams:', error);
      next(error);
    }
  };
}

/**
 * Middleware factory para validar query parameters
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError && Array.isArray(error.errors)) {
        return res.status(400).json({
          success: false,
          message: 'Query parameters inválidos',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      // Handle non-Zod errors or malformed Zod errors
      console.error('Error en validateQuery:', error);
      next(error);
    }
  };
}

/**
 * Middleware factory para validar body
 */
export function validateBody(schema) {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError && Array.isArray(error.errors)) {
        return res.status(400).json({
          success: false,
          message: 'Datos del body inválidos',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      // Handle non-Zod errors or malformed Zod errors
      console.error('Error en validateBody:', error);
      next(error);
    }
  };
}

/**
 * Esquema combinado común para endpoints con paginación
 */
export const paginatedQuerySchema = paginationSchema.merge(searchSchema);

/**
 * Sanitiza strings para prevenir XSS
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers (onclick=, etc.)
    .trim();
}

/**
 * Esquema de validación para document ID (UUID)
 */
export const documentIdSchema = z.object({
  id: uuidSchema
});

/**
 * Esquema de validación para user ID (número)
 */
export const userIdSchema = z.object({
  id: positiveIntSchema
});

/**
 * Esquema de validación para matrizador ID
 */
export const matrizadorIdSchema = z.object({
  matrizadorId: positiveIntSchema
});

/**
 * Esquema para estado de documento
 */
export const documentStatusSchema = z.enum([
  'PENDIENTE',
  'EN_PROCESO',
  'LISTO',
  'ENTREGADO',
  'ANULADO'
]);

/**
 * Middleware de sanitización general
 */
export function sanitizeInput(req, res, next) {
  // Sanitizar query params
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }

  // Sanitizar body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

/**
 * Sanitiza objetos recursivamente
 */
function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

/**
 * Validación de límite seguro con máximo hardcodeado
 */
export function validateLimit(limit, maxLimit = 100) {
  const parsed = parseInt(limit, 10);

  if (isNaN(parsed) || parsed < 1) {
    return 10; // Default
  }

  return Math.min(parsed, maxLimit);
}

/**
 * Validación de página segura
 */
export function validatePage(page) {
  const parsed = parseInt(page, 10);

  if (isNaN(parsed) || parsed < 1) {
    return 1; // Default
  }

  return Math.max(1, parsed);
}

/**
 * Calcula offset de forma segura
 */
export function calculateOffset(page, limit) {
  const safePage = validatePage(page);
  const safeLimit = validateLimit(limit);

  return (safePage - 1) * safeLimit;
}

export default {
  validateParams,
  validateQuery,
  validateBody,
  sanitizeInput,
  uuidSchema,
  positiveIntSchema,
  paginationSchema,
  searchSchema,
  documentIdSchema,
  userIdSchema,
  matrizadorIdSchema,
  documentStatusSchema,
  validateLimit,
  validatePage,
  calculateOffset
};
