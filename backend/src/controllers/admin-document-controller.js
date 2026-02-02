import prisma from '../db.js';
import cache from '../services/cache-service.js';
import { Prisma } from '@prisma/client';
import {
  logAdminAction,
  logUserListAccess,
  extractRequestInfo
} from '../utils/audit-logger.js';

/**
 * Obtener todos los documentos con filtros avanzados para supervisión
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAllDocumentsOversight(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      matrizador,
      overdueOnly,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(5, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Construir filtros WHERE
    const where = {};

    const searchTerm = (search || '').trim();

    // Filtro por fecha (rango)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate); // Inicio del día
      }
      if (endDate) {
        // Fin del día para incluir todo el día seleccionado
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Filtro por estado
    if (status) {
      where.status = status;
    }

    // Filtro por tipo
    if (type) {
      where.documentType = type;
    }

    // Filtro por matrizador
    if (matrizador) {
      if (matrizador === 'unassigned') {
        where.assignedToId = null;
      } else {
        where.assignedToId = parseInt(matrizador);
      }
    }

    // Configurar ordenamiento
    const orderBy = {};
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Ejecutar consultas con caché para mejorar tiempos de respuesta
    let documents;
    let totalCount;
    const cacheKey = cache.key({
      scope: 'admin:oversight', page: pageNum, limit: limitNum,
      search: searchTerm, status, type, matrizador, overdueOnly,
      sortBy, sortOrder
    });
    const cached = await cache.get(cacheKey);
    if (cached) {
      ({ documents, totalCount } = cached);
    } else {
      if (searchTerm) {
        const supportsUnaccent = await supportsUnaccentFn();
        if (supportsUnaccent) {
          const pattern = `%${searchTerm}%`;
          const filterClauses = [];
          if (where.status) filterClauses.push(Prisma.sql`d."status"::text = ${where.status}`);
          if (where.documentType) filterClauses.push(Prisma.sql`d."documentType"::text = ${where.documentType}`);
          if (where.assignedToId === null) {
            filterClauses.push(Prisma.sql`d."assignedToId" IS NULL`);
          } else if (typeof where.assignedToId === 'number') {
            filterClauses.push(Prisma.sql`d."assignedToId" = ${where.assignedToId}`);
          }

          const whereSql = Prisma.sql`${Prisma.join([
            Prisma.sql`(
              unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
              unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
              unaccent(d."actoPrincipalDescripcion") ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."numeroFactura", '')) ILIKE unaccent(${pattern}) OR
              d."clientPhone" ILIKE ${pattern} OR
              d."clientEmail" ILIKE ${pattern} OR
              unaccent(COALESCE(d."clientId", '')) ILIKE unaccent(${pattern})
            )`,
            ...filterClauses
          ], Prisma.sql` AND `)}`;

          const fieldSql = (sortBy === 'updatedAt')
            ? Prisma.sql`d."updatedAt"`
            : Prisma.sql`d."createdAt"`;
          // Use string for direction since ASC/DESC are safe SQL keywords
          const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';

          documents = await prisma.$queryRaw`
            SELECT d.*,
                   au.id   AS "_assignedToId", au."firstName" AS "_assignedToFirstName", au."lastName" AS "_assignedToLastName", au.email AS "_assignedToEmail",
                   cu.id   AS "_createdById",  cu."firstName"  AS "_createdByFirstName",  cu."lastName"  AS "_createdByLastName",  cu.email AS "_createdByEmail"
            FROM "documents" d
            LEFT JOIN "users" au ON au.id = d."assignedToId"
            LEFT JOIN "users" cu ON cu.id = d."createdById"
            WHERE ${whereSql}
            ORDER BY ${fieldSql} ${Prisma.raw(direction)}
            OFFSET ${offset} LIMIT ${limitNum}
          `;
          const countRows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${whereSql}`;
          totalCount = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

          // 💰 Obtener facturas para calcular estado de pago
          const docIds = documents.map(d => d.id);
          const invoicesMap = new Map();
          if (docIds.length > 0) {
            const invoices = await prisma.invoice.findMany({
              where: { documentId: { in: docIds } },
              select: { documentId: true, totalAmount: true, paidAmount: true, status: true }
            });
            invoices.forEach(inv => {
              if (!invoicesMap.has(inv.documentId)) {
                invoicesMap.set(inv.documentId, []);
              }
              invoicesMap.get(inv.documentId).push(inv);
            });
          }

          // Adaptar include manual + estado de pago
          documents = documents.map(d => {
            const docInvoices = invoicesMap.get(d.id) || [];
            let paymentStatus = 'SIN_FACTURA';
            let paymentInfo = null;
            
            if (docInvoices.length > 0) {
              const totalFacturado = docInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
              const totalPagado = docInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
              const saldoPendiente = totalFacturado - totalPagado;
              
              if (saldoPendiente <= 0) paymentStatus = 'PAGADO';
              else if (totalPagado > 0) paymentStatus = 'PARCIAL';
              else paymentStatus = 'PENDIENTE';
              
              paymentInfo = { totalFacturado, totalPagado, saldoPendiente, facturas: docInvoices.length };
            }
            
            return {
              ...d,
              assignedTo: d._assignedToId ? {
                id: d._assignedToId,
                firstName: d._assignedToFirstName,
                lastName: d._assignedToLastName,
                email: d._assignedToEmail
              } : null,
              createdBy: d._createdById ? {
                id: d._createdById,
                firstName: d._createdByFirstName,
                lastName: d._createdByLastName,
                email: d._createdByEmail
              } : null,
              paymentStatus,
              paymentInfo
            };
          });
        } else {
          // Fallback Prisma estándar
          where.OR = [
            { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
            { clientName: { contains: searchTerm, mode: 'insensitive' } },
            { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } },
            { detalle_documento: { contains: searchTerm, mode: 'insensitive' } },
            { numeroFactura: { contains: searchTerm, mode: 'insensitive' } },
            { clientPhone: { contains: searchTerm } },
            { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
            { clientId: { contains: searchTerm, mode: 'insensitive' } }
          ];
          [documents, totalCount] = await Promise.all([
            prisma.document.findMany({
              where,
              skip: offset,
              take: limitNum,
              orderBy,
              include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
                invoices: { select: { totalAmount: true, paidAmount: true, status: true } }
              }
            }),
            prisma.document.count({ where })
          ]);
        }
      } else {
        // Sin búsqueda
        [documents, totalCount] = await Promise.all([
          prisma.document.findMany({
            where,
            skip: offset,
            take: limitNum,
            orderBy,
            include: {
              assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
              createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
              invoices: { select: { totalAmount: true, paidAmount: true, status: true } }
            }
          }),
          prisma.document.count({ where })
        ]);
      }
      
      // 💰 Calcular estado de pago para documentos obtenidos via Prisma
      documents = documents.map(doc => {
        let paymentStatus = 'SIN_FACTURA';
        let paymentInfo = null;
        
        if (doc.invoices && doc.invoices.length > 0) {
          const totalFacturado = doc.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
          const totalPagado = doc.invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
          const saldoPendiente = totalFacturado - totalPagado;
          
          if (saldoPendiente <= 0) paymentStatus = 'PAGADO';
          else if (totalPagado > 0) paymentStatus = 'PARCIAL';
          else paymentStatus = 'PENDIENTE';
          
          paymentInfo = { totalFacturado, totalPagado, saldoPendiente, facturas: doc.invoices.length };
        }
        
        const { invoices, ...docWithoutInvoices } = doc;
        return { ...docWithoutInvoices, paymentStatus, paymentInfo };
      });
      
      // Guardar en caché
      await cache.set(cacheKey, { documents, totalCount }, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:admin:oversight'] });
    }

    // Calcular estadísticas básicas
    const stats = await getBasicDocumentStats();

    // Log de auditoría
    await logUserListAccess({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      ipAddress: extractRequestInfo(req).ipAddress,
      userAgent: extractRequestInfo(req).userAgent,
      filters: { search, status, type, matrizador, overdueOnly }
    });

    res.json({
      success: true,
      message: 'Documentos cargados exitosamente',
      data: {
        documents,
        stats,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          hasNext: pageNum < Math.ceil(totalCount / limitNum),
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Error en getAllDocumentsOversight:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Cache simple para soporte de unaccent
let UNACCENT_SUPPORTED = null;
async function supportsUnaccentFn() {
  if (UNACCENT_SUPPORTED !== null) return UNACCENT_SUPPORTED;
  try {
    await prisma.$queryRaw`SELECT unaccent('áéíóúÁÉÍÓÚ')`;
    UNACCENT_SUPPORTED = true;
  } catch (e) {
    console.warn('Extensión unaccent no disponible en ADMIN Oversight.');
    UNACCENT_SUPPORTED = false;
  }
  return UNACCENT_SUPPORTED;
}

/**
 * Obtener timeline de eventos de un documento específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentEvents(req, res) {
  try {
    const { id } = req.params;

    // Verificar que el documento existe
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Obtener eventos del documento (usando tabla de eventos si existe)
    const events = await prisma.documentEvent.findMany({
      where: { documentId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => {
      // Si no existe la tabla DocumentEvent, crear eventos básicos
      return [
        {
          id: '1',
          eventType: 'DOCUMENT_CREATED',
          description: 'Documento creado',
          createdAt: document.createdAt,
          user: document.createdBy || null,
          details: {}
        }
      ];
    });

    res.json({
      success: true,
      message: 'Timeline cargado exitosamente',
      data: {
        events,
        document: {
          id: document.id,
          protocolNumber: document.protocolNumber,
          clientName: document.clientName,
          status: document.status,
          documentType: document.documentType
        }
      }
    });

  } catch (error) {
    console.error('Error en getDocumentEvents:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener información de múltiples documentos para operaciones en lote
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getBulkDocumentsInfo(req, res) {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de documentos'
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds }
      },
      select: {
        id: true,
        protocolNumber: true,
        clientName: true,
        status: true,
        documentType: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Información de documentos cargada',
      data: { documents }
    });

  } catch (error) {
    console.error('Error en getBulkDocumentsInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Ejecutar operación en lote sobre múltiples documentos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function executeBulkDocumentOperation(req, res) {
  try {
    const { documentIds, operation, newMatrizadorId, newStatus } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de documentos'
      });
    }

    const results = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    for (const documentId of documentIds) {
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentId }
        });

        if (!document) {
          results.errors.push({
            documentId,
            message: 'Documento no encontrado'
          });
          results.errorCount++;
          continue;
        }

        let updateData = {};

        switch (operation) {
          case 'reassign':
            if (newMatrizadorId && newMatrizadorId !== 'null') {
              const newMatrizador = await prisma.user.findFirst({
                where: {
                  id: parseInt(newMatrizadorId),
                  role: 'MATRIZADOR',
                  isActive: true
                }
              });

              if (!newMatrizador) {
                results.errors.push({
                  documentId,
                  message: 'Matrizador no encontrado o inactivo'
                });
                results.errorCount++;
                continue;
              }

              updateData.assignedToId = parseInt(newMatrizadorId);
            } else {
              updateData.assignedToId = null;
            }
            break;

          case 'changeStatus':
            if (!newStatus) {
              results.errors.push({
                documentId,
                message: 'Nuevo estado requerido'
              });
              results.errorCount++;
              continue;
            }

            updateData.status = newStatus;
            updateData.updatedAt = new Date();
            break;

          default:
            results.errors.push({
              documentId,
              message: 'Operación no válida'
            });
            results.errorCount++;
            continue;
        }

        // Actualizar documento
        await prisma.document.update({
          where: { id: documentId },
          data: updateData
        });

        // Crear evento de auditoría si la tabla existe
        try {
          await prisma.documentEvent.create({
            data: {
              documentId,
              userId: req.user.id,
              eventType: operation === 'reassign' ? 'DOCUMENT_ASSIGNED' : 'STATUS_CHANGED',
              description: `${operation} ejecutado por administrador`,
              details: JSON.stringify({
                operation,
                ...(newMatrizadorId && { newMatrizadorId }),
                ...(newStatus && { newStatus }),
                adminOverride: true
              }),
              ipAddress: extractRequestInfo(req).ipAddress,
              userAgent: extractRequestInfo(req).userAgent
            }
          });
        } catch (eventError) {
          // Tabla de eventos no existe, continuar sin error
          console.log('DocumentEvent table not found, skipping audit log');
        }

        results.successCount++;

      } catch (error) {
        console.error(`Error procesando documento ${documentId}:`, error);
        results.errors.push({
          documentId,
          message: error.message || 'Error interno'
        });
        results.errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Operación completada: ${results.successCount} documentos procesados`,
      data: { results }
    });

  } catch (error) {
    console.error('Error en executeBulkDocumentOperation:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Exportar documentos en formato CSV
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function exportDocuments(req, res) {
  try {
    const { format = 'csv' } = req.query;
    const { search, status, type, matrizador } = req.query;

    // Construir filtros
    const where = {};

    const searchTerm = (search || '').trim();
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        // Más abajo ejecutamos consulta con $queryRaw y luego formateamos igual
        // Para mantener consistencia, construiremos los datos desde query bruta
      } else {
        where.OR = [
          { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
          { clientName: { contains: searchTerm, mode: 'insensitive' } },
          { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } },
          { detalle_documento: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }

    if (status) where.status = status;
    if (type) where.documentType = type;
    if (matrizador) {
      if (matrizador === 'unassigned') {
        where.assignedToId = null;
      } else {
        where.assignedToId = parseInt(matrizador);
      }
    }

    let documents;
    if (searchTerm && (await supportsUnaccentFn())) {
      const pattern = `%${searchTerm}%`;
      const filterClauses = [];
      if (status) filterClauses.push(Prisma.sql`d."status"::text = ${status}`);
      if (type) filterClauses.push(Prisma.sql`d."documentType"::text = ${type}`);
      if (matrizador === 'unassigned') {
        filterClauses.push(Prisma.sql`d."assignedToId" IS NULL`);
      } else if (matrizador) {
        filterClauses.push(Prisma.sql`d."assignedToId" = ${parseInt(matrizador)}`);
      }
      const whereSql = Prisma.sql`${Prisma.join([
        Prisma.sql`(
          unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
          unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
          unaccent(d."actoPrincipalDescripcion") ILIKE unaccent(${pattern}) OR
          unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern})
        )`,
        ...filterClauses
      ], Prisma.sql` AND `)}`;
      documents = await prisma.$queryRaw`
        SELECT d.*, 
               au."firstName" AS "_assignedToFirstName", au."lastName" AS "_assignedToLastName",
               cu."firstName" AS "_createdByFirstName", cu."lastName" AS "_createdByLastName"
        FROM "documents" d
        LEFT JOIN "users" au ON au.id = d."assignedToId"
        LEFT JOIN "users" cu ON cu.id = d."createdById"
        WHERE ${whereSql}
        ORDER BY d."createdAt" DESC
      `;
    } else {
      documents = await prisma.document.findMany({
        where,
        include: {
          assignedTo: { select: { firstName: true, lastName: true } },
          createdBy: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Formatear datos para exportación
    const exportData = documents.map(doc => ({
      'Número Protocolo': doc.protocolNumber || '',
      'Cliente': doc.clientName || '',
      'Teléfono': doc.clientPhone || '',
      'Tipo Documento': doc.documentType || '',
      'Estado': doc.status || '',
      'Matrizador Asignado': doc.assignedTo
        ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}`
        : (doc._assignedToFirstName ? `${doc._assignedToFirstName} ${doc._assignedToLastName}` : 'Sin asignar'),
      'Creado Por': doc.createdBy
        ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}`
        : (doc._createdByFirstName ? `${doc._createdByFirstName} ${doc._createdByLastName}` : 'N/A'),
      'Fecha Creación': doc.createdAt ?
        new Date(doc.createdAt).toLocaleDateString('es-ES') : '',
      'Última Actualización': doc.updatedAt ?
        new Date(doc.updatedAt).toLocaleDateString('es-ES') : '',
      'Valor Acto Principal': doc.totalFactura || 0, // ⭐ CAMBIO: Usar valor total de factura
      'Total Factura': doc.totalFactura || 0,
      'Código Verificación': doc.verificationCode || '',
      'Total Factura': doc.totalFactura || 0,
      'Código Verificación': doc.verificationCode || ''
    }));

    const filename = `documentos_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      // Generar CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row =>
        Object.values(row).map(val => `"${val}"`).join(',')
      ).join('\n');

      const csvContent = [headers, rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else {
      // Retornar JSON para procesamiento en frontend
      res.json({
        success: true,
        message: 'Datos preparados para exportación',
        data: {
          documents: exportData,
          filename,
          format
        }
      });
    }

  } catch (error) {
    console.error('Error en exportDocuments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Función auxiliar para calcular estadísticas básicas
 */
