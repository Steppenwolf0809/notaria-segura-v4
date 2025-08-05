import { PrismaClient } from '@prisma/client';
import { parseXmlDocument, generateVerificationCode } from '../services/xml-parser-service.js';
import DocumentGroupingService from '../services/document-grouping-service.js';
import MatrizadorAssignmentService from '../services/matrizador-assignment-service.js';
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
    const { status } = req.body;

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

    // Verificar permisos según rol y estado
    if (['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      // Matrizadores solo pueden modificar sus documentos asignados
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar documentos asignados a ti'
        });
      }
      // Matrizadores no pueden marcar como ENTREGADO
      if (status === 'ENTREGADO') {
        return res.status(403).json({
          success: false,
          message: 'Solo RECEPCIÓN puede marcar documentos como entregados'
        });
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

    // Preparar datos de actualización
    const updateData = { status };

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

    // Registrar evento de auditoría
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'STATUS_CHANGED',
          description: `Estado cambiado de ${document.status} a ${status} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: {
            previousStatus: document.status,
            newStatus: status,
            verificationCodeGenerated: status === 'LISTO' && updateData.verificationCode,
            whatsappSent: whatsappSent,
            whatsappError: whatsappError,
            userRole: req.user.role,
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
    console.error('Error actualizando estado del documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
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
 * Detectar documentos agrupables para un cliente
 */
async function detectGroupableDocuments(req, res) {
  try {
    const { clientName, clientPhone } = req.body;
    const matrizadorId = req.user.id;
    
    const groupableDocuments = await DocumentGroupingService
      .detectGroupableDocuments({ clientName, clientPhone }, matrizadorId);
    
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
 * Crear agrupación de documentos
 */
async function createDocumentGroup(req, res) {
  try {
    const { documentIds, verifiedPhone, notificationMessage } = req.body;
    const matrizadorId = req.user.id;
    
    // Crear grupo y marcar documentos como LISTO
    const result = await DocumentGroupingService
      .createDocumentGroup(documentIds, matrizadorId);
    
    // Enviar notificación grupal si se solicita
    if (req.body.sendNotification) {
      /*
      await WhatsAppService.sendGroupNotification({
        phone: verifiedPhone,
        group: result.group,
        documents: result.documents,
        customMessage: notificationMessage
      });
      */
      
      // Marcar notificación enviada
      await prisma.documentGroup.update({
        where: { id: result.group.id },
        data: {
          notificationSent: true,
          notificationSentAt: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      message: `Grupo creado con ${result.documents.length} documentos`,
      group: result.group,
      verificationCode: result.group.verificationCode
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

        // 🔗 DETECCIÓN AUTOMÁTICA DE DOCUMENTOS RELACIONADOS
        console.log(`🔍 Detectando documentos relacionados para: "${parsedData.clientName}"`);
        let groupableDocuments = [];
        let groupingSuggestion = null;
        
        if (parsedData.clientName && parsedData.clientPhone) {
          try {
            const groupingResult = await DocumentGroupingService.detectGroupableDocuments(
              {
                clientName: parsedData.clientName,
                clientPhone: parsedData.clientPhone
              },
              assignmentResult.assigned ? assignmentResult.matrizador.id : null
            );
            
            if (groupingResult && groupingResult.length > 0) {
              groupableDocuments = groupingResult;
              groupingSuggestion = {
                canGroup: true,
                count: groupingResult.length + 1, // +1 por el documento actual
                clientName: parsedData.clientName,
                clientPhone: parsedData.clientPhone,
                suggestion: `Se detectaron ${groupingResult.length} documentos adicionales del mismo cliente que podrían agruparse`
              };
              console.log(`✨ Agrupación sugerida: ${groupingSuggestion.suggestion}`);
            }
          } catch (groupingError) {
            console.warn('⚠️ Error en detección de agrupación:', groupingError.message);
          }
        }

        // Guardar resultado exitoso
        exitosos.push({
          archivo: archivo.originalname,
          protocolNumber: parsedData.protocolNumber,
          documentId: document.id,
          asignacionAutomatica: assignmentResult.assigned,
          matrizadorAsignado: assignmentResult.assigned ? assignmentResult.matrizador : null,
          indice: i + 1,
          // ✨ NUEVA INFORMACIÓN DE AGRUPACIÓN
          groupingSuggestion,
          groupableDocuments: groupableDocuments.map(doc => ({
            id: doc.id,
            protocolNumber: doc.protocolNumber,
            documentType: doc.documentType,
            status: doc.status,
            createdAt: doc.createdAt
          }))
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
    
    // Validar usuario CAJA
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA o ADMIN pueden crear grupos inteligentes'
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

    // Verificar que el usuario sea RECEPCION, ADMIN o CAJA
    if (!['RECEPCION', 'ADMIN', 'CAJA'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo RECEPCIÓN puede entregar documentos'
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

    // Actualizar documento con información de entrega
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
          usuario_entrega: `${req.user.firstName} ${req.user.lastName}`
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
    let message = 'Documento entregado exitosamente';
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
    ADMIN: ['clientPhone', 'clientName', 'detalle_documento', 'comentarios_recepcion'],
    MATRIZADOR: ['clientPhone', 'detalle_documento', 'comentarios_recepcion'],
    ARCHIVO: ['clientPhone', 'detalle_documento', 'comentarios_recepcion'],
    RECEPCION: ['clientPhone', 'comentarios_recepcion'],
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

    // Validar datos
    const validation = validateEditData(updateData, permissions.editableFields);
    
    if (!validation.isValid) {
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
  createSmartDocumentGroup
}; 