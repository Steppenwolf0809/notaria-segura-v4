/**
 * Controlador para el módulo de escrituras QR
 * Maneja upload de PDFs, parsing, generación de QR y verificación pública
 */

import prisma from '../db.js';
import { parseEscrituraPDF, validatePDFFile, sanitizeFilename } from '../services/pdf-parser-escrituras.js';
import { generateUniqueToken } from '../utils/token-generator.js';
import { generateQRInfo, generateMultiFormatQR } from '../services/qr-generator-service.js';

/**
 * POST /api/escrituras/upload
 * Sube un PDF, lo parsea y genera el QR
 * Solo para matrizadores
 */
export async function uploadEscritura(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar que sea matrizador
    if (userRole !== 'MATRIZADOR') {
      return res.status(403).json({
        success: false,
        message: 'Solo los matrizadores pueden subir escrituras'
      });
    }
    
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo PDF'
      });
    }
    
    const file = req.file;
    
    // Validar que sea un PDF
    if (!validatePDFFile(file.buffer, file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe ser un PDF válido'
      });
    }
    
    // Sanitizar nombre del archivo
    const sanitizedFilename = sanitizeFilename(file.originalname);
    
    // Parsear el PDF
    const parseResult = await parseEscrituraPDF(file.buffer, sanitizedFilename);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Error procesando el PDF',
        error: parseResult.error
      });
    }
    
    // Generar token único
    const token = await generateUniqueToken(prisma);
    
    // Guardar en base de datos
    const escritura = await prisma.escrituraQR.create({
      data: {
        token: token,
        numeroEscritura: parseResult.numeroEscritura,
        datosCompletos: parseResult.datosCompletos,
        archivoOriginal: sanitizedFilename,
        estado: parseResult.estado,
        createdBy: userId
      },
      include: {
        creador: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    // Generar información del QR
    const qrInfo = await generateQRInfo(token);
    
    res.status(201).json({
      success: true,
      message: 'Escritura procesada exitosamente',
      data: {
        id: escritura.id,
        token: escritura.token,
        numeroEscritura: escritura.numeroEscritura,
        estado: escritura.estado,
        archivoOriginal: escritura.archivoOriginal,
        createdAt: escritura.createdAt,
        creador: escritura.creador,
        qr: qrInfo,
        warnings: parseResult.warnings || []
      }
    });
    
  } catch (error) {
    console.error('Error en uploadEscritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/escrituras
 * Lista todas las escrituras del matrizador actual
 */
export async function getEscrituras(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar permisos
    if (userRole !== 'MATRIZADOR' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver las escrituras'
      });
    }
    
    // Parámetros de consulta
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const estado = req.query.estado;
    const search = req.query.search;
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const where = {};
    
    // Solo matrizadores ven sus propias escrituras, admins ven todas
    if (userRole === 'MATRIZADOR') {
      where.createdBy = userId;
    }
    
    if (estado) {
      where.estado = estado;
    }
    
    if (search) {
      where.OR = [
        { numeroEscritura: { contains: search } },
        { archivoOriginal: { contains: search } }
      ];
    }
    
    // Obtener escrituras con paginación
    const [escrituras, total] = await Promise.all([
      prisma.escrituraQR.findMany({
        where,
        include: {
          creador: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.escrituraQR.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        escrituras,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getEscrituras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * GET /api/escrituras/:id
 * Obtiene una escritura específica
 */
export async function getEscritura(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) },
      include: {
        creador: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar permisos
    if (userRole === 'MATRIZADOR' && escritura.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta escritura'
      });
    }
    
    // Generar QR actualizado
    const qrInfo = await generateQRInfo(escritura.token);
    
    res.json({
      success: true,
      data: {
        ...escritura,
        qr: qrInfo
      }
    });
    
  } catch (error) {
    console.error('Error en getEscritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * PUT /api/escrituras/:id
 * Actualiza datos de una escritura
 */
export async function updateEscritura(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { datosCompletos, estado } = req.body;
    
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar permisos
    if (userRole === 'MATRIZADOR' && escritura.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar esta escritura'
      });
    }
    
    // Validar estado si se proporciona
    const estadosValidos = ['activo', 'revision_requerida', 'inactivo'];
    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }
    
    // Actualizar escritura
    const updatedEscritura = await prisma.escrituraQR.update({
      where: { id: parseInt(id) },
      data: {
        ...(datosCompletos && { datosCompletos }),
        ...(estado && { estado })
      },
      include: {
        creador: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Escritura actualizada exitosamente',
      data: updatedEscritura
    });
    
  } catch (error) {
    console.error('Error en updateEscritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * GET /api/escrituras/:id/qr
 * Genera QR en múltiples formatos para una escritura
 */
export async function getEscrituraQR(req, res) {
  try {
    const { id } = req.params;
    const format = req.query.format || 'display';
    
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    if (escritura.estado !== 'activo') {
      return res.status(400).json({
        success: false,
        message: 'La escritura no está activa para generar QR'
      });
    }
    
    // Generar QR según formato solicitado
    let qrData;
    if (format === 'multi') {
      qrData = await generateMultiFormatQR(escritura.token);
    } else {
      qrData = await generateQRInfo(escritura.token);
    }
    
    res.json({
      success: true,
      data: qrData
    });
    
  } catch (error) {
    console.error('Error en getEscrituraQR:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando código QR'
    });
  }
}

/**
 * GET /api/verify/:token
 * Verificación pública de escritura (sin autenticación)
 */
export async function verifyEscritura(req, res) {
  try {
    const { token } = req.params;
    
    // Validar formato del token
    if (!token || !/^[A-Za-z0-9]{8}$/.test(token)) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    // Buscar escritura por token
    const escritura = await prisma.escrituraQR.findUnique({
      where: { token },
      include: {
        creador: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    if (escritura.estado !== 'activo') {
      return res.status(400).json({
        success: false,
        message: 'Esta escritura no está disponible para verificación'
      });
    }
    
    // Parsear datos completos
    let datosCompletos = {};
    try {
      datosCompletos = JSON.parse(escritura.datosCompletos || '{}');
    } catch (e) {
      console.error('Error parsing datosCompletos:', e);
    }
    
    // Datos públicos para mostrar
    const datosPublicos = {
      token: escritura.token,
      numeroEscritura: escritura.numeroEscritura,
      acto: datosCompletos.acto,
      fecha_otorgamiento: datosCompletos.fecha_otorgamiento,
      notario: datosCompletos.notario,
      notaria: datosCompletos.notaria,
      ubicacion: datosCompletos.ubicacion,
      cuantia: datosCompletos.cuantia,
      otorgantes: datosCompletos.otorgantes || null,
      objeto_observaciones: datosCompletos.objeto_observaciones || null,
      verificadoEn: new Date().toISOString(),
      procesadoPor: escritura.creador ? 
        `${escritura.creador.firstName} ${escritura.creador.lastName}` : 
        'Sistema'
    };
    
    // TODO: Registrar verificación para analytics
    // await registrarVerificacion(token, req.ip, req.get('User-Agent'));
    
    res.json({
      success: true,
      message: 'Escritura verificada exitosamente',
      data: datosPublicos
    });
    
  } catch (error) {
    console.error('Error en verifyEscritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * DELETE /api/escrituras/:id
 * Desactiva una escritura (soft delete)
 */
export async function deleteEscritura(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar permisos
    if (userRole === 'MATRIZADOR' && escritura.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta escritura'
      });
    }
    
    // Desactivar escritura
    await prisma.escrituraQR.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'inactivo',
        activo: false
      }
    });
    
    res.json({
      success: true,
      message: 'Escritura desactivada exitosamente'
    });
    
  } catch (error) {
    console.error('Error en deleteEscritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
