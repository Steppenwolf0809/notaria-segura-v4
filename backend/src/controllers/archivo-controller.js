import prisma from '../db.js';
import { Prisma } from '@prisma/client';

import CodigoRetiroService from '../utils/codigo-retiro.js';
import { getReversionCleanupData, STATUS_ORDER_LIST } from '../utils/status-transitions.js';
import cache from '../services/cache-service.js';
import logger from '../utils/logger.js';

/**
 * CONTROLADOR DE ARCHIVO
 * Funcionalidad dual:
 * 1. Como matrizador para documentos propios (copias, certificaciones de archivo)
 * 2. Como supervisor global de todos los documentos del sistema
 * 
 * CONSERVADOR: Reutiliza funciones existentes de matrizador y recepción
 */

// ============================================================================
// SECCIÓN 1: FUNCIONES PROPIAS (COMO MATRIZADOR)
// ============================================================================

/**
 * Dashboard para documentos propios del archivo
 * FUNCIONALIDAD: Idéntica a matrizador pero solo documentos asignados a archivo
 */
async function dashboardArchivo(req, res) {
  try {
    const userId = req.user.id;

    // Solo documentos asignados al usuario archivo
    const documentos = await prisma.document.findMany({
      where: {
        assignedToId: userId
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true }
        },
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Agrupar por estado
    const documentosPorEstado = {
      PENDIENTE: documentos.filter(doc => doc.status === 'PENDIENTE'),
      EN_PROCESO: documentos.filter(doc => doc.status === 'EN_PROCESO'),
      LISTO: documentos.filter(doc => doc.status === 'LISTO')
    };

    // Estadísticas básicas
    const estadisticas = {
      totalDocumentos: documentos.length,
      pendientes: documentosPorEstado.PENDIENTE.length,
      enProceso: documentosPorEstado.EN_PROCESO.length,
      listos: documentosPorEstado.LISTO.length,
      entregados: documentos.filter(doc => doc.status === 'ENTREGADO').length
    };

    res.json({
      success: true,
      data: {
        documentos: documentosPorEstado,
        estadisticas
      }
    });

  } catch (error) {
    logger.error('Error en dashboard archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Listar documentos propios del archivo con filtros
 * FUNCIONALIDAD: Como matrizador normal pero solo documentos propios
 */
async function listarMisDocumentos(req, res) {
  try {
    const userId = req.user.id;
    const {
      search,
      estado,
      tipo,
      orderBy = 'updatedAt',
      orderDirection = 'desc',
      page = 1,
      limit = 10,
      fechaDesde,
      fechaHasta,
      // 🆕 Parámetro para ocultar entregados
      ocultarEntregados
    } = req.query;

    // Filtros base
    const where = {
      assignedToId: userId
    };

    // 🆕 Si ocultarEntregados es true, excluir documentos ENTREGADO
    // A menos que el filtro de estado sea específicamente ENTREGADO
    // ESTO ESTABA CAUSANDO CONFLICTO CON FILTROS ESPECÍFICOS: SE MUEVE ABAJO
    /* if (ocultarEntregados === 'true' && estado !== 'ENTREGADO') {
      where.status = { notIn: ['ENTREGADO'] };
    } */

    // Filtro por rango de fechas (fechaFactura)
    if (fechaDesde || fechaHasta) {
      where.fechaFactura = {};
      if (fechaDesde) {
        where.fechaFactura.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const endDate = new Date(fechaHasta);
        endDate.setDate(endDate.getDate() + 1);
        where.fechaFactura.lt = endDate;
      }
    }

    // Caché por usuario + filtros
    const cacheKey = cache.key({
      scope: 'archivo:mis-documentos',
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      estado,
      tipo,
      orderBy,
      orderDirection,
      fechaDesde,
      fechaHasta,
      ocultarEntregados
    });

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Configuración de ordenamiento
    let prismaOrderBy = {};
    if (orderBy === 'prioridad') {
      // Ordenamiento por prioridad de estado (custom) - solo soportado en memoria o raw query complejo
      // Por simplicidad, si piden prioridad usamos updatedAt como fallback en Prisma
      // y el ordenamiento real se haría si usáramos raw query siempre.
      // DADO QUE PRISMA NO SOPORTA ORDENAMIENTO CONDICIONAL FÁCIL, 
      // usaremos updatedAt por defecto si piden prioridad
      prismaOrderBy = { updatedAt: 'desc' };
    } else {
      prismaOrderBy = { [orderBy]: orderDirection.toLowerCase() };
    }

    // Aplicar filtros adicionales
    const searchTerm = (search || '').trim();

    // CASO 1: BÚSQUEDA POR TEXTO (Raw Query para unaccent)
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        // Construcción dinámica de filtros SQL
        let typeFilter = Prisma.sql``;
        if (tipo && tipo !== 'TODOS') {
          typeFilter = Prisma.sql`AND d."documentType" = ${tipo}`;
        }

        // 🆕 Filtro de estado mejorado: incluye ocultarEntregados
        let statusFilter = Prisma.sql``;
        if (estado && estado !== 'TODOS') {
          statusFilter = Prisma.sql`AND d."status" = ${estado}`;
        } else if (ocultarEntregados === 'true') {
          // Si no hay filtro de estado específico, ocultar ENTREGADO
          statusFilter = Prisma.sql`AND d."status" != 'ENTREGADO'`;
        }

        // Filtro por rango de fechas (fechaFactura) para raw SQL
        let dateFilter = Prisma.sql``;
        if (fechaDesde && fechaHasta) {
          const endDate = new Date(fechaHasta);
          endDate.setDate(endDate.getDate() + 1);
          dateFilter = Prisma.sql`AND d."fechaFactura" >= ${new Date(fechaDesde)} AND d."fechaFactura" < ${endDate}`;
        } else if (fechaDesde) {
          dateFilter = Prisma.sql`AND d."fechaFactura" >= ${new Date(fechaDesde)}`;
        } else if (fechaHasta) {
          const endDate = new Date(fechaHasta);
          endDate.setDate(endDate.getDate() + 1);
          dateFilter = Prisma.sql`AND d."fechaFactura" < ${endDate}`;
        }

        // 🆕 Ordenamiento por PRIORIDAD DE ESTADO por defecto
        // Prioridad: EN_PROCESO > LISTO > otros > ENTREGADO
        // Luego ordenamiento secundario por updatedAt
        const statusPriorityOrder = Prisma.sql`
          CASE d."status"
            WHEN 'EN_PROCESO' THEN 1
            WHEN 'LISTO' THEN 2
            WHEN 'PENDIENTE' THEN 3
            WHEN 'CANCELADO' THEN 4
            WHEN 'ENTREGADO' THEN 5
            ELSE 6
          END`;

        // Construcción dinámica de ORDER BY SQL
        // Siempre ordenamos primero por prioridad de estado, luego por el campo seleccionado
        let orderSql;
        const allowedCols = ['createdAt', 'updatedAt', 'clientName', 'protocolNumber', 'totalFactura', 'status', 'fechaFactura'];
        const safeCol = allowedCols.includes(orderBy) ? orderBy : 'updatedAt';
        const safeDirStr = orderDirection.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        orderSql = Prisma.raw(`${statusPriorityOrder.strings[0]} ASC, d."${safeCol}" ${safeDirStr}`);

        const pattern = `%${searchTerm}%`;

        const documents = await prisma.$queryRaw`
          SELECT d.*
          FROM "documents" d
          WHERE d."assignedToId" = ${req.user.id} 
          ${statusFilter}
          ${typeFilter}
          ${dateFilter}
          AND (
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )
          ORDER BY ${orderSql}
          OFFSET ${(parseInt(page) - 1) * parseInt(limit)} LIMIT ${parseInt(limit)}
        `;

        const countRows = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS count
          FROM "documents" d
          WHERE d."assignedToId" = ${req.user.id} 
          ${statusFilter}
          ${typeFilter}
          ${dateFilter}
          AND (
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )
        `;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        // 💰 Obtener facturas para calcular estado de pago
        const docIds = documents.map(d => d.id);
        const invoicesMap = new Map();
        if (docIds.length > 0) {
          const invoices = await prisma.invoice.findMany({
            where: { documentId: { in: docIds } },
            select: { documentId: true, totalAmount: true, paidAmount: true, status: true }
          });
          invoices.forEach(inv => {
            if (!invoicesMap.has(inv.documentId)) invoicesMap.set(inv.documentId, []);
            invoicesMap.get(inv.documentId).push(inv);
          });
        }
        
        const documentsWithPayment = documents.map(d => {
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
          return { ...d, paymentStatus, paymentInfo };
        });

        const payload = {
          documentos: documentsWithPayment,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalDocuments: total,
            limit: parseInt(limit)
          }
        };
        await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:archivo:mis-documentos', `user:${userId}`] });
        return res.json({ success: true, data: payload });
      } else {
        // Fallback si no hay unaccent (Postgres sin extensión o SQLite)
        where.OR = [
          { clientName: { contains: searchTerm, mode: 'insensitive' } },
          { clientPhone: { contains: searchTerm } },
          { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
          { detalle_documento: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }

    // CASO 2: LISTADO ESTÁNDAR (Sin búsqueda o fallback)
    // CASO 2: LISTADO ESTÁNDAR (Sin búsqueda o fallback)
    // Aplicar filtro de estado tiene prioridad sobre ocultarEntregados
    if (estado && estado !== 'TODOS') {
      where.status = estado;
    } else if (ocultarEntregados === 'true') {
      // Si no hay filtro específico, ocultar ENTREGADOS por defecto
      where.status = { notIn: ['ENTREGADO'] };
    }

    if (tipo && tipo !== 'TODOS') {
      where.documentType = tipo;
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 🆕 Para ordenamiento por prioridad de estado, necesitamos obtener más documentos
    // y ordenar en memoria, luego paginar
    const [allDocumentos, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true }
          },
          // 💰 Incluir facturas para estado de pago
          invoices: {
            select: { totalAmount: true, paidAmount: true, status: true }
          }
        },
        orderBy: prismaOrderBy
      }),
      prisma.document.count({ where })
    ]);

    // 🆕 Ordenamiento en memoria por PRIORIDAD DE ESTADO
    const prioridad = {
      'EN_PROCESO': 1,
      'LISTO': 2,
      'PENDIENTE': 3,
      'CANCELADO': 4,
      'ENTREGADO': 5
    };

    const documentosOrdenados = allDocumentos.sort((a, b) => {
      const prioA = prioridad[a.status] || 99;
      const prioB = prioridad[b.status] || 99;

      // Si tienen diferente prioridad, ordenar por prioridad
      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Misma prioridad: aplicar ordenamiento secundario
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      if (orderBy === 'createdAt' || orderBy === 'updatedAt' || orderBy === 'fechaFactura') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (orderDirection.toLowerCase() === 'desc') {
        return bValue > aValue ? 1 : (bValue < aValue ? -1 : 0);
      }
      return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
    });

    // Aplicar paginación sobre los documentos ordenados
    const documentosPaginados = documentosOrdenados.slice(skip, skip + parseInt(limit));
    
    // 💰 Calcular estado de pago para cada documento
    const documentos = documentosPaginados.map(doc => {
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

    const payload = {
      documentos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        limit: parseInt(limit)
      }
    };
    await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:archivo:mis-documentos', `user:${userId}`] });
    res.json({ success: true, data: payload });

  } catch (error) {
    logger.error('Error listando documentos archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Cambiar estado de documento propio
 * FUNCIONALIDAD: Idéntica a matrizador pero solo documentos propios
 */
async function cambiarEstadoDocumento(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;
    const userId = req.user.id;

    // Verificar que el documento pertenece al archivo
    const documento = await prisma.document.findFirst({
      where: {
        id,
        assignedToId: userId
      },
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado o no asignado a usted'
      });
    }

    // Validar transición de estado
    const transicionesValidas = {
      'PENDIENTE': ['EN_PROCESO'],
      'EN_PROCESO': ['PENDIENTE', 'LISTO', 'ENTREGADO'],  // Permitir entrega directa
      'LISTO': ['EN_PROCESO', 'ENTREGADO']
    };

    if (!transicionesValidas[documento.status]?.includes(nuevoEstado)) {
      return res.status(400).json({
        success: false,
        message: 'Transición de estado no válida'
      });
    }

    // Preparar datos de actualización
    const updateData = { status: nuevoEstado };

    // Si se marca como LISTO, generar código de retiro
    let codigoGenerado = null;
    if (nuevoEstado === 'LISTO' && !documento.codigoRetiro) {
      if (true) {
        codigoGenerado = await CodigoRetiroService.generarUnico();
        updateData.codigoRetiro = codigoGenerado;

        // 📈 Registrar evento de generación de código de retiro
        try {
          await prisma.documentEvent.create({
            data: {
              documentId: id,
              userId: req.user.id,
              eventType: 'VERIFICATION_GENERATED',
              description: `Código de retiro generado por archivo: ${codigoGenerado}`,
              details: JSON.stringify({
                codigoRetiro: codigoGenerado,
                previousStatus: documento.status,
                newStatus: nuevoEstado,
                generatedBy: `${req.user.firstName} ${req.user.lastName}`,
                userRole: 'ARCHIVO',
                timestamp: new Date().toISOString()
              }),
              ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown'
            }
          });
        } catch (auditError) {
          logger.error('Error registrando evento de código de retiro:', auditError);
        }
      }
    }

    // Si se marca como ENTREGADO, registrar datos de entrega simplificada
    if (nuevoEstado === 'ENTREGADO') {
      updateData.usuarioEntregaId = req.user.id;
      updateData.fechaEntrega = new Date();
      updateData.entregadoA = `Entrega directa por archivo`;
      updateData.relacionTitular = 'directo';
    }

    // Actualizar solo el documento individual
    let documentosActualizados = [];
    const documentoActualizado = await prisma.document.update({
      where: { id },
      data: updateData
    });
    documentosActualizados = [documentoActualizado];

    // Usar el primer documento para las notificaciones (en grupos, todos son iguales)
    const docPrincipal = documentosActualizados[0];



    // Preparar respuesta con información de sincronización
    const totalSincronizados = documentosActualizados.length;
    const mensajeBase = totalSincronizados > 1
      ? `${totalSincronizados} documentos del grupo ${nuevoEstado.toLowerCase()}s`
      : `Documento ${nuevoEstado.toLowerCase()}`;

    res.json({
      success: true,
      data: {
        documento: docPrincipal,
        documentos: documentosActualizados,
        documentosSincronizados: totalSincronizados,
        esGrupo: totalSincronizados > 1,
        codigoGenerado
      },
      message: `${mensajeBase}${codigoGenerado ? ` - Código: ${codigoGenerado}` : ''}`
    });

  } catch (error) {
    logger.error('Error changing document status in archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al cambiar estado'
    });
  }
}

/**
 * Procesar entrega de documento propio (nueva funcionalidad ARCHIVO = RECEPCIÓN)
 * FUNCIONALIDAD: Equivalente a recepción pero para documentos de archivo
 */
async function procesarEntregaDocumento(req, res) {
  try {
    const { id } = req.params;
    const {
      entregadoA,
      cedulaReceptor,
      relacionTitular,
      codigoVerificacion,
      verificacionManual,
      facturaPresenta,
      observaciones
    } = req.body;

    const userId = req.user.id;

    // Validaciones
    if (!entregadoA) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de quien retira es obligatorio'
      });
    }

    if (!relacionTitular) {
      return res.status(400).json({
        success: false,
        message: 'Relación con titular es obligatoria'
      });
    }

    // 🆕 MEJORA: Determinar si es verificación manual (explícita o por ausencia de código)
    const isManualVerification = verificacionManual || !codigoVerificacion;

    // Determinar método de verificación para auditoría enriquecida
    const computedVerificationMethod = isManualVerification
      ? (req.body.metodoVerificacion || (cedulaReceptor ? 'cedula' : 'manual'))
      : 'codigo_whatsapp';

    // Buscar documento y verificar que pertenece al archivo (con información de grupo)
    const documento = await prisma.document.findFirst({
      where: {
        id,
        assignedToId: userId
      },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado o no asignado a usted'
      });
    }

    // Solo documentos LISTO o EN_PROCESO pueden ser entregados
    if (!['LISTO', 'EN_PROCESO'].includes(documento.status)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden entregar documentos que estén LISTO o EN PROCESO'
      });
    }

    // 🆕 MEJORA: Código de verificación es OPCIONAL para archivo
    // Si se proporciona un código, se valida; si no, se acepta como verificación manual
    if (codigoVerificacion && !isManualVerification) {
      const expectedCode = documento.codigoRetiro || documento.verificationCode;
      if (!expectedCode || expectedCode !== codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto'
        });
      }
    }


    // Actualizar documento principal con información de entrega
    const documentoActualizado = await prisma.document.update({
      where: { id },
      data: {
        status: 'ENTREGADO',
        entregadoA,
        cedulaReceptor,
        relacionTitular,
        verificacionManual: isManualVerification,
        facturaPresenta: facturaPresenta || false,
        fechaEntrega: new Date(),
        usuarioEntregaId: userId,
        observacionesEntrega: observaciones
      },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        },
        usuarioEntrega: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Como la funcionalidad de agrupación fue removida, definimos array vacío
    const groupDocuments = [];

    // Preparar mensaje de respuesta (incluir información de grupo)
    const message = groupDocuments.length > 0
      ? `Grupo de ${groupDocuments.length + 1} documentos entregado exitosamente`
      : 'Documento entregado exitosamente';

    res.json({
      success: true,
      message,
      data: {
        documento: documentoActualizado,
        // 🔗 NUEVA FUNCIONALIDAD: Información de entrega grupal
        groupDelivery: {
          wasGroupDelivery: groupDocuments.length > 0,
          totalDocuments: groupDocuments.length + 1,
          groupDocuments: groupDocuments.map(doc => ({
            id: doc.id,
            protocolNumber: doc.protocolNumber,
            documentType: doc.documentType
          }))
        },
        entrega: {
          entregadoA,
          cedulaReceptor,
          relacionTitular,
          verificacionManual,
          facturaPresenta,
          fechaEntrega: documentoActualizado.fechaEntrega,
          usuarioEntrega: `${req.user.firstName} ${req.user.lastName}`,
          observacionesEntrega: observaciones
        },

      }
    });

  } catch (error) {
    logger.error('Error procesando entrega archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Procesar entrega grupal de documentos propios (ARCHIVO)
 * Permite entregar múltiples documentos seleccionados manualmente
 */
async function procesarEntregaGrupal(req, res) {
  try {
    const { documentIds, entregadoA, cedulaReceptor, relacionTitular, facturaPresenta, observaciones } = req.body;
    const userId = req.user.id;

    // Validaciones básicas
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una lista de IDs de documentos'
      });
    }

    if (!entregadoA) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de quien retira es obligatorio'
      });
    }

    if (!relacionTitular) {
      return res.status(400).json({
        success: false,
        message: 'Relación con titular es obligatoria'
      });
    }

    // Buscar documentos y validar propiedad
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        assignedToId: userId, // Solo documentos propios
        status: { in: ['LISTO', 'EN_PROCESO'] } // Permitir EN_PROCESO también
      }
    });

    if (documents.length !== documentIds.length) {
      return res.status(400).json({
        success: false,
        message: `Solo ${documents.length} de ${documentIds.length} documentos están listos (o en proceso) y asignados a usted`
      });
    }

    // Actualizar documentos en transacción
    const updatedDocuments = await prisma.$transaction(async (tx) => {
      // Actualizar estado
      await tx.document.updateMany({
        where: { id: { in: documentIds } },
        data: {
          status: 'ENTREGADO',
          entregadoA,
          cedulaReceptor,
          relacionTitular,
          verificacionManual: true, // Siempre manual en entrega grupal de archivo
          facturaPresenta: facturaPresenta || false,
          fechaEntrega: new Date(),
          usuarioEntregaId: userId,
          observacionesEntrega: observaciones || `Entrega grupal manual de ${documents.length} documentos`
        }
      });

      // Registrar eventos
      const events = documents.map(doc => ({
        documentId: doc.id,
        userId: userId,
        eventType: 'STATUS_CHANGED',
        description: `Documento entregado grupalmente por ARCHIVO a ${entregadoA}`,
        details: JSON.stringify({
          entregadoA,
          cedulaReceptor,
          relacionTitular,
          groupDelivery: true,
          totalDocuments: documents.length,
          deliveredBy: 'ARCHIVO'
        }),
        personaRetiro: entregadoA,
        cedulaRetiro: cedulaReceptor || undefined,
        metodoVerificacion: 'manual',
        observacionesRetiro: observaciones
      }));

      await tx.documentEvent.createMany({ data: events });

      // Retornar documentos actualizados para notificaciones
      return await tx.document.findMany({
        where: { id: { in: documentIds } }
      });
    });



    res.json({
      success: true,
      message: `${updatedDocuments.length} documentos entregados exitosamente`,
      data: {
        documentsCount: updatedDocuments.length
      }
    });

  } catch (error) {
    logger.error('Error en entrega grupal archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// ============================================================================
// SECCIÓN 2: SUPERVISIÓN GLOBAL (VISTA DE TODOS LOS DOCUMENTOS)
// ============================================================================

/**
 * Vista de supervisión global - todos los documentos del sistema
 * FUNCIONALIDAD: Solo lectura, no puede modificar documentos ajenos
 */
async function supervisionGeneral(req, res) {
  try {
    const {
      search,
      matrizador,
      estado,
      tipo, // Nuevo parámetro
      alerta,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 20,
      sortDias
    } = req.query;



    // Construir filtros
    const where = {};

    // Umbrales de alertas basados en updatedAt (consistente en todas las ramas)
    const now = new Date();
    const fechaAmarilla = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const fechaRoja = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));

    const searchTerm = (search || '').trim();
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        const pattern = `%${searchTerm}%`;
        const filterClauses = [];
        if (matrizador && matrizador !== 'TODOS') filterClauses.push(Prisma.sql`d."assignedToId" = ${parseInt(matrizador)}`);
        if (estado && estado !== 'TODOS') filterClauses.push(Prisma.sql`d."status"::text = ${estado}`);
        if (tipo && tipo !== 'TODOS') filterClauses.push(Prisma.sql`d."documentType" = ${tipo}`); // Filtro de tipo
        if (fechaDesde) filterClauses.push(Prisma.sql`d."createdAt" >= ${new Date(fechaDesde)}`);
        if (fechaHasta) filterClauses.push(Prisma.sql`d."createdAt" <= ${new Date(fechaHasta)}`);
        // Aplicar filtro de alerta por updatedAt en SQL si corresponde
        if (alerta && alerta !== 'TODAS') {
          if (alerta === 'ROJAS') {
            // días >= 15  =>  updatedAt <= fechaRoja
            filterClauses.push(Prisma.sql`d."updatedAt" <= ${fechaRoja}`);
          } else if (alerta === 'AMARILLAS') {
            // 7 <= días < 15  =>  fechaRoja < updatedAt <= fechaAmarilla
            filterClauses.push(Prisma.sql`d."updatedAt" > ${fechaRoja}`);
            filterClauses.push(Prisma.sql`d."updatedAt" <= ${fechaAmarilla}`);
          } else if (alerta === 'NORMALES') {
            // días < 7  =>  updatedAt > fechaAmarilla
            filterClauses.push(Prisma.sql`d."updatedAt" > ${fechaAmarilla}`);
          }
        }
        // Construir la cláusula WHERE de forma segura
        const conditions = [
          Prisma.sql`(
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(d."actoPrincipalDescripcion") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."numeroFactura", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )`
        ];

        if (matrizador && matrizador !== 'TODOS') {
          conditions.push(Prisma.sql`d."assignedToId" = ${parseInt(matrizador)}`);
        }
        if (estado && estado !== 'TODOS') {
          conditions.push(Prisma.sql`d."status"::text = ${estado}`);
        }
        if (tipo && tipo !== 'TODOS') {
          conditions.push(Prisma.sql`d."documentType" = ${tipo}`);
        }
        if (fechaDesde) {
          conditions.push(Prisma.sql`d."createdAt" >= ${new Date(fechaDesde)}`);
        }
        if (fechaHasta) {
          conditions.push(Prisma.sql`d."createdAt" <= ${new Date(fechaHasta)}`);
        }

        // Aplicar filtro de alerta por updatedAt en SQL si corresponde
        if (alerta && alerta !== 'TODAS') {
          if (alerta === 'ROJAS') {
            conditions.push(Prisma.sql`d."updatedAt" <= ${fechaRoja}`);
          } else if (alerta === 'AMARILLAS') {
            conditions.push(Prisma.sql`d."updatedAt" > ${fechaRoja} AND d."updatedAt" <= ${fechaAmarilla}`);
          } else if (alerta === 'NORMALES') {
            conditions.push(Prisma.sql`d."updatedAt" > ${fechaAmarilla}`);
          }
        }

        const whereSql = Prisma.join(conditions, ' AND ');

        const sortLower = String(sortDias || '').toLowerCase();
        // Mapear: días desc => updatedAt ASC, días asc => updatedAt DESC
        const orderStr = sortDias
          ? (sortLower === 'desc' ? 'd."updatedAt" ASC' : 'd."updatedAt" DESC')
          : 'd."updatedAt" DESC';
        const orderSql = Prisma.raw(orderStr);

        const documentos = await prisma.$queryRaw`
          SELECT d.*, au.id as "_assignedToId", au."firstName" as "_assignedToFirstName", au."lastName" as "_assignedToLastName"
          FROM "documents" d
          LEFT JOIN "users" au ON au.id = d."assignedToId"
          WHERE ${whereSql}
          ORDER BY ${orderSql}
          OFFSET ${(parseInt(page) - 1) * parseInt(limit)} LIMIT ${parseInt(limit)}
        `;

        const countRows = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS count 
          FROM "documents" d 
          WHERE ${whereSql}
        `;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        const documentosConAlertas = documentos.map(doc => {
          const diasEnEstado = Math.floor((Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
          let alerta = { nivel: 'normal', icono: '', dias: diasEnEstado };
          if (diasEnEstado >= 15) alerta = { nivel: 'roja', icono: '🔥', dias: diasEnEstado };
          else if (diasEnEstado >= 7) alerta = { nivel: 'amarilla', icono: '⚠️', dias: diasEnEstado };

          // Reconstruir objeto assignedTo desde campos planos
          const assignedTo = doc._assignedToId ? {
            id: doc._assignedToId,
            firstName: doc._assignedToFirstName,
            lastName: doc._assignedToLastName,
            fullName: `${doc._assignedToFirstName} ${doc._assignedToLastName}`
          } : null;

          // Limpiar campos auxiliares
          const { _assignedToId, _assignedToFirstName, _assignedToLastName, ...cleanDoc } = doc;

          return {
            ...cleanDoc,
            assignedTo,
            alerta
          };
        });

        // Filtrar por alertas si se especifica
        let documentosFiltrados = documentosConAlertas;
        if (alerta && alerta !== 'TODAS') {
          documentosFiltrados = documentosConAlertas.filter(doc => {
            if (alerta === 'ROJAS') return doc.alerta.nivel === 'roja';
            if (alerta === 'AMARILLAS') return doc.alerta.nivel === 'amarilla';
            if (alerta === 'NORMALES') return doc.alerta.nivel === 'normal';
            return true;
          });
        }

        return res.json({
          success: true,
          data: {
            documentos: documentosFiltrados,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / parseInt(limit)),
              totalDocuments: total,
              limit: parseInt(limit)
            }
          }
        });
      } else {
        where.OR = [
          { clientName: { contains: searchTerm, mode: 'insensitive' } },
          { clientPhone: { contains: searchTerm } },
          { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
          { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } },
          { detalle_documento: { contains: searchTerm, mode: 'insensitive' } },
          { numeroFactura: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }

    if (matrizador && matrizador !== 'TODOS') {
      where.assignedToId = parseInt(matrizador);
    }

    if (estado && estado !== 'TODOS') {
      where.status = estado;
    }

    if (tipo && tipo !== 'TODOS') {
      where.documentType = tipo;
    }

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
    }

    // Aplicar filtro por estado de alerta usando updatedAt para que afecte paginación/total
    if (alerta && alerta !== 'TODAS') {
      where.updatedAt = where.updatedAt || {};
      if (alerta === 'ROJAS') {
        // días >= 15  => updatedAt <= fechaRoja
        where.updatedAt.lte = fechaRoja;
      } else if (alerta === 'AMARILLAS') {
        // 7 <= días < 15  => fechaRoja < updatedAt <= fechaAmarilla
        where.updatedAt.gt = fechaRoja;
        where.updatedAt.lte = fechaAmarilla;
      } else if (alerta === 'NORMALES') {
        // días < 7 => updatedAt > fechaAmarilla
        where.updatedAt.gt = fechaAmarilla;
      }
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documentos, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true }
          },
          createdBy: {
            select: { firstName: true, lastName: true }
          }
        },
        // Mapear: días desc => updatedAt ASC, días asc => updatedAt DESC
        orderBy: { updatedAt: String((sortDias || '')).toLowerCase() === 'desc' ? 'asc' : 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

    // Calcular alertas de tiempo para cada documento (basado en updatedAt para consistencia)
    const documentosConAlertas = documentos.map(doc => {
      const diasEnEstado = Math.floor((Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

      let alerta = { nivel: 'normal', icono: '', dias: diasEnEstado };

      if (diasEnEstado >= 15) {
        alerta = { nivel: 'roja', icono: '🔥', dias: diasEnEstado };
      } else if (diasEnEstado >= 7) {
        alerta = { nivel: 'amarilla', icono: '⚠️', dias: diasEnEstado };
      }

      return {
        ...doc,
        alerta
      };
    });

    // Filtrar por alertas si se especifica (redundante si ya se aplicó en where, pero se mantiene por seguridad)
    let documentosFiltrados = documentosConAlertas;
    if (alerta && alerta !== 'TODAS') {
      documentosFiltrados = documentosConAlertas.filter(doc => {
        if (alerta === 'ROJAS') return doc.alerta.nivel === 'roja';
        if (alerta === 'AMARILLAS') return doc.alerta.nivel === 'amarilla';
        if (alerta === 'NORMALES') return doc.alerta.nivel === 'normal';
        return true;
      });
    }

    res.json({
      success: true,
      data: {
        documentos: documentosFiltrados,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDocuments: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error en supervisión general:', error);
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
    logger.warn('Extensión unaccent no disponible');
    UNACCENT_SUPPORTED = false;
  }
  return UNACCENT_SUPPORTED;
}

/**
 * Resumen general del sistema para dashboard de supervisión
 * FUNCIONALIDAD: Métricas globales y alertas
 */
async function resumenGeneral(req, res) {
  try {
    // Contar documentos por estado
    const [total, pendientes, enProceso, listos, entregados] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { status: 'PENDIENTE' } }),
      prisma.document.count({ where: { status: 'EN_PROCESO' } }),
      prisma.document.count({ where: { status: 'LISTO' } }),
      prisma.document.count({ where: { status: 'ENTREGADO' } })
    ]);

    // Obtener todos los documentos para calcular alertas
    const todosDocumentos = await prisma.document.findMany({
      select: { createdAt: true, status: true }
    });

    // Calcular documentos con alertas
    let atrasadosAmarillo = 0;
    let atrasadosRojo = 0;

    todosDocumentos.forEach(doc => {
      const diasEnEstado = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      if (diasEnEstado >= 15) {
        atrasadosRojo++;
      } else if (diasEnEstado >= 7) {
        atrasadosAmarillo++;
      }
    });

    // Documentos procesados hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const procesadosHoy = await prisma.document.count({
      where: {
        updatedAt: { gte: hoy }
      }
    });

    const resumen = {
      total,
      pendientes,
      enProceso,
      listos,
      entregados,
      atrasadosAmarillo,
      atrasadosRojo,
      procesadosHoy
    };

    res.json({
      success: true,
      data: { resumen }
    });

  } catch (error) {
    logger.error('Error en resumen general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener lista de matrizadores para filtros
 * FUNCIONALIDAD: Reutiliza lógica de recepción
 */
async function obtenerMatrizadores(req, res) {
  try {
    const matrizadores = await prisma.user.findMany({
      where: {
        role: { in: ['MATRIZADOR', 'ARCHIVO'] },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: { firstName: 'asc' }
    });

    const formattedMatrizadores = matrizadores.map(m => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      fullName: `${m.firstName} ${m.lastName}`,
      role: m.role
    }));

    res.json({
      success: true,
      data: { matrizadores: formattedMatrizadores }
    });

  } catch (error) {
    logger.error('Error obteniendo matrizadores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener detalle de documento (solo lectura para documentos ajenos)
 * FUNCIONALIDAD: Puede ver cualquier documento, modificar solo los propios
 */
async function obtenerDetalleDocumento(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const documento = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        },
        usuarioEntrega: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Calcular alerta de tiempo
    const diasEnEstado = Math.floor((new Date() - new Date(documento.updatedAt)) / (1000 * 60 * 60 * 24));
    let alerta = { nivel: 'normal', icono: '', dias: diasEnEstado };

    if (diasEnEstado >= 15) {
      alerta = { nivel: 'roja', icono: '🔥', dias: diasEnEstado };
    } else if (diasEnEstado >= 7) {
      alerta = { nivel: 'amarilla', icono: '⚠️', dias: diasEnEstado };
    }

    // Determinar permisos: puede modificar solo documentos propios
    const puedeModificar = documento.assignedToId === userId;

    res.json({
      success: true,
      data: {
        documento: {
          ...documento,
          alerta
        },
        permisos: {
          puedeModificar,
          soloLectura: !puedeModificar
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo detalle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Revertir estado de documento (ARCHIVO)
 * Delega a la función central de revertDocumentStatus que maneja grupos automáticamente
 */
async function revertirEstadoDocumentoArchivo(req, res) {
  try {
    // Importar la función central de reversión
    const { revertDocumentStatus } = await import('./document-controller.js');

    // Delegar a la función central que ya maneja toda la lógica de grupos
    return await revertDocumentStatus(req, res);

  } catch (error) {
    logger.error('Error en revertirEstadoDocumentoArchivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// ============================================================================
// EXPORTAR FUNCIONES
// ============================================================================

export {
  // Funciones propias (como matrizador)
  dashboardArchivo,
  listarMisDocumentos,
  cambiarEstadoDocumento,
  procesarEntregaDocumento,

  // Funciones de supervisión global
  supervisionGeneral,
  resumenGeneral,
  obtenerMatrizadores,
  obtenerDetalleDocumento,
  revertirEstadoDocumentoArchivo,
  procesarEntregaGrupal
};
