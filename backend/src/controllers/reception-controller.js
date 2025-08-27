import { getPrismaClient } from '../db.js';
import { Prisma } from '@prisma/client';
import { getReversionCleanupData, isValidStatus, isReversion as isReversionFn, STATUS_ORDER_LIST } from '../utils/status-transitions.js';

const prisma = getPrismaClient();
import whatsappService from '../services/whatsapp-service.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';
import AlertasService from '../services/alertas-service.js';

// Cache simple para soporte de unaccent
let UNACCENT_SUPPORTED = null;
async function supportsUnaccentFn() {
  if (UNACCENT_SUPPORTED !== null) return UNACCENT_SUPPORTED;
  try {
    await prisma.$queryRaw`SELECT unaccent('áéíóúÁÉÍÓÚ')`;
    UNACCENT_SUPPORTED = true;
  } catch (e) {
    console.warn('Extensión unaccent no disponible. Búsqueda acento-insensible desactivada.');
    UNACCENT_SUPPORTED = false;
  }
  return UNACCENT_SUPPORTED;
}

async function getDashboardStats(req, res) {
  try {
    // 🔄 CONSERVADOR: Estadísticas básicas para dashboard de recepción
    const stats = await Promise.all([
      // Total de documentos
      prisma.document.count(),
      // Documentos en proceso
      prisma.document.count({ where: { status: 'EN_PROCESO' } }),
      // Documentos listos para entrega
      prisma.document.count({ where: { status: 'LISTO' } }),
      // Documentos entregados
      prisma.document.count({ where: { status: 'ENTREGADO' } }),
      // Documentos creados hoy
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // Documentos entregados hoy
      prisma.document.count({
        where: {
          status: 'ENTREGADO',
          fechaEntrega: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const [total, enProceso, listos, entregados, creadosHoy, entregadosHoy] = stats;

    res.json({
      success: true,
      data: {
        stats: {
          total,
          enProceso,
          listos,
          entregados,
          creadosHoy,
          entregadosHoy,
          // Métricas adicionales
          pendientesEntrega: listos,
          eficienciaHoy: creadosHoy > 0 ? Math.round((entregadosHoy / creadosHoy) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function getMatrizadores(req, res) {
  try {
    const matrizadores = await prisma.user.findMany({
      where: { 
        role: { in: ['MATRIZADOR', 'ARCHIVO'] },
        isActive: true
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: 'asc' }
    });
    res.json({
      success: true,
      data: { matrizadores }
    });
  } catch (error) {
    console.error('Error obteniendo matrizadores:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function listarTodosDocumentos(req, res) {
  try {
    const { search, matrizador, estado, fechaDesde, fechaHasta, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    // Normalizar y mapear campo de ordenamiento permitido
    const mapSortField = (field) => {
      switch ((field || '').toString()) {
        case 'createdAt':
        case 'fechaCreacion':
          return 'createdAt';
        case 'updatedAt':
          return 'updatedAt';
        case 'clientName':
          return 'clientName';
        case 'protocolNumber':
          return 'protocolNumber';
        case 'documentType':
          return 'documentType';
        case 'status':
          return 'status';
        case 'fechaEntrega':
          return 'fechaEntrega';
        default:
          return 'createdAt';
      }
    };
    const mappedSortField = mapSortField(sortBy);
    const mappedSortOrder = (sortOrder === 'asc') ? 'asc' : 'desc';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    // PostgreSQL - Búsqueda case-insensitive y acento-insensitive (si hay extensión unaccent)
    const searchTerm = (search || '').trim();
    
    if (matrizador) {
      where.assignedToId = parseInt(matrizador);
    }
    
    if (estado) {
      where.status = estado;
    }

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) {
        where.createdAt.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setDate(hasta.getDate() + 1);
        where.createdAt.lt = hasta;
      }
    }
    // Si hay término de búsqueda, intentar búsqueda acento-insensible con unaccent
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        const pattern = `%${searchTerm}%`;
        // Construir cláusulas adicionales según filtros
        const filterClauses = [];
        if (estado) filterClauses.push(Prisma.sql`d."status"::text = ${estado}`);
        if (matrizador) filterClauses.push(Prisma.sql`d."assignedToId" = ${parseInt(matrizador)}`);
        if (fechaDesde) filterClauses.push(Prisma.sql`d."createdAt" >= ${new Date(fechaDesde)}`);
        if (fechaHasta) {
          const hasta = new Date(fechaHasta); hasta.setDate(hasta.getDate() + 1);
          filterClauses.push(Prisma.sql`d."createdAt" < ${hasta}`);
        }

        const whereSql = Prisma.sql`${Prisma.join([
          Prisma.sql`(
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."clientEmail") ILIKE unaccent(${pattern}) OR
            unaccent(d."clientId") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(d."actoPrincipalDescripcion") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )`,
          ...filterClauses
        ], Prisma.sql` AND `)}`;

        // Preparar ORDER BY seguro (solo campos permitidos)
        const fieldSql = (() => {
          switch (mappedSortField) {
            case 'createdAt': return Prisma.sql`d."createdAt"`;
            case 'updatedAt': return Prisma.sql`d."updatedAt"`;
            case 'clientName': return Prisma.sql`d."clientName"`;
            case 'protocolNumber': return Prisma.sql`d."protocolNumber"`;
            case 'documentType': return Prisma.sql`d."documentType"`;
            case 'status': return Prisma.sql`d."status"`;
            case 'fechaEntrega': return Prisma.sql`d."fechaEntrega"`;
            default: return Prisma.sql`d."createdAt"`;
          }
        })();
        const directionSql = mappedSortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

        const documents = await prisma.$queryRaw`
          SELECT d.*, u.id as "_assignedToId", u."firstName" as "_assignedToFirstName", u."lastName" as "_assignedToLastName"
          FROM "documents" d
          LEFT JOIN "users" u ON u.id = d."assignedToId"
          WHERE ${whereSql}
          ORDER BY ${fieldSql} ${directionSql}
          OFFSET ${skip} LIMIT ${take}
        `;
        const countRows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${whereSql}`;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        const formattedDocuments = documents.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          clientPhone: doc.clientPhone,
          clientEmail: doc.clientEmail,
          clientId: doc.clientId,
          documentType: doc.documentType,
          status: doc.status,
          isGrouped: doc.isGrouped,
          documentGroupId: doc.documentGroupId,
          groupVerificationCode: doc.groupVerificationCode,
          matrizador: doc._assignedToFirstName ? `${doc._assignedToFirstName} ${doc._assignedToLastName}` : 'No asignado',
          matrizadorId: doc.assignedToId,
          codigoRetiro: doc.codigoRetiro,
          verificationCode: doc.verificationCode,
          fechaCreacion: doc.createdAt,
          fechaEntrega: doc.fechaEntrega,
          actoPrincipalDescripcion: doc.actoPrincipalDescripcion,
          actoPrincipalValor: doc.totalFactura,
          totalFactura: doc.totalFactura,
          matrizadorName: doc.matrizadorName,
          detalle_documento: doc.detalle_documento,
          comentarios_recepcion: doc.comentarios_recepcion
        }));

        const totalPages = Math.ceil(total / take);

        return res.json({
          success: true,
          data: {
            documents: formattedDocuments,
            pagination: {
              page: parseInt(page),
              limit: take,
              total,
              totalPages
            }
          }
        });
      } else {
        // Si no hay unaccent, usar filtros compatibles con todos los proveedores (sin 'mode')
        // Nota: Esto puede ser sensible a mayúsculas/minúsculas en algunos motores (p.ej. SQLite)
        where.OR = [
          { clientName: { contains: searchTerm } },
          { clientPhone: { contains: searchTerm } },
          { clientEmail: { contains: searchTerm } },
          { clientId: { contains: searchTerm } },
          { protocolNumber: { contains: searchTerm } },
          { actoPrincipalDescripcion: { contains: searchTerm } },
          { detalle_documento: { contains: searchTerm } }
        ];
      }
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { [mappedSortField]: mappedSortOrder },
        skip,
        take
      }),
      prisma.document.count({ where })
    ]);

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      protocolNumber: doc.protocolNumber,
      clientName: doc.clientName,
      clientPhone: doc.clientPhone,
      clientEmail: doc.clientEmail,
      clientId: doc.clientId,
      documentType: doc.documentType,
      status: doc.status,
      // 🔗 Campos de agrupación para que el frontend muestre chips e info de grupo
      isGrouped: doc.isGrouped,
      documentGroupId: doc.documentGroupId,
      groupVerificationCode: doc.groupVerificationCode,
      matrizador: doc.assignedTo ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'No asignado',
      matrizadorId: doc.assignedToId,
      codigoRetiro: doc.codigoRetiro,
      verificationCode: doc.verificationCode, // 🔄 CONSERVADOR: Agregar verificationCode para frontend
      fechaCreacion: doc.createdAt,
      fechaEntrega: doc.fechaEntrega,
      // ✅ AGREGADO: Información del acto principal para que RECEPCION la vea
      actoPrincipalDescripcion: doc.actoPrincipalDescripcion,
      actoPrincipalValor: doc.totalFactura, // ⭐ CAMBIO: Usar valor total de factura
      totalFactura: doc.totalFactura,
      matrizadorName: doc.matrizadorName,
      // Campos editables
      detalle_documento: doc.detalle_documento,
      comentarios_recepcion: doc.comentarios_recepcion
    }));

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        documents: formattedDocuments,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('Error listando todos los documentos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function getDocumentosEnProceso(req, res) {
  try {
    const { search, matrizador, page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      status: 'EN_PROCESO'
    };
    
    // PostgreSQL - Búsqueda case-insensitive y acento-insensitive (si hay extensión unaccent)
    const searchTerm2 = (search || '').trim();
    if (searchTerm2) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        const pattern = `%${searchTerm2}%`;
        const baseFilter = Prisma.sql`d."status" = 'EN_PROCESO'`;
        const whereSql = Prisma.sql`${Prisma.join([
          baseFilter,
          Prisma.sql`(
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."clientEmail") ILIKE unaccent(${pattern}) OR
            unaccent(d."clientId") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(d."actoPrincipalDescripcion") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )`
        ], Prisma.sql` AND `)}`;

        const documents = await prisma.$queryRaw`
          SELECT d.*, u.id as "_assignedToId", u."firstName" as "_assignedToFirstName", u."lastName" as "_assignedToLastName"
          FROM "documents" d
          LEFT JOIN "users" u ON u.id = d."assignedToId"
          WHERE ${whereSql}
          ORDER BY d."updatedAt" DESC
          OFFSET ${skip} LIMIT ${take}
        `;
        const countRows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${whereSql}`;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        const formattedDocuments = documents.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          clientPhone: doc.clientPhone,
          clientId: doc.clientId,
          documentType: doc.documentType,
          status: doc.status,
          matrizador: doc._assignedToFirstName ? `${doc._assignedToFirstName} ${doc._assignedToLastName}` : 'No asignado',
          matrizadorId: doc.assignedToId,
          fechaCreacion: doc.createdAt,
          fechaActualizacion: doc.updatedAt
        }));

        const totalPages = Math.ceil(total / take);

        return res.json({
          success: true,
          data: {
            documents: formattedDocuments,
            pagination: {
              page: parseInt(page),
              limit: take,
              total,
              totalPages
            }
          }
        });
      } else {
        // Filtros compatibles con todos los proveedores (sin 'mode')
        where.OR = [
          { clientName: { contains: searchTerm2 } },
          { clientPhone: { contains: searchTerm2 } },
          { clientEmail: { contains: searchTerm2 } },
          { clientId: { contains: searchTerm2 } },
          { protocolNumber: { contains: searchTerm2 } },
          { actoPrincipalDescripcion: { contains: searchTerm2 } },
          { detalle_documento: { contains: searchTerm2 } }
        ];
      }
    }
    
    if (matrizador) {
      where.assignedToId = parseInt(matrizador);
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take
      }),
      prisma.document.count({ where })
    ]);

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      protocolNumber: doc.protocolNumber,
      clientName: doc.clientName,
      clientPhone: doc.clientPhone,
      clientId: doc.clientId,
      documentType: doc.documentType,
      status: doc.status,
      matrizador: doc.assignedTo ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'No asignado',
      matrizadorId: doc.assignedToId,
      fechaCreacion: doc.createdAt,
      fechaActualizacion: doc.updatedAt
    }));

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        documents: formattedDocuments,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos en proceso:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function marcarComoListo(req, res) {
    try {
        const { id } = req.params;
        
        console.log('🎯 marcarComoListo iniciado:', {
            documentId: id,
            userId: req.user.id,
            userRole: req.user.role,
            timestamp: new Date().toISOString()
        });
        
        const document = await prisma.document.findUnique({ 
            where: { id },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });

        if (!document) {
            console.log('❌ Documento no encontrado:', id);
            return res.status(404).json({ success: false, message: 'Documento no encontrado' });
        }
        
        console.log('📄 Documento encontrado:', {
            id: document.id,
            currentStatus: document.status,
            protocolNumber: document.protocolNumber,
            clientName: document.clientName,
            documentGroupId: document.documentGroupId,
            isGrouped: document.isGrouped
        });
        
        if (document.status !== 'EN_PROCESO') {
            console.log('❌ Estado incorrecto:', {
                expectedStatus: 'EN_PROCESO',
                actualStatus: document.status
            });
            return res.status(400).json({ success: false, message: `El documento no está en proceso. Estado actual: ${document.status}` });
        }

        // NUEVA FUNCIONALIDAD: Manejar propagación de estado en documentos agrupados
        let updatedDocuments = [];
        let groupAffected = false;
        
        // Verificar si el documento pertenece a un grupo y propagar el cambio
        if (document.documentGroupId) {
            console.log('🔗 Documento agrupado detectado - Iniciando propagación de estado:', {
                documentGroupId: document.documentGroupId
            });

            try {
                // Obtener todos los documentos del mismo grupo
                const groupDocuments = await prisma.document.findMany({
                    where: {
                        documentGroupId: document.documentGroupId,
                        status: { not: 'ENTREGADO' } // Solo documentos no entregados
                    },
                    include: {
                        assignedTo: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                });

                console.log(`📋 Encontrados ${groupDocuments.length} documentos en el grupo para actualizar`);

                // Generar códigos únicos para cada documento si no los tienen
                const documentsToUpdate = [];
                for (const doc of groupDocuments) {
                    let codigoRetiro;
                    if (doc.verificationCode) {
                        codigoRetiro = doc.verificationCode;
                    } else {
                        codigoRetiro = await CodigoRetiroService.generarUnico();
                        console.log(`🎯 Código generado para ${doc.protocolNumber}: ${codigoRetiro}`);
                    }
                    
                    documentsToUpdate.push({
                        docId: doc.id,
                        originalStatus: doc.status,
                        codigoRetiro: codigoRetiro
                    });
                }

                // Actualizar todos los documentos del grupo en una transacción
                updatedDocuments = await prisma.$transaction(async (tx) => {
                    const updates = [];
                    for (const { docId, codigoRetiro } of documentsToUpdate) {
                        const updated = await tx.document.update({
                            where: { id: docId },
                            data: { 
                                status: 'LISTO', 
                                codigoRetiro: codigoRetiro,
                                updatedAt: new Date() 
                            },
                            include: {
                                assignedTo: {
                                    select: { id: true, firstName: true, lastName: true, email: true }
                                }
                            }
                        });
                        updates.push(updated);
                    }
                    return updates;
                });

                groupAffected = true;
                console.log(`✅ ${updatedDocuments.length} documentos del grupo actualizados exitosamente`);

                // Registrar eventos de auditoría para todos los documentos afectados
                for (let i = 0; i < updatedDocuments.length; i++) {
                    const doc = updatedDocuments[i];
                    const originalStatus = documentsToUpdate[i].originalStatus;
                    
                    try {
                        await prisma.documentEvent.create({
                            data: {
                                documentId: doc.id,
                                userId: req.user.id,
                                eventType: 'STATUS_CHANGED',
                                description: `Estado cambiado de ${originalStatus} a LISTO por propagación grupal - ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
                                details: {
                                    previousStatus: originalStatus,
                                    newStatus: 'LISTO',
                                    codigoRetiro: doc.codigoRetiro,
                                    groupPropagation: true,
                                    triggeredBy: id,
                                    changedBy: `${req.user.firstName} ${req.user.lastName}`,
                                    userRole: req.user.role,
                                    timestamp: new Date().toISOString()
                                },
                                ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                                userAgent: req.get('User-Agent') || 'unknown'
                            }
                        });
                    } catch (auditError) {
                        console.error(`Error registrando evento para documento ${doc.id}:`, auditError);
                    }
                }

            } catch (error) {
                console.error('❌ Error en propagación grupal:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error propagando cambio de estado a documentos agrupados',
                    error: error.message
                });
            }
        } else {
            // Documento individual - comportamiento original
            console.log('🔐 Generando código de retiro...');
            const nuevoCodigo = await CodigoRetiroService.generarUnico();
            console.log('✅ Código generado:', nuevoCodigo);

            console.log('💾 Actualizando documento en base de datos...');
            // Usar transacción para evitar condiciones de carrera
            const updatedDocument = await prisma.$transaction(async (tx) => {
                // Verificar nuevamente el estado dentro de la transacción
                const currentDoc = await tx.document.findUnique({ where: { id } });
                
                if (!currentDoc || currentDoc.status !== 'EN_PROCESO') {
                    throw new Error(`El documento ya no está en proceso. Estado actual: ${currentDoc?.status || 'NO_ENCONTRADO'}`);
                }
                
                return await tx.document.update({
                    where: { id },
                    data: { status: 'LISTO', codigoRetiro: nuevoCodigo, updatedAt: new Date() }
                });
            });
            
            updatedDocuments = [updatedDocument];
            console.log('✅ Documento actualizado exitosamente:', {
                id: updatedDocument.id,
                newStatus: updatedDocument.status,
                codigoRetiro: updatedDocument.codigoRetiro
            });
        }

        // 📱 ENVIAR NOTIFICACIÓN WHATSAPP (respetar política no_notificar)
        try {
            if (document.notificationPolicy === 'no_notificar') {
                console.log('🔕 RECEPCIÓN: Política no_notificar activa, se omite WhatsApp (LISTO)');
            } else {
            const clienteData = {
                clientName: document.clientName,
                clientPhone: document.clientPhone
            };

            if (groupAffected) {
                // Notificación grupal - enviar información de todos los documentos
                const whatsappResult = await whatsappService.enviarGrupoDocumentosListo(
                    clienteData,
                    updatedDocuments,
                    updatedDocuments[0].codigoRetiro // Usar el código del primer documento como referencia
                );

                console.log('✅ Notificación WhatsApp grupal enviada:', whatsappResult.messageId || 'simulado');
            } else {
                // Notificación individual
                const documentoData = {
                    tipoDocumento: document.tipoDocumento,
                    protocolNumber: document.protocolNumber
                };

                const whatsappResult = await whatsappService.enviarDocumentoListo(
                    clienteData, 
                    documentoData, 
                    updatedDocuments[0].codigoRetiro
                );

                console.log('✅ Notificación WhatsApp enviada:', whatsappResult.messageId || 'simulado');
            }
            }
        } catch (whatsappError) {
            // No fallar la operación principal si WhatsApp falla
            console.error('⚠️ Error enviando WhatsApp (operación continúa):', whatsappError.message);
        }

        const mainDocument = updatedDocuments.find(doc => doc.id === id) || updatedDocuments[0];
        const responseMessage = groupAffected 
            ? `${updatedDocuments.length} documentos del grupo marcados como listos exitosamente`
            : `Documento ${mainDocument.protocolNumber} marcado como listo exitosamente`;

        console.log('🎉 Proceso completado exitosamente:', {
            documentId: mainDocument.id,
            protocolNumber: mainDocument.protocolNumber,
            codigoRetiro: mainDocument.codigoRetiro,
            clientName: mainDocument.clientName,
            groupAffected: groupAffected,
            documentsUpdated: updatedDocuments.length
        });

        res.json({ 
            success: true, 
            message: responseMessage, 
            data: { 
                document: mainDocument,
                documents: updatedDocuments,
                codigoRetiro: mainDocument.codigoRetiro,
                groupAffected: groupAffected,
                documentsUpdated: updatedDocuments.length,
                whatsappSent: true // Siempre true para no exponer errores al frontend
            } 
        });
    } catch (error) {
        console.error('Error marcando como listo:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

async function marcarGrupoListo(req, res) {
    try {
        const { documentIds } = req.body;
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere una lista de IDs de documentos.' });
        }

        const documents = await prisma.document.findMany({
            where: { id: { in: documentIds }, status: 'EN_PROCESO' }
        });

        if (documents.length !== documentIds.length) {
            return res.status(400).json({ success: false, message: 'Algunos documentos no se pudieron procesar o no están en proceso.' });
        }

        const clientNames = [...new Set(documents.map(doc => doc.clientName))];
        const clientIds = [...new Set(documents.map(doc => doc.clientId).filter(Boolean))];
        
        if (clientNames.length > 1) {
            return res.status(400).json({ success: false, message: 'Todos los documentos deben ser del mismo cliente.' });
        }
        
        // Si hay clientIds, deben ser todos iguales
        if (clientIds.length > 1) {
            return res.status(400).json({ success: false, message: 'Los documentos deben tener la misma identificación del cliente.' });
        }

        // Generar código único para grupo usando el servicio mejorado
        const nuevoCodigo = await CodigoRetiroService.generarUnicoGrupo();
        
        const updatedDocuments = await prisma.$transaction(async (tx) => {
            // Verificar nuevamente que todos los documentos estén EN_PROCESO
            const currentDocs = await tx.document.findMany({
                where: { id: { in: documentIds } }
            });
            
            const invalidDocs = currentDocs.filter(doc => doc.status !== 'EN_PROCESO');
            if (invalidDocs.length > 0) {
                throw new Error(`Algunos documentos ya no están en proceso: ${invalidDocs.map(d => `${d.protocolNumber}(${d.status})`).join(', ')}`);
            }
            
            return await Promise.all(
                documentIds.map(id => tx.document.update({
                    where: { id },
                    data: { status: 'LISTO', codigoRetiro: nuevoCodigo, isGrouped: true, groupVerificationCode: nuevoCodigo, updatedAt: new Date() }
                }))
            );
        });

        // 📱 ENVIAR NOTIFICACIÓN WHATSAPP GRUPAL
        try {
            // Tomar datos del primer documento (todos son del mismo cliente)
            const primerDocumento = documents[0];
            if (primerDocumento.notificationPolicy === 'no_notificar') {
                console.log('🔕 RECEPCIÓN: Política no_notificar activa, omitimos WhatsApp grupal (LISTO)');
            } else {
            const clienteData = {
                clientName: primerDocumento.clientName,
                clientPhone: primerDocumento.clientPhone
            };

            const whatsappResult = await whatsappService.enviarGrupoDocumentosListo(
                clienteData,
                updatedDocuments, // Array de documentos actualizados
                nuevoCodigo
            );

            console.log('✅ Notificación WhatsApp grupal enviada:', whatsappResult.messageId || 'simulado');
            }
        } catch (whatsappError) {
            // No fallar la operación principal si WhatsApp falla
            console.error('⚠️ Error enviando WhatsApp grupal (operación continúa):', whatsappError.message);
        }

        res.json({ 
            success: true, 
            message: `${updatedDocuments.length} documentos marcados como listos`, 
            data: { 
                codigoRetiro: nuevoCodigo,
                documentsCount: updatedDocuments.length,
                whatsappSent: true // Siempre true para no exponer errores al frontend
            } 
        });
    } catch (error) {
        console.error('Error marcando grupo como listo:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

/**
 * Obtener alertas de recepción (documentos LISTO sin entregar)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAlertasRecepcion(req, res) {
  try {
    const alertas = await AlertasService.getAlertasRecepcion();
    res.json(alertas);
  } catch (error) {
    console.error('Error obteniendo alertas de recepción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      data: {
        alertas: [],
        stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosListo: 0 }
      }
    });
  }
}

async function desagruparDocumentos(req, res) {
    try {
        const { documentIds } = req.body;
        
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere una lista de IDs de documentos.' });
        }

        // Verificar que los documentos existen y están agrupados
        const documents = await prisma.document.findMany({
            where: { 
                id: { in: documentIds },
                isGrouped: true
            }
        });

        if (documents.length === 0) {
            return res.status(400).json({ success: false, message: 'No se encontraron documentos agrupados para desagrupar.' });
        }

        // Generar códigos individuales para cada documento
        const codigosIndividuales = await Promise.all(
            documents.map(() => CodigoRetiroService.generarUnico())
        );

        // Desagrupar documentos - asignar códigos individuales
        const updatedDocuments = await prisma.$transaction(
            documents.map((doc, index) => prisma.document.update({
                where: { id: doc.id },
                data: { 
                    isGrouped: false,
                    documentGroupId: null,
                    groupVerificationCode: null,
                    codigoRetiro: codigosIndividuales[index],
                    updatedAt: new Date()
                }
            }))
        );

        // Registrar evento de desagrupación
        try {
            await Promise.all(
                documents.map(doc => 
                    prisma.documentEvent.create({
                        data: {
                            documentId: doc.id,
                            userId: req.user.id,
                            eventType: 'DOCUMENT_UNGROUPED',
                            description: `Documento desagrupado. Nuevo código: ${codigosIndividuales[documents.findIndex(d => d.id === doc.id)]}`,
                            details: {
                                previousGroupCode: doc.groupVerificationCode,
                                newIndividualCode: codigosIndividuales[documents.findIndex(d => d.id === doc.id)],
                                ungroupedBy: `${req.user.firstName || 'Sistema'} ${req.user.lastName || ''}`,
                                userRole: req.user.role || 'RECEPCION',
                                timestamp: new Date().toISOString()
                            },
                            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                            userAgent: req.get('User-Agent') || 'unknown'
                        }
                    })
                )
            );
        } catch (auditError) {
            console.error('Error registrando eventos de desagrupación:', auditError);
        }

        // Enviar notificaciones WhatsApp individuales
        try {
            const clienteData = {
                clientName: documents[0].clientName,
                clientPhone: documents[0].clientPhone
            };

            for (let i = 0; i < updatedDocuments.length; i++) {
                const doc = updatedDocuments[i];
                const documentoData = {
                    tipoDocumento: doc.documentType,
                    protocolNumber: doc.protocolNumber
                };

                await whatsappService.enviarDocumentoListo(
                    clienteData, 
                    documentoData, 
                    codigosIndividuales[i]
                );
            }

            console.log(`✅ ${updatedDocuments.length} notificaciones WhatsApp individuales enviadas`);
        } catch (whatsappError) {
            console.error('⚠️ Error enviando notificaciones WhatsApp de desagrupación:', whatsappError.message);
        }

        res.json({ 
            success: true, 
            message: `${updatedDocuments.length} documentos desagrupados exitosamente`, 
            data: { 
                documentsCount: updatedDocuments.length,
                individualCodes: codigosIndividuales,
                whatsappSent: true
            } 
        });
    } catch (error) {
        console.error('Error desagrupando documentos:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

/**
 * Revertir estado de documento con razón obligatoria
 * Delega a la función central de revertDocumentStatus que maneja grupos automáticamente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function revertirEstadoDocumento(req, res) {
    try {
        // Importar la función central de reversión
        const { revertDocumentStatus } = await import('./document-controller.js');
        
        // Delegar a la función central que ya maneja toda la lógica de grupos
        return await revertDocumentStatus(req, res);
        
    } catch (error) {
        console.error('Error en revertirEstadoDocumento (recepción):', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

/**
 * Obtener historial de notificaciones WhatsApp para recepción
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getNotificationHistoryReception(req, res) {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            type = '',
            dateFrom = '',
            dateTo = ''
        } = req.query;

        const take = Math.min(parseInt(limit), 50);
        const skip = (parseInt(page) - 1) * take;

        // Mostrar historial sin restringir por usuario creador,
        // ya que las notificaciones pueden ser generadas por diferentes roles/servicios
        const where = {};

        if (search) {
            where.OR = [
                { clientName: { contains: search, mode: 'insensitive' } },
                { clientPhone: { contains: search } },
                { messageBody: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status) {
            where.status = status;
        }

        if (type) {
            where.messageType = type;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.createdAt.lte = new Date(dateTo);
            }
        }

        const notifications = await prisma.whatsAppNotification.findMany({
            where,
            take,
            skip,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                clientName: true,
                clientPhone: true,
                messageType: true,
                messageBody: true,
                status: true,
                messageId: true,
                errorMessage: true,
                createdAt: true,
                sentAt: true
            }
        });

        const totalCount = await prisma.whatsAppNotification.count({ where });

        console.log('📱 Historial de notificaciones obtenido:', {
            count: notifications.length,
            total: totalCount,
            page: parseInt(page)
        });

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: take,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / take)
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo historial de notificaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}

export {
  getDashboardStats,
  getMatrizadores,
  listarTodosDocumentos,
  getDocumentosEnProceso,
  marcarComoListo,
  marcarGrupoListo,
  desagruparDocumentos,
  getAlertasRecepcion,
  revertirEstadoDocumento,
  getNotificationHistoryReception
};
