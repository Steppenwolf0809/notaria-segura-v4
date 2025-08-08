import { PrismaClient } from '@prisma/client';
import { parseXmlDocument, generateVerificationCode } from '../services/xml-parser-service.js';
import DocumentGroupingService from '../services/document-grouping-service.js';
import MatrizadorAssignmentService from '../services/matrizador-assignment-service.js';
import { 
  formatEventDescription, 
  getEventContextInfo, 
  formatEventDate, 
  getEventTitle,
  getEventIcon, 
  getEventColor 
} from '../utils/event-formatter.js';
// const WhatsAppService = require('../services/whatsapp-service.js'); // Descomentar cuando exista

const prisma = new PrismaClient();

/**
 * Procesar XML y crear documento automáticamente
 * Función para CAJA: Upload XML, procesar y crear documento
 * @param {Object} req - Request object con archivo XML
 * @param {Object} res - Response object
 */
async function uploadXmlDocument(req, res) {
  try {
    // Verificar que el usuario sea CAJA
    if (req.user.role !== 'CAJA') {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA pueden subir documentos XML'
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo XML'
      });
    }

    // Verificar que es un archivo XML
    if (!req.file.originalname.toLowerCase().endsWith('.xml')) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe ser un XML válido'
      });
    }

    // Leer contenido del archivo XML
    const xmlContent = req.file.buffer.toString('utf8');
    
    // Procesar XML con el parser service
    const parsedData = await parseXmlDocument(xmlContent);
    
    // Verificar que no existe un documento con el mismo protocolNumber
    const existingDocument = await prisma.document.findUnique({
      where: { protocolNumber: parsedData.protocolNumber }
    });
    
    if (existingDocument) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un documento con número de protocolo: ${parsedData.protocolNumber}`
      });
    }
    
    // Crear documento en la base de datos
    const document = await prisma.document.create({
      data: {
        protocolNumber: parsedData.protocolNumber,
        clientName: parsedData.clientName,
        clientId: parsedData.clientId,
        clientPhone: parsedData.clientPhone,
        clientEmail: parsedData.clientEmail,
        documentType: parsedData.documentType,
        actoPrincipalDescripcion: parsedData.actoPrincipalDescripcion,
        actoPrincipalValor: parsedData.actoPrincipalValor,
        totalFactura: parsedData.totalFactura,
        matrizadorName: parsedData.matrizadorName,
        itemsSecundarios: parsedData.itemsSecundarios,
        xmlOriginal: parsedData.xmlOriginal,
        createdById: req.user.id
        // assignedToId será null inicialmente, se asignará automáticamente después
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // 📈 Registrar evento de creación de documento
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          userId: req.user.id,
          eventType: 'DOCUMENT_CREATED',
          description: `Documento creado desde XML por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: {
            protocolNumber: parsedData.protocolNumber,
            documentType: parsedData.documentType,
            clientName: parsedData.clientName,
            source: 'XML_UPLOAD',
            xmlFileName: req.file.originalname,
            fileSize: req.file.size,
            totalFactura: parsedData.totalFactura,
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de creación de documento:', auditError);
      // No fallar la creación del documento si hay error en auditoría
    }

    // 🤖 ASIGNACIÓN AUTOMÁTICA DE MATRIZADOR
    console.log(`🔍 Intentando asignación automática para matrizador: "${parsedData.matrizadorName}"`);
    const assignmentResult = await MatrizadorAssignmentService.autoAssignDocument(
      document.id, 
      parsedData.matrizadorName
    );

    // Actualizar el documento con la información de asignación
    let finalDocument = document;
    if (assignmentResult.assigned) {
      finalDocument = assignmentResult.document;
      console.log(`✅ Documento asignado automáticamente a: ${assignmentResult.matrizador.firstName} ${assignmentResult.matrizador.lastName}`);
    } else {
      console.log(`⚠️ Documento creado sin asignación automática: ${assignmentResult.message}`);
    }

    res.status(201).json({
      success: true,
      message: assignmentResult.assigned 
        ? `Documento XML procesado y asignado automáticamente a ${assignmentResult.matrizador.firstName} ${assignmentResult.matrizador.lastName}`
        : 'Documento XML procesado exitosamente (sin asignación automática)',
      data: {
        document: finalDocument,
        parsedInfo: {
          tipoDetectado: parsedData.documentType,
          actoPrincipal: parsedData.actoPrincipalDescripcion,
          valorPrincipal: parsedData.actoPrincipalValor,
          itemsIgnorados: parsedData.itemsSecundarios?.length || 0
        },
        autoAssignment: {
          attempted: true,
          successful: assignmentResult.assigned,
          message: assignmentResult.message,
          matrizadorFromXml: parsedData.matrizadorName,
          assignedTo: assignmentResult.assigned ? {
            id: assignmentResult.matrizador.id,
            name: `${assignmentResult.matrizador.firstName} ${assignmentResult.matrizador.lastName}`,
            email: assignmentResult.matrizador.email,
            role: assignmentResult.matrizador.role
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Error procesando XML:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando archivo XML',
      error: error.message
    });
  }
}

/**
 * Obtener todos los documentos para gestión de CAJA
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAllDocuments(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver todos los documentos'
      });
    }

    const documents = await prisma.document.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Asignar documento a matrizador
 * Función para CAJA: Asignar documento a un matrizador específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function assignDocument(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA o ADMIN pueden asignar documentos'
      });
    }

    const { id } = req.params;
    const { matrizadorId } = req.body;

    if (!matrizadorId) {
      return res.status(400).json({
        success: false,
        message: 'ID del matrizador es obligatorio'
      });
    }

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

    // Verificar que el matrizador existe y tiene el rol correcto
    const matrizador = await prisma.user.findUnique({
      where: { id: parseInt(matrizadorId) }
    });

    if (!matrizador || !['MATRIZADOR', 'ARCHIVO'].includes(matrizador.role)) {
      return res.status(400).json({
        success: false,
        message: 'Matrizador no válido'
      });
    }

    // Asignar documento y cambiar estado a EN_PROCESO
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        assignedToId: parseInt(matrizadorId),
        status: 'EN_PROCESO'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // 📈 Registrar evento de asignación de documento
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'DOCUMENT_ASSIGNED',
          description: `Documento asignado a ${matrizador.firstName} ${matrizador.lastName} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: {
            assignedFrom: document.assignedToId,
            assignedTo: parseInt(matrizadorId),
            matrizadorName: `${matrizador.firstName} ${matrizador.lastName}`,
            matrizadorRole: matrizador.role,
            previousStatus: document.status,
            newStatus: 'EN_PROCESO',
            assignmentType: 'MANUAL',
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de asignación de documento:', auditError);
      // No fallar la asignación del documento si hay error en auditoría
    }

    res.json({
      success: true,
      message: 'Documento asignado exitosamente',
      data: {
        document: updatedDocument
      }
    });

  } catch (error) {
    console.error('Error asignando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener documentos del matrizador autenticado
 * Función para MATRIZADOR: Ver solo documentos asignados a él
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getMyDocuments(req, res) {
  try {
    // Verificar que el usuario sea MATRIZADOR o ARCHIVO
    if (!['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo matrizadores pueden ver sus documentos asignados'
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        assignedToId: req.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length,
        byStatus: {
          PENDIENTE: documents.filter(d => d.status === 'PENDIENTE').length,
          EN_PROCESO: documents.filter(d => d.status === 'EN_PROCESO').length,
          LISTO: documents.filter(d => d.status === 'LISTO').length,
          ENTREGADO: documents.filter(d => d.status === 'ENTREGADO').length
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos del matrizador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Actualizar estado de documento
 * Función para MATRIZADOR: Cambiar estado de documento asignado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateDocumentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, deliveredTo } = req.body;

    console.log('🔄 updateDocumentStatus iniciado:', {
      documentId: id,
      newStatus: status,
      currentUser: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
      requestBody: req.body
    });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Nuevo estado es obligatorio'
      });
    }

    // Validar estados válidos
    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    // Buscar documento y verificar propiedad
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    console.log('📄 Documento encontrado:', {
      currentStatus: document.status,
      newStatus: status,
      assignedTo: document.assignedToId,
      userId: req.user.id
    });

    // Detectar si es una reversión (estado "hacia atrás")
    const statusOrder = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const currentIndex = statusOrder.indexOf(document.status);
    const newIndex = statusOrder.indexOf(status);
    const isReversion = newIndex < currentIndex;

    console.log('🔄 Análisis de cambio:', {
      currentStatus: document.status,
      newStatus: status,
      isReversion,
      requiresReason: isReversion
    });

    // Para reversiones, requerir razón obligatoria
    if (isReversion && !req.body.reversionReason) {
      return res.status(400).json({
        success: false,
        message: 'Las reversiones de estado requieren especificar una razón'
      });
    }

    // Preparar datos de actualización
    const updateData = { status };

    // Verificar permisos según rol y estado
    if (req.user.role === 'MATRIZADOR') {
      // Matrizadores solo pueden modificar sus documentos asignados
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar documentos asignados a ti'
        });
      }
      // Matrizadores pueden marcar como ENTREGADO sus documentos LISTO
      if (status === 'ENTREGADO') {
        if (document.status !== 'LISTO') {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO'
          });
        }
        updateData.usuarioEntregaId = req.user.id;
        updateData.fechaEntrega = new Date();
        updateData.entregadoA = deliveredTo || `Entrega directa por matrizador`;
        updateData.relacionTitular = 'directo';
      }
    } else if (req.user.role === 'ARCHIVO') {
      // ARCHIVO puede gestionar cualquier documento (supervisión completa)
      // Puede entregar documentos directamente como MATRIZADOR
      if (status === 'ENTREGADO') {
        if (document.status !== 'LISTO') {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO'
          });
        }
        updateData.usuarioEntregaId = req.user.id;
        updateData.fechaEntrega = new Date();
        updateData.entregadoA = deliveredTo || `Entrega directa por archivo`;
        updateData.relacionTitular = 'directo';
      }
    } else if (req.user.role === 'RECEPCION') {
      // Recepción solo puede marcar como ENTREGADO y solo documentos LISTO
      if (status !== 'ENTREGADO') {
        return res.status(403).json({
          success: false,
          message: 'RECEPCIÓN solo puede marcar documentos como entregados'
        });
      }
      if (document.status !== 'LISTO') {
        return res.status(403).json({
          success: false,
          message: 'Solo se pueden entregar documentos que estén LISTO'
        });
      }
    } else if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar documentos'
      });
    }

    // Generar código de verificación si se marca como LISTO
    if (status === 'LISTO' && !document.verificationCode) {
      updateData.verificationCode = generateVerificationCode();
    }

    // Actualizar documento
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // NUEVA FUNCIONALIDAD: Enviar notificación WhatsApp si se marca como LISTO
    let whatsappSent = false;
    let whatsappError = null;
    
    if (status === 'LISTO' && updatedDocument.clientPhone) {
      try {
        // Importar el servicio de WhatsApp
        const whatsappService = await import('../services/whatsapp-service.js');
        
        // Enviar notificación de documento listo
        const whatsappResult = await whatsappService.default.sendDocumentReadyNotification(updatedDocument);
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp:', whatsappResult.error);
        } else {
          console.log('Notificación WhatsApp enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp:', error);
        whatsappError = error.message;
      }
    }

    // NUEVA FUNCIONALIDAD: Enviar notificación WhatsApp para entrega directa de MATRIZADOR/ARCHIVO
    if (status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) && updatedDocument.clientPhone) {
      try {
        // Importar el servicio de WhatsApp
        const whatsappService = await import('../services/whatsapp-service.js');
        
        // Preparar datos de entrega
        const datosEntrega = {
          entregado_a: updateData.entregadoA,
          deliveredTo: updateData.entregadoA,
          fecha: updateData.fechaEntrega,
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
        };

        // Enviar notificación de documento entregado
        const whatsappResult = await whatsappService.default.enviarDocumentoEntregado(
          {
            nombre: updatedDocument.clientName,
            clientName: updatedDocument.clientName,
            telefono: updatedDocument.clientPhone,
            clientPhone: updatedDocument.clientPhone
          },
          {
            tipo_documento: updatedDocument.documentType,
            tipoDocumento: updatedDocument.documentType,
            numero_documento: updatedDocument.protocolNumber,
            protocolNumber: updatedDocument.protocolNumber
          },
          datosEntrega
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega directa:', whatsappResult.error);
        } else {
          console.log('📱 Notificación WhatsApp de entrega directa enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega directa:', error);
        whatsappError = error.message;
      }
    }

    // Registrar evento de auditoría
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'STATUS_CHANGED',
          description: `Estado cambiado de ${document.status} a ${status} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})${status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) ? ' - Entrega directa' : ''}${isReversion && req.body.reversionReason ? ` - Razón: ${req.body.reversionReason}` : ''}`,
          details: {
            previousStatus: document.status,
            newStatus: status,
            verificationCodeGenerated: status === 'LISTO' && updateData.verificationCode,
            whatsappSent: whatsappSent,
            whatsappError: whatsappError,
            userRole: req.user.role,
            deliveryType: status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) ? 'DIRECT_DELIVERY' : 'STANDARD_DELIVERY',
            entregadoA: status === 'ENTREGADO' ? updateData.entregadoA : undefined,
            isReversion,
            reason: req.body.reversionReason || null,
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de auditoría:', auditError);
    }

    // Preparar mensaje de respuesta
    let message = 'Estado del documento actualizado exitosamente';
    if (status === 'LISTO') {
      if (whatsappSent) {
        message += ' y notificación WhatsApp enviada';
      } else if (updatedDocument.clientPhone && whatsappError) {
        message += ', pero falló la notificación WhatsApp';
      } else if (!updatedDocument.clientPhone) {
        message += ' (sin teléfono para notificación WhatsApp)';
      }
    }

    res.json({
      success: true,
      message: message,
      data: {
        document: updatedDocument,
        changes: {
          previousStatus: document.status,
          newStatus: status,
          verificationCodeGenerated: status === 'LISTO' && updateData.verificationCode
        },
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: updatedDocument.clientPhone
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado del documento:', error);
    console.error('📊 Detalles del error:', {
      message: error.message,
      stack: error.stack,
      documentId: req.params.id,
      status: req.body.status,
      userRole: req.user.role,
      options: req.body
    });
    res.status(500).json({
      success: false,
      message: `Error interno del servidor: ${error.message}`
    });
  }
}

/**
 * Obtener detalle de documento específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentById(req, res) {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos según rol
    if (['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver documentos asignados a ti'
        });
      }
    } else if (!['CAJA', 'ADMIN', 'RECEPCION'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este documento'
      });
    }

    res.json({
      success: true,
      data: {
        document
      }
    });

  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener lista de matrizadores disponibles para asignación
 * Función para CAJA: Obtener matrizadores activos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAvailableMatrizadores(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver matrizadores'
      });
    }

    const matrizadores = await prisma.user.findMany({
      where: {
        role: {
          in: ['MATRIZADOR', 'ARCHIVO']
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            documents: {
              where: {
                status: {
                  in: ['PENDIENTE', 'EN_PROCESO']
                }
              }
            }
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    // Formatear datos con información de carga de trabajo
    const formattedMatrizadores = matrizadores.map(matrizador => ({
      id: matrizador.id,
      firstName: matrizador.firstName,
      lastName: matrizador.lastName,
      fullName: `${matrizador.firstName} ${matrizador.lastName}`,
      email: matrizador.email,
      activeDocuments: matrizador._count.documents
    }));

    res.json({
      success: true,
      data: {
        matrizadores: formattedMatrizadores,
        total: formattedMatrizadores.length
      }
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
 * Detectar documentos agrupables para un cliente - Matrizador, Recepción y Archivo
 */
async function detectGroupableDocuments(req, res) {
  try {
    // Validar roles autorizados para detectar agrupaciones
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR, RECEPCION o ARCHIVO pueden detectar agrupaciones'
      });
    }

    const { clientName, clientId } = req.body;
    const matrizadorId = req.user.id;
    
    console.log('🔍 Controller: detectGroupableDocuments solicitado:', {
      clientName,
      clientId: clientId || '(sin ID)',
      matrizadorId,
      userRole: req.user.role
    });
    
    const groupableDocuments = await DocumentGroupingService
      .detectGroupableDocuments({ clientName, clientId }, matrizadorId);
    
    res.json({
      success: true,
      groupableDocuments,
      canGroup: groupableDocuments.length >= 2
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Crear agrupación de documentos - Matrizador, Recepción y Archivo
 */
async function createDocumentGroup(req, res) {
  try {
    // Validar roles autorizados para agrupar documentos
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR, RECEPCION o ARCHIVO pueden crear grupos de documentos'
      });
    }

    const { documentIds, verifiedPhone, notificationMessage } = req.body;
    const matrizadorId = req.user.id;
    
    // Crear grupo y marcar documentos como LISTO
    const result = await DocumentGroupingService
      .createDocumentGroup(documentIds, matrizadorId);
    
    // Enviar notificación grupal si se solicita
    let whatsappSent = false;
    let whatsappError = null;
    
    console.log('🔍 DEBUG: Verificando condiciones para WhatsApp grupal:', {
      sendNotification: req.body.sendNotification,
      clientPhone: result.group.clientPhone,
      clientName: result.group.clientName,
      documentsCount: result.documents.length
    });
    
    if (req.body.sendNotification && result.group.clientPhone) {
      try {
        // Importar el servicio de WhatsApp
        const whatsappService = await import('../services/whatsapp-service.js');
        
        // Preparar datos del cliente
        const cliente = {
          nombre: result.group.clientName,
          telefono: result.group.clientPhone
        };
        
        // Enviar notificación grupal
        const whatsappResult = await whatsappService.default.enviarGrupoDocumentosListo(
          cliente,
          result.documents,
          result.group.verificationCode
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp grupal:', whatsappResult.error);
        } else {
          console.log('📱 Notificación grupal WhatsApp enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp grupal:', error);
        whatsappError = error.message;
      }
      
      // Marcar notificación enviada solo si fue exitosa
      if (whatsappSent) {
        await prisma.documentGroup.update({
          where: { id: result.group.id },
          data: {
            notificationSent: true,
            notificationSentAt: new Date()
          }
        });
      }
    }
    
    // Preparar mensaje de respuesta
    let message = `Grupo creado con ${result.documents.length} documentos`;
    if (req.body.sendNotification) {
      if (whatsappSent) {
        message += ' y notificación WhatsApp enviada';
      } else if (result.group.clientPhone && whatsappError) {
        message += ', pero falló la notificación WhatsApp';
      } else if (!result.group.clientPhone) {
        message += ' (sin teléfono para notificación WhatsApp)';
      }
    }

    res.json({
      success: true,
      message: message,
      group: result.group,
      verificationCode: result.group.verificationCode,
      whatsapp: {
        sent: whatsappSent,
        error: whatsappError,
        phone: result.group.clientPhone
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Entregar grupo de documentos
 */
async function deliverDocumentGroup(req, res) {
  try {
    const { verificationCode, deliveredTo, deliveryNotes } = req.body;
    const deliveredBy = req.user.id;
    
    const group = await DocumentGroupingService.deliverDocumentGroup(
      verificationCode,
      { deliveredTo, deliveredBy, deliveryNotes }
    );
    
    res.json({
      success: true,
      message: `Grupo de ${group.documentsCount} documentos entregado`,
      group
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 📦 PROCESAR MÚLTIPLES XML EN LOTE
 * Función para CAJA: Upload y procesar múltiples archivos XML
 * @param {Object} req - Request object con múltiples archivos XML
 * @param {Object} res - Response object
 */
async function uploadXmlDocumentsBatch(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA o ADMIN pueden subir documentos'
      });
    }

    // Verificar que se enviaron archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron archivos XML para procesar'
      });
    }

    console.log(`🚀 Iniciando procesamiento en lote de ${req.files.length} archivos XML...`);

    const resultados = [];
    const errores = [];
    const exitosos = [];

    // Procesar cada archivo secuencialmente para evitar sobrecargar la base de datos
    for (let i = 0; i < req.files.length; i++) {
      const archivo = req.files[i];
      
      try {
        console.log(`📄 Procesando archivo ${i + 1}/${req.files.length}: ${archivo.originalname}`);

        // Validar que es un archivo XML
        if (!archivo.originalname.toLowerCase().endsWith('.xml')) {
          errores.push({
            archivo: archivo.originalname,
            error: 'No es un archivo XML válido',
            indice: i + 1
          });
          continue;
        }

        // Parsear XML
        const xmlContent = archivo.buffer.toString('utf-8');
        const parsedData = await parseXmlDocument(xmlContent);

        // Verificar si ya existe un documento con este número de protocolo
        const existingDocument = await prisma.document.findUnique({
          where: { protocolNumber: parsedData.protocolNumber }
        });

        if (existingDocument) {
          errores.push({
            archivo: archivo.originalname,
            protocolNumber: parsedData.protocolNumber,
            error: `Ya existe un documento con número de protocolo: ${parsedData.protocolNumber}`,
            indice: i + 1
          });
          continue;
        }

        // Crear documento en la base de datos
        const document = await prisma.document.create({
          data: {
            protocolNumber: parsedData.protocolNumber,
            clientName: parsedData.clientName,
            clientId: parsedData.clientId,
            clientPhone: parsedData.clientPhone,
            clientEmail: parsedData.clientEmail,
            documentType: parsedData.documentType,
            actoPrincipalDescripcion: parsedData.actoPrincipalDescripcion,
            actoPrincipalValor: parsedData.actoPrincipalValor,
            totalFactura: parsedData.totalFactura,
            matrizadorName: parsedData.matrizadorName,
            itemsSecundarios: parsedData.itemsSecundarios,
            xmlOriginal: parsedData.xmlOriginal,
            createdById: req.user.id
          },
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        // 🤖 ASIGNACIÓN AUTOMÁTICA DE MATRIZADOR
        const assignmentResult = await MatrizadorAssignmentService.autoAssignDocument(
          document.id, 
          parsedData.matrizadorName
        );

        // CAJA SOLO PROCESA XMLs - Sin detección de agrupación
        // La agrupación es responsabilidad exclusiva del MATRIZADOR
        console.log(`📄 Documento procesado: "${parsedData.protocolNumber}" para cliente "${parsedData.clientName}"`);

        // Guardar resultado exitoso (SIN información de agrupación)
        exitosos.push({
          archivo: archivo.originalname,
          protocolNumber: parsedData.protocolNumber,
          documentId: document.id,
          asignacionAutomatica: assignmentResult.assigned,
          matrizadorAsignado: assignmentResult.assigned ? assignmentResult.matrizador : null,
          indice: i + 1
          // ❌ AGRUPACIÓN REMOVIDA - Solo para Matrizador
        });

        console.log(`✅ Archivo ${i + 1} procesado: ${archivo.originalname} (${parsedData.protocolNumber})`);

      } catch (archivoError) {
        console.error(`❌ Error procesando archivo ${archivo.originalname}:`, archivoError.message);
        errores.push({
          archivo: archivo.originalname,
          error: archivoError.message,
          indice: i + 1
        });
      }
    }

    // Generar respuesta con resumen
    const resumen = {
      totalArchivos: req.files.length,
      exitosos: exitosos.length,
      errores: errores.length,
      porcentajeExito: req.files.length > 0 ? Math.round((exitosos.length / req.files.length) * 100) : 0
    };

    console.log(`📊 Procesamiento en lote completado: ${exitosos.length}/${req.files.length} exitosos`);

    res.status(exitosos.length > 0 ? 201 : 400).json({
      success: exitosos.length > 0,
      message: `Procesamiento en lote completado: ${exitosos.length}/${req.files.length} archivos procesados exitosamente`,
      data: {
        resumen,
        exitosos,
        errores,
        detalles: {
          archivosProcesados: exitosos.map(e => ({
            archivo: e.archivo,
            protocolo: e.protocolNumber,
            asignado: e.asignacionAutomatica,
            matrizador: e.matrizadorAsignado ? `${e.matrizadorAsignado.firstName} ${e.matrizadorAsignado.lastName}` : null
          })),
          archivosConError: errores.map(e => ({
            archivo: e.archivo,
            error: e.error
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error en procesamiento en lote:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor durante procesamiento en lote',
      error: error.message
    });
  }
}

/**
 * 🔗 CREAR GRUPO INTELIGENTE DE DOCUMENTOS
 * Función optimizada para agrupar documentos detectados automáticamente en el batch upload
 * @param {Object} req - Request object con documentIds y configuración
 * @param {Object} res - Response object
 */
async function createSmartDocumentGroup(req, res) {
  try {
    const { documentIds, notificationPolicy = 'automatica', skipValidation = false } = req.body;
    
    // Validar roles autorizados para agrupación inteligente
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR, RECEPCION o ARCHIVO pueden crear grupos de documentos'
      });
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos 2 documentos para crear un grupo'
      });
    }

    console.log(`🔗 Creando grupo inteligente con ${documentIds.length} documentos...`);

    // Usar el servicio existente pero con lógica mejorada
    const groupResult = await DocumentGroupingService.createDocumentGroup(
      documentIds, 
      req.user.id // CAJA puede crear grupos aunque no sea matrizador
    );

    if (!groupResult) {
      return res.status(400).json({
        success: false,
        message: 'Error creando el grupo de documentos'
      });
    }

    // Enviar notificación según política
    if (notificationPolicy === 'automatica') {
      try {
        // Obtener el grupo creado para enviar notificación
        const documentGroup = await prisma.documentGroup.findUnique({
          where: { id: groupResult.groupId },
          include: {
            documents: {
              select: {
                id: true,
                protocolNumber: true,
                documentType: true,
                clientName: true,
                clientPhone: true
              }
            }
          }
        });

        if (documentGroup && documentGroup.documents.length > 0) {
          const WhatsAppService = await import('../services/whatsapp-service.js');
          await WhatsAppService.default.enviarGrupoDocumentosListo(
            {
              nombre: documentGroup.clientName,
              telefono: documentGroup.clientPhone
            },
            documentGroup.documents,
            documentGroup.verificationCode
          );

          console.log(`📱 Notificación grupal enviada para grupo ${groupResult.groupId}`);
        }
      } catch (notificationError) {
        console.warn('⚠️ Error enviando notificación grupal:', notificationError.message);
        // No fallar la creación del grupo por error de notificación
      }
    }

    res.status(201).json({
      success: true,
      message: `Grupo creado exitosamente con ${documentIds.length} documentos`,
      data: {
        groupId: groupResult.groupId,
        verificationCode: groupResult.verificationCode,
        documentsCount: documentIds.length,
        notificationSent: notificationPolicy === 'automatica'
      }
    });

  } catch (error) {
    console.error('Error creando grupo inteligente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * Actualizar estado de grupo de documentos
 * Función optimizada para mover todos los documentos de un grupo juntos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateDocumentGroupStatus(req, res) {
  try {
    const { documentGroupId, newStatus, deliveredTo, reversionReason } = req.body;
    
    console.log('🔄 updateDocumentGroupStatus iniciado:', {
      documentGroupId,
      newStatus,
      deliveredTo,
      userRole: req.user.role,
      userId: req.user.id
    });

    if (!documentGroupId || !newStatus) {
      return res.status(400).json({
        success: false,
        message: 'ID del grupo y nuevo estado son obligatorios'
      });
    }

    // Validar estados válidos
    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    // Buscar documentos del grupo y verificar permisos
    console.log('🔍 Buscando documentos del grupo:', documentGroupId);
    const groupDocuments = await prisma.document.findMany({
      where: { 
        documentGroupId,
        isGrouped: true
      },
      include: {
        documentGroup: true
      }
    });

    console.log('📄 Documentos encontrados:', {
      count: groupDocuments.length,
      documents: groupDocuments.map(doc => ({
        id: doc.id,
        status: doc.status,
        assignedToId: doc.assignedToId,
        clientName: doc.clientName
      }))
    });

    if (groupDocuments.length === 0) {
      console.log('❌ Grupo de documentos no encontrado:', documentGroupId);
      return res.status(404).json({
        success: false,
        message: 'Grupo de documentos no encontrado'
      });
    }

    // Verificar permisos - todos los documentos deben pertenecer al usuario
    const userRole = req.user.role;
    if (['MATRIZADOR', 'ARCHIVO'].includes(userRole)) {
      const unauthorizedDocs = groupDocuments.filter(doc => doc.assignedToId !== req.user.id);
      if (unauthorizedDocs.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar documentos asignados a ti'
        });
      }
    }

    // Preparar datos de actualización
    const updateData = { status: newStatus };

    // Generar códigos de verificación si se marca como LISTO
    if (newStatus === 'LISTO') {
      // Para grupos, usar el código del grupo
      const groupCode = groupDocuments[0].documentGroup?.verificationCode;
      if (groupCode) {
        updateData.verificationCode = groupCode;
      }
    }

    // Si se marca como ENTREGADO, registrar datos de entrega
    if (newStatus === 'ENTREGADO') {
      updateData.usuarioEntregaId = req.user.id;
      updateData.fechaEntrega = new Date();
      updateData.entregadoA = deliveredTo || `Entrega por ${req.user.role.toLowerCase()}`;
      updateData.relacionTitular = 'directo';
    }

    // Actualizar todos los documentos del grupo
    console.log('📝 Actualizando documentos con datos:', updateData);
    const updateResult = await prisma.document.updateMany({
      where: { 
        documentGroupId,
        isGrouped: true
      },
      data: updateData
    });
    
    console.log('✅ Documentos actualizados:', {
      count: updateResult.count,
      newStatus
    });

    // Obtener documentos actualizados
    const updatedDocuments = await prisma.document.findMany({
      where: { 
        documentGroupId,
        isGrouped: true
      },
      include: {
        documentGroup: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Enviar notificación grupal si corresponde
    let whatsappSent = false;
    let whatsappError = null;
    
    if (newStatus === 'LISTO' && updatedDocuments[0]?.clientPhone && updatedDocuments[0]?.documentGroup) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');
        
        const cliente = {
          nombre: updatedDocuments[0].clientName,
          telefono: updatedDocuments[0].clientPhone
        };

        const whatsappResult = await whatsappService.default.enviarGrupoDocumentosListo(
          cliente,
          updatedDocuments,
          updatedDocuments[0].documentGroup.verificationCode
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp grupal:', whatsappResult.error);
        } else {
          console.log('📱 Notificación grupal WhatsApp enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp grupal:', error);
        whatsappError = error.message;
      }
    } else {
      console.log('❌ WhatsApp grupal NO enviado. Razones:', {
        newStatus: newStatus !== 'LISTO' ? 'Estado no es LISTO' : 'OK',
        clientPhone: !updatedDocuments[0]?.clientPhone ? 'clientPhone está vacío' : 'OK',
        hasGroup: !updatedDocuments[0]?.documentGroup ? 'Sin grupo de documentos' : 'OK'
      });
    }

    // 🆕 CORRECCIÓN: Enviar notificación WhatsApp para estado ENTREGADO
    if (newStatus === 'ENTREGADO' && updatedDocuments[0]?.clientPhone) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');
        
        const cliente = {
          nombre: updatedDocuments[0].clientName,
          clientName: updatedDocuments[0].clientName,
          telefono: updatedDocuments[0].clientPhone,
          clientPhone: updatedDocuments[0].clientPhone
        };

        const datosEntrega = {
          entregado_a: deliveredTo || `Entrega grupal por ${req.user.role.toLowerCase()}`,
          deliveredTo: deliveredTo || `Entrega grupal por ${req.user.role.toLowerCase()}`,
          fecha: new Date(),
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
        };

        // Enviar notificación de grupo entregado usando la función de documento individual
        // pero con información del grupo
        const whatsappResult = await whatsappService.default.enviarDocumentoEntregado(
          cliente,
          {
            tipo_documento: `Grupo de ${updatedDocuments.length} documento(s)`,
            tipoDocumento: `Grupo de ${updatedDocuments.length} documento(s)`,
            numero_documento: documentGroupId,
            protocolNumber: documentGroupId
          },
          datosEntrega
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega grupal:', whatsappResult.error);
        } else {
          console.log('📱 Notificación grupal WhatsApp de entrega enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega grupal:', error);
        whatsappError = error.message;
      }
    }

    res.json({
      success: true,
      message: `Grupo de ${updateResult.count} documentos actualizado exitosamente`,
      data: {
        documentsUpdated: updateResult.count,
        newStatus,
        groupId: documentGroupId,
        documents: updatedDocuments,
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: updatedDocuments[0]?.clientPhone
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado del grupo:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
}

/**
 * Actualizar información compartida de grupo de documentos
 * Función para sincronizar datos como teléfono, email entre documentos del mismo grupo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateDocumentGroupInfo(req, res) {
  try {
    const { documentGroupId, sharedData } = req.body;

    if (!documentGroupId || !sharedData) {
      return res.status(400).json({
        success: false,
        message: 'ID del grupo y datos compartidos son obligatorios'
      });
    }

    // Buscar documentos del grupo
    const groupDocuments = await prisma.document.findMany({
      where: { 
        documentGroupId,
        isGrouped: true
      }
    });

    if (groupDocuments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de documentos no encontrado'
      });
    }

    // Verificar permisos - al menos uno debe pertenecer al usuario
    const userRole = req.user.role;
    if (['MATRIZADOR', 'ARCHIVO'].includes(userRole)) {
      const hasPermission = groupDocuments.some(doc => doc.assignedToId === req.user.id);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar este grupo'
        });
      }
    }

    // Preparar datos que se pueden actualizar de forma compartida
    const updateData = {};
    
    // Solo permitir actualizar campos específicos que son compartidos
    const allowedFields = ['clientPhone', 'clientEmail', 'clientName'];
    allowedFields.forEach(field => {
      if (sharedData[field] !== undefined) {
        updateData[field] = sharedData[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos válidos para actualizar'
      });
    }

    // Actualizar todos los documentos del grupo
    const updateResult = await prisma.document.updateMany({
      where: { 
        documentGroupId,
        isGrouped: true
      },
      data: updateData
    });

    // También actualizar el grupo si existe
    if (updateData.clientPhone || updateData.clientEmail || updateData.clientName) {
      await prisma.documentGroup.update({
        where: { id: documentGroupId },
        data: {
          clientPhone: updateData.clientPhone,
          clientEmail: updateData.clientEmail,
          clientName: updateData.clientName
        }
      });
    }

    // Obtener documentos actualizados
    const updatedDocuments = await prisma.document.findMany({
      where: { 
        documentGroupId,
        isGrouped: true
      }
    });

    res.json({
      success: true,
      message: `Información compartida actualizada en ${updateResult.count} documentos del grupo`,
      data: {
        documentsUpdated: updateResult.count,
        groupId: documentGroupId,
        updatedFields: Object.keys(updateData),
        documents: updatedDocuments
      }
    });

  } catch (error) {
    console.error('Error actualizando información del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Entregar documento con información completa de recepción
 * Función para RECEPCION: Marcar documento como entregado con detalles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function deliverDocument(req, res) {
  try {
    const { id } = req.params;
    const {
      entregadoA,
      cedulaReceptor,
      relacionTitular,
      codigoVerificacion,
      verificacionManual,
      facturaPresenta,
      observacionesEntrega
    } = req.body;

    // Verificar que el usuario sea RECEPCION, ADMIN, CAJA o MATRIZADOR
    if (!['RECEPCION', 'ADMIN', 'CAJA', 'MATRIZADOR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo RECEPCIÓN y MATRIZADORES pueden entregar documentos'
      });
    }

    // Validar datos requeridos
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

    // Buscar documento con información de grupo (ajustado al esquema actual)
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        },
        documentGroup: {
          include: {
            documents: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Validar permisos específicos por rol
    if (req.user.role === 'MATRIZADOR') {
      // Los matrizadores solo pueden entregar sus propios documentos
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes entregar documentos asignados a ti'
        });
      }
    }

    // Verificar que el documento esté LISTO
    if (document.status !== 'LISTO') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden entregar documentos que estén LISTO'
      });
    }

    // Verificar código de verificación si no es manual
    if (!verificacionManual) {
      if (!codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación es obligatorio'
        });
      }
      
      if (document.verificationCode !== codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto'
        });
      }
    }

    // Si el documento está agrupado, entregar todos los documentos del grupo
    let groupDocuments = [];
    if (document.documentGroup && Array.isArray(document.documentGroup.documents)) {
      const allGroupDocuments = document.documentGroup.documents;

      // Entregar todos los documentos del grupo que estén LISTO (excepto el actual)
      const documentsToDeliver = allGroupDocuments.filter(doc => 
        doc.status === 'LISTO' && doc.id !== id
      );

      if (documentsToDeliver.length > 0) {
        console.log(`🚚 Entregando ${documentsToDeliver.length + 1} documentos del grupo automáticamente`);

        // Actualizar todos los documentos del grupo
        await prisma.document.updateMany({
          where: {
            id: { in: documentsToDeliver.map(doc => doc.id) }
          },
          data: {
            status: 'ENTREGADO',
            entregadoA,
            cedulaReceptor,
            relacionTitular,
            verificacionManual: verificacionManual || false,
            facturaPresenta: facturaPresenta || false,
            fechaEntrega: new Date(),
            usuarioEntregaId: req.user.id,
            observacionesEntrega: observacionesEntrega || `Entregado grupalmente junto con ${document.protocolNumber}`
          }
        });

        // Registrar eventos para todos los documentos del grupo
        for (const doc of documentsToDeliver) {
          await prisma.documentEvent.create({
            data: {
              documentId: doc.id,
              userId: req.user.id,
              eventType: 'STATUS_CHANGED',
              description: `Documento entregado grupalmente a ${entregadoA}`,
              details: {
                previousStatus: 'LISTO',
                newStatus: 'ENTREGADO',
                entregadoA,
                cedulaReceptor,
                relacionTitular,
                verificacionManual: verificacionManual || false,
                facturaPresenta: facturaPresenta || false,
                deliveredWith: document.protocolNumber,
                groupDelivery: true,
                timestamp: new Date().toISOString()
              }
            }
          });
        }

        groupDocuments = documentsToDeliver;
      }
    }

    // Actualizar documento principal con información de entrega
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'ENTREGADO',
        entregadoA,
        cedulaReceptor,
        relacionTitular,
        verificacionManual: verificacionManual || false,
        facturaPresenta: facturaPresenta || false,
        fechaEntrega: new Date(),
        usuarioEntregaId: req.user.id,
        observacionesEntrega
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

    // Enviar notificación WhatsApp de entrega
    let whatsappSent = false;
    let whatsappError = null;
    
    if (updatedDocument.clientPhone) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');
        
        const datosEntrega = {
          entregado_a: entregadoA,
          deliveredTo: entregadoA,
          fecha: new Date(),
          usuario_entrega: `${req.user.firstName} ${req.user.lastName}`,
          // Claves adicionales que esperan los templates del servicio
          entregadoA,
          cedulaReceptor,
          relacionTitular
        };

        const whatsappResult = await whatsappService.default.enviarDocumentoEntregado(
          {
            nombre: updatedDocument.clientName,
            clientName: updatedDocument.clientName,
            telefono: updatedDocument.clientPhone,
            clientPhone: updatedDocument.clientPhone
          },
          {
            tipo_documento: updatedDocument.documentType,
            tipoDocumento: updatedDocument.documentType,
            numero_documento: updatedDocument.protocolNumber,
            protocolNumber: updatedDocument.protocolNumber
          },
          datosEntrega
        );
        
        whatsappSent = whatsappResult.success;
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
        }
      } catch (error) {
        console.error('Error enviando WhatsApp de entrega:', error);
        whatsappError = error.message;
      }
    }

    // Registrar evento de auditoría
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'STATUS_CHANGED',
          description: `Documento entregado a ${entregadoA} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: {
            previousStatus: 'LISTO',
            newStatus: 'ENTREGADO',
            entregadoA,
            cedulaReceptor,
            relacionTitular,
            verificacionManual,
            facturaPresenta,
            observacionesEntrega,
            whatsappSent,
            whatsappError,
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de auditoría:', auditError);
    }

    // Preparar mensaje de respuesta
    const totalDelivered = 1 + groupDocuments.length;
    let message = totalDelivered > 1 
      ? `${totalDelivered} documentos entregados exitosamente (entrega grupal)`
      : 'Documento entregado exitosamente';
    
    if (whatsappSent) {
      message += ' y notificación WhatsApp enviada';
    } else if (updatedDocument.clientPhone && whatsappError) {
      message += ', pero falló la notificación WhatsApp';
    }

    res.json({
      success: true,
      message,
      data: {
        document: updatedDocument,
        delivery: {
          entregadoA,
          cedulaReceptor,
          relacionTitular,
          verificacionManual,
          facturaPresenta,
          fechaEntrega: updatedDocument.fechaEntrega,
          usuarioEntrega: `${req.user.firstName} ${req.user.lastName}`,
          observacionesEntrega
        },
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: updatedDocument.clientPhone
        },
        groupDelivery: {
          isGroupDelivery: groupDocuments.length > 0,
          totalDocuments: totalDelivered,
          groupDocuments: groupDocuments.map(doc => ({
            id: doc.id,
            protocolNumber: doc.protocolNumber,
            documentType: doc.documentType,
            status: 'ENTREGADO'
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error entregando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * ============================================================================
 * FUNCIONES DE EDICIÓN DE DOCUMENTOS
 * Implementación conservadora siguiendo estructura existente
 * ============================================================================
 */

/**
 * Validar permisos de edición según rol del usuario
 * @param {Object} user - Usuario autenticado
 * @param {Object} document - Documento a editar
 * @returns {Object} - { canEdit: boolean, editableFields: Array }
 */
function validateEditPermissions(user, document) {
  const { role, id: userId } = user;
  
  // Definir campos editables por rol
  const fieldsByRole = {
    ADMIN: ['clientPhone', 'clientName', 'clientEmail', 'actoPrincipalDescripcion', 'detalle_documento', 'comentarios_recepcion'],
    MATRIZADOR: ['clientPhone', 'clientName', 'clientEmail', 'actoPrincipalDescripcion', 'detalle_documento', 'comentarios_recepcion'],
    ARCHIVO: ['clientPhone', 'clientName', 'clientEmail', 'actoPrincipalDescripcion', 'detalle_documento', 'comentarios_recepcion'],
    RECEPCION: ['clientPhone', 'clientEmail', 'comentarios_recepcion'],
    CAJA: [] // Caja no puede editar información de documento
  };

  // Verificar permisos específicos por rol
  switch (role) {
    case 'ADMIN':
      return { canEdit: true, editableFields: fieldsByRole.ADMIN };
      
    case 'MATRIZADOR':
    case 'ARCHIVO':
      // Solo puede editar sus documentos asignados
      if (document.assignedToId === userId) {
        return { canEdit: true, editableFields: fieldsByRole[role] };
      }
      return { canEdit: false, editableFields: [], reason: 'Solo puedes editar documentos asignados a ti' };
      
    case 'RECEPCION':
      // Solo documentos listos para entrega o entregados
      if (['LISTO', 'ENTREGADO'].includes(document.status)) {
        return { canEdit: true, editableFields: fieldsByRole.RECEPCION };
      }
      return { canEdit: false, editableFields: [], reason: 'Solo puedes editar documentos listos para entrega' };
      
    default:
      return { canEdit: false, editableFields: [], reason: 'Sin permisos de edición' };
  }
}

/**
 * Validar datos de entrada para edición
 * @param {Object} data - Datos a validar
 * @param {Array} allowedFields - Campos permitidos para el usuario
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
function validateEditData(data, allowedFields) {
  const errors = [];

  // Verificar que solo se envíen campos permitidos
  const providedFields = Object.keys(data);
  const unauthorizedFields = providedFields.filter(field => !allowedFields.includes(field));
  
  if (unauthorizedFields.length > 0) {
    errors.push(`Campos no permitidos: ${unauthorizedFields.join(', ')}`);
  }

  // Validar formato de teléfono si se proporciona
  if (data.clientPhone !== undefined) {
    if (data.clientPhone && !/^[0-9+\-\s]{7,15}$/.test(data.clientPhone)) {
      errors.push('Formato de teléfono inválido (7-15 dígitos, puede incluir +, -, espacios)');
    }
  }

  // Validar longitud de campos de texto
  if (data.detalle_documento !== undefined) {
    if (data.detalle_documento && data.detalle_documento.length > 500) {
      errors.push('Detalle del documento muy largo (máximo 500 caracteres)');
    }
  }

  if (data.comentarios_recepcion !== undefined) {
    if (data.comentarios_recepcion && data.comentarios_recepcion.length > 300) {
      errors.push('Comentarios de recepción muy largos (máximo 300 caracteres)');
    }
  }

  // Validar nombre del cliente
  if (data.clientName !== undefined) {
    if (!data.clientName || data.clientName.trim().length < 2) {
      errors.push('Nombre del cliente debe tener al menos 2 caracteres');
    }
    if (data.clientName && data.clientName.length > 100) {
      errors.push('Nombre del cliente muy largo (máximo 100 caracteres)');
    }
  }

  // Validar acto principal descripción
  if (data.actoPrincipalDescripcion !== undefined) {
    if (!data.actoPrincipalDescripcion || data.actoPrincipalDescripcion.trim().length < 5) {
      errors.push('Descripción del acto principal debe tener al menos 5 caracteres');
    }
    if (data.actoPrincipalDescripcion && data.actoPrincipalDescripcion.length > 300) {
      errors.push('Descripción del acto principal muy larga (máximo 300 caracteres)');
    }
  }

  // Validar valor del acto principal
  if (data.actoPrincipalValor !== undefined) {
    const valor = parseFloat(data.actoPrincipalValor);
    if (isNaN(valor) || valor < 0) {
      errors.push('Valor del acto principal debe ser un número mayor o igual a 0');
    }
    if (valor > 1000000) {
      errors.push('Valor del acto principal muy alto (máximo $1,000,000)');
    }
  }

  // Validar email del cliente
  if (data.clientEmail !== undefined) {
    if (data.clientEmail && data.clientEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.clientEmail)) {
        errors.push('Formato de email inválido');
      }
      if (data.clientEmail.length > 100) {
        errors.push('Email muy largo (máximo 100 caracteres)');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Obtener información editable de un documento
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getEditableDocumentInfo(req, res) {
  try {
    const { id } = req.params;

    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos
    const permissions = validateEditPermissions(req.user, document);
    
    if (!permissions.canEdit) {
      return res.status(403).json({
        success: false,
        message: permissions.reason || 'Sin permisos para editar este documento'
      });
    }

    // Preparar información editable
    const editableInfo = {
      id: document.id,
      protocolNumber: document.protocolNumber,
      currentValues: {},
      editableFields: permissions.editableFields,
      readOnlyInfo: {
        documentType: document.documentType,
        status: document.status,
        createdAt: document.createdAt,
        assignedTo: document.assignedTo ? 
          `${document.assignedTo.firstName} ${document.assignedTo.lastName}` : null,
        actoPrincipalDescripcion: document.actoPrincipalDescripcion,
        actoPrincipalValor: document.actoPrincipalValor,
        totalFactura: document.totalFactura
      }
    };

    // Agregar valores actuales solo de campos editables
    permissions.editableFields.forEach(field => {
      editableInfo.currentValues[field] = document[field];
    });

    res.json({
      success: true,
      data: editableInfo
    });

  } catch (error) {
    console.error('Error obteniendo información editable:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Actualizar información de documento
 * @param {Object} req - Request object  
 * @param {Object} res - Response object
 */
async function updateDocumentInfo(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos
    const permissions = validateEditPermissions(req.user, document);
    
    if (!permissions.canEdit) {
      return res.status(403).json({
        success: false,
        message: permissions.reason || 'Sin permisos para editar este documento'
      });
    }

    // Debug: Log de los datos recibidos
    console.log('🔍 DEBUG - Datos recibidos del frontend:', updateData);
    console.log('🔍 DEBUG - Campos permitidos para el rol:', permissions.editableFields);
    
    // Validar datos
    const validation = validateEditData(updateData, permissions.editableFields);
    
    if (!validation.isValid) {
      console.log('❌ DEBUG - Errores de validación:', validation.errors);
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.errors
      });
    }

    // Preparar datos para actualización (solo campos permitidos)
    const allowedUpdateData = {};
    permissions.editableFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        allowedUpdateData[field] = updateData[field];
      }
    });

    // Verificar si hay cambios reales
    const hasChanges = Object.keys(allowedUpdateData).some(
      field => document[field] !== allowedUpdateData[field]
    );

    if (!hasChanges) {
      return res.status(400).json({
        success: false,
        message: 'No se detectaron cambios en la información'
      });
    }

    // Actualizar documento
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...allowedUpdateData,
        updatedAt: new Date() // Actualizar timestamp
      }
    });

    // Registrar evento de auditoría - NUEVA FUNCIONALIDAD
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'INFO_EDITED',
          description: `Información actualizada por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: {
            fieldsChanged: changedFields,
            changes: changesSummary,
            userRole: req.user.role,
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      // No fallar la actualización si hay error en auditoría
      console.error('Error registrando evento de auditoría:', auditError);
    }
    
    // Preparar respuesta con información de cambios
    const changedFields = Object.keys(allowedUpdateData);
    const changesSummary = changedFields.map(field => ({
      field,
      oldValue: document[field],
      newValue: allowedUpdateData[field]
    }));

    res.json({
      success: true,
      message: `Información actualizada exitosamente. Campos modificados: ${changedFields.join(', ')}`,
      data: {
        document: {
          id: updatedDocument.id,
          protocolNumber: updatedDocument.protocolNumber,
          ...allowedUpdateData
        },
        changes: changesSummary,
        updatedBy: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role
        },
        updatedAt: updatedDocument.updatedAt
      }
    });

  } catch (error) {
    console.error('Error actualizando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

/**
 * ============================================================================
 * SISTEMA DE CONFIRMACIONES Y DESHACER
 * Implementación conservadora que mantiene auditoría completa
 * ============================================================================
 */

/**
 * Deshacer último cambio de estado de un documento
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function undoDocumentStatusChange(req, res) {
  try {
    const { documentId, changeId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del documento es obligatorio'
      });
    }

    // Buscar el documento actual
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos - solo el usuario que hizo el cambio o ADMIN puede deshacer
    let lastChangeEvent = null;
    
    if (changeId) {
      // Buscar evento específico por ID
      lastChangeEvent = await prisma.documentEvent.findUnique({
        where: { id: changeId },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true }
          }
        }
      });
    } else {
      // Buscar último cambio de estado del documento
      lastChangeEvent = await prisma.documentEvent.findFirst({
        where: {
          documentId: documentId,
          eventType: 'STATUS_CHANGED'
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true }
          }
        }
      });
    }

    if (!lastChangeEvent) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el cambio de estado para deshacer'
      });
    }

    // Verificar que el cambio no sea muy antiguo (máximo 10 minutos)
    const changeTime = new Date(lastChangeEvent.createdAt);
    const now = new Date();
    const timeDifference = now - changeTime;
    const maxUndoTime = 10 * 60 * 1000; // 10 minutos

    if (timeDifference > maxUndoTime) {
      return res.status(400).json({
        success: false,
        message: 'El cambio es muy antiguo para ser deshecho (máximo 10 minutos)'
      });
    }

    // Verificar permisos
    const isOwner = lastChangeEvent.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes deshacer tus propios cambios'
      });
    }

    // Extraer estado anterior del detalle del evento
    const eventDetails = lastChangeEvent.details;
    const previousStatus = eventDetails.previousStatus;
    
    if (!previousStatus) {
      return res.status(400).json({
        success: false,
        message: 'No se puede determinar el estado anterior'
      });
    }

    // Verificar que el estado actual del documento coincida con el evento
    if (document.status !== eventDetails.newStatus) {
      return res.status(400).json({
        success: false,
        message: 'El estado del documento ha cambiado desde el último evento registrado'
      });
    }

    // CONSERVADOR: Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Revertir estado del documento
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          status: previousStatus,
          // CONSERVADOR: Si se deshace un cambio a LISTO, limpiar código de verificación solo si se generó en ese cambio
          ...(eventDetails.newStatus === 'LISTO' && eventDetails.verificationCodeGenerated && {
            verificationCode: null
          })
        }
      });

      // Registrar evento de deshacer
      const undoEvent = await tx.documentEvent.create({
        data: {
          documentId: documentId,
          userId: req.user.id,
          eventType: 'STATUS_UNDO',
          description: `Cambio deshecho: ${eventDetails.newStatus} → ${previousStatus} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: {
            originalEventId: lastChangeEvent.id,
            revertedFrom: eventDetails.newStatus,
            revertedTo: previousStatus,
            originalEventTime: lastChangeEvent.createdAt,
            timeSinceChange: timeDifference,
            undoneBy: {
              id: req.user.id,
              name: `${req.user.firstName} ${req.user.lastName}`,
              role: req.user.role
            },
            originalChangedBy: {
              id: lastChangeEvent.userId,
              name: `${lastChangeEvent.user.firstName} ${lastChangeEvent.user.lastName}`,
              role: lastChangeEvent.user.role
            },
            whatsappWasSent: eventDetails.whatsappSent || false,
            verificationCodeCleared: eventDetails.newStatus === 'LISTO' && eventDetails.verificationCodeGenerated
          },
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });

      return { updatedDocument, undoEvent };
    });

    res.json({
      success: true,
      message: `Cambio deshecho exitosamente: ${eventDetails.newStatus} → ${previousStatus}`,
      data: {
        document: result.updatedDocument,
        undo: {
          revertedFrom: eventDetails.newStatus,
          revertedTo: previousStatus,
          originalEventId: lastChangeEvent.id,
          undoEventId: result.undoEvent.id,
          timeSinceOriginalChange: `${Math.round(timeDifference / 1000)} segundos`,
          whatsappWasSent: eventDetails.whatsappSent || false,
          note: eventDetails.whatsappSent ? 
            'Nota: Se había enviado notificación WhatsApp que no puede ser revertida automáticamente' : null
        }
      }
    });

  } catch (error) {
    console.error('Error deshaciendo cambio de estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al deshacer cambio',
      error: error.message
    });
  }
}