async function getBasicDocumentStats() {
  try {
    const [total, pending, inProgress, ready, delivered] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { status: 'PENDIENTE' } }),
      prisma.document.count({ where: { status: 'EN_PROCESO' } }),
      prisma.document.count({ where: { status: 'LISTO' } }),
      prisma.document.count({ where: { status: 'ENTREGADO' } })
    ]);

    return {
      total,
      pending,
      inProgress,
      ready,
      delivered,
      overdue: 0, // Simplificado por ahora
      byStatus: {
        PENDIENTE: pending,
        EN_PROCESO: inProgress,
        LISTO: ready,
        ENTREGADO: delivered
      }
    };
  } catch (error) {
    console.error('Error calculando estadísticas:', error);
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      ready: 0,
      delivered: 0,
      overdue: 0,
      byStatus: {}
    };
  }
}

/**
 * Eliminar un documento específico (hard delete)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const requestInfo = extractRequestInfo(req);

    // Verificar que el documento existe
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Eliminar el documento (los eventos asociados se eliminarán en cascada)
    await prisma.document.delete({
      where: { id }
    });

    // Log de auditoría
    await logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      action: 'DELETE_DOCUMENT',
      targetType: 'document',
      targetId: id,
      details: JSON.stringify({
        protocolNumber: document.protocolNumber,
        clientName: document.clientName,
        documentType: document.documentType,
        status: document.status,
        adminOverride: true
      }),
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    // Invalidar caché
    await cache.invalidateByTag('documents');
    await cache.invalidateByTag('search:admin:oversight');

    res.json({
      success: true,
      message: `Documento ${document.protocolNumber} eliminado exitosamente`,
      data: {
        deletedDocument: {
          id: document.id,
          protocolNumber: document.protocolNumber,
          clientName: document.clientName
        }
      }
    });

  } catch (error) {
    console.error('Error en deleteDocument:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Eliminar múltiples documentos en lote (hard delete)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function bulkDeleteDocuments(req, res) {
  try {
    const { documentIds } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de documentos'
      });
    }

    const results = {
      successCount: 0,
      errorCount: 0,
      deletedDocuments: [],
      errors: []
    };

    // Obtener información de los documentos antes de eliminarlos
    const documentsToDelete = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: {
        id: true,
        protocolNumber: true,
        clientName: true,
        documentType: true,
        status: true
      }
    });

    // Eliminar documentos uno por uno para mantener un registro preciso
    for (const doc of documentsToDelete) {
      try {
        await prisma.document.delete({
          where: { id: doc.id }
        });

        results.deletedDocuments.push({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName
        });

        results.successCount++;

        // Log de auditoría para cada documento
        await logAdminAction({
          adminUserId: req.user.id,
          adminEmail: req.user.email,
          action: 'BULK_DELETE_DOCUMENT',
          targetType: 'document',
          targetId: doc.id,
          details: JSON.stringify({
            protocolNumber: doc.protocolNumber,
            clientName: doc.clientName,
            documentType: doc.documentType,
            status: doc.status,
            bulkOperation: true
          }),
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        });

      } catch (error) {
        console.error(`Error eliminando documento ${doc.id}:`, error);
        results.errors.push({
          documentId: doc.id,
          protocolNumber: doc.protocolNumber,
          message: error.message || 'Error al eliminar'
        });
        results.errorCount++;
      }
    }

    // Verificar si algunos IDs no se encontraron
    const foundIds = documentsToDelete.map(d => d.id);
    const notFoundIds = documentIds.filter(id => !foundIds.includes(id));

    notFoundIds.forEach(id => {
      results.errors.push({
        documentId: id,
        message: 'Documento no encontrado'
      });
      results.errorCount++;
    });

    // Invalidar caché
    await cache.invalidateByTag('documents');
    await cache.invalidateByTag('search:admin:oversight');

    res.json({
      success: true,
      message: `Eliminación completada: ${results.successCount} documentos eliminados`,
      data: { results }
    });

  } catch (error) {
    console.error('Error en bulkDeleteDocuments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export {
  getAllDocumentsOversight,
  getDocumentEvents,
  getBulkDocumentsInfo,
  executeBulkDocumentOperation,
  exportDocuments,
  deleteDocument,
  bulkDeleteDocuments
};
