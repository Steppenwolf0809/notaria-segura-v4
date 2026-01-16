import prisma from '../db.js';

/**
 * Servicio de Alertas para Sistema de Trazabilidad Notarial
 * Gestiona alertas inteligentes por rol según tiempos críticos
 */
class AlertasService {

  /**
   * RECEPCIÓN: Documentos estado "LISTO" sin entregar
   * Criterios: 3-7 días amarilla, 8-15 días naranja, +15 días roja
   */
  static async getAlertasRecepcion() {
    const now = new Date();

    // Calcular fechas límite
    const fechaAmarilla = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)); // 3 días
    const fechaNaranja = new Date(now.getTime() - (8 * 24 * 60 * 60 * 1000));  // 8 días  
    const fechaRoja = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));    // 15 días

    try {
      // Documentos LISTO sin entregar con diferentes niveles de urgencia
      const [alertasRojas, alertasNaranjas, alertasAmarillas] = await Promise.all([
        // CRÍTICAS (> 15 días)
        prisma.document.findMany({
          where: {
            status: 'LISTO',
            updatedAt: {
              lt: fechaRoja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            clientPhone: true,
            documentType: true,
            updatedAt: true,
            verificationCode: true
          },
          orderBy: {
            updatedAt: 'asc' // Más antiguos primero
          }
        }),

        // URGENTES (8-15 días)  
        prisma.document.findMany({
          where: {
            status: 'LISTO',
            updatedAt: {
              gte: fechaRoja,
              lt: fechaNaranja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            clientPhone: true,
            documentType: true,
            updatedAt: true,
            verificationCode: true
          },
          orderBy: {
            updatedAt: 'asc'
          }
        }),

        // ATENCIÓN (3-7 días)
        prisma.document.findMany({
          where: {
            status: 'LISTO',
            updatedAt: {
              gte: fechaNaranja,
              lt: fechaAmarilla
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            clientPhone: true,
            documentType: true,
            updatedAt: true,
            verificationCode: true
          },
          orderBy: {
            updatedAt: 'asc'
          }
        })
      ]);

      // Procesar alertas con información adicional
      const procesarAlertas = (documentos, nivel) => {
        return documentos.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          clientPhone: doc.clientPhone,
          documentType: doc.documentType,
          updatedAt: doc.updatedAt,
          verificationCode: doc.verificationCode,
          nivel,
          diasPendientes: Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)),
          mensaje: this.generarMensajeAlerta('RECEPCION', nivel, Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)))
        }));
      };

      const alertas = [
        ...procesarAlertas(alertasRojas, 'CRITICA'),
        ...procesarAlertas(alertasNaranjas, 'URGENTE'),
        ...procesarAlertas(alertasAmarillas, 'ATENCION')
      ];

      // Estadísticas consolidadas
      const stats = {
        total: alertas.length,
        criticas: alertasRojas.length,
        urgentes: alertasNaranjas.length,
        atencion: alertasAmarillas.length,
        documentosListo: await prisma.document.count({ where: { status: 'LISTO' } })
      };

      return {
        success: true,
        data: {
          alertas,
          stats,
          ultimaActualizacion: now
        }
      };

    } catch (error) {
      console.error('Error obteniendo alertas de recepción:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosListo: 0 }
        }
      };
    }
  }

  /**
   * MATRIZADOR: Documentos asignados sin procesar  
   * Criterios: 5-7 días amarilla, 8-10 días naranja, +10 días roja
   */
  static async getAlertasMatrizador(matrizadorId) {
    const now = new Date();

    const fechaAmarilla = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5 días
    const fechaNaranja = new Date(now.getTime() - (8 * 24 * 60 * 60 * 1000));  // 8 días
    const fechaRoja = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));   // 10 días

    try {
      const [alertasRojas, alertasNaranjas, alertasAmarillas] = await Promise.all([
        // Documentos asignados hace más de 10 días sin procesar
        prisma.document.findMany({
          where: {
            assignedToId: matrizadorId,
            status: 'EN_PROCESO',
            updatedAt: {
              lt: fechaRoja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            updatedAt: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            updatedAt: 'asc'
          }
        }),

        prisma.document.findMany({
          where: {
            assignedToId: matrizadorId,
            status: 'EN_PROCESO',
            updatedAt: {
              gte: fechaRoja,
              lt: fechaNaranja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            updatedAt: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            updatedAt: 'asc'
          }
        }),

        prisma.document.findMany({
          where: {
            assignedToId: matrizadorId,
            status: 'EN_PROCESO',
            updatedAt: {
              gte: fechaNaranja,
              lt: fechaAmarilla
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            updatedAt: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            updatedAt: 'asc'
          }
        })
      ]);

      const procesarAlertas = (documentos, nivel) => {
        return documentos.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          documentType: doc.documentType,
          updatedAt: doc.updatedAt,
          assignedTo: doc.assignedTo,
          nivel,
          diasPendientes: Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)),
          mensaje: this.generarMensajeAlerta('MATRIZADOR', nivel, Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)))
        }));
      };

      const alertas = [
        ...procesarAlertas(alertasRojas, 'CRITICA'),
        ...procesarAlertas(alertasNaranjas, 'URGENTE'),
        ...procesarAlertas(alertasAmarillas, 'ATENCION')
      ];

      const stats = {
        total: alertas.length,
        criticas: alertasRojas.length,
        urgentes: alertasNaranjas.length,
        atencion: alertasAmarillas.length,
        documentosEnProceso: await prisma.document.count({
          where: {
            assignedToId: matrizadorId,
            status: 'EN_PROCESO'
          }
        })
      };

      return {
        success: true,
        data: {
          alertas,
          stats,
          ultimaActualizacion: now
        }
      };

    } catch (error) {
      console.error('Error obteniendo alertas de matrizador:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosEnProceso: 0 }
        }
      };
    }
  }

  /**
   * ARCHIVO: Documentos asignados por tiempo
   * Criterios: 7-14 días amarilla, 15-21 días naranja, +21 días roja
   */
  static async getAlertasArchivo(archivoId) {
    const now = new Date();

    const fechaAmarilla = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));  // 7 días
    const fechaNaranja = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)); // 15 días
    const fechaRoja = new Date(now.getTime() - (21 * 24 * 60 * 60 * 1000));    // 21 días

    try {
      const [alertasRojas, alertasNaranjas, alertasAmarillas] = await Promise.all([
        prisma.document.findMany({
          where: {
            assignedToId: archivoId,
            status: {
              in: ['PENDIENTE', 'EN_PROCESO']
            },
            updatedAt: {
              lt: fechaRoja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            status: true,
            updatedAt: true
          },
          orderBy: {
            updatedAt: 'asc'
          }
        }),

        prisma.document.findMany({
          where: {
            assignedToId: archivoId,
            status: {
              in: ['PENDIENTE', 'EN_PROCESO']
            },
            updatedAt: {
              gte: fechaRoja,
              lt: fechaNaranja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            status: true,
            updatedAt: true
          },
          orderBy: {
            updatedAt: 'asc'
          }
        }),

        prisma.document.findMany({
          where: {
            assignedToId: archivoId,
            status: {
              in: ['PENDIENTE', 'EN_PROCESO']
            },
            updatedAt: {
              gte: fechaNaranja,
              lt: fechaAmarilla
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            status: true,
            updatedAt: true
          },
          orderBy: {
            updatedAt: 'asc'
          }
        })
      ]);

      const procesarAlertas = (documentos, nivel) => {
        return documentos.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          documentType: doc.documentType,
          status: doc.status,
          updatedAt: doc.updatedAt,
          nivel,
          diasPendientes: Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)),
          mensaje: this.generarMensajeAlerta('ARCHIVO', nivel, Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)))
        }));
      };

      const alertas = [
        ...procesarAlertas(alertasRojas, 'CRITICA'),
        ...procesarAlertas(alertasNaranjas, 'URGENTE'),
        ...procesarAlertas(alertasAmarillas, 'ATENCION')
      ];

      const stats = {
        total: alertas.length,
        criticas: alertasRojas.length,
        urgentes: alertasNaranjas.length,
        atencion: alertasAmarillas.length
      };

      return {
        success: true,
        data: {
          alertas,
          stats,
          ultimaActualizacion: now
        }
      };

    } catch (error) {
      console.error('Error obteniendo alertas de archivo:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0 }
        }
      };
    }
  }

  /**
   * ADMIN: Vista global consolidada
   * Criterios: 7 días amarilla, 15 días naranja, 30+ días roja crítica
   */
  static async getAlertasAdmin() {
    const now = new Date();

    const fechaAmarilla = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));  // 7 días
    const fechaNaranja = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)); // 15 días
    const fechaRoja = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));    // 30 días

    try {
      const [estadisticasGlobales, documentosCriticos, documentosUrgentes, documentosAtencion] = await Promise.all([
        // Estadísticas globales
        Promise.all([
          prisma.document.count(),
          prisma.document.count({ where: { status: 'PENDIENTE' } }),
          prisma.document.count({ where: { status: 'EN_PROCESO' } }),
          prisma.document.count({ where: { status: 'LISTO' } }),
          prisma.document.count({ where: { status: 'ENTREGADO' } })
        ]),

        // Documentos críticos (>30 días)
        prisma.document.findMany({
          where: {
            status: {
              in: ['PENDIENTE', 'EN_PROCESO', 'LISTO']
            },
            updatedAt: {
              lt: fechaRoja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            status: true,
            updatedAt: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: {
            updatedAt: 'asc'
          },
          take: 50 // Limitar para performance
        }),

        // Documentos urgentes (15-30 días)
        prisma.document.findMany({
          where: {
            status: {
              in: ['PENDIENTE', 'EN_PROCESO', 'LISTO']
            },
            updatedAt: {
              gte: fechaRoja,
              lt: fechaNaranja
            }
          },
          select: {
            id: true,
            protocolNumber: true,
            clientName: true,
            documentType: true,
            status: true,
            updatedAt: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: {
            updatedAt: 'asc'
          },
          take: 100
        }),

        // Documentos de atención (7-15 días)
        prisma.document.count({
          where: {
            status: {
              in: ['PENDIENTE', 'EN_PROCESO', 'LISTO']
            },
            updatedAt: {
              gte: fechaNaranja,
              lt: fechaAmarilla
            }
          }
        })
      ]);

      const [total, pendientes, enProceso, listos, entregados] = estadisticasGlobales;

      const procesarAlertas = (documentos, nivel) => {
        return documentos.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          documentType: doc.documentType,
          status: doc.status,
          updatedAt: doc.updatedAt,
          assignedTo: doc.assignedTo,
          nivel,
          diasPendientes: Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)),
          mensaje: this.generarMensajeAlerta('ADMIN', nivel, Math.floor((now - doc.updatedAt) / (24 * 60 * 60 * 1000)))
        }));
      };

      const alertas = [
        ...procesarAlertas(documentosCriticos, 'CRITICA'),
        ...procesarAlertas(documentosUrgentes, 'URGENTE')
      ];

      const stats = {
        total: alertas.length,
        criticas: documentosCriticos.length,
        urgentes: documentosUrgentes.length,
        atencion: documentosAtencion,
        estadisticasGlobales: {
          total,
          pendientes,
          enProceso,
          listos,
          entregados
        }
      };

      return {
        success: true,
        data: {
          alertas,
          stats,
          ultimaActualizacion: now
        }
      };

    } catch (error) {
      console.error('Error obteniendo alertas de admin:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: {
            total: 0,
            criticas: 0,
            urgentes: 0,
            atencion: 0,
            estadisticasGlobales: { total: 0, pendientes: 0, enProceso: 0, listos: 0, entregados: 0 }
          }
        }
      };
    }
  }

  /**
   * Determinar nivel de alerta basado en días transcurridos y rol
   */
  static calculateAlertLevel(dias, rol) {
    const criterios = {
      RECEPCION: { amarilla: 3, naranja: 8, roja: 15 },
      MATRIZADOR: { amarilla: 5, naranja: 8, roja: 10 },
      ARCHIVO: { amarilla: 7, naranja: 15, roja: 21 },
      ADMIN: { amarilla: 7, naranja: 15, roja: 30 }
    };

    const limites = criterios[rol] || criterios.ADMIN;

    if (dias >= limites.roja) return 'CRITICA';
    if (dias >= limites.naranja) return 'URGENTE';
    if (dias >= limites.amarilla) return 'ATENCION';
    return 'NORMAL';
  }

  /**
   * Generar mensaje descriptivo para cada tipo de alerta
   */
  static generarMensajeAlerta(rol, nivel, dias) {
    const mensajes = {
      RECEPCION: {
        CRITICA: `⚠️ Documento listo hace ${dias} días - ENTREGA CRÍTICA`,
        URGENTE: `🔔 Documento listo hace ${dias} días - Entrega urgente requerida`,
        ATENCION: `📋 Documento listo hace ${dias} días - Requiere atención`
      },
      MATRIZADOR: {
        CRITICA: `⚠️ Documento sin procesar hace ${dias} días - ACCIÓN CRÍTICA`,
        URGENTE: `🔔 Documento asignado hace ${dias} días - Procesamiento urgente`,
        ATENCION: `📋 Documento asignado hace ${dias} días - Requiere procesamiento`
      },
      ARCHIVO: {
        CRITICA: `⚠️ Documento sin gestión hace ${dias} días - REVISIÓN CRÍTICA`,
        URGENTE: `🔔 Documento asignado hace ${dias} días - Gestión urgente`,
        ATENCION: `📋 Documento asignado hace ${dias} días - Requiere gestión`
      },
      ADMIN: {
        CRITICA: `⚠️ Documento estancado ${dias} días - INTERVENCIÓN CRÍTICA`,
        URGENTE: `🔔 Documento demorado ${dias} días - Supervisión urgente`,
        ATENCION: `📋 Documento demorado ${dias} días - Seguimiento requerido`
      }
    };

    return mensajes[rol]?.[nivel] || `Documento requiere atención (${dias} días)`;
  }
}

export default AlertasService;