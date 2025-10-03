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
    
    // Parsear datosCompletos si viene como string (para consistencia con el frontend)
    let datosCompletosParsed = escritura.datosCompletos;
    if (typeof datosCompletosParsed === 'string') {
      try {
        datosCompletosParsed = JSON.parse(datosCompletosParsed);
      } catch (e) {
        console.warn('[uploadEscritura] No se pudo parsear datosCompletos:', e.message);
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Escritura procesada exitosamente',
      data: {
        id: escritura.id,
        token: escritura.token,
        numeroEscritura: escritura.numeroEscritura,
        datosCompletos: datosCompletosParsed, // ← Enviar parseado para uso inmediato en frontend
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
    
    // Parsear datosCompletos de cada escritura para consistencia
    const escriturasConDatosParsed = escrituras.map(esc => {
      let datosCompletosParsed = esc.datosCompletos;
      if (typeof datosCompletosParsed === 'string') {
        try {
          datosCompletosParsed = JSON.parse(datosCompletosParsed);
        } catch (e) {
          console.warn(`[getEscrituras] No se pudo parsear datosCompletos de escritura ${esc.id}`);
        }
      }
      return {
        ...esc,
        datosCompletos: datosCompletosParsed
      };
    });
    
    res.json({
      success: true,
      data: {
        escrituras: escriturasConDatosParsed,
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
    
    // Parsear datosCompletos para consistencia
    let datosCompletosParsed = escritura.datosCompletos;
    if (typeof datosCompletosParsed === 'string') {
      try {
        datosCompletosParsed = JSON.parse(datosCompletosParsed);
      } catch (e) {
        console.warn('[getEscritura] No se pudo parsear datosCompletos:', e.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        ...escritura,
        datosCompletos: datosCompletosParsed,
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
    const { datosCompletos, estado, numeroEscritura } = req.body;
    
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
        ...(estado && { estado }),
        ...(numeroEscritura && { numeroEscritura })
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
    
    // Parsear datosCompletos para consistencia
    let datosCompletosParsed = updatedEscritura.datosCompletos;
    if (typeof datosCompletosParsed === 'string') {
      try {
        datosCompletosParsed = JSON.parse(datosCompletosParsed);
      } catch (e) {
        console.warn('[updateEscritura] No se pudo parsear datosCompletos:', e.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Escritura actualizada exitosamente',
      data: {
        ...updatedEscritura,
        datosCompletos: datosCompletosParsed
      }
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
 * Parsea recursivamente un valor que puede estar doblemente stringificado
 * @param {any} v - Valor a parsear
 * @returns {any} Valor parseado
 */
function safeParseDeep(v) {
  try {
    if (typeof v === 'string') {
      v = JSON.parse(v);
    }
    // Intentar parsear una segunda vez por si llegó doble stringificado
    if (typeof v === 'string') {
      v = JSON.parse(v);
    }
  } catch (_) {
    // Si no se puede parsear, devolver el valor original
  }
  return v;
}

/**
 * Normaliza la cuantía a un formato consistente
 * @param {any} cuantiaRaw - Valor crudo de cuantía
 * @returns {number|string} Valor normalizado (número o 'INDETERMINADA')
 */
function normalizeCuantia(cuantiaRaw) {
  if (cuantiaRaw === null || cuantiaRaw === undefined || cuantiaRaw === '') {
    return 'INDETERMINADA';
  }

  // Si ya es un número, devolverlo
  if (typeof cuantiaRaw === 'number') {
    return cuantiaRaw;
  }

  // Convertir a string y limpiar
  const cuantiaStr = String(cuantiaRaw).trim().toUpperCase();

  // Valores que se consideran indeterminados
  const valoresIndeterminados = [
    'INDETERMINADA',
    'NO APLICA',
    'INDETERMINADO',
    'S/N',
    'N/A',
    'SIN CUANTIA',
    'SIN CUANTÍA'
  ];

  if (valoresIndeterminados.includes(cuantiaStr)) {
    return 'INDETERMINADA';
  }

  // Intentar extraer número: "$ 1.234,56" → 1234.56
  // Remover todo excepto dígitos, comas, puntos y guiones
  const numeroLimpio = cuantiaStr
    .replace(/[^\d,.-]/g, '') // Remover símbolos de moneda y letras
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, '') // Remover puntos de miles
    .replace(',', '.'); // Convertir coma decimal a punto

  const numeroFloat = parseFloat(numeroLimpio);

  return Number.isFinite(numeroFloat) ? numeroFloat : 'INDETERMINADA';
}

/**
 * Normaliza los datos completos de una escritura para verificación pública
 * @param {Object} datosCompletos - Datos crudos parseados
 * @returns {Object} Datos normalizados y limpios
 */
function normalizeDatosEscritura(datosCompletos) {
  const datos = safeParseDeep(datosCompletos) || {};

  // Normalizar cuantía desde diferentes posibles campos
  const cuantiaRaw = datos.cuantia ?? datos.cuantiaDelActo ?? datos.monto ?? datos.valor ?? '';
  const cuantiaNormalizada = normalizeCuantia(cuantiaRaw);

  // Normalizar notario y notaría desde diferentes posibles campos
  const notario = (
    datos.notarioNombre ?? 
    datos.notario ?? 
    datos.titularNotaria ?? 
    datos.encabezadoNotario ?? 
    ''
  ).toString().trim();

  const notaria = (
    datos.notariaNombre ?? 
    datos.notaria ?? 
    datos.oficina ?? 
    datos.encabezadoNotaria ?? 
    ''
  ).toString().trim();

  // Normalizar acto/contrato
  const acto = (
    datos.acto ?? 
    datos.actoContrato ?? 
    datos.tipoActo ?? 
    datos.contrato ?? 
    ''
  ).toString().trim();

  // Normalizar fecha
  const fechaOtorgamiento = (
    datos.fecha_otorgamiento ?? 
    datos.fechaOtorgamiento ?? 
    datos.fecha ?? 
    ''
  ).toString().trim();

  return {
    ...datos,
    cuantia: cuantiaNormalizada,
    notario,
    notaria,
    acto,
    fecha_otorgamiento: fechaOtorgamiento
  };
}

/**
 * Limpia una lista de personas removiendo entradas inválidas o basura
 * @param {Array} personas - Array de personas (otorgantes/beneficiarios)
 * @returns {Array} Array limpio de personas válidas
 */
function sanitizePersonas(personas) {
  if (!Array.isArray(personas)) return [];

  // Palabras que indican que es un campo de cabecera o basura
  const palabrasBasura = [
    'DOCUMENTO', 'IDENTIDAD', 'COMPARECIENTE', 'INTERVINIENTE', 
    'NOMBRES', 'RAZON SOCIAL', 'DESCONOCIDO', 'CÉDULA', 'CEDULA',
    'TIPO INTERVINIENTE', 'PERSONA QUE', 'NACIONALIDAD', 'CALIDAD',
    'PASAPORTE', 'UBICACIÓN', 'UBICACION', 'PROVINCIA', 'CANTON',
    'PARROQUIA', 'DESCRIPCIÓN', 'DESCRIPCION', 'OBJETO', 'OBSERVACIONES',
    'CUANTÍA', 'CUANTIA', 'CONTRATO', 'OTORGADO POR', 'A FAVOR DE'
  ];

  return personas.filter(persona => {
    if (!persona || !persona.nombre) return false;

    const nombreUpper = String(persona.nombre).toUpperCase().trim();
    
    // Filtrar si el nombre es muy corto (menos de 5 caracteres)
    if (nombreUpper.length < 5) return false;

    // Filtrar si contiene palabras basura
    const contieneBasura = palabrasBasura.some(basura => 
      nombreUpper.includes(basura)
    );
    
    if (contieneBasura) return false;

    // Filtrar si el nombre es solo números o caracteres especiales
    if (/^[\d\s\-\_\.]+$/.test(nombreUpper)) return false;

    // Debe tener al menos 2 palabras (nombre y apellido mínimo)
    const palabras = nombreUpper.split(/\s+/).filter(p => p.length > 0);
    if (palabras.length < 2) return false;

    return true;
  }).map(persona => {
    // Limpiar los campos de la persona
    const numero = String(persona.numero || '').replace(/\D+/g, '');
    
    return {
      nombre: String(persona.nombre || '').trim(),
      documento: String(persona.documento || '').trim() || null,
      numero: numero || null,
      nacionalidad: String(persona.nacionalidad || '').trim() || null,
      calidad: String(persona.calidad || '').trim() || null
    };
  });
}

/**
 * Extrae solo los campos importantes para mostrar públicamente
 * @param {Object} datosNormalizados - Datos normalizados
 * @param {Object} escritura - Registro de escritura de la BD
 * @returns {Object} Datos públicos filtrados
 */
function extractDatosPublicos(datosNormalizados, escritura) {
  // Limpiar otorgantes si existen
  let otorgantesLimpios = null;
  if (datosNormalizados.otorgantes) {
    const otorgadoPor = sanitizePersonas(datosNormalizados.otorgantes.otorgado_por || []);
    const aFavorDe = sanitizePersonas(datosNormalizados.otorgantes.a_favor_de || []);
    
    // Solo incluir si hay al menos una persona válida
    if (otorgadoPor.length > 0 || aFavorDe.length > 0) {
      otorgantesLimpios = {
        otorgado_por: otorgadoPor,
        a_favor_de: aFavorDe
      };
    }
  }

  // Whitelist de campos importantes
  const datosPublicos = {
    // Identificación
    token: escritura.token,
    numeroEscritura: escritura.numeroEscritura || 'N/A',

    // Información del acto (6 campos clave)
    acto: datosNormalizados.acto || 'N/A',
    fecha_otorgamiento: datosNormalizados.fecha_otorgamiento || 'N/A',
    cuantia: datosNormalizados.cuantia,
    notario: datosNormalizados.notario || 'N/A',
    notaria: datosNormalizados.notaria || 'N/A',

    // Partes (solo si hay personas válidas después de limpiar)
    ...(otorgantesLimpios && { otorgantes: otorgantesLimpios }),

    // Objeto/observaciones (solo si existe y no está vacío)
    ...(datosNormalizados.objeto_observaciones && {
      objeto_observaciones: datosNormalizados.objeto_observaciones
    }),

    // Ubicación (solo campos principales si existe)
    ...(datosNormalizados.ubicacion && {
      ubicacion: {
        provincia: datosNormalizados.ubicacion.provincia || null,
        canton: datosNormalizados.ubicacion.canton || null,
        parroquia: datosNormalizados.ubicacion.parroquia || null
      }
    }),

    // Metadata de verificación
    verificadoEn: new Date().toISOString(),
    procesadoPor: escritura.creador ? 
      `${escritura.creador.firstName} ${escritura.creador.lastName}` : 
      'Sistema'
  };

  return datosPublicos;
}

/**
 * GET /api/verify/:token
 * Verificación pública de escritura (sin autenticación)
 */
export async function verifyEscritura(req, res) {
  try {
    console.log('[API-QR] Verificando token:', req.params.token?.substring(0, 4) + '****');
    
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
      console.log('[API-QR] Escritura no encontrada para token:', token);
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    if (escritura.estado !== 'activo') {
      console.log('[API-QR] Escritura inactiva:', token, 'estado:', escritura.estado);
      return res.status(400).json({
        success: false,
        message: 'Esta escritura no está disponible para verificación'
      });
    }
    
    // Parsear datos completos (puede venir stringificado)
    let datosCompletos = {};
    try {
      datosCompletos = typeof escritura.datosCompletos === 'string' 
        ? JSON.parse(escritura.datosCompletos)
        : escritura.datosCompletos || {};
    } catch (e) {
      console.error('[API-QR] Error parsing datosCompletos:', e.message);
      datosCompletos = {};
    }
    
    // Normalizar datos (cuantía, notario, etc.)
    const datosNormalizados = normalizeDatosEscritura(datosCompletos);
    
    // Extraer solo campos públicos importantes
    const datosPublicos = extractDatosPublicos(datosNormalizados, escritura);
    
    console.log('[API-QR] Verificación exitosa:', {
      token: token.substring(0, 4) + '****',
      numeroEscritura: datosPublicos.numeroEscritura,
      acto: datosPublicos.acto?.substring(0, 30) + '...',
      cuantia: typeof datosPublicos.cuantia === 'number' ? `$${datosPublicos.cuantia}` : datosPublicos.cuantia
    });
    
    // TODO: Registrar verificación para analytics
    // await registrarVerificacion(token, req.ip, req.get('User-Agent'));
    
    res.json({
      success: true,
      message: 'Escritura verificada exitosamente',
      data: datosPublicos
    });
    
  } catch (error) {
    console.error('[API-QR] Error en verifyEscritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * POST /api/escrituras/manual
 * Crea una escritura ingresando datos manualmente (sin PDF)
 * Solo para matrizadores
 */
export async function createEscrituraManual(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verificar que sea matrizador
    if (userRole !== 'MATRIZADOR' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo los matrizadores pueden crear escrituras'
      });
    }
    
    const {
      numeroEscritura,
      acto,
      fecha_otorgamiento,
      cuantia,
      notario,
      notaria,
      ubicacion,
      otorgantes,
      objeto_observaciones,
      extractoTextoCompleto
    } = req.body;
    
    // Validar campos requeridos
    if (!numeroEscritura) {
      return res.status(400).json({
        success: false,
        message: 'El número de escritura es requerido'
      });
    }
    
    if (!acto) {
      return res.status(400).json({
        success: false,
        message: 'El acto/contrato es requerido'
      });
    }
    
    if (!fecha_otorgamiento) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de otorgamiento es requerida'
      });
    }
    
    console.log('[createEscrituraManual] Creando escritura manual:', {
      numeroEscritura,
      acto: acto.substring(0, 30) + '...',
      usuario: req.user.email
    });
    
    // Construir objeto datosCompletos
    const datosCompletos = {
      escritura: numeroEscritura,
      acto: acto || '',
      fecha_otorgamiento: fecha_otorgamiento || '',
      cuantia: cuantia || 'INDETERMINADA',
      notario: notario || 'GLENDA ELIZABETH ZAPATA SILVA',
      notaria: notaria || 'DÉCIMA OCTAVA DEL CANTÓN QUITO',
      ubicacion: ubicacion || {},
      otorgantes: otorgantes || { otorgado_por: [], a_favor_de: [] },
      objeto_observaciones: objeto_observaciones || ''
    };
    
    // Generar token único
    const token = await generateUniqueToken(prisma);
    
    // Crear escritura en base de datos
    const escritura = await prisma.escrituraQR.create({
      data: {
        token: token,
        numeroEscritura: numeroEscritura,
        datosCompletos: JSON.stringify(datosCompletos),
        archivoOriginal: null, // No hay archivo PDF
        extractoTextoCompleto: extractoTextoCompleto || null,
        origenDatos: 'MANUAL',
        estado: 'activo', // Ingreso manual se considera revisado
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
    
    console.log('[createEscrituraManual] Escritura manual creada exitosamente:', escritura.id);
    
    res.status(201).json({
      success: true,
      message: 'Escritura creada exitosamente',
      data: {
        id: escritura.id,
        token: escritura.token,
        numeroEscritura: escritura.numeroEscritura,
        datosCompletos: datosCompletos, // Enviar como objeto
        origenDatos: escritura.origenDatos,
        estado: escritura.estado,
        createdAt: escritura.createdAt,
        creador: escritura.creador,
        qr: qrInfo
      }
    });
    
  } catch (error) {
    console.error('[createEscrituraManual] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
