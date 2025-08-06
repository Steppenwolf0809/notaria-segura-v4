import { PrismaClient } from '@prisma/client';
import whatsappService from '../services/whatsapp-service.js';
import CodigoRetiroService from '../utils/codigo-retiro.js';

const prisma = new PrismaClient();

/**
 * CONTROLADOR DE ARCHIVO
 * Funcionalidad dual:
 * 1. Como matrizador para documentos propios (copias, certificaciones de archivo)
 * 2. Como supervisor global de todos los documentos del sistema
 * 
 * CONSERVADOR: Reutiliza funciones existentes de matrizador y recepción
 */

// ============================================================================
// SECCIÓN 1: FUNCIONES PROPIAS (COMO MATRIZADOR)
// ============================================================================

/**
 * Dashboard kanban para documentos propios del archivo
 * FUNCIONALIDAD: Idéntica a matrizador pero solo documentos asignados a archivo
 */
async function dashboardArchivo(req, res) {
  try {
    const userId = req.user.id;

    // Solo documentos asignados al usuario archivo
    const documentos = await prisma.document.findMany({
      where: {
        assignedToId: userId
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true }
        },
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Agrupar por estado para el kanban
    const documentosPorEstado = {
      PENDIENTE: documentos.filter(doc => doc.status === 'PENDIENTE'),
      EN_PROCESO: documentos.filter(doc => doc.status === 'EN_PROCESO'),
      LISTO: documentos.filter(doc => doc.status === 'LISTO')
    };

    // Estadísticas básicas
    const estadisticas = {
      totalDocumentos: documentos.length,
      pendientes: documentosPorEstado.PENDIENTE.length,
      enProceso: documentosPorEstado.EN_PROCESO.length,
      listos: documentosPorEstado.LISTO.length,
      entregados: documentos.filter(doc => doc.status === 'ENTREGADO').length
    };

    res.json({
      success: true,
      data: {
        documentos: documentosPorEstado,
        estadisticas
      }
    });

  } catch (error) {
    console.error('Error en dashboard archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Listar documentos propios del archivo con filtros
 * FUNCIONALIDAD: Como matrizador normal pero solo documentos propios
 */
async function listarMisDocumentos(req, res) {
  try {
    const userId = req.user.id;
    const { search, estado, page = 1, limit = 10 } = req.query;

    // Filtros base
    const where = {
      assignedToId: userId
    };

    // Aplicar filtros adicionales
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { protocolNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (estado && estado !== 'TODOS') {
      where.status = estado;
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documentos, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        documentos,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDocuments: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error listando documentos archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Cambiar estado de documento propio (drag & drop kanban)
 * FUNCIONALIDAD: Idéntica a matrizador pero solo documentos propios
 */
async function cambiarEstadoDocumento(req, res) {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;
    const userId = req.user.id;

    // Verificar que el documento pertenece al archivo
    const documento = await prisma.document.findFirst({
      where: {
        id,
        assignedToId: userId
      }
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado o no asignado a usted'
      });
    }

    // Validar transición de estado
    const transicionesValidas = {
      'PENDIENTE': ['EN_PROCESO'],
      'EN_PROCESO': ['PENDIENTE', 'LISTO'],
      'LISTO': ['EN_PROCESO', 'ENTREGADO']
    };

    if (!transicionesValidas[documento.status]?.includes(nuevoEstado)) {
      return res.status(400).json({
        success: false,
        message: 'Transición de estado no válida'
      });
    }

    // Preparar datos de actualización
    const updateData = { status: nuevoEstado };

    // Si se marca como LISTO, generar código de retiro
    let codigoGenerado = null;
    if (nuevoEstado === 'LISTO' && !documento.codigoRetiro) {
      codigoGenerado = await CodigoRetiroService.generarUnico();
      updateData.codigoRetiro = codigoGenerado;
    }

    // Si se marca como ENTREGADO, registrar datos de entrega simplificada
    if (nuevoEstado === 'ENTREGADO') {
      updateData.usuarioEntregaId = req.user.id;
      updateData.fechaEntrega = new Date();
      updateData.entregadoA = `Entrega directa por archivo`;
      updateData.relacionTitular = 'directo';
    }

    // Actualizar estado
    const documentoActualizado = await prisma.document.update({
      where: { id },
      data: updateData
    });

    // 📱 ENVIAR NOTIFICACIÓN WHATSAPP si se marca como LISTO
    let whatsappSent = false;
    let whatsappError = null;
    
    if (nuevoEstado === 'LISTO' && codigoGenerado) {
      try {
        const clienteData = {
          clientName: documento.clientName,
          clientPhone: documento.clientPhone
        };
        
        const documentoData = {
          tipoDocumento: documento.tipoDocumento,
          protocolNumber: documento.protocolNumber
        };

        const whatsappResult = await whatsappService.enviarDocumentoListo(
          clienteData, 
          documentoData, 
          codigoGenerado
        );

        console.log('✅ Notificación WhatsApp enviada desde archivo:', whatsappResult.messageId || 'simulado');
        whatsappSent = true;
      } catch (error) {
        // No fallar la operación principal si WhatsApp falla
        console.error('⚠️ Error enviando WhatsApp desde archivo (operación continúa):', error.message);
        whatsappError = error.message;
      }
    }

    // 📱 ENVIAR NOTIFICACIÓN WHATSAPP si se marca como ENTREGADO
    if (nuevoEstado === 'ENTREGADO' && documento.clientPhone) {
      try {
        // Preparar datos de entrega
        const datosEntrega = {
          entregado_a: updateData.entregadoA,
          deliveredTo: updateData.entregadoA,
          fecha: updateData.fechaEntrega,
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (ARCHIVO)`
        };

        // Enviar notificación de documento entregado
        const whatsappResult = await whatsappService.enviarDocumentoEntregado(
          {
            nombre: documento.clientName,
            clientName: documento.clientName,
            telefono: documento.clientPhone,
            clientPhone: documento.clientPhone
          },
          {
            tipo_documento: documento.documentType,
            tipoDocumento: documento.documentType,
            numero_documento: documento.protocolNumber,
            protocolNumber: documento.protocolNumber
          },
          datosEntrega
        );
        
        whatsappSent = whatsappResult.success;
        
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega directa desde archivo:', whatsappResult.error);
        } else {
          console.log('📱 Notificación WhatsApp de entrega directa desde archivo enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega directa desde archivo:', error);
        whatsappError = error.message;
      }
    }

    res.json({
      success: true,
      data: { 
        documento: documentoActualizado,
        codigoGenerado,
        whatsappSent 
      },
      message: `Documento ${nuevoEstado.toLowerCase()}${codigoGenerado ? ` - Código: ${codigoGenerado}` : ''}`
    });

  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// ============================================================================
// SECCIÓN 2: SUPERVISIÓN GLOBAL (VISTA DE TODOS LOS DOCUMENTOS)
// ============================================================================

/**
 * Vista de supervisión global - todos los documentos del sistema
 * FUNCIONALIDAD: Solo lectura, no puede modificar documentos ajenos
 */
async function supervisionGeneral(req, res) {
  try {
    const { 
      search, 
      matrizador, 
      estado, 
      alerta,
      fechaDesde, 
      fechaHasta,
      page = 1, 
      limit = 20 
    } = req.query;



    // Construir filtros
    const where = {};

    if (search) {
      // Para SQLite: buscar en múltiples variaciones para simular insensitive
      const searchLower = search.toLowerCase();
      const searchUpper = search.toUpperCase();
      const searchCapitalized = search.charAt(0).toUpperCase() + search.slice(1).toLowerCase();
      
      where.OR = [
        { clientName: { contains: search } },
        { clientName: { contains: searchLower } },
        { clientName: { contains: searchUpper } },
        { clientName: { contains: searchCapitalized } },
        { clientPhone: { contains: search } },
        { protocolNumber: { contains: search } },
        { protocolNumber: { contains: searchLower } },
        { protocolNumber: { contains: searchUpper } }
      ];
    }

    if (matrizador && matrizador !== 'TODOS') {
      where.assignedToId = parseInt(matrizador);
    }

    if (estado && estado !== 'TODOS') {
      where.status = estado;
    }

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documentos, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true }
          },
          createdBy: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

    // Calcular alertas de tiempo para cada documento
    const documentosConAlertas = documentos.map(doc => {
      const diasEnEstado = Math.floor((new Date() - new Date(doc.updatedAt)) / (1000 * 60 * 60 * 24));
      
      let alerta = { nivel: 'normal', icono: '', dias: diasEnEstado };
      
      if (diasEnEstado >= 15) {
        alerta = { nivel: 'roja', icono: '🔥', dias: diasEnEstado };
      } else if (diasEnEstado >= 7) {
        alerta = { nivel: 'amarilla', icono: '⚠️', dias: diasEnEstado };
      }

      return {
        ...doc,
        alerta
      };
    });

    // Filtrar por alertas si se especifica
    let documentosFiltrados = documentosConAlertas;
    if (alerta && alerta !== 'TODAS') {
      documentosFiltrados = documentosConAlertas.filter(doc => {
        if (alerta === 'ROJAS') return doc.alerta.nivel === 'roja';
        if (alerta === 'AMARILLAS') return doc.alerta.nivel === 'amarilla';
        if (alerta === 'NORMALES') return doc.alerta.nivel === 'normal';
        return true;
      });
    }

    res.json({
      success: true,
      data: {
        documentos: documentosFiltrados,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDocuments: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error en supervisión general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Resumen general del sistema para dashboard de supervisión
 * FUNCIONALIDAD: Métricas globales y alertas
 */
async function resumenGeneral(req, res) {
  try {
    // Contar documentos por estado
    const [total, pendientes, enProceso, listos, entregados] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { status: 'PENDIENTE' } }),
      prisma.document.count({ where: { status: 'EN_PROCESO' } }),
      prisma.document.count({ where: { status: 'LISTO' } }),
      prisma.document.count({ where: { status: 'ENTREGADO' } })
    ]);

    // Obtener todos los documentos para calcular alertas
    const todosDocumentos = await prisma.document.findMany({
      select: { updatedAt: true, status: true }
    });

    // Calcular documentos con alertas
    let atrasadosAmarillo = 0;
    let atrasadosRojo = 0;

    todosDocumentos.forEach(doc => {
      const diasEnEstado = Math.floor((new Date() - new Date(doc.updatedAt)) / (1000 * 60 * 60 * 24));
      
      if (diasEnEstado >= 15) {
        atrasadosRojo++;
      } else if (diasEnEstado >= 7) {
        atrasadosAmarillo++;
      }
    });

    // Documentos procesados hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const procesadosHoy = await prisma.document.count({
      where: {
        updatedAt: { gte: hoy }
      }
    });

    const resumen = {
      total,
      pendientes,
      enProceso,
      listos,
      entregados,
      atrasadosAmarillo,
      atrasadosRojo,
      procesadosHoy
    };

    res.json({
      success: true,
      data: { resumen }
    });

  } catch (error) {
    console.error('Error en resumen general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener lista de matrizadores para filtros
 * FUNCIONALIDAD: Reutiliza lógica de recepción
 */
async function obtenerMatrizadores(req, res) {
  try {
    const matrizadores = await prisma.user.findMany({
      where: { 
        role: { in: ['MATRIZADOR', 'ARCHIVO'] },
        isActive: true
      },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        role: true 
      },
      orderBy: { firstName: 'asc' }
    });

    const formattedMatrizadores = matrizadores.map(m => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      fullName: `${m.firstName} ${m.lastName}`,
      role: m.role
    }));

    res.json({
      success: true,
      data: { matrizadores: formattedMatrizadores }
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
 * Obtener detalle de documento (solo lectura para documentos ajenos)
 * FUNCIONALIDAD: Puede ver cualquier documento, modificar solo los propios
 */
async function obtenerDetalleDocumento(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const documento = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        },
        usuarioEntrega: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Calcular alerta de tiempo
    const diasEnEstado = Math.floor((new Date() - new Date(documento.updatedAt)) / (1000 * 60 * 60 * 24));
    let alerta = { nivel: 'normal', icono: '', dias: diasEnEstado };
    
    if (diasEnEstado >= 15) {
      alerta = { nivel: 'roja', icono: '🔥', dias: diasEnEstado };
    } else if (diasEnEstado >= 7) {
      alerta = { nivel: 'amarilla', icono: '⚠️', dias: diasEnEstado };
    }

    // Determinar permisos: puede modificar solo documentos propios
    const puedeModificar = documento.assignedToId === userId;

    res.json({
      success: true,
      data: {
        documento: {
          ...documento,
          alerta
        },
        permisos: {
          puedeModificar,
          soloLectura: !puedeModificar
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo detalle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// ============================================================================
// EXPORTAR FUNCIONES
// ============================================================================

export {
  // Funciones propias (como matrizador)
  dashboardArchivo,
  listarMisDocumentos,
  cambiarEstadoDocumento,
  
  // Funciones de supervisión global
  supervisionGeneral,
  resumenGeneral,
  obtenerMatrizadores,
  obtenerDetalleDocumento
};