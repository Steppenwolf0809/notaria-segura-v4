import { PrismaClient } from '@prisma/client';
import whatsappService from '../services/whatsapp-service.js';

const prisma = new PrismaClient();

/**
 * Controlador para operaciones masivas de documentos
 * Maneja cambios de estado en lote con validaciones y notificaciones
 */

/**
 * Cambio de estado masivo para documentos
 * POST /api/documents/bulk-status-change
 */
export const bulkStatusChange = async (req, res) => {
  const { documentIds, fromStatus, toStatus, sendNotifications = false } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  console.log('🔄 BULK: Iniciando cambio masivo:', {
    documentIds: documentIds?.length,
    fromStatus,
    toStatus,
    sendNotifications,
    userId,
    userRole
  });

  try {
    // Validaciones básicas
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una lista válida de documentos'
      });
    }

    if (documentIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 50 documentos por operación masiva'
      });
    }

    if (!fromStatus || !toStatus) {
      return res.status(400).json({
        success: false,
        message: 'Estados origen y destino son requeridos'
      });
    }

    // Validar transiciones permitidas para operaciones masivas
    const VALID_BULK_TRANSITIONS = {
      'EN_PROCESO': ['AGRUPADO', 'LISTO'],
      'AGRUPADO': ['LISTO', 'EN_PROCESO'],
      'LISTO': [] // No permitimos LISTO → ENTREGADO en masa
    };

    const validTransitions = VALID_BULK_TRANSITIONS[fromStatus] || [];
    if (!validTransitions.includes(toStatus)) {
      return res.status(400).json({
        success: false,
        message: `Transición no válida para operación masiva: ${fromStatus} → ${toStatus}`
      });
    }

    // Validar permisos por rol
    const rolePermissions = {
      'MATRIZADOR': ['EN_PROCESO', 'AGRUPADO', 'LISTO'],
      'ARCHIVO': ['EN_PROCESO', 'AGRUPADO', 'LISTO'],
      'ADMIN': ['EN_PROCESO', 'AGRUPADO', 'LISTO'],
      'RECEPCION': [], // Sin permisos de cambio masivo
      'CAJA': []
    };

    const allowedStatuses = rolePermissions[userRole] || [];
    if (!allowedStatuses.includes(toStatus)) {
      return res.status(403).json({
        success: false,
        message: `Sin permisos para cambiar estado a ${toStatus}`
      });
    }

    // Obtener documentos y validar estado actual
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds }
      },
      include: {
        matrizador: {
          select: { id: true, name: true }
        }
      }
    });

    if (documents.length !== documentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos documentos no fueron encontrados'
      });
    }

    // Validar que todos los documentos tengan el estado origen esperado
    const wrongStatusDocs = documents.filter(doc => doc.status !== fromStatus);
    if (wrongStatusDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${wrongStatusDocs.length} documento(s) no tienen el estado ${fromStatus} requerido`
      });
    }

    // Validar permisos específicos de matrizador si aplica
    if (userRole === 'MATRIZADOR') {
      const unauthorizedDocs = documents.filter(doc => 
        doc.matrizadorId && doc.matrizadorId !== userId
      );
      
      if (unauthorizedDocs.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Sin permisos para modificar ${unauthorizedDocs.length} documento(s) asignado(s) a otro matrizador`
        });
      }
    }

    // Preparar datos para la transacción
    const updateData = {
      status: toStatus,
      updatedAt: new Date()
    };

    // Lógica específica por transición
    if (toStatus === 'LISTO') {
      // Generar códigos de verificación únicos para cada documento
      const verificationCodes = new Map();
      
      for (const doc of documents) {
        let verificationCode;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
          verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
          
          const existing = await prisma.document.findFirst({
            where: { verificationCode }
          });
          
          if (!existing && !Array.from(verificationCodes.values()).includes(verificationCode)) {
            isUnique = true;
          }
          attempts++;
        }
        
        if (!isUnique) {
          return res.status(500).json({
            success: false,
            message: 'Error generando códigos de verificación únicos'
          });
        }
        
        verificationCodes.set(doc.id, verificationCode);
      }
      
      updateData.verificationCode = 'BULK_PLACEHOLDER'; // Se actualizará individualmente
    }

    // Ejecutar transacción
    const result = await prisma.$transaction(async (tx) => {
      const updatedDocuments = [];
      const events = [];
      
      for (const doc of documents) {
        // Datos específicos por documento
        const docUpdateData = { ...updateData };
        
        if (toStatus === 'LISTO') {
          docUpdateData.verificationCode = verificationCodes.get(doc.id);
        }
        
        // Actualizar documento
        const updatedDoc = await tx.document.update({
          where: { id: doc.id },
          data: docUpdateData,
          include: {
            matrizador: {
              select: { id: true, name: true }
            }
          }
        });
        
        updatedDocuments.push(updatedDoc);
        
        // Crear evento de auditoría
        const eventData = {
          documentId: doc.id,
          eventType: 'STATUS_CHANGE_BULK',
          userId: userId,
          description: `Estado cambiado masivamente: ${fromStatus} → ${toStatus}`,
          metadata: {
            fromStatus,
            toStatus,
            bulkOperation: true,
            documentsCount: documents.length,
            ...(toStatus === 'LISTO' && { verificationCode: docUpdateData.verificationCode })
          },
          createdAt: new Date()
        };
        
        events.push(eventData);
      }
      
      // Insertar eventos en lote
      await tx.documentEvent.createMany({
        data: events
      });
      
      return updatedDocuments;
    });

    console.log('✅ BULK: Transacción completada:', {
      updated: result.length,
      newStatus: toStatus
    });

    // Enviar notificaciones WhatsApp si está habilitado
    let notificationResults = null;
    if (sendNotifications && toStatus === 'LISTO') {
      console.log('📱 BULK: Enviando notificaciones WhatsApp...');
      
      try {
        notificationResults = await Promise.allSettled(
          result
            .filter(doc => doc.clientPhone) // Solo documentos con teléfono
            .map(async (doc) => {
              try {
                return await whatsappService.sendDocumentReady({
                  clientName: doc.clientName,
                  clientPhone: doc.clientPhone,
                  verificationCode: doc.verificationCode,
                  documentType: doc.actoPrincipalDescripcion || doc.documentType,
                  protocolNumber: doc.protocolNumber
                });
              } catch (error) {
                console.error(`Error enviando WhatsApp a ${doc.clientPhone}:`, error);
                return { success: false, error: error.message, documentId: doc.id };
              }
            })
        );
        
        const successful = notificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = notificationResults.length - successful;
        
        console.log(`📱 BULK: Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`);
      } catch (error) {
        console.error('❌ BULK: Error enviando notificaciones:', error);
      }
    }

    // Respuesta exitosa
    res.json({
      success: true,
      message: `${result.length} documento(s) actualizado(s) a estado ${toStatus}`,
      data: {
        updatedDocuments: result.length,
        fromStatus,
        toStatus,
        documents: result.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          status: doc.status,
          verificationCode: doc.verificationCode
        })),
        notifications: notificationResults ? {
          sent: notificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length,
          failed: notificationResults.filter(r => r.status === 'rejected' || !r.value.success).length,
          total: result.filter(doc => doc.clientPhone).length
        } : null
      }
    });

  } catch (error) {
    console.error('❌ BULK: Error en cambio masivo:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno al realizar cambio masivo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
};