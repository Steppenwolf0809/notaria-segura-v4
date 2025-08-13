import prisma from '../db.js';

class DocumentGroupingService {
  
  /**
   * Detecta documentos EN_PROCESO del mismo cliente que pueden agruparse
   */
  async detectGroupableDocuments(clientData, matrizadorId) {
    const { clientName, clientId } = clientData;

    // Buscar documentos del mismo matrizador que:
    // 1. Están EN_PROCESO o LISTO (pueden agruparse)
    // 2. Mismo cliente (por nombre Y cédula/RUC - NUNCA por teléfono)
    // 3. No están ya agrupados
    const whereConditions = {
      assignedToId: matrizadorId,
      status: { in: ['EN_PROCESO', 'LISTO'] },
      isGrouped: false
    };

    // CRITERIO PRINCIPAL: Nombre del cliente (exacto) - OBLIGATORIO
    if (clientName) {
      whereConditions.clientName = clientName.trim();
    } else {
      console.warn('⚠️ DocumentGroupingService: clientName es obligatorio');
      return [];
    }
    
    // CRITERIO SECUNDARIO: ID cliente (cualquier identificación: cédula, RUC, pasaporte) - OPCIONAL pero recomendado
    if (clientId && clientId.trim()) {
      whereConditions.clientId = clientId.trim();
    } else {
      console.warn('⚠️ DocumentGroupingService: Sin ID cliente, agrupando solo por nombre (menos preciso)');
    }

    console.log('🔍 DocumentGroupingService: Buscando documentos agrupables con criterios:', {
      clientName,
      clientId,
      matrizadorId,
      whereConditions: JSON.stringify(whereConditions, null, 2)
    });

    const groupableDocuments = await prisma.document.findMany({
      where: whereConditions
    });

    console.log('📋 DocumentGroupingService: Documentos encontrados:', {
      count: groupableDocuments.length,
      documentos: groupableDocuments.map(d => ({
        protocolo: d.protocolNumber,
        cliente: d.clientName,
        clientId: d.clientId,
        telefono: d.clientPhone,
        id: d.id
      }))
    });

    return groupableDocuments;
  }
    
