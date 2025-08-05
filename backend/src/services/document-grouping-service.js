import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class DocumentGroupingService {
  
  /**
   * Detecta documentos EN_PROCESO del mismo cliente que pueden agruparse
   */
  async detectGroupableDocuments(clientData, matrizadorId) {
    const { clientName, clientPhone } = clientData;

    // Buscar documentos del mismo matrizador que:
    // 1. Están EN_PROCESO (no LISTO)
    // 2. Mismo cliente (por teléfono o nombre exacto)
    // 3. No están ya agrupados
    const whereConditions = {
      assignedToId: matrizadorId,
      status: 'EN_PROCESO',
      isGrouped: false
    };

    // Construir condiciones OR para cliente
    const orConditions = [];
    
    if (clientPhone) {
      orConditions.push({ clientPhone: clientPhone });
    }
    
    if (clientName) {
      orConditions.push({ clientName: clientName });
    }

    if (orConditions.length > 0) {
      whereConditions.OR = orConditions;
    }

    const groupableDocuments = await prisma.document.findMany({
      where: whereConditions
    });

    return groupableDocuments;
  }
    
  /**
   * Crea un grupo de documentos y los marca como LISTO
   */
  async createDocumentGroup(documentIds, matrizadorId) {
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
    
    // Crear grupo
    const groupCode = this.generateGroupCode();
    const verificationCode = this.generateVerificationCode();
    
    const documentGroup = await prisma.documentGroup.create({
      data: {
        groupCode,
        verificationCode,
        clientName: firstDoc.clientName,
        clientPhone: firstDoc.clientPhone,
        clientEmail: firstDoc.clientEmail,
        documentsCount: documents.length,
        status: 'READY',
        createdBy: matrizadorId.toString()
      }
    });
    
    // Actualizar documentos como agrupados y LISTOS
    await prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: {
        status: 'LISTO',
        documentGroupId: documentGroup.id,
        isGrouped: true,
        groupLeaderId: documents[0].id, // Primer documento es líder
        groupVerificationCode: verificationCode,
        groupCreatedAt: new Date(),
        groupCreatedBy: matrizadorId.toString()
      }
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