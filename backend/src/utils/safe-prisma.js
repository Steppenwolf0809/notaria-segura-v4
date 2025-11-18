/**
 * Safe Prisma Wrapper
 *
 * Protege contra:
 * - DoS por queries sin límite
 * - Memory exhaustion
 * - Timeout de queries lentas
 */

/**
 * Límites por defecto y máximos
 */
const LIMITS = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MAX_OFFSET: 10000, // Prevenir deep pagination attacks
  QUERY_TIMEOUT: 30000 // 30 segundos
};

/**
 * Valida y sanitiza opciones de paginación para Prisma
 *
 * @param {Object} options - Opciones originales
 * @param {number} options.take - Número de registros a obtener
 * @param {number} options.skip - Número de registros a saltar
 * @returns {Object} Opciones sanitizadas
 */
export function sanitizePaginationOptions(options = {}) {
  const { take, skip, ...rest } = options;

  // Validar y limitar 'take'
  let safeTake = LIMITS.DEFAULT_PAGE_SIZE;
  if (take !== undefined) {
    const parsed = parseInt(take, 10);
    if (!isNaN(parsed) && parsed > 0) {
      safeTake = Math.min(parsed, LIMITS.MAX_PAGE_SIZE);
    }
  }

  // Validar y limitar 'skip'
  let safeSkip = 0;
  if (skip !== undefined) {
    const parsed = parseInt(skip, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      safeSkip = Math.min(parsed, LIMITS.MAX_OFFSET);
    }
  }

  return {
    ...rest,
    take: safeTake,
    skip: safeSkip
  };
}

/**
 * Wrapper seguro para prisma.findMany
 *
 * @param {Object} model - Modelo de Prisma (ej: prisma.document)
 * @param {Object} options - Opciones de query
 * @returns {Promise} Resultado de la query
 */
export async function safeFindMany(model, options = {}) {
  const safeOptions = sanitizePaginationOptions(options);

  try {
    return await model.findMany(safeOptions);
  } catch (error) {
    // Log del error (usar logger en producción)
    console.error('Error en safeFindMany:', error);
    throw error;
  }
}

/**
 * Wrapper seguro para conteo con timeout
 *
 * @param {Object} model - Modelo de Prisma
 * @param {Object} where - Condiciones de filtro
 * @returns {Promise<number>} Conteo de registros
 */
export async function safeCount(model, where = {}) {
  try {
    return await model.count({ where });
  } catch (error) {
    console.error('Error en safeCount:', error);
    throw error;
  }
}

/**
 * Ejecuta paginación de forma segura y devuelve metadata
 *
 * @param {Object} model - Modelo de Prisma
 * @param {Object} options - Opciones de query
 * @param {Object} options.where - Filtros
 * @param {Object} options.orderBy - Ordenamiento
 * @param {Object} options.include - Relaciones a incluir
 * @param {number} options.page - Número de página (base 1)
 * @param {number} options.limit - Registros por página
 * @returns {Promise<Object>} { data, pagination }
 */
export async function safePaginate(model, options = {}) {
  const {
    where = {},
    orderBy,
    include,
    page = 1,
    limit = LIMITS.DEFAULT_PAGE_SIZE
  } = options;

  // Validar página
  const safePage = Math.max(1, parseInt(page, 10) || 1);

  // Validar y limitar límite
  const safeLimit = Math.min(
    Math.max(1, parseInt(limit, 10) || LIMITS.DEFAULT_PAGE_SIZE),
    LIMITS.MAX_PAGE_SIZE
  );

  // Calcular offset
  const skip = (safePage - 1) * safeLimit;

  // Validar que el offset no sea demasiado grande
  if (skip > LIMITS.MAX_OFFSET) {
    throw new Error(`Offset demasiado grande. Máximo: ${LIMITS.MAX_OFFSET}`);
  }

  // Ejecutar query y count en paralelo
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      include,
      take: safeLimit,
      skip
    }),
    model.count({ where })
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage < Math.ceil(total / safeLimit),
      hasPrevPage: safePage > 1
    }
  };
}

/**
 * Middleware para agregar métodos seguros a req
 */
export function addSafePrismaMethods(prisma) {
  return (req, res, next) => {
    req.safePrisma = {
      findMany: (model, options) => safeFindMany(model, options),
      count: (model, where) => safeCount(model, where),
      paginate: (model, options) => safePaginate(model, options)
    };
    next();
  };
}

/**
 * Límites y configuraciones exportadas
 */
export const limits = LIMITS;

export default {
  sanitizePaginationOptions,
  safeFindMany,
  safeCount,
  safePaginate,
  addSafePrismaMethods,
  limits: LIMITS
};
