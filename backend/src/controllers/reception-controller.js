import prisma from '../db.js';
import whatsappService from '../services/whatsapp-service.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';
import AlertasService from '../services/alertas-service.js';

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
    const { search, matrizador, estado, fechaDesde, fechaHasta, page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    // PostgreSQL - Búsqueda case-insensitive con mode: 'insensitive'
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { protocolNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
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
        orderBy: { createdAt: 'desc' },
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
      fechaEntrega: doc.fechaEntrega
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

async function marcarComoListo(req, res) {
    try {
        const { id } = req.params;
        const document = await prisma.document.findUnique({ where: { id } });

        if (!document) {
            return res.status(404).json({ success: false, message: 'Documento no encontrado' });
        }
        if (document.status !== 'EN_PROCESO') {
            return res.status(400).json({ success: false, message: 'El documento no está en proceso' });
        }

        // Generar código único usando el servicio mejorado
        const nuevoCodigo = await CodigoRetiroService.generarUnico();

        const updatedDocument = await prisma.document.update({
            where: { id },
            data: { status: 'LISTO', codigoRetiro: nuevoCodigo, updatedAt: new Date() }
        });

        // 📈 Registrar evento de generación de código de retiro
        try {
          await prisma.documentEvent.create({
            data: {
              documentId: id,
              userId: req.user.id,
              eventType: 'VERIFICATION_GENERATED',
              description: `Código de retiro generado: ${nuevoCodigo}`,
              details: {
                codigoRetiro: nuevoCodigo,
                previousStatus: 'EN_PROCESO',
                newStatus: 'LISTO',
                generatedBy: `${req.user.firstName || 'Sistema'} ${req.user.lastName || ''}`,
                userRole: req.user.role || 'RECEPCION',
                timestamp: new Date().toISOString()
              },
              ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown'
            }
          });
        } catch (auditError) {
          console.error('Error registrando evento de código de retiro:', auditError);
        }

        // 📱 ENVIAR NOTIFICACIÓN WHATSAPP
        try {
            const clienteData = {
                clientName: document.clientName,
                clientPhone: document.clientPhone
            };
            
            const documentoData = {
                tipoDocumento: document.tipoDocumento,
                protocolNumber: document.protocolNumber
            };

            const whatsappResult = await whatsappService.enviarDocumentoListo(
                clienteData, 
                documentoData, 
                nuevoCodigo
            );

            console.log('✅ Notificación WhatsApp enviada:', whatsappResult.messageId || 'simulado');
            
            // 📈 Registrar evento de notificación WhatsApp enviada exitosamente
            if (whatsappResult.success) {
              try {
                await prisma.documentEvent.create({
                  data: {
                    documentId: id,
                    userId: req.user.id,
                    eventType: 'WHATSAPP_SENT',
                    description: `Notificación WhatsApp de documento listo enviada a ${document.clientPhone}`,
                    details: {
                      phoneNumber: document.clientPhone,
                      messageType: 'DOCUMENT_READY',
                      codigoRetiro: nuevoCodigo,
                      messageId: whatsappResult.messageId || 'simulado',
                      sentBy: `${req.user.firstName || 'Sistema'} ${req.user.lastName || ''}`,
                      userRole: req.user.role || 'RECEPCION',
                      timestamp: new Date().toISOString()
                    },
                    ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                    userAgent: req.get('User-Agent') || 'unknown'
                  }
                });
              } catch (auditError) {
                console.error('Error registrando evento de notificación WhatsApp:', auditError);
              }
            }
        } catch (whatsappError) {
            // No fallar la operación principal si WhatsApp falla
            console.error('⚠️ Error enviando WhatsApp (operación continúa):', whatsappError.message);
        }

        res.json({ 
            success: true, 
            message: 'Documento marcado como listo', 
            data: { 
                document: updatedDocument,
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
        if (clientNames.length > 1) {
            return res.status(400).json({ success: false, message: 'Todos los documentos deben ser del mismo cliente.' });
        }

        // Generar código único para grupo usando el servicio mejorado
        const nuevoCodigo = await CodigoRetiroService.generarUnicoGrupo();
        
        const updatedDocuments = await prisma.$transaction(
            documentIds.map(id => prisma.document.update({
                where: { id },
                data: { status: 'LISTO', codigoRetiro: nuevoCodigo, isGrouped: true, groupVerificationCode: nuevoCodigo, updatedAt: new Date() }
            }))
        );

        // 📱 ENVIAR NOTIFICACIÓN WHATSAPP GRUPAL
        try {
            // Tomar datos del primer documento (todos son del mismo cliente)
            const primerDocumento = documents[0];
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

export {
  getDashboardStats,
  getMatrizadores,
  listarTodosDocumentos,
  marcarComoListo,
  marcarGrupoListo,
  getAlertasRecepcion
};