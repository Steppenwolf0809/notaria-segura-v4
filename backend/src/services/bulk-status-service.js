import { getPrismaClient } from '../db.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';
import logger from '../utils/logger.js';

const prisma = getPrismaClient();

/**
 * Servicio para cambios masivos de estado de documentos.
 * - Permite a RECEPCION, ARCHIVO, MATRIZADOR y ADMIN marcar documentos como LISTO.
 * - Genera código de retiro único por grupo de cliente (agrupación inteligente).
 * - Crea notificaciones WhatsApp automáticamente.
 * - Agrupa documentos nuevos con notificaciones pendientes existentes del mismo cliente.
 */
export async function bulkMarkReady({ documentIds, actor, sendNotifications = true }) {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return {
      success: false,
      status: 400,
      message: 'Se requiere una lista válida de IDs de documentos'
    };
  }

  const allowedRoles = new Set(['RECEPCION', 'ARCHIVO', 'MATRIZADOR', 'ADMIN']);
  if (!actor || !allowedRoles.has(actor.role)) {
    return {
      success: false,
      status: 403,
      message: 'Sin permisos para realizar cambios masivos'
    };
  }

  // Cargar documentos con datos mínimos necesarios
  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: {
      id: true,
      status: true,
      protocolNumber: true,
      documentType: true,
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      clientId: true,
      assignedToId: true,
      actoPrincipalDescripcion: true,
      actoPrincipalValor: true
    }
  });

  if (documents.length !== documentIds.length) {
    return {
      success: false,
      status: 400,
      message: 'Algunos documentos no fueron encontrados'
    };
  }

  // Validar estados actuales (todos deben estar EN_PROCESO)
  const invalidDocs = documents.filter(d => d.status !== 'EN_PROCESO');
  if (invalidDocs.length > 0) {
    return {
      success: false,
      status: 400,
      message: `${invalidDocs.length} documento(s) no están en estado EN_PROCESO`
    };
  }

  // Validar propiedad para MATRIZADOR: solo puede modificar los suyos
  if (actor.role === 'MATRIZADOR') {
    const unauthorized = documents.filter(d => d.assignedToId && d.assignedToId !== actor.id);
    if (unauthorized.length > 0) {
      return {
        success: false,
        status: 403,
        message: `Sin permisos para modificar ${unauthorized.length} documento(s) asignado(s) a otro matrizador`
      };
    }
  }

  // Agrupar por cliente para usar mismo código de retiro
  // Preferir clientPhone si existe (para notificaciones); si no, agrupar por (clientName + clientId)
  const groupKey = (d) => {
    if (d.clientPhone && d.clientPhone.trim()) {
      return `phone:${d.clientPhone.trim()}`;
    }
    return `name:${d.clientName}__${d.clientId || ''}`;
  };

  const byClient = new Map();
  for (const d of documents) {
    const key = groupKey(d);
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key).push(d);
  }

  // 🔄 Buscar notificaciones pendientes para cada grupo de cliente
  const clientNotificationMap = new Map();
  for (const [key, docs] of byClient.entries()) {
    const firstDoc = docs[0];
    if (firstDoc.clientPhone && firstDoc.clientPhone.trim()) {
      const phoneNormalized = firstDoc.clientPhone.trim();

      // Buscar notificación pendiente del mismo cliente (últimas 24 horas)
      const notificacionExistente = await prisma.whatsAppNotification.findFirst({
        where: {
          clientPhone: phoneNormalized,
          messageType: 'DOCUMENTO_LISTO',
          status: { in: ['PENDING', 'PREPARED'] },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          document: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (notificacionExistente && notificacionExistente.document?.codigoRetiro) {
        clientNotificationMap.set(key, {
          codigoRetiro: notificacionExistente.document.codigoRetiro,
          notificacionId: notificacionExistente.id,
          documentosExistentes: await prisma.document.count({
            where: {
              codigoRetiro: notificacionExistente.document.codigoRetiro,
              status: 'LISTO'
            }
          })
        });
        logger.info(`📦 Grupo ${key} se agrupará con notificación existente. Código: ${notificacionExistente.document.codigoRetiro}`);
      }
    }
  }

  // Ejecutar actualización en transacción
  const result = await prisma.$transaction(async (tx) => {
    const updatedDocs = [];
    const notificacionesCreadas = [];
    const now = new Date();

    // Procesar cada grupo de cliente
    for (const [key, docs] of byClient.entries()) {
      const firstDoc = docs[0];

      // Determinar código de retiro (existente o nuevo)
      let codigoRetiro;
      let agrupadoConExistente = false;
      let documentosExistentesEnGrupo = 0;

      if (clientNotificationMap.has(key)) {
        const existente = clientNotificationMap.get(key);
        codigoRetiro = existente.codigoRetiro;
        agrupadoConExistente = true;
        documentosExistentesEnGrupo = existente.documentosExistentes;
        logger.info(`📦 Usando código existente ${codigoRetiro} para ${docs.length} documento(s)`);
      } else {
        codigoRetiro = await CodigoRetiroService.generarUnico();
        logger.info(`🆕 Nuevo código ${codigoRetiro} para ${docs.length} documento(s)`);
      }

      // Actualizar todos los documentos del grupo con el mismo código
      for (const d of docs) {
        const data = {
          status: 'LISTO',
          codigoRetiro: codigoRetiro,
          fechaListo: now,
          updatedAt: now,
        };

        const ud = await tx.document.update({ where: { id: d.id }, data });
        updatedDocs.push(ud);

        // Evento auditoría por documento
        await tx.documentEvent.create({
          data: {
            documentId: d.id,
            userId: actor.id,
            eventType: 'STATUS_CHANGED',
            description: `Cambio masivo de EN_PROCESO a LISTO (${actor.firstName || ''} ${actor.lastName || ''} - ${actor.role})`,
            details: JSON.stringify({
              fromStatus: 'EN_PROCESO',
              toStatus: 'LISTO',
              bulk: true,
              codigoRetiro: codigoRetiro,
              agrupadoConExistente: agrupadoConExistente,
              documentosEnGrupo: docs.length + documentosExistentesEnGrupo
            }),
            createdAt: now
          }
        });

        // 📱 Crear notificación automáticamente si el cliente tiene teléfono
        if (d.clientPhone && d.clientPhone.trim()) {
          const cantidadTotal = docs.length + documentosExistentesEnGrupo;

          const notificacion = await tx.whatsAppNotification.create({
            data: {
              documentId: d.id,
              clientName: d.clientName,
              clientPhone: d.clientPhone.trim(),
              messageType: 'DOCUMENTO_LISTO',
              messageBody: `Código de retiro: ${codigoRetiro}. Documentos en lote: ${cantidadTotal}`,
              status: 'PENDING',
              sentAt: null
            }
          });

          notificacionesCreadas.push(notificacion);

          // Evento de notificación preparada
          await tx.documentEvent.create({
            data: {
              documentId: d.id,
              userId: actor.id,
              eventType: 'WHATSAPP_NOTIFICATION',
              description: agrupadoConExistente
                ? `Documento agregado a notificación existente. Código: ${codigoRetiro}`
                : `Notificación WhatsApp preparada automáticamente. Código: ${codigoRetiro}`,
              details: JSON.stringify({
                codigoRetiro,
                clientPhone: d.clientPhone.trim(),
                documentosEnLote: cantidadTotal,
                agrupadoConExistente: agrupadoConExistente,
                notificacionId: notificacion.id,
                timestamp: now.toISOString()
              }),
              createdAt: now
            }
          });
        } else {
          // Sin teléfono: registrar evento de código interno
          await tx.documentEvent.create({
            data: {
              documentId: d.id,
              userId: actor.id,
              eventType: 'CODIGO_GENERADO',
              description: `Código interno generado (cliente sin teléfono): ${codigoRetiro}`,
              details: JSON.stringify({
                codigoRetiro,
                sinTelefono: true,
                bulk: true,
                timestamp: now.toISOString()
              }),
              createdAt: now
            }
          });
        }
      }
    }

    return { updatedDocs, notificacionesCreadas };
  });

  const { updatedDocs, notificacionesCreadas } = result;

  logger.info(`✅ bulkMarkReady completado: ${updatedDocs.length} documentos actualizados, ${notificacionesCreadas.length} notificaciones creadas`);

  return {
    success: true,
    status: 200,
    message: `${updatedDocs.length} documento(s) marcado(s) como LISTO. ${notificacionesCreadas.length} notificación(es) preparada(s).`,
    data: {
      updatedCount: updatedDocs.length,
      notificacionesCreadas: notificacionesCreadas.length,
      gruposCliente: byClient.size
    }
  };
}

/**
 * Servicio para ENTREGA masiva de documentos (LISTO/AGRUPADO/EN_PROCESO -> ENTREGADO)
 */
export async function bulkDeliverDocuments({ documentIds, actor, deliveryData, sendNotifications = true }) {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return {
      success: false,
      status: 400,
      message: 'Se requiere una lista válida de IDs de documentos'
    };
  }

  const allowedRoles = new Set(['RECEPCION', 'ARCHIVO', 'MATRIZADOR', 'ADMIN']);
  if (!actor || !allowedRoles.has(actor.role)) {
    return {
      success: false,
      status: 403,
      message: 'Sin permisos para realizar entregas masivas'
    };
  }

  // Cargar documentos
  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: {
      id: true,
      status: true,
      protocolNumber: true,
      documentType: true,
      clientName: true,
      clientPhone: true,
      clientId: true,
      assignedToId: true,
      actoPrincipalValor: true,
      // Campos para notificación
      verificationCode: true,
      codigoRetiro: true
    }
  });

  if (documents.length !== documentIds.length) {
    return {
      success: false,
      status: 400,
      message: 'Algunos documentos no fueron encontrados'
    };
  }

  // Validar permisos para MATRIZADOR
  if (actor.role === 'MATRIZADOR') {
    const unauthorized = documents.filter(d => d.assignedToId && d.assignedToId !== actor.id);
    if (unauthorized.length > 0) {
      return {
        success: false,
        status: 403,
        message: `Sin permisos para entregar ${unauthorized.length} documento(s) asignado(s) a otro matrizador`
      };
    }
  }

  // Agrupar por cliente
  const groupKey = (d) => d.clientId || `${d.clientName}__${d.clientPhone || ''}`;
  const byClient = new Map();
  for (const d of documents) {
    const key = groupKey(d);
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key).push(d);
  }

  // Ejecutar actualización
  const updated = await prisma.$transaction(async (tx) => {
    const updatedDocs = [];
    const now = new Date();

    for (const d of documents) {
      const data = {
        status: 'ENTREGADO',
        updatedAt: now,
        fechaEntrega: now,
        usuarioEntregaId: actor.id,
        // Datos de entrega (mapping de frontend a schema DB)
        entregadoA: deliveryData.deliveredTo,
        cedulaReceptor: deliveryData.receptorId || null,
        relacionTitular: deliveryData.relationType || null,
        observacionesEntrega: deliveryData.observations || null
      };

      const ud = await tx.document.update({ where: { id: d.id }, data });
      updatedDocs.push(ud);

      // Evento auditoría
      await tx.documentEvent.create({
        data: {
          documentId: d.id,
          userId: actor.id,
          eventType: 'STATUS_CHANGED',
          description: `Entrega masiva a ${deliveryData.deliveredTo} (${actor.firstName || ''} ${actor.role})`,
          details: JSON.stringify({
            fromStatus: d.status,
            toStatus: 'ENTREGADO',
            bulk: true,
            deliveryData
          }),
          createdAt: now
        }
      });
    }
    return updatedDocs;
  });



  return {
    success: true,
    status: 200,
    message: `Se registraron ${updated.length} entregas exitosamente`,
    data: {
      updatedCount: updated.length
    }
  };
}

export default { bulkMarkReady, bulkDeliverDocuments };

