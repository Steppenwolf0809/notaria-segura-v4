import prisma from '../db.js';
import { Prisma } from '@prisma/client';
import whatsappService from '../services/whatsapp-service.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';
import { getReversionCleanupData, STATUS_ORDER_LIST } from '../utils/status-transitions.js';
import cache from '../services/cache-service.js';

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
    console.error('Error en dashboard archivo:', error);
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
    const { search, estado, page = 1, limit = 10 } = req.query;

    // Filtros base
    const where = {
      assignedToId: userId
    };

    // Caché por usuario + filtros
    const cacheKey = cache.key({ scope: 'archivo:mis-documentos', userId, page: parseInt(page), limit: parseInt(limit), search, estado });
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Aplicar filtros adicionales
    const searchTerm = (search || '').trim();
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        // Consulta por raw para acentos
        const pattern = `%${searchTerm}%`;
        const documents = await prisma.$queryRaw`
          SELECT d.*
          FROM "documents" d
          WHERE d."assignedToId" = ${req.user.id} AND (
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )
          ORDER BY d."updatedAt" DESC
          OFFSET ${(parseInt(page) - 1) * parseInt(limit)} LIMIT ${parseInt(limit)}
        `;
        const countRows = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS count
          FROM "documents" d
          WHERE d."assignedToId" = ${req.user.id} AND (
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )
        `;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        const payload = {
          documentos: documents,
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
        where.OR = [
          { clientName: { contains: searchTerm, mode: 'insensitive' } },
          { clientPhone: { contains: searchTerm } },
          { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
          { detalle_documento: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }

    if (estado && estado !== 'TODOS') {
      where.status = estado;
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documentos, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

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
    console.error('Error listando documentos archivo:', error);
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
      include: {
        documentGroup: true
      }
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
      'EN_PROCESO': ['PENDIENTE', 'LISTO'],
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
      // Para documentos agrupados, usar el código del grupo si existe
      if (documento.isGrouped && documento.documentGroup?.verificationCode) {
        updateData.codigoRetiro = documento.documentGroup.verificationCode;
      } else {
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
              details: {
                codigoRetiro: codigoGenerado,
                previousStatus: documento.status,
                newStatus: nuevoEstado,
                generatedBy: `${req.user.firstName} ${req.user.lastName}`,
                userRole: 'ARCHIVO',
                timestamp: new Date().toISOString()
              },
              ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown'
            }
          });
        } catch (auditError) {
          console.error('Error registrando evento de código de retiro:', auditError);
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

    // 🔗 NUEVA FUNCIONALIDAD: Sincronización grupal
    let documentosActualizados = [];
    
    if (documento.isGrouped && documento.documentGroupId) {
      console.log(`🔗 Documento ${id} es parte de un grupo, sincronizando cambio de estado...`);
      
      // Sincronización grupal: si el código fue generado solo para este documento,
      // no propagar codigoRetiro al resto del grupo, solo el estado.
      const dataGroupSync = { ...updateData };
      if (codigoGenerado) {
        delete dataGroupSync.codigoRetiro;
      }

      // Actualizar todos los documentos del grupo
      await prisma.document.updateMany({
        where: {
          documentGroupId: documento.documentGroupId,
          isGrouped: true,
          assignedToId: userId // Solo documentos asignados al mismo usuario
        },
        data: dataGroupSync
      });
      
      // Obtener todos los documentos actualizados del grupo
      documentosActualizados = await prisma.document.findMany({
        where: {
          documentGroupId: documento.documentGroupId,
          isGrouped: true,
          assignedToId: userId
        }
      });
      
      console.log(`✅ Sincronizados ${documentosActualizados.length} documentos del grupo`);
    } else {
      // Actualizar solo el documento individual
      const documentoActualizado = await prisma.document.update({
        where: { id },
        data: updateData
      });
      documentosActualizados = [documentoActualizado];
    }

    // Usar el primer documento para las notificaciones (en grupos, todos son iguales)
    const documentoActualizado = documentosActualizados[0];

    // 📱 ENVIAR NOTIFICACIÓN WHATSAPP si se marca como LISTO
    let whatsappSent = false;
    let whatsappError = null;
    
    if (nuevoEstado === 'LISTO' && (codigoGenerado || updateData.codigoRetiro)) {
      // Respetar política de no notificar
      if (documento.notificationPolicy === 'no_notificar') {
        console.log('🔕 ARCHIVO: Política no_notificar activa, omitimos WhatsApp (LISTO)');
      } else {
      try {
        const clienteData = {
          clientName: documento.clientName,
          clientPhone: documento.clientPhone
        };
        
        const documentoData = {
          tipoDocumento: documento.documentType,
          protocolNumber: documento.protocolNumber
        };

        const whatsappResult = await whatsappService.enviarDocumentoListo(
          clienteData, 
          documentoData, 
          codigoGenerado || updateData.codigoRetiro
        );

        console.log('✅ Notificación WhatsApp enviada desde archivo:', whatsappResult.messageId || 'simulado');
        whatsappSent = true;
      } catch (error) {
        // No fallar la operación principal si WhatsApp falla
        console.error('⚠️ Error enviando WhatsApp desde archivo (operación continúa):', error.message);
        whatsappError = error.message;
      }
    }
    }
    // 📱 ENVIAR NOTIFICACIÓN WHATSAPP si se marca como ENTREGADO
    if (nuevoEstado === 'ENTREGADO' && documento.clientPhone && documento.notificationPolicy !== 'no_notificar') {
      try {
        // Preparar datos de entrega
        const datosEntrega = {
          entregado_a: updateData.entregadoA,
          deliveredTo: updateData.entregadoA,
          fecha: updateData.fechaEntrega,
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (ARCHIVO)`
        };

        // Enviar notificación de documento entregado
        const whatsappResult = await whatsappService.enviarDocumentoEntregado(
          {
            nombre: documento.clientName,
            clientName: documento.clientName,
            telefono: documento.clientPhone,
            clientPhone: documento.clientPhone
          },
          {
            tipo_documento: documento.documentType,
            tipoDocumento: documento.documentType,
            numero_documento: documento.protocolNumber,
            protocolNumber: documento.protocolNumber
          },
          datosEntrega
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega directa desde archivo:', whatsappResult.error);
        } else {
          console.log('📱 Notificación WhatsApp de entrega directa desde archivo enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega directa desde archivo:', error);
        whatsappError = error.message;
      }
    }

    // Preparar respuesta con información de sincronización
    const totalSincronizados = documentosActualizados.length;
    const mensajeBase = totalSincronizados > 1 
      ? `${totalSincronizados} documentos del grupo ${nuevoEstado.toLowerCase()}s`
      : `Documento ${nuevoEstado.toLowerCase()}`;

    res.json({
      success: true,
      data: { 
        documento: documentoActualizado,
        documentosSincronizados: totalSincronizados,
        esGrupo: totalSincronizados > 1,
        codigoGenerado,
        whatsappSent 
      },
      message: `${mensajeBase}${codigoGenerado ? ` - Código: ${codigoGenerado}` : ''}`
    });

  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
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

    // Determinar método de verificación para auditoría enriquecida
    const computedVerificationMethod = verificacionManual
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
        },
        // 🔗 NUEVA FUNCIONALIDAD: Incluir información de grupo
        documentGroup: {
          include: {
            documents: true
          }
        }
      }
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado o no asignado a usted'
      });
    }

    // Solo documentos LISTO pueden ser entregados
    if (documento.status !== 'LISTO') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden entregar documentos que estén LISTO'
      });
    }

    // Validar código de verificación (si no es manual)
    if (!verificacionManual) {
      if (!codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación es obligatorio'
        });
      }
      
      const expectedCode = documento.codigoRetiro || documento.verificationCode || documento.groupVerificationCode;
      if (!expectedCode || expectedCode !== codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto'
        });
      }
    }

    // 🔗 NUEVA FUNCIONALIDAD: Si el documento está agrupado, entregar todos los documentos del grupo
    let groupDocuments = [];
    if (documento.isGrouped && documento.documentGroupId) {
      console.log(`🔗 ARCHIVO: Documento ${documento.protocolNumber} está agrupado, entregando grupo completo`);
      
      // Buscar todos los documentos del grupo que estén LISTO
      const groupDocsToDeliver = await prisma.document.findMany({
        where: {
          documentGroupId: documento.documentGroupId,
          status: 'LISTO',
          id: { not: id }, // Excluir el documento actual
          isGrouped: true
        }
      });

      if (groupDocsToDeliver.length > 0) {
        console.log(`🚚 ARCHIVO: Entregando ${groupDocsToDeliver.length + 1} documentos del grupo automáticamente`);
        
        // Actualizar todos los documentos del grupo
        await prisma.document.updateMany({
          where: {
            id: { in: groupDocsToDeliver.map(doc => doc.id) }
          },
          data: {
            status: 'ENTREGADO',
            entregadoA,
            cedulaReceptor,
            relacionTitular,
            verificacionManual: verificacionManual || false,
            facturaPresenta: facturaPresenta || false,
            fechaEntrega: new Date(),
            usuarioEntregaId: userId,
            observacionesEntrega: observaciones || `Entregado grupalmente junto con ${documento.protocolNumber} por ARCHIVO`
          }
        });

        // Registrar eventos para todos los documentos del grupo
        for (const doc of groupDocsToDeliver) {
          await prisma.documentEvent.create({
            data: {
              documentId: doc.id,
              userId: userId,
              eventType: 'STATUS_CHANGED',
              description: `Documento entregado grupalmente por ARCHIVO a ${entregadoA}`,
              details: {
                entregadoA,
                cedulaReceptor,
                relacionTitular,
                verificacionManual: verificacionManual || false,
                facturaPresenta: facturaPresenta || false,
                deliveredWith: documento.protocolNumber,
                groupDelivery: true,
                deliveredBy: 'ARCHIVO'
              },
              personaRetiro: entregadoA,
              cedulaRetiro: cedulaReceptor || undefined,
              metodoVerificacion: computedVerificationMethod,
              observacionesRetiro: (observaciones || `Entregado grupalmente junto con ${documento.protocolNumber} por ARCHIVO`)
            }
          });
        }

        groupDocuments = groupDocsToDeliver;
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
        verificacionManual: verificacionManual || false,
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

    // 📱 ENVIAR NOTIFICACIÓN WHATSAPP
    let whatsappSent = false;
    let whatsappError = null;
    
    if (documentoActualizado.clientPhone) {
      try {
        // Preparar lista de documentos para el template (individual o grupal)
        const documentosParaMensaje = groupDocuments.length > 0 
          ? [documentoActualizado, ...groupDocuments]
          : [documentoActualizado];

        const datosEntrega = {
          entregado_a: entregadoA,
          deliveredTo: entregadoA,
          fecha: new Date(),
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (ARCHIVO)`,
          // Campos opcionales y condicionales
          cedulaReceptor,
          cedula_receptor: cedulaReceptor,
          relacionTitular,
          relacion_titular: relacionTitular,
          documentos: documentosParaMensaje,
          cantidadDocumentos: documentosParaMensaje.length
        };

        const whatsappResult = await whatsappService.enviarDocumentoEntregado(
          {
            nombre: documentoActualizado.clientName,
            clientName: documentoActualizado.clientName,
            telefono: documentoActualizado.clientPhone,
            clientPhone: documentoActualizado.clientPhone
          },
          {
            tipo_documento: documentoActualizado.documentType,
            tipoDocumento: documentoActualizado.documentType,
            numero_documento: documentoActualizado.protocolNumber,
            protocolNumber: documentoActualizado.protocolNumber,
            actoPrincipalDescripcion: documentoActualizado.actoPrincipalDescripcion,
            actoPrincipalValor: documentoActualizado.actoPrincipalValor
          },
          datosEntrega
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega archivo:', whatsappResult.error);
        } else {
          console.log('📱 Notificación WhatsApp de entrega archivo enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega archivo:', error);
        whatsappError = error.message;
      }
    }

    // Preparar mensaje de respuesta (incluir información de grupo)
    let message = groupDocuments.length > 0 
      ? `Grupo de ${groupDocuments.length + 1} documentos entregado exitosamente` 
      : 'Documento entregado exitosamente';
    
    if (whatsappSent) {
      message += ' y notificación WhatsApp enviada';
    } else if (documentoActualizado.clientPhone && whatsappError) {
      message += ', pero falló la notificación WhatsApp';
    }

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
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: documentoActualizado.clientPhone
        }
      }
    });

  } catch (error) {
    console.error('Error procesando entrega archivo:', error);
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
        const whereSql = Prisma.sql`${Prisma.join([
          Prisma.sql`(
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(d."actoPrincipalDescripcion") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )`,
          ...filterClauses
        ], Prisma.sql` AND `)}`;

        const sortLower = String(sortDias || '').toLowerCase();
        // Mapear: días desc => updatedAt ASC, días asc => updatedAt DESC
        const orderSql = sortDias
          ? (sortLower === 'desc' ? Prisma.sql`d."updatedAt" ASC` : Prisma.sql`d."updatedAt" DESC`)
          : Prisma.sql`d."updatedAt" DESC`;

        const documentos = await prisma.$queryRaw`
          SELECT d.*, au.id as "_assignedToId", au."firstName" as "_assignedToFirstName", au."lastName" as "_assignedToLastName"
          FROM "documents" d
          LEFT JOIN "users" au ON au.id = d."assignedToId"
          WHERE ${whereSql}
          ORDER BY ${orderSql}
          OFFSET ${(parseInt(page) - 1) * parseInt(limit)} LIMIT ${parseInt(limit)}
        `;
        const countRows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${whereSql}`;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        const documentosConAlertas = documentos.map(doc => {
          const diasEnEstado = Math.floor((Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
          let alerta = { nivel: 'normal', icono: '', dias: diasEnEstado };
          if (diasEnEstado >= 15) alerta = { nivel: 'roja', icono: '🔥', dias: diasEnEstado };
          else if (diasEnEstado >= 7) alerta = { nivel: 'amarilla', icono: '⚠️', dias: diasEnEstado };
          return { ...doc, alerta };
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
          { detalle_documento: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }

    if (matrizador && matrizador !== 'TODOS') {
      where.assignedToId = parseInt(matrizador);
    }

    if (estado && estado !== 'TODOS') {
      where.status = estado;
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
    console.error('Error en supervisión general:', error);
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
    console.warn('Extensión unaccent no disponible en ARCHIVO.');
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
    console.error('Error en resumen general:', error);
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
    console.error('Error obteniendo matrizadores:', error);
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
    console.error('Error obteniendo detalle:', error);
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
    console.error('Error en revertirEstadoDocumentoArchivo:', error);
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
  revertirEstadoDocumentoArchivo
};
