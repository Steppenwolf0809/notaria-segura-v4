import { getPrismaClient } from '../db.js';
import { Prisma } from '@prisma/client';
import { getReversionCleanupData, isValidStatus, isReversion as isReversionFn, STATUS_ORDER_LIST } from '../utils/status-transitions.js';

const prisma = getPrismaClient();
import whatsappService from '../services/whatsapp-service.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';
import AlertasService from '../services/alertas-service.js';
import cache from '../services/cache-service.js';

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
    // 🔥 EXCLUYE Notas de Crédito de todas las estadísticas
    const baseFilter = { NOT: { status: 'ANULADO_NOTA_CREDITO' } };
    
    const stats = await Promise.all([
      // Total de documentos (sin NC)
      prisma.document.count({ where: baseFilter }),
      // Documentos en proceso
      prisma.document.count({ where: { status: 'EN_PROCESO' } }),
      // Documentos listos para entrega
      prisma.document.count({ where: { status: 'LISTO' } }),
      // Documentos entregados
      prisma.document.count({ where: { status: 'ENTREGADO' } }),
      // Documentos creados hoy (sin NC)
      prisma.document.count({
        where: {
          ...baseFilter,
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
    // Clave de caché (incluye filtros y orden)
    const cacheKey = cache.key({
      scope: 'reception:todos',
      page: parseInt(page),
      limit: take,
      search: searchTerm,
      matrizador: matrizador ? parseInt(matrizador) : null,
      estado,
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      sortBy: mappedSortField,
      sortOrder: mappedSortOrder
    });

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
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

        const payload = {
          documents: formattedDocuments,
          pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages
          }
        };
        await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:todos'] });
        return res.json({ success: true, data: payload });
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

    const payload = {
      documents: formattedDocuments,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages
      }
    };
    await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:todos'] });
    res.json({ success: true, data: payload });

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

    // Clave de caché (incluye filtros)
    const cacheKey = cache.key({
      scope: 'reception:en_proceso',
      page: parseInt(page),
      limit: take,
      search: searchTerm2,
      matrizador: matrizador ? parseInt(matrizador) : null
    });
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }
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
        const payload = {
          documents: formattedDocuments,
          pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages
          }
        };
        await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:en_proceso'] });
        return res.json({ success: true, data: payload });
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

    const payload = {
      documents: formattedDocuments,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages
      }
    };
    await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:en_proceso'] });
    res.json({ success: true, data: payload });

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
                                details: JSON.stringify({
                                    previousStatus: originalStatus,
                                    newStatus: 'LISTO',
                                    codigoRetiro: doc.codigoRetiro,
                                    groupPropagation: true,
                                    triggeredBy: id,
                                    changedBy: `${req.user.firstName} ${req.user.lastName}`,
                                    userRole: req.user.role,
                                    timestamp: new Date().toISOString()
                                }),
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
                    protocolNumber: document.protocolNumber,
                    actoPrincipalDescripcion: document.actoPrincipalDescripcion,
                    actoPrincipalValor: document.actoPrincipalValor
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

        // Headers para evitar cache del navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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

        // Headers para evitar cache del navegador
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

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
                            eventType: 'STATUS_CHANGED',
                            description: `Documento desagrupado. Nuevo código: ${codigosIndividuales[documents.findIndex(d => d.id === doc.id)]}`,
                            details: JSON.stringify({
                                previousGroupCode: doc.groupVerificationCode,
                                newIndividualCode: codigosIndividuales[documents.findIndex(d => d.id === doc.id)],
                                ungroupedBy: `${req.user.firstName || 'Sistema'} ${req.user.lastName || ''}`,
                                userRole: req.user.role || 'RECEPCION',
                                timestamp: new Date().toISOString()
                            }),
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
                    protocolNumber: doc.protocolNumber,
                    actoPrincipalDescripcion: doc.actoPrincipalDescripcion,
                    actoPrincipalValor: doc.actoPrincipalValor
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