/**
 * Obtener historial de cambios recientes deshacibles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getUndoableChanges(req, res) {
  try {
    const { documentId } = req.params;
    
    // Buscar cambios recientes (últimos 10 minutos) que pueden ser deshechos
    const recentChanges = await prisma.documentEvent.findMany({
      where: {
        documentId: documentId,
        eventType: 'STATUS_CHANGED',
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Últimos 10 minutos
        }
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Máximo 5 cambios recientes
    });

    // Filtrar cambios que el usuario puede deshacer
    const undoableChanges = recentChanges.filter(change => {
      const isOwner = change.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';
      return isOwner || isAdmin;
    });

    res.json({
      success: true,
      data: {
        undoableChanges: undoableChanges.map(change => ({
          id: change.id,
          description: change.description,
          fromStatus: change.details.previousStatus,
          toStatus: change.details.newStatus,
          createdAt: change.createdAt,
          canUndo: true,
          timeRemaining: Math.max(0, 10 * 60 * 1000 - (Date.now() - new Date(change.createdAt).getTime())),
          whatsappSent: change.details.whatsappSent || false,
          changedBy: {
            name: `${change.user.firstName} ${change.user.lastName}`,
            role: change.user.role
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error obteniendo cambios deshacibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener historial completo de un documento
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentHistory(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, eventType } = req.query;

    // Buscar documento y verificar permisos
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Control de permisos por rol
    const userRole = req.user.role;
    const userId = req.user.id;

    // MATRIZADOR: Solo SUS documentos asignados
    if (userRole === 'MATRIZADOR' && document.assignedToId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes ver el historial de documentos asignados a ti'
      });
    }

    // ADMIN/RECEPCIÓN/CAJA/ARCHIVO: Ven TODOS los documentos
    if (!['ADMIN', 'RECEPCION', 'CAJA', 'ARCHIVO', 'MATRIZADOR'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver el historial de documentos'
      });
    }

    // Construir filtros de consulta
    const whereClause = {
      documentId: id
    };

    if (eventType) {
      whereClause.eventType = eventType;
    }

    // Obtener eventos del historial
    const events = await prisma.documentEvent.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit)
    });

    // Obtener total de eventos para paginación
    const totalEvents = await prisma.documentEvent.count({
      where: whereClause
    });

    // Formatear eventos para respuesta con descripciones mejoradas
    const formattedEvents = events.map(event => {
      // Usar el formateo mejorado de descripción
      const formattedDescription = formatEventDescription(event);
      
      // Obtener información contextual adicional
      const contextInfo = getEventContextInfo(event);
      
      return {
        id: event.id,
        type: event.eventType,
        title: getEventTitle(event.eventType),
        description: formattedDescription,
        timestamp: event.createdAt,
        user: {
          id: event.user.id,
          name: `${event.user.firstName} ${event.user.lastName}`,
          role: event.user.role
        },
        icon: getEventIcon(event.eventType),
        color: getEventColor(event.eventType, event.details),
        contextInfo: contextInfo, // Información adicional para mostrar
        details: event.details, // Detalles técnicos (solo para debug si es necesario)
        // Omitir metadata técnica innecesaria para el usuario final
        ...(userRole === 'ADMIN' && { 
          metadata: {
            ipAddress: event.ipAddress,
            userAgent: event.userAgent
          }
        })
      };
    });

    // Información básica del documento para contexto
    const documentInfo = {
      id: document.id,
      protocolNumber: document.protocolNumber,
      clientName: document.clientName,
      currentStatus: document.status,
      documentType: document.documentType,
      createdAt: document.createdAt
    };

    res.json({
      success: true,
      data: {
        document: documentInfo,
        history: {
          events: formattedEvents,
          pagination: {
            total: totalEvents,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < totalEvents
          }
        },
        permissions: {
          role: userRole,
          canViewAll: ['ADMIN', 'RECEPCION', 'CAJA', 'ARCHIVO'].includes(userRole),
          canViewOwned: userRole === 'MATRIZADOR' && document.assignedToId === userId
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial del documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export {
  uploadXmlDocument,
  uploadXmlDocumentsBatch,
  getAllDocuments,
  assignDocument,
  getMyDocuments,
  updateDocumentStatus,
  getDocumentById,
  getAvailableMatrizadores,
  detectGroupableDocuments,
  createDocumentGroup,
  deliverDocumentGroup,
  // Función de entrega completa
  deliverDocument,
  // Funciones de edición
  getEditableDocumentInfo,
  updateDocumentInfo,
  // 🔗 Función de agrupación inteligente
  createSmartDocumentGroup,
  // 🔄 Sistema de confirmaciones y deshacer
  undoDocumentStatusChange,
  getUndoableChanges,
  // 📈 Sistema de historial universal
  getDocumentHistory,
  // 🔗 Funciones de grupos
  updateDocumentGroupStatus,
  updateDocumentGroupInfo
}; 