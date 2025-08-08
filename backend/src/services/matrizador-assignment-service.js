/**
 * 🎯 SERVICIO DE ASIGNACIÓN AUTOMÁTICA DE MATRIZADORES
 * 
 * Este servicio maneja la lógica para:
 * 1. Buscar matrizadores por nombre del XML
 * 2. Asignar automáticamente documentos a matrizadores
 * 3. Manejar casos sin coincidencia exacta
 * 
 * Estrategia de coincidencia:
 * - Busca por nombre completo exacto
 * - Busca por coincidencias parciales de nombres y apellidos
 * - Prioriza usuarios ADMIN sobre MATRIZADOR en caso de empate
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class MatrizadorAssignmentService {
  
  /**
   * Busca un matrizador basado en el nombre del XML
   * @param {string} matrizadorNameFromXml - Nombre del matrizador extraído del XML
   * @returns {Object|null} Usuario matrizador encontrado o null
   */
  async findMatrizadorByName(matrizadorNameFromXml) {
    if (!matrizadorNameFromXml || matrizadorNameFromXml === 'Sin asignar') {
      return null;
    }

    // Limpiar y normalizar el nombre del XML
    const nombreLimpio = this.normalizeMatrizadorName(matrizadorNameFromXml);
    
    try {
      // Buscar todos los matrizadores activos (incluye ADMIN, ARCHIVO y CAJA que también pueden ser matrizadores)
      const matrizadores = await prisma.user.findMany({
        where: {
          role: {
            in: ['MATRIZADOR', 'ADMIN', 'ARCHIVO', 'CAJA']
          },
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      });

      if (matrizadores.length === 0) {
        console.log('⚠️ No hay matrizadores activos en el sistema');
        return null;
      }

      // 1. Buscar coincidencia exacta (nombre completo)
      const coincidenciaExacta = matrizadores.find(matrizador => {
        const nombreCompleto = `${matrizador.firstName} ${matrizador.lastName}`.toLowerCase();
        return nombreCompleto === nombreLimpio.toLowerCase();
      });

      if (coincidenciaExacta) {
        console.log(`✅ Coincidencia exacta encontrada: ${coincidenciaExacta.firstName} ${coincidenciaExacta.lastName}`);
        return coincidenciaExacta;
      }

      // 2. Buscar por coincidencias parciales (nombres y apellidos)
      const coincidenciasParciales = matrizadores.filter(matrizador => {
        return this.matchesPartialName(nombreLimpio, matrizador.firstName, matrizador.lastName);
      });

      if (coincidenciasParciales.length === 1) {
        console.log(`✅ Coincidencia parcial encontrada: ${coincidenciasParciales[0].firstName} ${coincidenciasParciales[0].lastName}`);
        return coincidenciasParciales[0];
      }

      if (coincidenciasParciales.length > 1) {
        // Si hay múltiples coincidencias, priorizar ADMIN > ARCHIVO > MATRIZADOR > CAJA
        const adminMatch = coincidenciasParciales.find(m => m.role === 'ADMIN');
        if (adminMatch) {
          console.log(`✅ Múltiples coincidencias - seleccionando ADMIN: ${adminMatch.firstName} ${adminMatch.lastName}`);
          return adminMatch;
        }
        
        const archivoMatch = coincidenciasParciales.find(m => m.role === 'ARCHIVO');
        if (archivoMatch) {
          console.log(`✅ Múltiples coincidencias - seleccionando ARCHIVO: ${archivoMatch.firstName} ${archivoMatch.lastName}`);
          return archivoMatch;
        }
        
        const matrizadorMatch = coincidenciasParciales.find(m => m.role === 'MATRIZADOR');
        if (matrizadorMatch) {
          console.log(`✅ Múltiples coincidencias - seleccionando MATRIZADOR: ${matrizadorMatch.firstName} ${matrizadorMatch.lastName}`);
          return matrizadorMatch;
        }
        
        // Si no hay otro rol, tomar CAJA
        console.log(`⚠️ Múltiples coincidencias - seleccionando CAJA: ${coincidenciasParciales[0].firstName} ${coincidenciasParciales[0].lastName}`);
        return coincidenciasParciales[0];
      }

      // 3. No se encontró coincidencia
      console.log(`❌ No se encontró matrizador para: "${matrizadorNameFromXml}"`);
      console.log('Matrizadores disponibles:');
      matrizadores.forEach(m => {
        console.log(`  - ${m.firstName} ${m.lastName} (${m.role})`);
      });
      
      return null;

    } catch (error) {
      console.error('Error buscando matrizador:', error);
      return null;
    }
  }

  /**
   * Normaliza el nombre del matrizador del XML
   * @param {string} nombre - Nombre a normalizar
   * @returns {string} Nombre normalizado
   */
  normalizeMatrizadorName(nombre) {
    return nombre
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .replace(/[^\w\sáéíóúüñ]/gi, '') // Remover caracteres especiales
      .toLowerCase();
  }

  /**
   * Verifica si hay coincidencia parcial entre nombres
   * @param {string} nombreXml - Nombre del XML normalizado
   * @param {string} firstName - Nombre del usuario
   * @param {string} lastName - Apellido del usuario
   * @returns {boolean} True si hay coincidencia
   */
  matchesPartialName(nombreXml, firstName, lastName) {
    const palabrasXml = nombreXml.toLowerCase().split(' ');
    const palabrasUsuario = `${firstName} ${lastName}`.toLowerCase().split(' ');

    // Verificar que al menos coincida el primer nombre
    const primerNombreXml = palabrasXml[0];
    const primerNombreUsuario = palabrasUsuario[0];
    
    // Si el primer nombre no coincide, no es una buena coincidencia
    if (!primerNombreUsuario.includes(primerNombreXml) && !primerNombreXml.includes(primerNombreUsuario)) {
      return false;
    }

    // Contar cuántas palabras del XML coinciden con palabras del usuario
    let coincidencias = 0;
    
    for (const palabraXml of palabrasXml) {
      if (palabraXml.length < 3) continue; // Ignorar palabras muy cortas
      
      for (const palabraUsuario of palabrasUsuario) {
        if (palabraUsuario.includes(palabraXml) || palabraXml.includes(palabraUsuario)) {
          coincidencias++;
          break;
        }
      }
    }

    // Considerar coincidencia si al menos 2 palabras coinciden
    // o si el nombre tiene pocas palabras y coincide al menos 1
    const minimoCoincidencias = palabrasXml.length <= 2 ? 1 : 2;
    return coincidencias >= minimoCoincidencias;
  }

  /**
   * Asigna automáticamente un documento a un matrizador
   * @param {string} documentId - ID del documento
   * @param {string} matrizadorNameFromXml - Nombre del matrizador del XML
   * @returns {Object} Resultado de la asignación
   */
  async autoAssignDocument(documentId, matrizadorNameFromXml) {
    try {
      // Buscar matrizador correspondiente
      const matrizador = await this.findMatrizadorByName(matrizadorNameFromXml);
      
      if (!matrizador) {
        return {
          success: false,
          assigned: false,
          message: `No se encontró matrizador para: "${matrizadorNameFromXml}"`,
          matrizadorName: matrizadorNameFromXml
        };
      }

      // Obtener documento original para registro de evento
      const originalDocument = await prisma.document.findUnique({
        where: { id: documentId },
        select: { status: true, assignedToId: true, createdById: true }
      });

      // Asignar documento al matrizador
      const documentoAsignado = await prisma.document.update({
        where: { id: documentId },
        data: {
          assignedToId: matrizador.id,
          status: 'EN_PROCESO' // Cambiar estado automáticamente
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      });

      // 📈 Registrar evento de asignación automática
      try {
        await prisma.documentEvent.create({
          data: {
            documentId: documentId,
            userId: originalDocument.createdById, // Usuario que creó el documento
            eventType: 'DOCUMENT_ASSIGNED',
            description: `Documento asignado automáticamente a ${matrizador.firstName} ${matrizador.lastName} (${matrizador.role})`,
            details: {
              assignedFrom: originalDocument.assignedToId,
              assignedTo: matrizador.id,
              matrizadorName: `${matrizador.firstName} ${matrizador.lastName}`,
              matrizadorRole: matrizador.role,
              previousStatus: originalDocument.status,
              newStatus: 'EN_PROCESO',
              assignmentType: 'AUTOMATIC',
              xmlMatrizadorName: matrizadorNameFromXml,
              timestamp: new Date().toISOString()
            },
            ipAddress: 'system',
            userAgent: 'auto-assignment-service'
          }
        });
      } catch (auditError) {
        console.error('Error registrando evento de asignación automática:', auditError);
        // No fallar la asignación del documento si hay error en auditoría
      }

      console.log(`✅ Documento ${documentId} asignado automáticamente a ${matrizador.firstName} ${matrizador.lastName}`);

      return {
        success: true,
        assigned: true,
        message: `Documento asignado automáticamente a ${matrizador.firstName} ${matrizador.lastName}`,
        matrizador: matrizador,
        document: documentoAsignado
      };

    } catch (error) {
      console.error('Error en asignación automática:', error);
      return {
        success: false,
        assigned: false,
        message: 'Error interno en asignación automática',
        error: error.message
      };
    }
  }

  /**
   * Obtiene estadísticas de asignación automática
   * @returns {Object} Estadísticas del sistema
   */
  async getAssignmentStats() {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_documentos,
          COUNT(CASE WHEN "assignedToId" IS NOT NULL THEN 1 END) as documentos_asignados,
          COUNT(CASE WHEN "assignedToId" IS NULL THEN 1 END) as documentos_sin_asignar,
          COUNT(DISTINCT "assignedToId") as matrizadores_con_documentos
        FROM documents
      `;

      const matrizadoresActivos = await prisma.user.count({
        where: {
          role: {
            in: ['MATRIZADOR', 'ADMIN']
          },
          isActive: true
        }
      });

      return {
        ...stats[0],
        matrizadores_activos: matrizadoresActivos,
        porcentaje_asignacion: stats[0].total_documentos > 0 
          ? (Number(stats[0].documentos_asignados) / Number(stats[0].total_documentos) * 100).toFixed(2)
          : 0
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

export default new MatrizadorAssignmentService();