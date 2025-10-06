/**
 * Controlador para el módulo de escrituras QR
 * Maneja upload de PDFs, parsing, generación de QR y verificación pública
 */

import prisma from '../db.js';
import { parseEscrituraPDF, validatePDFFile, sanitizeFilename } from '../services/pdf-parser-escrituras.js';
import { generateUniqueToken } from '../utils/token-generator.js';
import { generateQRInfo, generateMultiFormatQR } from '../services/qr-generator-service.js';
import { uploadPhotoToFTP } from '../services/cpanel-ftp-service.js';
import { 
  uploadPDFToFTP, 
  downloadPDFFromFTP, 
  validatePDFFile as validatePDFBuffer 
} from '../services/cpanel-ftp-service.js';

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
    
    // Con multer.fields(), los archivos están en req.files
    const files = req.files || {};
    const pdfFile = files.pdfFile ? files.pdfFile[0] : null;
    const fotoFile = files.foto ? files.foto[0] : null;
    
    // Verificar que se subió el PDF (obligatorio)
    if (!pdfFile) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo PDF'
      });
    }
    
    // Validar que sea un PDF
    if (!validatePDFFile(pdfFile.buffer, pdfFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe ser un PDF válido'
      });
    }
    
    // Validar foto si se proporcionó
    if (fotoFile) {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validImageTypes.includes(fotoFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de foto inválido. Solo JPG, PNG o WEBP'
        });
      }
      
      // Verificar tamaño de foto (máximo 5MB)
      const maxFotoSize = 5 * 1024 * 1024; // 5MB
      if (fotoFile.size > maxFotoSize) {
        return res.status(400).json({
          success: false,
          message: 'La foto es demasiado grande (máximo 5MB)'
        });
      }
      
      console.log(`[uploadEscritura] Foto recibida: ${fotoFile.originalname} (${(fotoFile.size / 1024).toFixed(2)} KB)`);
    }
    
    // Sanitizar nombre del archivo PDF
    const sanitizedFilename = sanitizeFilename(pdfFile.originalname);
    
    // Parsear el PDF
    const parseResult = await parseEscrituraPDF(pdfFile.buffer, sanitizedFilename);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Error procesando el PDF',
        error: parseResult.error
      });
    }
    
    // Generar token único
    const token = await generateUniqueToken(prisma);
    
    // Variable para la URL de la foto
    let fotoURL = null;
    let fotoUploadWarning = null;
    
    // Procesar foto si existe
    if (fotoFile) {
      try {
        console.log(`[uploadEscritura] Subiendo foto al FTP para token ${token}...`);
        
        // Nombre del archivo: token + extensión original
        const fotoExtension = fotoFile.originalname.split('.').pop().toLowerCase();
        const fotoFilename = `${token}.${fotoExtension}`;
        
        // Subir foto al FTP
        fotoURL = await uploadPhotoToFTP(fotoFile.buffer, fotoFilename);
        
        console.log(`[uploadEscritura] ✅ Foto subida exitosamente: ${fotoURL}`);
      } catch (fotoError) {
        // Si falla la foto, NO bloquear la creación de la escritura
        console.error('[uploadEscritura] ❌ Error subiendo foto:', fotoError.message);
        fotoUploadWarning = `La escritura se creó correctamente, pero no se pudo subir la foto: ${fotoError.message}`;
        fotoURL = null; // Asegurar que quede null
      }
    }
    
    // Guardar en base de datos
    const escritura = await prisma.escrituraQR.create({
      data: {
        token: token,
        numeroEscritura: parseResult.numeroEscritura,
        datosCompletos: parseResult.datosCompletos,
        archivoOriginal: sanitizedFilename,
        fotoURL: fotoURL, // Puede ser null si no hay foto o si falló
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
    
    // Construir warnings
    const allWarnings = [...(parseResult.warnings || [])];
    if (fotoUploadWarning) {
      allWarnings.push(fotoUploadWarning);
    }
    
    // Construir mensaje de respuesta
    let successMessage = 'Escritura procesada exitosamente';
    if (fotoURL) {
      successMessage += ' con fotografía';
    } else if (fotoFile) {
      successMessage += ' (sin fotografía debido a error en upload)';
    }
    
    res.status(201).json({
      success: true,
      message: successMessage,
      data: {
        id: escritura.id,
        token: escritura.token,
        numeroEscritura: escritura.numeroEscritura,
        datosCompletos: datosCompletosParsed,
        estado: escritura.estado,
        archivoOriginal: escritura.archivoOriginal,
        fotoURL: escritura.fotoURL, // Incluir URL de foto (o null)
        createdAt: escritura.createdAt,
        creador: escritura.creador,
        qr: qrInfo,
        warnings: allWarnings
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
 * Actualiza datos de una escritura (ahora soporta actualizar foto)
 */
export async function updateEscritura(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Extraer datos del body
    // Si viene con foto, los datos pueden estar en req.body.data como JSON string
    let bodyData;
    if (req.body.data) {
      try {
        bodyData = JSON.parse(req.body.data);
      } catch (parseError) {
        bodyData = req.body;
      }
    } else {
      bodyData = req.body;
    }
    
    const { datosCompletos, estado, numeroEscritura } = bodyData;
    
    // Buscar escritura actual
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
    
    // Procesar foto si se está actualizando
    let nuevaFotoURL = null;
    let fotoWarning = null;
    const files = req.files || {};
    const fotoFile = files.foto ? files.foto[0] : null;
    
    if (fotoFile) {
      console.log(`[updateEscritura] Procesando nueva foto para escritura ${id}...`);
      
      try {
        // Si existe una foto anterior, eliminarla del FTP
        if (escritura.fotoURL) {
          try {
            // Extraer nombre del archivo de la URL antigua
            const urlParts = escritura.fotoURL.split('/');
            const oldFilename = urlParts[urlParts.length - 1];
            
            console.log(`[updateEscritura] Eliminando foto antigua del FTP: ${oldFilename}`);
            
            // Importar función de eliminación dinámicamente
            const { deletePhotoFromFTP } = await import('../services/cpanel-ftp-service.js');
            await deletePhotoFromFTP(oldFilename);
            
            console.log(`[updateEscritura] ✅ Foto antigua eliminada del FTP`);
          } catch (deleteError) {
            // Si falla la eliminación, solo registrar warning pero continuar
            console.warn(`[updateEscritura] ⚠️ No se pudo eliminar foto antigua: ${deleteError.message}`);
          }
        }
        
        // Generar nombre único para la nueva foto
        const timestamp = Date.now();
        const originalExtension = fotoFile.originalname.split('.').pop().toLowerCase();
        const sanitizedBasename = sanitizeFilename(
          fotoFile.originalname.replace(/\.[^/.]+$/, '') // Remover extensión
        );
        const newFilename = `${timestamp}-${sanitizedBasename}.${originalExtension}`;
        
        console.log(`[updateEscritura] Subiendo nueva foto al FTP: ${newFilename}`);
        
        // Subir nueva foto al FTP
        nuevaFotoURL = await uploadPhotoToFTP(fotoFile.buffer, newFilename);
        
        console.log(`[updateEscritura] ✅ Nueva foto subida exitosamente: ${nuevaFotoURL}`);
        
      } catch (fotoError) {
        // Si falla la actualización de foto, registrar warning pero no bloquear la actualización
        console.error('[updateEscritura] ❌ Error procesando foto:', fotoError.message);
        fotoWarning = `Datos actualizados, pero no se pudo actualizar la foto: ${fotoError.message}`;
      }
    }
    
    // Preparar datos para actualización
    const dataToUpdate = {};
    if (datosCompletos) dataToUpdate.datosCompletos = datosCompletos;
    if (estado) dataToUpdate.estado = estado;
    if (numeroEscritura) dataToUpdate.numeroEscritura = numeroEscritura;
    if (nuevaFotoURL) dataToUpdate.fotoURL = nuevaFotoURL;
    
    // Actualizar escritura en base de datos
    const updatedEscritura = await prisma.escrituraQR.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
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
    
    // Construir respuesta
    const response = {
      success: true,
      message: fotoWarning || 'Escritura actualizada exitosamente',
      data: {
        ...updatedEscritura,
        datosCompletos: datosCompletosParsed
      }
    };
    
    if (fotoWarning) {
      response.warning = fotoWarning;
    }
    
    res.json(response);
    
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
    // Limpiar los campos de la persona - estructura simplificada
    const numero = String(persona.numero || '').replace(/\D+/g, '');
    
    const personaLimpia = {
      nombre: String(persona.nombre || '').trim(),
      documento: String(persona.documento || '').trim() || 'CÉDULA',
      numero: numero || null
    };
    
    // Solo incluir representadoPor si tiene valor
    if (persona.representadoPor && String(persona.representadoPor).trim()) {
      personaLimpia.representadoPor = String(persona.representadoPor).trim();
    }
    
    return personaLimpia;
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

    // Fotografía del menor (si existe)
    ...(escritura.fotoURL && { fotoURL: escritura.fotoURL }),

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
 * Crea una escritura ingresando datos manualmente (sin PDF, con foto opcional)
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
    
    // Con multer.fields(), los archivos están en req.files
    const files = req.files || {};
    const fotoFile = files.foto ? files.foto[0] : null;
    
    // Si viene con foto, los datos están en req.body.data como string JSON
    // Si viene sin foto, los datos están directamente en req.body
    let datosBody;
    if (fotoFile && req.body.data) {
      try {
        datosBody = JSON.parse(req.body.data);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Error al parsear los datos de la escritura'
        });
      }
    } else {
      datosBody = req.body;
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
    } = datosBody;
    
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
      tieneFoto: !!fotoFile,
      usuario: req.user.email
    });
    
    // Generar token único
    const token = await generateUniqueToken(prisma);
    
    // Procesar foto si existe
    let fotoURL = null;
    let fotoUploadWarning = null;
    
    if (fotoFile) {
      try {
        console.log(`[createEscrituraManual] Subiendo foto al FTP para token ${token}...`);
        
        // Nombre del archivo: token + extensión original
        const fotoExtension = fotoFile.originalname.split('.').pop().toLowerCase();
        const fotoFilename = `${token}.${fotoExtension}`;
        
        // Subir foto al FTP
        fotoURL = await uploadPhotoToFTP(fotoFile.buffer, fotoFilename);
        
        console.log(`[createEscrituraManual] ✅ Foto subida exitosamente: ${fotoURL}`);
      } catch (fotoError) {
        // Si falla la foto, NO bloquear la creación de la escritura
        console.error('[createEscrituraManual] ❌ Error subiendo foto:', fotoError.message);
        fotoUploadWarning = `La escritura se creó correctamente, pero no se pudo subir la foto: ${fotoError.message}`;
        fotoURL = null; // Asegurar que quede null
      }
    }
    
    // Construir objeto datosCompletos (estructura simplificada)
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
    
    // Crear escritura en base de datos
    const escritura = await prisma.escrituraQR.create({
      data: {
        token: token,
        numeroEscritura: numeroEscritura,
        datosCompletos: JSON.stringify(datosCompletos),
        archivoOriginal: null, // No hay archivo PDF
        extractoTextoCompleto: extractoTextoCompleto || null,
        fotoURL: fotoURL, // Puede ser null si no hay foto o si falló
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
    
    // Respuesta con o sin warning de foto
    const response = {
      success: true,
      message: fotoUploadWarning || 'Escritura creada exitosamente',
      data: {
        id: escritura.id,
        token: escritura.token,
        numeroEscritura: escritura.numeroEscritura,
        datosCompletos: datosCompletos, // Enviar como objeto
        fotoURL: fotoURL, // Incluir URL de foto si existe
        origenDatos: escritura.origenDatos,
        estado: escritura.estado,
        createdAt: escritura.createdAt,
        creador: escritura.creador,
        qr: qrInfo
      }
    };
    
    if (fotoUploadWarning) {
      response.warning = fotoUploadWarning;
    }
    
    res.status(201).json(response);
    
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

/**
 * DELETE /api/escrituras/:id/hard-delete
 * Elimina permanentemente una escritura de la base de datos (hard delete)
 * ACCIÓN IRREVERSIBLE - Solo para matrizadores
 */
export async function hardDeleteEscritura(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`[hardDelete] Usuario ${userId} (${userRole}) intentando eliminar escritura ${id}`);
    
    // Verificar que sea matrizador (el middleware ya validó, pero doble verificación)
    if (userRole !== 'MATRIZADOR' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo los matrizadores pueden eliminar escrituras permanentemente'
      });
    }
    
    // Buscar escritura
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar permisos: solo el creador puede eliminar (o admin)
    if (userRole === 'MATRIZADOR' && escritura.createdBy !== userId) {
      console.log(`[hardDelete] Permiso denegado: escritura creada por ${escritura.createdBy}, solicitante ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Solo puedes eliminar escrituras que tú creaste'
      });
    }
    
    // Guardar info para logs antes de eliminar
    const numeroEscritura = escritura.numeroEscritura;
    const token = escritura.token;
    const fotoURL = escritura.fotoURL;
    
    // ELIMINACIÓN PERMANENTE de la base de datos
    await prisma.escrituraQR.delete({
      where: { id: parseInt(id) }
    });
    
    console.log(`[hardDelete] ✅ Escritura ${id} (${numeroEscritura}, token: ${token}) eliminada permanentemente por usuario ${userId}`);
    
    // TODO FUTURO: Eliminar foto del FTP si existe
    // if (fotoURL) {
    //   try {
    //     await deletePhotoFromFTP(fotoURL);
    //     console.log(`[hardDelete] Foto eliminada del FTP: ${fotoURL}`);
    //   } catch (ftpError) {
    //     console.warn(`[hardDelete] No se pudo eliminar foto del FTP: ${ftpError.message}`);
    //   }
    // }
    
    res.json({
      success: true,
      message: 'Escritura eliminada permanentemente',
      data: {
        id: parseInt(id),
        numeroEscritura,
        token
      }
    });
    
  } catch (error) {
    console.error('[hardDelete] Error eliminando escritura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * POST /api/escrituras/:id/pdf
 * Sube el PDF completo de una escritura al FTP
 * Solo para ADMIN y MATRIZADOR (protegido)
 */
export async function uploadPDFToEscritura(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`[uploadPDF] Usuario ${userId} (${userRole}) subiendo PDF para escritura ${id}`);
    
    // Verificar permisos (ADMIN o MATRIZADOR)
    if (userRole !== 'ADMIN' && userRole !== 'MATRIZADOR') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores y matrizadores pueden subir PDFs'
      });
    }
    
    // Verificar que se recibió el archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo PDF'
      });
    }
    
    const pdfFile = req.file;
    
    // Obtener páginas ocultas si se proporcionaron
    const hiddenPages = req.body.hiddenPages || null;
    let hiddenPagesArray = null;
    
    if (hiddenPages) {
      try {
        hiddenPagesArray = JSON.parse(hiddenPages);
        // Validar que sea un array de números
        if (!Array.isArray(hiddenPagesArray) || !hiddenPagesArray.every(p => typeof p === 'number' && p > 0)) {
          return res.status(400).json({
            success: false,
            message: 'Las páginas ocultas deben ser un array de números positivos'
          });
        }
        console.log(`[uploadPDF] Páginas a ocultar: ${hiddenPagesArray.join(', ')}`);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Formato inválido de páginas ocultas'
        });
      }
    }
    
    // Validar que sea un PDF (verificar magic bytes)
    if (!validatePDFBuffer(pdfFile.buffer)) {
      return res.status(400).json({
        success: false,
        message: 'El archivo no es un PDF válido'
      });
    }
    
    // Validar tamaño máximo (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (pdfFile.size > maxSize) {
      const sizeMB = (pdfFile.size / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        success: false,
        message: `El archivo es demasiado grande (${sizeMB}MB). Máximo permitido: 10MB`
      });
    }
    
    // Buscar escritura
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Nombre del archivo: {TOKEN}.pdf
    const filename = `${escritura.token}.pdf`;
    
    console.log(`[uploadPDF] Subiendo PDF al FTP: ${filename} (${(pdfFile.size / 1024).toFixed(2)} KB)`);
    
    // Subir PDF al FTP (si ya existe, se reemplaza automáticamente)
    const pdfURL = await uploadPDFToFTP(pdfFile.buffer, filename);
    
    // Actualizar base de datos
    const updateData = {
      pdfFileName: filename,
      pdfUploadedAt: new Date(),
      pdfUploadedBy: userId,
      pdfFileSize: pdfFile.size
    };
    
    // Agregar páginas ocultas si se proporcionaron
    if (hiddenPagesArray && hiddenPagesArray.length > 0) {
      updateData.pdfHiddenPages = JSON.stringify(hiddenPagesArray);
      console.log(`[uploadPDF] Guardando ${hiddenPagesArray.length} página(s) oculta(s)`);
    } else {
      // Si no hay páginas ocultas, establecer como null (todas visibles)
      updateData.pdfHiddenPages = null;
    }
    
    await prisma.escrituraQR.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    console.log(`[uploadPDF] ✅ PDF subido exitosamente para escritura ${id}`);
    
    // Respuesta
    res.json({
      success: true,
      message: 'PDF subido exitosamente',
      data: {
        fileName: filename,
        fileSize: pdfFile.size,
        uploadedAt: new Date(),
        pdfURL: pdfURL,
        hiddenPages: hiddenPagesArray || []
      }
    });
    
  } catch (error) {
    console.error('[uploadPDF] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error subiendo el PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/verify/:token/pdf
 * Redirige al PDF completo de una escritura hospedado en el dominio (PÚBLICO)
 * Cualquiera con el token puede ver el PDF
 * 
 * NOTA: El PDF se sirve directamente desde el dominio de la notaría para mejor performance
 */
export async function getPDFPublic(req, res) {
  try {
    const { token } = req.params;
    
    console.log(`[getPDFPublic] Solicitud de PDF con token: ${token.substring(0, 4)}****`);
    
    // Validar formato del token
    if (!token || !/^[A-Za-z0-9]{8}$/.test(token)) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    // Buscar escritura por token
    const escritura = await prisma.escrituraQR.findUnique({
      where: { token }
    });
    
    if (!escritura) {
      console.log(`[getPDFPublic] Escritura no encontrada para token: ${token}`);
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar que esté activa
    if (escritura.estado !== 'activo') {
      console.log(`[getPDFPublic] Escritura inactiva: ${token}`);
      return res.status(400).json({
        success: false,
        message: 'Esta escritura no está disponible para verificación'
      });
    }
    
    // Verificar que tenga PDF subido
    if (!escritura.pdfFileName) {
      console.log(`[getPDFPublic] Escritura sin PDF subido: ${token}`);
      return res.status(404).json({
        success: false,
        message: 'El PDF de esta escritura no está disponible'
      });
    }
    
    // Incrementar contador de visualizaciones (no esperar)
    prisma.escrituraQR.update({
      where: { id: escritura.id },
      data: {
        pdfViewCount: {
          increment: 1
        }
      }
    }).catch(err => {
      console.warn('[getPDFPublic] Error actualizando contador de vistas:', err.message);
    });
    
    // Registrar visualización (IP, fecha)
    const clientIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    console.log(`[getPDFPublic] ✅ Redirigiendo a PDF. IP: ${clientIP}, Token: ${token.substring(0, 4)}****`);
    
    // Construir URL pública del PDF (sirve directamente desde el dominio)
    const publicBaseURL = process.env.PUBLIC_FOTOS_URL || 'https://notaria18quito.com.ec/fotos-escrituras';
    const pdfURL = `${publicBaseURL}/${escritura.pdfFileName}`;
    
    console.log(`[getPDFPublic] Redirigiendo a: ${pdfURL}`);
    
    // Redirigir al PDF hospedado en el dominio
    // Usamos 302 (temporal) en caso de que necesitemos cambiar la ubicación en el futuro
    res.redirect(302, pdfURL);
    
  } catch (error) {
    console.error('[getPDFPublic] Error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener el PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * GET /api/verify/:token/pdf/metadata
 * Obtiene la metadata del PDF (incluyendo páginas ocultas) - PÚBLICO
 * No requiere autenticación
 */
export async function getPDFMetadata(req, res) {
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
      select: {
        id: true,
        token: true,
        numeroEscritura: true,
        pdfFileName: true,
        pdfFileSize: true,
        pdfHiddenPages: true,
        estado: true
      }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar que esté activa
    if (escritura.estado !== 'activo') {
      return res.status(400).json({
        success: false,
        message: 'Esta escritura no está disponible para verificación'
      });
    }
    
    // Verificar que tenga PDF
    if (!escritura.pdfFileName) {
      return res.status(404).json({
        success: false,
        message: 'Esta escritura no tiene PDF disponible'
      });
    }
    
    // Parsear páginas ocultas
    let hiddenPages = [];
    if (escritura.pdfHiddenPages) {
      try {
        hiddenPages = JSON.parse(escritura.pdfHiddenPages);
      } catch (e) {
        console.error('[getPDFMetadata] Error parsing hiddenPages:', e);
        hiddenPages = [];
      }
    }
    
    res.json({
      success: true,
      data: {
        numeroEscritura: escritura.numeroEscritura,
        pdfFileName: escritura.pdfFileName,
        pdfFileSize: escritura.pdfFileSize,
        hiddenPages: hiddenPages,
        hasHiddenPages: hiddenPages.length > 0
      }
    });
    
  } catch (error) {
    console.error('[getPDFMetadata] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener metadata del PDF'
    });
  }
}

/**
 * GET /api/escrituras/:id/pdf
 * Obtiene el PDF de una escritura por ID (PROTEGIDO)
 * Solo para ADMIN y MATRIZADOR
 */
export async function getPDFPrivate(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`[getPDFPrivate] Usuario ${userId} (${userRole}) solicitando PDF de escritura ${id}`);
    
    // Verificar permisos
    if (userRole !== 'ADMIN' && userRole !== 'MATRIZADOR') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este PDF'
      });
    }
    
    // Buscar escritura
    const escritura = await prisma.escrituraQR.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!escritura) {
      return res.status(404).json({
        success: false,
        message: 'Escritura no encontrada'
      });
    }
    
    // Verificar que tenga PDF subido
    if (!escritura.pdfFileName) {
      return res.status(404).json({
        success: false,
        message: 'Esta escritura no tiene un PDF subido'
      });
    }
    
    // Descargar PDF del FTP
    console.log(`[getPDFPrivate] Descargando PDF del FTP: ${escritura.pdfFileName}`);
    const pdfBuffer = await downloadPDFFromFTP(escritura.pdfFileName);
    
    console.log(`[getPDFPrivate] ✅ PDF servido exitosamente a usuario ${userId}`);
    
    // Configurar headers para visualización inline
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('[getPDFPrivate] Error completo:', error);
    console.error('[getPDFPrivate] Stack trace:', error.stack);
    
    // Errores específicos del FTP
    if (error.message.includes('PDF no encontrado') || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'El archivo PDF no se encuentra en el servidor FTP'
      });
    }
    
    if (error.message.includes('FTP') || error.message.includes('timeout')) {
      return res.status(503).json({
        success: false,
        message: 'Error al conectar con el servidor de archivos. Intenta nuevamente en unos momentos.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener el PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