  /**
   * Crea un grupo de documentos y los marca como AGRUPADO (estado intermedio)
   * NUEVA FUNCIONALIDAD: Separación entre agrupar y marcar como listo
   */
  async createDocumentGroup(documentIds, matrizadorId, markAsReady = false) {
    // Validar que todos los documentos:
    // 1. Pertenezcan al matrizador
    // 2. No estén ya ENTREGADOS
    // 3. Sean del mismo cliente
    // 4. No estén ya agrupados
    
    const documents = await prisma.document.findMany({
      where: { 
        id: { in: documentIds },
        assignedToId: matrizadorId,
        status: { not: 'ENTREGADO' }, // Permitir EN_PROCESO y LISTO
        isGrouped: false // No permitir re-agrupar
      }
    });
    
    if (documents.length !== documentIds.length) {
      const foundIds = documents.map(d => d.id);
      const missingIds = documentIds.filter(id => !foundIds.includes(id));
      throw new Error(`Algunos documentos no son válidos para agrupación. IDs no válidos: ${missingIds.join(', ')}`);
    }
    
    // Verificar mismo cliente
    const firstDoc = documents[0];
    const sameClient = documents.every(doc => 
      doc.clientPhone === firstDoc.clientPhone ||
      doc.clientName.toLowerCase() === firstDoc.clientName.toLowerCase()
    );
    
    if (!sameClient) {
      throw new Error('Todos los documentos deben ser del mismo cliente');
    }
    
    // Buscar el mejor teléfono disponible (priorizar el que no sea null)
    const bestPhone = documents.find(doc => doc.clientPhone)?.clientPhone || firstDoc.clientPhone || 'SIN_TELEFONO';
    const bestEmail = documents.find(doc => doc.clientEmail)?.clientEmail || firstDoc.clientEmail;
    
    console.log('📞 Seleccionando datos de contacto para el grupo:', {
      clientName: firstDoc.clientName,
      bestPhone: bestPhone,
      firstDocPhone: firstDoc.clientPhone || 'NO TIENE',
      allPhones: documents.map(d => d.clientPhone || 'NULL')
    });
    
    // Validar que el clientPhone no sea null (requerido por schema)
    if (!bestPhone || bestPhone === 'null' || bestPhone === '') {
      throw new Error('No se puede crear el grupo: al menos un documento debe tener número de teléfono válido');
    }
    
    // Crear grupo
    const groupCode = this.generateGroupCode();
    const verificationCode = this.generateVerificationCode();
    
    const documentGroup = await prisma.documentGroup.create({
      data: {
        groupCode,
        verificationCode,
        clientName: firstDoc.clientName,
        clientPhone: bestPhone,
        clientEmail: bestEmail,
        documentsCount: documents.length,
        status: markAsReady ? 'READY' : 'IN_PROCESS', // Grupo en proceso si documentos están agrupados
        createdBy: matrizadorId.toString()
      }
    });
    
    // CORRECCIÓN: Solo cambiar estado si se marca como listo, mantener estado original al agrupar
    const updateData = {
      documentGroupId: documentGroup.id,
      isGrouped: true,
      groupLeaderId: documents[0].id, // Primer documento es líder
      groupVerificationCode: verificationCode,
      groupCreatedAt: new Date(),
      groupCreatedBy: matrizadorId.toString()
    };
    
    // Solo cambiar estado a LISTO si se solicita explícitamente
    if (markAsReady) {
      updateData.status = 'LISTO';
      console.log(`🔗 Agrupando y marcando documentos como LISTO`);
    } else {
      console.log(`🔗 Agrupando documentos (manteniendo estado original)`);
    }
    
    await prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: updateData
    });
    
    // Asignar posiciones en el grupo
    for (let i = 0; i < documents.length; i++) {
      await prisma.document.update({
        where: { id: documents[i].id },
        data: { groupPosition: i + 1 }
      });
    }
    
    return {
      group: documentGroup,
      documents: await prisma.document.findMany({
        where: { documentGroupId: documentGroup.id }
      })
    };
  }

  /**
   * NUEVA FUNCIONALIDAD: Marcar grupo como LISTO y enviar notificaciones
   * Convierte documentos AGRUPADOS a LISTO
   */
  async markDocumentGroupAsReady(documentGroupId, matrizadorId) {
    console.log(`🚀 Marcando grupo ${documentGroupId} como LISTO`);

    // Verificar que el grupo existe y pertenece al matrizador
    const groupDocuments = await prisma.document.findMany({
      where: { 
        documentGroupId,
        isGrouped: true,
        assignedToId: matrizadorId
      },
      include: {
        documentGroup: true
      }
    });

    if (groupDocuments.length === 0) {
      throw new Error('Grupo no encontrado o no autorizado');
    }

    // Verificar que los documentos están agrupados pero no entregados
    const invalidDocs = groupDocuments.filter(doc => doc.status === 'ENTREGADO');
    if (invalidDocs.length > 0) {
      throw new Error('No se puede marcar como listo: algunos documentos ya están entregados');
    }

    // Actualizar documentos a LISTO
    await prisma.document.updateMany({
      where: { 
        documentGroupId,
        isGrouped: true
      },
      data: {
        status: 'LISTO'
      }
    });

    // Actualizar grupo a READY
    await prisma.documentGroup.update({
      where: { id: documentGroupId },
      data: {
        status: 'READY'
      }
    });

    // Obtener documentos actualizados
    const updatedDocuments = await prisma.document.findMany({
      where: { documentGroupId },
      include: {
        documentGroup: true
      }
    });

    console.log(`✅ Grupo ${documentGroupId} marcado como LISTO`);

    return {
      group: updatedDocuments[0].documentGroup,
      documents: updatedDocuments
    };
  }
  
  /**
   * Entrega grupo completo con un solo código
   */
  async deliverDocumentGroup(verificationCode, deliveryData) {
    const { deliveredTo, deliveredBy, deliveryNotes } = deliveryData;
    
    // Buscar grupo por código de verificación
    const group = await prisma.documentGroup.findUnique({
      where: { verificationCode },
      include: { documents: true }
    });
    
    if (!group) {
      throw new Error('Código de verificación inválido');
    }
    
    if (group.status === 'DELIVERED') {
      throw new Error('Este grupo ya fue entregado');
    }
    
    // Marcar grupo como entregado
    await prisma.documentGroup.update({
      where: { id: group.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveredTo
      }
    });
    
    // Marcar TODOS los documentos como entregados
    await prisma.document.updateMany({
      where: { documentGroupId: group.id },
      data: {
        status: 'ENTREGADO',
        groupDeliveredAt: new Date(),
        groupDeliveredTo: deliveredTo
      }
    });
    
    // Registrar evento de entrega para cada documento
    for (const document of group.documents) {
      await this.createDeliveryEvent(document.id, deliveryData);
    }
    
    return group;
  }
  
  // Métodos auxiliares
  generateGroupCode() {
    return `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
  
  generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
  }
  
  async createDeliveryEvent(documentId, deliveryData) {
    // Crear evento en historial del documento
    // (implementar según sistema de eventos existente)
  }
}

export default new DocumentGroupingService(); 