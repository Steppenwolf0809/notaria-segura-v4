import { getPrismaClient } from '../db.js';
import whatsappService from './whatsapp-service.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';

const prisma = getPrismaClient();

/**
 * Servicio para cambios masivos de estado de documentos.
 * - Permite a RECEPCION, ARCHIVO, MATRIZADOR y ADMIN marcar documentos como LISTO.
 * - Cuando hay múltiples documentos del mismo cliente, usa código grupal y envía un solo WhatsApp por cliente.
 * - Cuando hay documentos de distintos clientes, envía un WhatsApp por cliente (no por documento).
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
      isGrouped: true,
      documentGroupId: true,
      groupVerificationCode: true,
      notificationPolicy: true
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

  // Agrupar por cliente para decidir si es envío grupal o individual
  // Preferir clientId si existe; si no, agrupar por (clientName + clientPhone)
  const groupKey = (d) => d.clientId || `${d.clientName}__${d.clientPhone || ''}`;
  const byClient = new Map();
  for (const d of documents) {
    const key = groupKey(d);
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key).push(d);
  }

  // Pre-calcular códigos: un código por cliente si hay >1 documento, si no, uno por documento
  const perDocCode = new Map();
  const perClientGroupCode = new Map();

  for (const [key, docs] of byClient.entries()) {
    if (docs.length > 1) {
      // Código grupal compartido
      const code = await CodigoRetiroService.generarUnicoGrupo();
      perClientGroupCode.set(key, code);
    } else {
      const code = await CodigoRetiroService.generarUnico();
      perDocCode.set(docs[0].id, code);
    }
  }

  // Ejecutar actualización en transacción
  const updated = await prisma.$transaction(async (tx) => {
    const updatedDocs = [];
    for (const d of documents) {
      const key = groupKey(d);
      const isGroup = byClient.get(key).length > 1;
      const code = isGroup ? perClientGroupCode.get(key) : perDocCode.get(d.id);

      const data = {
        status: 'LISTO',
        codigoRetiro: code,
        updatedAt: new Date(),
        // Si es grupo por cliente, marcar agrupado y setear el mismo código grupal.
        ...(isGroup ? { isGrouped: true, groupVerificationCode: code } : {})
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
          details: {
            fromStatus: 'EN_PROCESO',
            toStatus: 'LISTO',
            bulk: true,
            groupByClient: byClient.get(key).length,
            codigoRetiro: code
          },
          createdAt: new Date()
        }
      });
    }
    return updatedDocs;
  });

  // Notificaciones: 1 por cliente (grupal si >1, individual si 1)
  let notifications = [];
  if (sendNotifications) {
    for (const [key, docs] of byClient.entries()) {
      const firstDoc = docs[0];
      const clienteData = {
        clientName: firstDoc.clientName,
        clientPhone: firstDoc.clientPhone
      };

      // Respetar política por cliente (tomar del primer doc)
      if (firstDoc.notificationPolicy === 'no_notificar') {
        continue;
      }

      try {
        if (docs.length > 1) {
          // Envío grupal
          const code = perClientGroupCode.get(key);
          const result = await whatsappService.enviarGrupoDocumentosListo(
            clienteData,
            docs,
            code
          );
          notifications.push({ status: 'fulfilled', value: result });
        } else {
          // Envío individual
          const only = docs[0];
          const code = perDocCode.get(only.id);
          const documentoData = {
            id: only.id,
            tipoDocumento: only.documentType,
            protocolNumber: only.protocolNumber
          };
          const result = await whatsappService.enviarDocumentoListo(
            clienteData,
            documentoData,
            code
          );
          notifications.push({ status: 'fulfilled', value: result });
        }
      } catch (error) {
        notifications.push({ status: 'rejected', reason: error.message });
      }
    }
  }

  return {
    success: true,
    status: 200,
    message: `${updated.length} documento(s) marcado(s) como LISTO` + (sendNotifications ? ' y notificados por cliente' : ''),
    data: {
      updatedCount: updated.length,
      clientsNotified: notifications.length,
      notifications
    }
  };
}

export default { bulkMarkReady };

