import { PrismaClient } from '@prisma/client';
import { 
  logAdminAction,
  logUserListAccess,
  extractRequestInfo 
} from '../utils/audit-logger.js';

const prisma = new PrismaClient();

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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(5, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Construir filtros WHERE
    const where = {};
    
    // Filtro por búsqueda
    if (search) {
      where.OR = [
        { protocolNumber: { contains: search } },
        { clientName: { contains: search } },
        { documentType: { contains: search } }
      ];
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

    // Ejecutar consultas
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: offset,
        take: limitNum,
        orderBy,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.document.count({ where })
    ]);

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
    
    if (search) {
      where.OR = [
        { protocolNumber: { contains: search } },
        { clientName: { contains: search } },
        { documentType: { contains: search } }
      ];
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

    const documents = await prisma.document.findMany({
      where,
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Formatear datos para exportación
    const exportData = documents.map(doc => ({
      'Número Protocolo': doc.protocolNumber || '',
      'Cliente': doc.clientName || '',
      'Teléfono': doc.clientPhone || '',
      'Tipo Documento': doc.documentType || '',
      'Estado': doc.status || '',
      'Matrizador Asignado': doc.assignedTo ? 
        `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'Sin asignar',
      'Creado Por': doc.createdBy ? 
        `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : 'N/A',
      'Fecha Creación': doc.createdAt ? 
        new Date(doc.createdAt).toLocaleDateString('es-ES') : '',
      'Última Actualización': doc.updatedAt ? 
        new Date(doc.updatedAt).toLocaleDateString('es-ES') : '',
      'Valor Acto Principal': doc.actoPrincipalValor || 0,
      'Total Factura': doc.totalFactura || 0,
      'Código Verificación': doc.verificationCode || '',
      'Agrupado': doc.isGrouped ? 'Sí' : 'No'
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

export {
  getAllDocumentsOversight,
  getDocumentEvents,
  getBulkDocumentsInfo,
  executeBulkDocumentOperation,
  exportDocuments
};