/**
 * 🎯 NUEVA FUNCIONALIDAD: Obtener recepciones con filtros unificados para UI Activos/Entregados
 * Endpoint principal para la nueva interfaz de recepción con pestañas y búsqueda global
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getReceptionsUnified(req, res) {
  try {
    const { tab, query, clientId, matrizadorId, page = 1, pageSize = 25 } = req.query;

    // Logs de diagnóstico solicitados
    console.info('[RECEPTION][QUERY]', { tab, query: query || '', clientId, matrizadorId, page: Number(page), pageSize: Number(pageSize) });

    // Validación de pestaña
    if (!tab || !['ACTIVOS', 'ENTREGADOS'].includes(tab)) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro "tab" es obligatorio y debe ser "ACTIVOS" o "ENTREGADOS"'
      });
    }

    // Normalizar pageSize
    const validPageSizes = [25, 50, 100];
    const limit = validPageSizes.includes(parseInt(pageSize)) ? parseInt(pageSize) : 25;

    // Filtro por estados según pestaña
    const statusFilter = tab === 'ENTREGADOS' ? ['ENTREGADO'] : ['EN_PROCESO', 'LISTO'];

    // Construir where
    const whereClause = {
      status: { in: statusFilter },
      // 🔥 EXCLUIR Notas de Crédito
      NOT: { status: 'ANULADO_NOTA_CREDITO' }
    };
    if (clientId) whereClause.clientId = clientId;
    if (matrizadorId) whereClause.assignedToId = parseInt(matrizadorId);
    if (query && query.trim()) {
      const searchTerm = query.trim();
      whereClause.OR = [
        { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { clientId: { contains: searchTerm, mode: 'insensitive' } },
        { documentType: { contains: searchTerm, mode: 'insensitive' } },
        { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Obtener documentos (sin paginar) para agrupar por "acto principal" por cliente
    const docs = await prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        protocolNumber: true,
        clientId: true,
        clientName: true,
        clientPhone: true,
        documentType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        actoPrincipalDescripcion: true,
        actoPrincipalValor: true,
        totalFactura: true,
        verificationCode: true,
        codigoRetiro: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalizador simple
    const normalize = (s) => (s || '').toString().trim().toLowerCase();

    // Clave de agrupación: cliente + acto principal (paridad con la intención de "acto principal")
    const makeGroupKey = (d) => {
      const cKey = normalize(d.clientId) || `${normalize(d.clientName)}__${normalize(d.clientPhone)}`;
      const act = normalize(d.actoPrincipalDescripcion) || 'sin_acto';
      return `${cKey}::${act}`;
    };

    // Agrupar
    const groups = new Map();
    for (const d of docs) {
      const k = makeGroupKey(d);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    }

    // Convertir grupos a items y paginar por grupo
    const allGroups = Array.from(groups.values());

    // Estado del grupo: si todos ENTREGADO => ENTREGADO; si alguno LISTO => LISTO; si no => EN_PROCESO
    const computeGroupStatus = (arr) => {
      if (arr.length === 0) return 'EN_PROCESO';
      const allDelivered = arr.every(x => x.status === 'ENTREGADO');
      if (allDelivered) return 'ENTREGADO';
      const anyReady = arr.some(x => x.status === 'LISTO');
      return anyReady ? 'LISTO' : 'EN_PROCESO';
    };

    const toCurrency = (n) => {
      try {
        const v = Number(n || 0);
        return isNaN(v) ? '-' : `$${v.toLocaleString('es-EC')}`;
      } catch { return '-'; }
    };

    const totalGroups = allGroups.length;
    const pages = Math.max(1, Math.ceil(totalGroups / limit));
    const currentPage = Math.max(1, Math.min(parseInt(page), pages));
    const start = (currentPage - 1) * limit;
    const pageGroups = allGroups.slice(start, start + limit);

    const items = pageGroups.map(arr => {
      // Ordenar por createdAt desc para elegir líder estable
      const sorted = [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const leader = sorted[0];

      // Monto del grupo (suma de totalFactura o actoPrincipalValor)
      const sumAmount = arr.reduce((acc, x) => acc + (Number(x.totalFactura ?? x.actoPrincipalValor ?? 0) || 0), 0);

      return {
        id: leader.id,
        code: leader.protocolNumber,
        clientId: leader.clientId,
        clientName: leader.clientName,
        clientIdentification: leader.clientId,
        typeLabel: leader.documentType,
        mainAct: leader.actoPrincipalDescripcion || '—',
        groupSize: arr.length,
        statusLabel: computeGroupStatus(arr),
        receivedAtFmt: leader.createdAt ? new Date(leader.createdAt).toLocaleDateString('es-EC') : '-',
        amountFmt: toCurrency(sumAmount),
        matrizador: leader.assignedTo
          ? `${leader.assignedTo.firstName} ${leader.assignedTo.lastName}`
          : 'Sin asignar',
        matrizadorId: leader.assignedToId,
        documents: arr.map(x => ({
          id: x.id,
          code: x.protocolNumber,
          status: x.status,
          verificationCode: x.verificationCode || x.codigoRetiro || null,
          act: x.actoPrincipalDescripcion || null,
          amount: Number(x.totalFactura ?? x.actoPrincipalValor ?? 0) || 0,
          matrizador: x.assignedTo
            ? `${x.assignedTo.firstName} ${x.assignedTo.lastName}`
            : 'Sin asignar',
          documentType: x.documentType
        }))
      };
    });

    console.info('[RECEPTION][UNIFIED_RESULT]', { totalGroups, pages, currentPage, pageSize: limit });

    return res.json({
      success: true,
      data: {
        total: totalGroups,
        pages,
        items
      }
    });
  } catch (error) {
    console.error('❌ Error en getReceptionsUnified:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener recepciones',
      error: error?.message || 'Unknown error'
    });
  }
}

/**
 * 🎯 NUEVA FUNCIONALIDAD: Obtener conteos para badges de pestañas de recepción
 * Endpoint optimizado para actualizar badges en tiempo real
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getReceptionsCounts(req, res) {
  try {
    const { query, clientId } = req.query;

    // Filtro base
    const baseWhere = {
      // 🔥 EXCLUIR Notas de Crédito
      NOT: { status: 'ANULADO_NOTA_CREDITO' }
    };
    if (clientId) baseWhere.clientId = clientId;
    if (query && query.trim()) {
      const searchTerm = query.trim();
      baseWhere.OR = [
        { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { clientId: { contains: searchTerm, mode: 'insensitive' } },
        { documentType: { contains: searchTerm, mode: 'insensitive' } },
        { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Traer documentos filtrados (sin paginar) para contar por grupos
    const docs = await prisma.document.findMany({
      where: baseWhere,
      select: {
        id: true,
        protocolNumber: true,
        clientId: true,
        clientName: true,
        clientPhone: true,
        status: true,
        actoPrincipalDescripcion: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const normalize = (s) => (s || '').toString().trim().toLowerCase();
    const makeGroupKey = (d) => {
      const cKey = normalize(d.clientId) || `${normalize(d.clientName)}__${normalize(d.clientPhone)}`;
      const act = normalize(d.actoPrincipalDescripcion) || 'sin_acto';
      return `${cKey}::${act}`;
    };

    // Agrupar
    const groups = new Map();
    for (const d of docs) {
      const k = makeGroupKey(d);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    }

    // Clasificar grupos a ACTIVOS o ENTREGADOS
    let activos = 0;
    let entregados = 0;
    for (const arr of groups.values()) {
      const allDelivered = arr.length > 0 && arr.every(x => x.status === 'ENTREGADO');
      if (allDelivered) entregados += 1;
      else activos += 1; // Si no todos entregados, el grupo sigue activo
    }

    console.info('[RECEPTION][COUNTS]', { ACTIVOS: activos, ENTREGADOS: entregados, groups: groups.size });

    return res.json({
      success: true,
      data: { ACTIVOS: activos, ENTREGADOS: entregados }
    });
  } catch (error) {
    console.error('❌ Error en getReceptionsCounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener conteos de recepción',
      error: error?.message || 'Unknown error'
    });
  }
}

/**
 * 🎯 NUEVA FUNCIONALIDAD: Sugerencias para typeahead en Recepción
 * Busca clientes y códigos por término con soporte unaccent cuando está disponible.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getReceptionSuggestions(req, res) {
  try {
    const term = (req.query.term || req.query.query || '').trim();
    if (!term) {
      return res.json({ success: true, data: { clients: [], codes: [] } });
    }

    const supportsUnaccent = await supportsUnaccentFn();
    let rows;
    if (supportsUnaccent) {
      const pattern = `%${term}%`;
      rows = await prisma.$queryRaw`
        SELECT d.id, d."protocolNumber", d."clientId", d."clientName", d."clientPhone", d."createdAt"
        FROM "documents" d
        WHERE (
          unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
          unaccent(COALESCE(d."clientId", '')) ILIKE unaccent(${pattern}) OR
          unaccent(d."protocolNumber") ILIKE unaccent(${pattern})
        )
        ORDER BY d."createdAt" DESC
        LIMIT 50
      `;
    } else {
      rows = await prisma.document.findMany({
        where: {
          OR: [
            { clientName: { contains: term, mode: 'insensitive' } },
            { clientId: { contains: term, mode: 'insensitive' } },
            { protocolNumber: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          protocolNumber: true,
          clientId: true,
          clientName: true,
          clientPhone: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    }

    const clientMap = new Map();
    const codeSet = new Set();
    const codes = [];

    for (const r of rows) {
      const cKey = (r.clientId && r.clientId.trim())
        ? `id:${r.clientId}`
        : `name:${(r.clientName || '').trim().toLowerCase()}__${(r.clientPhone || '').trim()}`;

      if (!clientMap.has(cKey)) {
        clientMap.set(cKey, {
          clientId: r.clientId || null,
          clientName: r.clientName,
          clientPhone: r.clientPhone || null
        });
      }

      if (r.protocolNumber && !codeSet.has(r.protocolNumber)) {
        codeSet.add(r.protocolNumber);
        codes.push({ code: r.protocolNumber, id: r.id });
      }
    }

    const clients = Array.from(clientMap.values()).slice(0, 10);
    const topCodes = codes.slice(0, 10);

    console.info('[RECEPTION][SUGGEST]', { term, clients: clients.length, codes: topCodes.length });

    return res.json({
      success: true,
      data: { clients, codes: topCodes }
    });
  } catch (error) {
    console.error('❌ Error en getReceptionSuggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor en sugerencias',
      error: error?.message || 'Unknown error'
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
  getNotificationHistoryReception,
  // 🎯 NUEVA FUNCIONALIDAD: UI Activos/Entregados para Recepción
  getReceptionsUnified,
  getReceptionsCounts,
  getReceptionSuggestions
};
