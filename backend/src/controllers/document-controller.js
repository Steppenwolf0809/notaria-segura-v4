import prisma from '../db.js';
import { Prisma } from '@prisma/client';
import { getReversionCleanupData, isValidStatus, isReversion as isReversionFn } from '../utils/status-transitions.js';
import { parseXmlDocument, generateVerificationCode } from '../services/xml-parser-service.js';
import MatrizadorAssignmentService from '../services/matrizador-assignment-service.js';
import {
  formatEventDescription,
  getEventContextInfo,
  getEventTitle,
  getEventIcon,
  getEventColor
} from '../utils/event-formatter.js';
import AdvancedExtractionService from '../services/advanced-extraction-service.js';
import ActosExtractorService from '../services/actos-extractor-service.js';
// const WhatsAppService = require('../services/whatsapp-service.js'); // Descomentar cuando exista

/**
 * Procesar XML y crear documento automáticamente
 * Función para CAJA: Upload XML, procesar y crear documento
 * @param {Object} req - Request object con archivo XML
 * @param {Object} res - Response object
 */
async function uploadXmlDocument(req, res) {
  try {
    // Verificar que el usuario sea CAJA
    if (req.user.role !== 'CAJA') {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA pueden subir documentos XML'
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo XML'
      });
    }

    // Verificar que es un archivo XML
    if (!req.file.originalname.toLowerCase().endsWith('.xml')) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe ser un XML válido'
      });
    }

    // Leer contenido del archivo XML
    const xmlContent = req.file.buffer.toString('utf8');

    // Procesar XML con el parser service
    const parsedData = await parseXmlDocument(xmlContent);

    // Verificar que no existe un documento con el mismo protocolNumber
    const existingDocument = await prisma.document.findUnique({
      where: { protocolNumber: parsedData.protocolNumber }
    });

    if (existingDocument) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un documento con número de protocolo: ${parsedData.protocolNumber}`
      });
    }

    // Crear documento en la base de datos
    const document = await prisma.document.create({
      data: {
        protocolNumber: parsedData.protocolNumber,
        clientName: parsedData.clientName,
        clientId: parsedData.clientId,
        clientPhone: parsedData.clientPhone,
        clientEmail: parsedData.clientEmail,
        documentType: parsedData.documentType,
        actoPrincipalDescripcion: parsedData.actoPrincipalDescripcion,
        actoPrincipalValor: parsedData.actoPrincipalValor,
        totalFactura: parsedData.totalFactura,
        matrizadorName: parsedData.matrizadorName,
        itemsSecundarios: parsedData.itemsSecundarios,
        xmlOriginal: parsedData.xmlOriginal,
        fechaFactura: parsedData.fechaEmision, // ⭐ NUEVO: Fecha de emisión de la factura
        createdById: req.user.id
        // assignedToId será null inicialmente, se asignará automáticamente después
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // 📈 Registrar evento de creación de documento
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          userId: req.user.id,
          eventType: 'DOCUMENT_CREATED',
          description: `Documento creado desde XML por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: JSON.stringify({
            protocolNumber: parsedData.protocolNumber,
            documentType: parsedData.documentType,
            clientName: parsedData.clientName,
            source: 'XML_UPLOAD',
            xmlFileName: req.file.originalname,
            fileSize: req.file.size,
            totalFactura: parsedData.totalFactura,
            timestamp: new Date().toISOString()
          }),
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de creación de documento:', auditError);
      // No fallar la creación del documento si hay error en auditoría
    }

    // 🤖 ASIGNACIÓN AUTOMÁTICA DE MATRIZADOR
    console.log(`🔍 Intentando asignación automática para matrizador: "${parsedData.matrizadorName}"`);
    const assignmentResult = await MatrizadorAssignmentService.autoAssignDocument(
      document.id,
      parsedData.matrizadorName
    );

    // Actualizar el documento con la información de asignación
    let finalDocument = document;
    if (assignmentResult.assigned) {
      finalDocument = assignmentResult.document;
      console.log(`✅ Documento asignado automáticamente a: ${assignmentResult.matrizador.firstName} ${assignmentResult.matrizador.lastName}`);
    } else {
      console.log(`⚠️ Documento creado sin asignación automática: ${assignmentResult.message}`);
    }

    // 🧪 Extracción avanzada (snapshot) si está activo y hay texto para analizar
    try {
      const advEnabled = (process.env.ADVANCED_EXTRACTION || 'false') !== 'false';
      const candidateText = `${parsedData.actoPrincipalDescripcion || ''}\n${Array.isArray(parsedData.itemsSecundarios) ? parsedData.itemsSecundarios.join('\n') : (parsedData.itemsSecundarios || '')}`;
      if (advEnabled && candidateText && candidateText.trim().length > 10) {
        const base = AdvancedExtractionService.extractFromText(candidateText);
        const actos = ActosExtractorService.extract(candidateText);
        const parties = actos.acts.flatMap(a => a.parties || []);

        await prisma.documentEvent.create({
          data: {
            documentId: document.id,
            userId: req.user.id,
            eventType: 'EXTRACTION_SNAPSHOT',
            description: `Snapshot extracción avanzada (auto) al crear desde XML`,
            details: JSON.stringify({
              acts: actos.acts,
              parties,
              signals: base.fields.filter(f => ['valor_operacion', 'forma_pago', 'articulo_29'].includes(f.fieldName)),
              confidence: base.confidence,
              meta: base.metadata,
              extractor: 'advanced-actos-v1'
            }),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        });
      }
    } catch (snapErr) {
      console.warn('No se pudo crear snapshot de extracción avanzada en uploadXmlDocument:', snapErr?.message || snapErr);
    }

    // ⭐ FIX: Invalidar caché de documentos para que se muestren los nuevos
    try {
      const cache = (await import('../services/cache-service.js')).default;
      await cache.invalidateByTag('documents');
      await cache.invalidateByTag('caja:all');
      console.log('🗑️ Caché de documentos invalidado después de subir XML');
    } catch (cacheError) {
      console.warn('Error invalidando caché:', cacheError);
      // No fallar la respuesta si hay error en caché
    }

    res.status(201).json({
      success: true,
      message: assignmentResult.assigned
        ? `Documento XML procesado y asignado automáticamente a ${assignmentResult.matrizador.firstName} ${assignmentResult.matrizador.lastName}`
        : 'Documento XML procesado exitosamente (sin asignación automática)',
      data: {
        document: finalDocument,
        parsedInfo: {
          tipoDetectado: parsedData.documentType,
          actoPrincipal: parsedData.actoPrincipalDescripcion,
          valorPrincipal: parsedData.actoPrincipalValor,
          itemsIgnorados: parsedData.itemsSecundarios?.length || 0
        },
        autoAssignment: {
          attempted: true,
          successful: assignmentResult.assigned,
          message: assignmentResult.message,
          matrizadorFromXml: parsedData.matrizadorName,
          assignedTo: assignmentResult.assigned ? {
            id: assignmentResult.matrizador.id,
            name: `${assignmentResult.matrizador.firstName} ${assignmentResult.matrizador.lastName}`,
            email: assignmentResult.matrizador.email,
            role: assignmentResult.matrizador.role
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Error procesando XML:', error);

    // Determinar el tipo de error para mejor debugging
    let userMessage = 'Error procesando archivo XML';
    let errorDetail = error.message || 'Error desconocido';

    if (error.message && error.message.includes('prisma')) {
      userMessage = 'Error al guardar el documento en la base de datos';
      errorDetail = error.message;
    } else if (error.message && error.message.includes('XML')) {
      userMessage = 'Error al analizar el archivo XML';
      errorDetail = error.message;
    }

    res.status(500).json({
      success: false,
      message: userMessage,
      error: errorDetail,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Extraer actos y comparecientes (experimental, detrás de flag)
 */
async function extractDocumentActs(req, res) {
  try {
    const enabled = (process.env.ADVANCED_EXTRACTION || 'false') !== 'false';
    if (!enabled) {
      return res.status(200).json({ success: true, data: { enabled: false, acts: [], parties: [], message: 'ADVANCED_EXTRACTION disabled' } });
    }

    const { id } = req.params;
    const { text, saveSnapshot = false } = req.body || {};

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }

    // Construir texto base: preferir payload, luego campos descriptivos del doc
    const candidateText = `${text || ''}\n${doc.actoPrincipalDescripcion || ''}\n${doc.itemsSecundarios || ''}`;
    if (!candidateText.trim()) {
      return res.status(400).json({ success: false, message: 'No hay texto disponible para extraer actos' });
    }

    const base = AdvancedExtractionService.extractFromText(candidateText);
    const actos = ActosExtractorService.extract(candidateText);

    const parties = actos.acts.flatMap(a => a.parties || []);

    // Persistir snapshot en historial si se solicita
    if (saveSnapshot) {
      try {
        await prisma.documentEvent.create({
          data: {
            documentId: id,
            userId: req.user.id,
            eventType: 'EXTRACTION_SNAPSHOT',
            description: `Snapshot de extracción avanzada guardado por ${req.user.firstName} ${req.user.lastName}`,
            details: JSON.stringify({
              acts: actos.acts,
              parties,
              signals: base.fields.filter(f => ['valor_operacion', 'forma_pago', 'articulo_29'].includes(f.fieldName)),
              confidence: base.confidence,
              meta: base.metadata,
              extractor: 'advanced-actos-v1'
            }),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        });
      } catch (e) {
        console.warn('No se pudo guardar snapshot de extracción:', e?.message || e);
      }
    }

    return res.json({
      success: true,
      data: {
        enabled: true,
        acts: actos.acts,
        parties,
        signals: base.fields.filter(f => ['valor_operacion', 'forma_pago', 'articulo_29'].includes(f.fieldName)),
        confidence: base.confidence,
        meta: base.metadata,
        saved: !!saveSnapshot
      }
    });
  } catch (error) {
    console.error('Error en extractDocumentActs:', error);
    res.status(500).json({ success: false, message: 'Error interno extrayendo actos', error: error.message });
  }
}

/**
 * Aplicar sugerencias del último snapshot de extracción al documento
 * Reglas: solo completa campos vacíos y respeta umbral de confianza.
 */
async function applyExtractionSuggestions(req, res) {
  try {
    const { id } = req.params;
    const minConfidence = parseFloat(process.env.DEFAULT_EXTRACTION_CONFIDENCE || '0.8');

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    const snapshot = await prisma.documentEvent.findFirst({
      where: { documentId: id, eventType: 'EXTRACTION_SNAPSHOT' },
      orderBy: { createdAt: 'desc' }
    });
    if (!snapshot || !snapshot.details) {
      return res.status(400).json({ success: false, message: 'No hay snapshot de extracción para aplicar' });
    }

    const details = snapshot.details;
    const confidence = typeof details.confidence === 'number' ? details.confidence : 0;
    if (confidence < minConfidence) {
      return res.status(400).json({ success: false, message: `Confianza insuficiente (${Math.round(confidence * 100)}%). Umbral: ${Math.round(minConfidence * 100)}%` });
    }

    const acts = Array.isArray(details.acts) ? details.acts : [];
    const firstActType = acts[0]?.actType ? String(acts[0].actType).trim() : '';
    const joinedActs = acts.map(a => a.actType).filter(Boolean).join(' | ');

    const updates = {};
    const applied = {};
    if ((!doc.actoPrincipalDescripcion || String(doc.actoPrincipalDescripcion).trim().length === 0) && firstActType) {
      updates.actoPrincipalDescripcion = firstActType;
      applied.actoPrincipalDescripcion = { from: doc.actoPrincipalDescripcion || null, to: firstActType };
    }
    if ((!doc.detalle_documento || String(doc.detalle_documento).trim().length === 0) && joinedActs) {
      updates.detalle_documento = joinedActs;
      applied.detalle_documento = { from: doc.detalle_documento || null, to: joinedActs };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({ success: true, message: 'No hay cambios aplicables (campos ya tienen valor o no hay actos detectados)' });
    }

    const updated = await prisma.document.update({ where: { id }, data: updates });

    // Auditar
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'EXTRACTION_APPLIED',
          description: `Sugerencias de extracción aplicadas por ${req.user.firstName} ${req.user.lastName}`,
          details: JSON.stringify({
            applied,
            snapshotId: snapshot.id,
            confidence,
            threshold: minConfidence
          }),
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch { }

    return res.json({ success: true, message: 'Sugerencias aplicadas', data: { document: updated, applied } });
  } catch (error) {
    console.error('Error en applyExtractionSuggestions:', error);
    return res.status(500).json({ success: false, message: 'Error aplicando sugerencias', error: error.message });
  }
}

/**
 * Obtener todos los documentos para gestión de CAJA
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAllDocuments(req, res) {
  try {
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver todos los documentos'
      });
    }

    // Paginación y límite conservador por defecto para evitar cargas pesadas
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limitDefault = parseInt(process.env.CAJA_DOCS_LIMIT_DEFAULT || '200', 10);
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit || String(limitDefault), 10)));
    const skip = (page - 1) * limit;

    // Clave de caché simple (paginada)
    const cacheKey = `caja:all:${page}:${limit}`;
    const cached = await (await import('../services/cache-service.js')).default.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          // 🔥 NOTA DE CRÉDITO: Por defecto CAJA ve todos incluyendo NC
          // Si quiere solo activos, puede usar filtros en frontend
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.document.count({
        // CAJA ve el total incluyendo Notas de Crédito
      })
    ]);

    const payload = {
      documents,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        pageSize: limit
      }
    };

    // Guardar por 60s, invalidado por mutaciones (hook en db.js)
    const cache = (await import('../services/cache-service.js')).default;
    await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'caja:all'] });

    res.json({ success: true, data: payload });

  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * Asignar documento a matrizador
 * Función para CAJA: Asignar documento a un matrizador específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function assignDocument(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA o ADMIN pueden asignar documentos'
      });
    }

    const { id } = req.params;
    const { matrizadorId } = req.body;

    if (!matrizadorId) {
      return res.status(400).json({
        success: false,
        message: 'ID del matrizador es obligatorio'
      });
    }

    // Verificar que el documento existe
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar que el matrizador existe y tiene el rol correcto
    const matrizador = await prisma.user.findUnique({
      where: { id: parseInt(matrizadorId) }
    });

    if (!matrizador || !['MATRIZADOR', 'ARCHIVO'].includes(matrizador.role)) {
      return res.status(400).json({
        success: false,
        message: 'Matrizador no válido'
      });
    }

    // Asignar documento y cambiar estado a EN_PROCESO
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        assignedToId: parseInt(matrizadorId),
        status: 'EN_PROCESO'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // 📈 Registrar evento de asignación de documento
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'DOCUMENT_ASSIGNED',
          description: `Documento asignado a ${matrizador.firstName} ${matrizador.lastName} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: JSON.stringify({
            assignedFrom: document.assignedToId,
            assignedTo: parseInt(matrizadorId),
            matrizadorName: `${matrizador.firstName} ${matrizador.lastName}`,
            matrizadorRole: matrizador.role,
            previousStatus: document.status,
            newStatus: 'EN_PROCESO',
            assignmentType: 'MANUAL',
            timestamp: new Date().toISOString()
          }),
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de asignación de documento:', auditError);
      // No fallar la asignación del documento si hay error en auditoría
    }

    res.json({
      success: true,
      message: 'Documento asignado exitosamente',
      data: {
        document: updatedDocument
      }
    });

  } catch (error) {
    console.error('Error asignando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener documentos del matrizador autenticado
 * Función para MATRIZADOR: Ver solo documentos asignados a él
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
// Helper para verificar soporte de unaccent (copiado de otros controladores para consistencia)
async function supportsUnaccentFn() {
  try {
    await prisma.$queryRaw`SELECT unaccent('test')`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Obtener documentos del matrizador autenticado
 * Función para MATRIZADOR: Ver solo documentos asignados a él con paginación
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getMyDocuments(req, res) {
  try {
    // Verificar que el usuario sea MATRIZADOR o ARCHIVO
    if (!['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo matrizadores pueden ver sus documentos asignados'
      });
    }

    const {
      search,
      status, // Estado específico
      tipo, // Tipo de documento
      orderBy = 'updatedAt',
      orderDirection = 'desc',
      page = 1,
      limit = 10,
      fechaDesde, // Filtro por fecha desde (fechaFactura)
      fechaHasta  // Filtro por fecha hasta (fechaFactura)
    } = req.query;

    const userId = req.user.id;

    // Filtros base
    const where = {
      assignedToId: userId
    };

    // Configuración de ordenamiento
    let prismaOrderBy = {};
    if (orderBy === 'prioridad') {
      prismaOrderBy = { updatedAt: 'desc' }; // Fallback simple para Prisma
    } else {
      prismaOrderBy = { [orderBy]: orderDirection.toLowerCase() };
    }

    // Aplicar filtros adicionales
    const searchTerm = (search || '').trim();

    // CASO 1: BÚSQUEDA POR TEXTO (Raw Query para unaccent)
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        // Construcción dinámica de filtros SQL
        let typeFilter = Prisma.sql``;
        if (tipo && tipo !== 'TODOS') {
          typeFilter = Prisma.sql`AND d."documentType" = ${tipo}`;
        }

        let statusFilter = Prisma.sql``;
        if (status && status !== 'TODOS') {
          statusFilter = Prisma.sql`AND d."status" = ${status}`;
        }

        // Filtro por rango de fechas (fechaFactura)
        let dateFilter = Prisma.sql``;
        if (fechaDesde && fechaHasta) {
          const endDate = new Date(fechaHasta);
          endDate.setDate(endDate.getDate() + 1);
          dateFilter = Prisma.sql`AND d."fechaFactura" >= ${new Date(fechaDesde)} AND d."fechaFactura" < ${endDate}`;
        } else if (fechaDesde) {
          dateFilter = Prisma.sql`AND d."fechaFactura" >= ${new Date(fechaDesde)}`;
        } else if (fechaHasta) {
          const endDate = new Date(fechaHasta);
          endDate.setDate(endDate.getDate() + 1);
          dateFilter = Prisma.sql`AND d."fechaFactura" < ${endDate}`;
        }

        // Construcción dinámica de ORDER BY SQL
        let orderSql = Prisma.sql`d."updatedAt" DESC`;
        if (orderBy !== 'prioridad') {
          const allowedCols = ['createdAt', 'updatedAt', 'clientName', 'protocolNumber', 'totalFactura', 'status', 'fechaFactura'];
          const safeCol = allowedCols.includes(orderBy) ? orderBy : 'updatedAt';
          const safeDir = orderDirection.toLowerCase() === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
          orderSql = Prisma.sql([`d."${safeCol}" ${safeDir === Prisma.sql`ASC` ? 'ASC' : 'DESC'}`]);
        }

        const pattern = `%${searchTerm}%`;

        const documents = await prisma.$queryRaw`
          SELECT d.*
          FROM "documents" d
          WHERE d."assignedToId" = ${req.user.id} 
          ${statusFilter}
          ${typeFilter}
          ${dateFilter}
          AND (
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )
          ORDER BY ${orderSql}
          OFFSET ${(parseInt(page) - 1) * parseInt(limit)} LIMIT ${parseInt(limit)}
        `;

        const countRows = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS count
          FROM "documents" d
          WHERE d."assignedToId" = ${req.user.id} 
          ${statusFilter}
          ${typeFilter}
          ${dateFilter}
          AND (
            unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
            unaccent(d."protocolNumber") ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')) ILIKE unaccent(${pattern}) OR
            d."clientPhone" ILIKE ${pattern}
          )
        `;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        // Enriquecer documentos con relaciones mínimas si es necesario (el frontend las espera)
        // Nota: QueryRaw no trae relaciones. Si se necesitan, habría que hacer un fetch adicional o JOINs manuales.
        // Por simplicidad y rendimiento, si el frontend solo muestra datos planos, esto basta.
        // Pero ListView.jsx espera `createdBy`. Vamos a hacer un "hydration" rápido de IDs.
        // O mejor: Haremos el query normal de Prisma para búsqueda si no usamos raw complejo, 
        // pero unaccent requiere raw.
        // SOLUCIÓN: Hydrate authors
        const authorIds = [...new Set(documents.map(d => d.createdById).filter(Boolean))];
        const authors = await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, firstName: true, lastName: true, email: true }
        });
        const authorMap = new Map(authors.map(a => [a.id, a]));

        const hydratedDocs = documents.map(d => ({
          ...d,
          createdBy: d.createdById ? authorMap.get(d.createdById) : null
        }));

        return res.json({
          success: true,
          data: {
            documents: hydratedDocs,
            total: Number(total),
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: Math.ceil(Number(total) / parseInt(limit))
            }
          }
        });
      } else {
        // Fallback si no hay unaccent
        where.OR = [
          { clientName: { contains: searchTerm, mode: 'insensitive' } },
          { clientPhone: { contains: searchTerm } },
          { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
          { detalle_documento: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }

    // CASO 2: LISTADO ESTÁNDAR (Sin búsqueda por texto o fallback)
    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (tipo && tipo !== 'TODOS') {
      where.documentType = tipo;
    }

    // Filtro por rango de fechas (fechaFactura)
    if (fechaDesde || fechaHasta) {
      where.fechaFactura = {};
      if (fechaDesde) {
        where.fechaFactura.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        // Agregar 1 día para incluir todo el día final
        const endDate = new Date(fechaHasta);
        endDate.setDate(endDate.getDate() + 1);
        where.fechaFactura.lt = endDate;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: prismaOrderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

    // También necesitamos los conteos por estado para el dashboard rápido (opcional, o en otra llamada)
    // El frontend actualmente los usa en "byStatus".
    // Para no romper compatibilidad, podemos devolverlos calculados globalmente (sin filtros).
    // Esto es un poco costoso, quizá deberíamos cachearlo o hacerlo en endpoint separado.
    // Por ahora, mantengamos el conteo global simple.

    let byStatus = {};
    // Solo calcular conteos globales si es la primera página para ahorrar recursos
    if (parseInt(page) === 1 && !search) {
      const counts = await prisma.document.groupBy({
        by: ['status'],
        where: { assignedToId: userId },
        _count: { status: true }
      });
      counts.forEach(c => {
        byStatus[c.status] = c._count.status;
      });
    }

    res.json({
      success: true,
      data: {
        documents,
        total,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        byStatus // Puede venir vacío en paginación profunda o búsquedas
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos del matrizador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Actualizar estado de documento
 * Función para MATRIZADOR: Cambiar estado de documento asignado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateDocumentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, deliveredTo } = req.body;

    console.log('🔄 updateDocumentStatus iniciado:', {
      documentId: id,
      newStatus: status,
      currentUser: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
      requestBody: req.body
    });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Nuevo estado es obligatorio'
      });
    }

    // Validar estados válidos
    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    // Buscar documento y verificar propiedad
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    console.log('📄 Documento encontrado:', {
      currentStatus: document.status,
      newStatus: status,
      assignedTo: document.assignedToId,
      userId: req.user.id
    });

    // Detectar si es una reversión (estado "hacia atrás")
    const isReversion = isReversionFn(document.status, status);

    console.log('🔄 Análisis de cambio:', {
      currentStatus: document.status,
      newStatus: status,
      isReversion,
      requiresReason: isReversion
    });

    // Para reversiones, requerir razón obligatoria para todos los roles
    if (isReversion && !req.body.reversionReason) {
      return res.status(400).json({
        success: false,
        message: 'Las reversiones de estado requieren especificar una razón'
      });
    }

    // Preparar datos de actualización
    const updateData = { status };

    // Aplicar limpieza cuando hay reversión (como en Recepción)
    if (isReversion) {
      Object.assign(updateData, getReversionCleanupData(document.status, status));
    }

    // Verificar permisos según rol y estado
    if (req.user.role === 'MATRIZADOR') {
      // Matrizadores solo pueden modificar sus documentos asignados
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar documentos asignados a ti'
        });
      }
      // Matrizadores pueden marcar como ENTREGADO sus documentos LISTO o EN_PROCESO (entrega directa)
      if (status === 'ENTREGADO') {
        if (!['LISTO', 'EN_PROCESO'].includes(document.status)) {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO o EN PROCESO'
          });
        }
        updateData.usuarioEntregaId = req.user.id;
        updateData.fechaEntrega = new Date();
        updateData.entregadoA = deliveredTo || `Entrega directa por matrizador`;
        updateData.relacionTitular = 'directo';
      }
    } else if (req.user.role === 'ARCHIVO') {
      // ARCHIVO: Solo puede modificar documentos asignados a él (propios). En supervisión es solo lectura.
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar documentos asignados a ti'
        });
      }
      // Puede entregar documentos directamente como MATRIZADOR sobre sus propios documentos (LISTO o EN_PROCESO)
      if (status === 'ENTREGADO') {
        if (!['LISTO', 'EN_PROCESO'].includes(document.status)) {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO o EN PROCESO'
          });
        }
        updateData.usuarioEntregaId = req.user.id;
        updateData.fechaEntrega = new Date();
        updateData.entregadoA = deliveredTo || `Entrega directa por archivo`;
        updateData.relacionTitular = 'directo';
      }
    } else if (req.user.role === 'RECEPCION') {
      // Recepción puede marcar como LISTO (EN_PROCESO → LISTO) y como ENTREGADO (LISTO → ENTREGADO)
      if (status === 'LISTO') {
        // RECEPCION puede marcar EN_PROCESO como LISTO
        if (document.status !== 'EN_PROCESO') {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden marcar como LISTO los documentos que estén EN_PROCESO'
          });
        }
      } else if (status === 'ENTREGADO') {
        // RECEPCION puede marcar LISTO como ENTREGADO
        if (document.status !== 'LISTO') {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO'
          });
        }
      } else {
        // RECEPCION no puede usar otros estados
        return res.status(403).json({
          success: false,
          message: 'RECEPCIÓN solo puede marcar documentos como LISTO o ENTREGADO'
        });
      }
    } else if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar documentos'
      });
    }

    // Generar código de verificación si se marca como LISTO Y no tiene código
    if (status === 'LISTO' && !document.verificationCode) {
      updateData.verificationCode = generateVerificationCode();

      // 📈 Registrar evento de generación de código de verificación
      try {
        await prisma.documentEvent.create({
          data: {
            documentId: id,
            userId: req.user.id,
            eventType: 'VERIFICATION_GENERATED',
            description: `Código de verificación generado automáticamente: ${updateData.verificationCode}`,
            details: JSON.stringify({
              verificationCode: updateData.verificationCode,
              generatedBy: `${req.user.firstName} ${req.user.lastName}`,
              userRole: req.user.role,
              timestamp: new Date().toISOString()
            }),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        });
      } catch (auditError) {
        console.error('Error registrando evento de generación de código:', auditError);
      }
    }

    // NUEVA FUNCIONALIDAD: Manejar propagación de estado en documentos agrupados
    let updatedDocuments = [];
    let groupAffected = false;

    // Verificar si el documento pertenece a un grupo y si el cambio debe propagarse
    // Ahora: si el usuario es MATRIZADOR y el documento está agrupado, propagamos SIEMPRE
    // Actualización individual (comportamiento original)
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    updatedDocuments = [updatedDocument];


    // NUEVA FUNCIONALIDAD: Enviar notificación WhatsApp si se marca como LISTO
    let whatsappSent = false;
    let whatsappError = null;
    let whatsappResults = [];

    if (status === 'LISTO') {
      try {
        // Importar el servicio de WhatsApp
        const whatsappService = await import('../services/whatsapp-service.js');

        if (groupAffected && updatedDocuments.length > 1) {
          // Enviar notificaciones grupales - una por cada documento con teléfono único
          const uniqueClients = new Map();

          // Agrupar documentos por teléfono del cliente
          for (const doc of updatedDocuments) {
            if (doc.clientPhone) {
              if (!uniqueClients.has(doc.clientPhone)) {
                uniqueClients.set(doc.clientPhone, {
                  clientName: doc.clientName,
                  clientPhone: doc.clientPhone,
                  documents: []
                });
              }
              uniqueClients.get(doc.clientPhone).documents.push(doc);
            }
          }

          console.log(`📱 Enviando notificaciones grupales a ${uniqueClients.size} cliente(s)`);

          // Enviar notificación a cada cliente único
          for (const [phone, clientData] of uniqueClients) {
            try {
              if (clientData.documents.length === 1) {
                // Un solo documento - notificación individual
                const whatsappResult = await whatsappService.default.sendDocumentReadyNotification(clientData.documents[0]);
                whatsappResults.push({
                  phone: phone,
                  success: whatsappResult.success,
                  error: whatsappResult.error,
                  documentCount: 1
                });
              } else {
                // Múltiples documentos - notificación grupal
                const whatsappResult = await whatsappService.default.enviarGrupoDocumentosListo(
                  {
                    clientName: clientData.clientName,
                    clientPhone: clientData.clientPhone
                  },
                  clientData.documents,
                  clientData.documents[0].verificationCode // Usar el código del primer documento
                );
                whatsappResults.push({
                  phone: phone,
                  success: whatsappResult.success,
                  error: whatsappResult.error,
                  documentCount: clientData.documents.length
                });
              }
            } catch (error) {
              console.error(`Error enviando WhatsApp a ${phone}:`, error);
              whatsappResults.push({
                phone: phone,
                success: false,
                error: error.message,
                documentCount: clientData.documents.length
              });
            }
          }

          whatsappSent = whatsappResults.some(result => result.success);
          const failedNotifications = whatsappResults.filter(result => !result.success);
          if (failedNotifications.length > 0) {
            whatsappError = `Falló envío a ${failedNotifications.length} cliente(s)`;
          }

        } else if (updatedDocument.clientPhone) {
          // Enviar notificación individual (comportamiento original)
          const whatsappResult = await whatsappService.default.sendDocumentReadyNotification(updatedDocument);
          whatsappSent = whatsappResult.success;

          if (!whatsappResult.success) {
            whatsappError = whatsappResult.error;
            console.error('Error enviando WhatsApp:', whatsappResult.error);
          } else {
            console.log('Notificación WhatsApp enviada exitosamente');

            // 📈 Registrar evento de notificación WhatsApp enviada
            try {
              await prisma.documentEvent.create({
                data: {
                  documentId: id,
                  userId: req.user.id,
                  eventType: 'WHATSAPP_SENT',
                  description: `Notificación WhatsApp de documento listo enviada a ${updatedDocument.clientPhone}`,
                  details: JSON.stringify({
                    phoneNumber: updatedDocument.clientPhone,
                    messageType: 'DOCUMENT_READY',
                    verificationCode: updatedDocument.verificationCode,
                    sentBy: `${req.user.firstName} ${req.user.lastName}`,
                    userRole: req.user.role,
                    timestamp: new Date().toISOString()
                  }),
                  ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                  userAgent: req.get('User-Agent') || 'unknown'
                }
              });
            } catch (auditError) {
              console.error('Error registrando evento de notificación WhatsApp:', auditError);
            }
          }
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp:', error);
        whatsappError = error.message;
      }
    }


    // NOTE: WhatsApp notifications for delivered documents are not yet implemented
    // The enviarDocumentoEntregado function does not exist in whatsapp-service.js

    // Registrar evento de auditoría
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'STATUS_CHANGED',
          description: `Estado cambiado de ${document.status} a ${status} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})${status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) ? ' - Entrega directa' : ''}${isReversion && req.body.reversionReason ? ` - Razón: ${req.body.reversionReason}` : ''}`,
          details: JSON.stringify({
            previousStatus: document.status,
            newStatus: status,
            verificationCodeGenerated: status === 'LISTO' && updateData.verificationCode,
            whatsappSent: whatsappSent,
            whatsappError: whatsappError,
            userRole: req.user.role,
            deliveryType: status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) ? 'DIRECT_DELIVERY' : 'STANDARD_DELIVERY',
            entregadoA: status === 'ENTREGADO' ? updateData.entregadoA : undefined,
            metodoVerificacion: status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) ? 'manual' : undefined,
            isReversion,
            reason: req.body.reversionReason || null,
            timestamp: new Date().toISOString()
          }),
          personaRetiro: status === 'ENTREGADO' ? (updateData.entregadoA || undefined) : undefined,
          metodoVerificacion: status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) ? 'manual' : undefined,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de auditoría:', auditError);
    }

    // Preparar mensaje de respuesta
    let message = groupAffected
      ? `${updatedDocuments.length} documentos del grupo actualizados exitosamente`
      : 'Estado del documento actualizado exitosamente';

    if (status === 'LISTO') {
      if (groupAffected) {
        if (whatsappSent) {
          const successCount = whatsappResults.filter(r => r.success).length;
          message += ` y notificaciones WhatsApp enviadas (${successCount}/${whatsappResults.length} clientes)`;
        } else if (whatsappError) {
          message += ', pero fallaron las notificaciones WhatsApp';
        }
      } else {
        if (whatsappSent) {
          message += ' y notificación WhatsApp enviada';
        } else if (updatedDocument.clientPhone && whatsappError) {
          message += ', pero falló la notificación WhatsApp';
        } else if (!updatedDocument.clientPhone) {
          message += ' (sin teléfono para notificación WhatsApp)';
        }
      }
    }

    res.json({
      success: true,
      message: message,
      data: {
        document: updatedDocument,
        changes: {
          previousStatus: document.status,
          newStatus: status,
          verificationCodeGenerated: status === 'LISTO' && updateData.verificationCode
        },
        groupOperation: {
          isGroupOperation: groupAffected,
          documentsAffected: updatedDocuments.length,
        },
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: updatedDocument.clientPhone,
          groupResults: whatsappResults.length > 0 ? whatsappResults : undefined
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado del documento:', error);
    console.error('📊 Detalles del error:', {
      message: error.message,
      stack: error.stack,
      documentId: req.params.id,
      status: req.body.status,
      userRole: req.user.role,
      options: req.body
    });
    res.status(500).json({
      success: false,
      message: `Error interno del servidor: ${error.message}`
    });
  }
}

/**
 * Obtener detalle de documento específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentById(req, res) {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos según rol
    if (['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes ver documentos asignados a ti'
        });
      }
    } else if (!['CAJA', 'ADMIN', 'RECEPCION'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este documento'
      });
    }

    res.json({
      success: true,
      data: {
        document
      }
    });

  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener lista de matrizadores disponibles para asignación
 * Función para CAJA: Obtener matrizadores activos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAvailableMatrizadores(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver matrizadores'
      });
    }

    const matrizadores = await prisma.user.findMany({
      where: {
        role: {
          in: ['MATRIZADOR', 'ARCHIVO']
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            documents: {
              where: {
                status: {
                  in: ['PENDIENTE', 'EN_PROCESO']
                }
              }
            }
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    // Formatear datos con información de carga de trabajo
    const formattedMatrizadores = matrizadores.map(matrizador => ({
      id: matrizador.id,
      firstName: matrizador.firstName,
      lastName: matrizador.lastName,
      fullName: `${matrizador.firstName} ${matrizador.lastName}`,
      email: matrizador.email,
      activeDocuments: matrizador._count.documents
    }));

    res.json({
      success: true,
      data: {
        matrizadores: formattedMatrizadores,
        total: formattedMatrizadores.length
      }
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
 * 📦 PROCESAR MÚLTIPLES XML EN LOTE
 * Función para CAJA: Upload y procesar múltiples archivos XML
 * @param {Object} req - Request object con múltiples archivos XML
 * @param {Object} res - Response object
 */
async function uploadXmlDocumentsBatch(req, res) {
  try {
    // Verificar que el usuario sea CAJA o ADMIN
    if (!['CAJA', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios CAJA o ADMIN pueden subir documentos'
      });
    }

    // Verificar que se enviaron archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron archivos XML para procesar'
      });
    }

    console.log(`🚀 Iniciando procesamiento en lote de ${req.files.length} archivos XML...`);

    const resultados = [];
    const errores = [];
    const exitosos = [];

    // Procesar cada archivo secuencialmente para evitar sobrecargar la base de datos
    for (let i = 0; i < req.files.length; i++) {
      const archivo = req.files[i];

      try {
        console.log(`📄 Procesando archivo ${i + 1}/${req.files.length}: ${archivo.originalname}`);

        // Validar que es un archivo XML
        if (!archivo.originalname.toLowerCase().endsWith('.xml')) {
          errores.push({
            archivo: archivo.originalname,
            error: 'No es un archivo XML válido',
            indice: i + 1
          });
          continue;
        }

        // Parsear XML
        const xmlContent = archivo.buffer.toString('utf-8');
        const parsedData = await parseXmlDocument(xmlContent);

        // Verificar si ya existe un documento con este número de protocolo
        const existingDocument = await prisma.document.findUnique({
          where: { protocolNumber: parsedData.protocolNumber }
        });

        if (existingDocument) {
          errores.push({
            archivo: archivo.originalname,
            protocolNumber: parsedData.protocolNumber,
            error: `Ya existe un documento con número de protocolo: ${parsedData.protocolNumber}`,
            indice: i + 1
          });
          continue;
        }

        // Crear documento en la base de datos
        const document = await prisma.document.create({
          data: {
            protocolNumber: parsedData.protocolNumber,
            clientName: parsedData.clientName,
            clientId: parsedData.clientId,
            clientPhone: parsedData.clientPhone,
            clientEmail: parsedData.clientEmail,
            documentType: parsedData.documentType,
            actoPrincipalDescripcion: parsedData.actoPrincipalDescripcion,
            actoPrincipalValor: parsedData.actoPrincipalValor,
            totalFactura: parsedData.totalFactura,
            matrizadorName: parsedData.matrizadorName,
            itemsSecundarios: parsedData.itemsSecundarios,
            xmlOriginal: parsedData.xmlOriginal,
            fechaFactura: parsedData.fechaEmision, // ⭐ NUEVO: Fecha de emisión de la factura
            createdById: req.user.id
          },
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        // 🤖 ASIGNACIÓN AUTOMÁTICA DE MATRIZADOR
        const assignmentResult = await MatrizadorAssignmentService.autoAssignDocument(
          document.id,
          parsedData.matrizadorName
        );

        // CAJA SOLO PROCESA XMLs - Sin detección de agrupación
        // La agrupación es responsabilidad exclusiva del MATRIZADOR
        console.log(`📄 Documento procesado: "${parsedData.protocolNumber}" para cliente "${parsedData.clientName}"`);

        // Guardar resultado exitoso (SIN información de agrupación)
        exitosos.push({
          archivo: archivo.originalname,
          protocolNumber: parsedData.protocolNumber,
          documentId: document.id,
          asignacionAutomatica: assignmentResult.assigned,
          matrizadorAsignado: assignmentResult.assigned ? assignmentResult.matrizador : null,
          indice: i + 1
          // ❌ AGRUPACIÓN REMOVIDA - Solo para Matrizador
        });

        console.log(`✅ Archivo ${i + 1} procesado: ${archivo.originalname} (${parsedData.protocolNumber})`);

      } catch (archivoError) {
        console.error(`❌ Error procesando archivo ${archivo.originalname}:`, archivoError);
        const errorMessage = archivoError.message || 'Error desconocido al procesar archivo';
        errores.push({
          archivo: archivo.originalname,
          error: errorMessage,
          indice: i + 1,
          detalles: process.env.NODE_ENV === 'development' ? archivoError.stack : undefined
        });
      }
    }

    // Generar respuesta con resumen
    const resumen = {
      totalArchivos: req.files.length,
      exitosos: exitosos.length,
      errores: errores.length,
      porcentajeExito: req.files.length > 0 ? Math.round((exitosos.length / req.files.length) * 100) : 0
    };

    console.log(`📊 Procesamiento en lote completado: ${exitosos.length}/${req.files.length} exitosos`);

    // ⭐ FIX: Invalidar caché de documentos si hubo éxitos
    if (exitosos.length > 0) {
      try {
        const cache = (await import('../services/cache-service.js')).default;
        await cache.invalidateByTag('documents');
        await cache.invalidateByTag('caja:all');
        console.log('🗑️ Caché de documentos invalidado después de batch upload');
      } catch (cacheError) {
        console.warn('Error invalidando caché:', cacheError);
        // No fallar la respuesta si hay error en caché
      }
    }

    res.status(exitosos.length > 0 ? 201 : 400).json({
      success: exitosos.length > 0,
      message: `Procesamiento en lote completado: ${exitosos.length}/${req.files.length} archivos procesados exitosamente`,
      data: {
        resumen,
        exitosos,
        errores,
        detalles: {
          archivosProcesados: exitosos.map(e => ({
            archivo: e.archivo,
            protocolo: e.protocolNumber,
            asignado: e.asignacionAutomatica,
            matrizador: e.matrizadorAsignado ? `${e.matrizadorAsignado.firstName} ${e.matrizadorAsignado.lastName}` : null
          })),
          archivosConError: errores.map(e => ({
            archivo: e.archivo,
            error: e.error
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error en procesamiento en lote:', error);

    // Mejor manejo de errores para debugging
    const errorMessage = error.message || 'Error desconocido';
    const userMessage = error.message && error.message.includes('archivos')
      ? error.message
      : 'Error interno del servidor durante procesamiento en lote';

    res.status(500).json({
      success: false,
      message: userMessage,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * 🔗 CREAR GRUPO INTELIGENTE DE DOCUMENTOS
 * Función optimizada para agrupar documentos detectados automáticamente en el batch upload
 * @param {Object} req - Request object con documentIds y configuración
 * @param {Object} res - Response object
 */

/**
 * NUEVA FUNCIONALIDAD: Obtener información editable de un documento
 */
async function getEditableDocumentInfo(req, res) {
  try {
    const { id } = req.params;

    console.log('📝 getEditableDocumentInfo iniciado:', {
      documentId: id,
      userRole: req.user.role,
      userId: req.user.id
    });

    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos según rol
    if (['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes editar documentos asignados a ti'
        });
      }
    } else if (req.user.role === 'RECEPCION') {
      // RECEPCION puede ver información de cualquier documento para editar
      // No hay restricciones adicionales para RECEPCION
    } else if (!['ADMIN', 'CAJA'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver la información de documentos'
      });
    }

    res.json({
      success: true,
      data: {
        document: {
          id: document.id,
          protocolNumber: document.protocolNumber,
          documentType: document.documentType,
          detalle_documento: document.detalle_documento,
          comentarios_recepcion: document.comentarios_recepcion,
          actoPrincipalDescripcion: document.actoPrincipalDescripcion,
          clientName: document.clientName,
          clientPhone: document.clientPhone,
          clientEmail: document.clientEmail,
          clientId: document.clientId
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo información editable del documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * NUEVA FUNCIONALIDAD: Actualizar información editable de un documento
 */
async function updateDocumentInfo(req, res) {
  try {
    const { id } = req.params;
    const {
      detalle_documento,
      comentarios_recepcion,
      clientName,
      clientPhone,
      clientEmail,
      clientId,
      actoPrincipalDescripcion
    } = req.body;

    console.log('📝 updateDocumentInfo iniciado:', {
      documentId: id,
      userRole: req.user.role,
      userId: req.user.id,
      updateData: req.body
    });

    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos según rol
    if (['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes editar documentos asignados a ti'
        });
      }
    } else if (req.user.role === 'RECEPCION') {
      // RECEPCION puede editar información de cualquier documento
      // No hay restricciones adicionales para RECEPCION
    } else if (!['ADMIN', 'CAJA'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar documentos'
      });
    }

    // Validaciones básicas
    if (!clientName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del cliente es obligatorio'
      });
    }

    // Actualizar documento
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        detalle_documento: detalle_documento?.trim() || null,
        comentarios_recepcion: comentarios_recepcion?.trim() || null,
        actoPrincipalDescripcion: actoPrincipalDescripcion?.trim() || document.actoPrincipalDescripcion,
        clientName: clientName.trim(),
        clientPhone: clientPhone?.trim() || null,
        clientEmail: clientEmail?.trim() || null,
        clientId: clientId?.trim() || null,
        updatedAt: new Date()
      }
    });

    // Registrar evento de edición
    try {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'INFO_EDITED',
          description: `Información del documento editada por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: JSON.stringify({
            previousData: {
              clientName: document.clientName,
              clientPhone: document.clientPhone,
              clientEmail: document.clientEmail,
              clientId: document.clientId,
              detalle_documento: document.detalle_documento,
              comentarios_recepcion: document.comentarios_recepcion
            },
            newData: {
              clientName,
              clientPhone,
              clientEmail,
              clientId,
              detalle_documento,
              comentarios_recepcion,
              actoPrincipalDescripcion
            },
            editedBy: `${req.user.firstName} ${req.user.lastName}`,
            editedByRole: req.user.role
          }),
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de edición:', auditError);
    }

    res.json({
      success: true,
      message: 'Información del documento actualizada exitosamente',
      data: {
        document: updatedDocument
      }
    });

  } catch (error) {
    console.error('Error actualizando información del documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Entregar documento con información completa de recepción
 * Función para RECEPCION: Marcar documento como entregado con detalles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function deliverDocument(req, res) {
  try {
    const { id } = req.params;
    const {
      entregadoA,
      cedulaReceptor,
      relacionTitular,
      codigoVerificacion,
      verificacionManual,
      facturaPresenta,
      observacionesEntrega
    } = req.body;

    // Verificar que el usuario sea RECEPCION, ADMIN, CAJA, MATRIZADOR o ARCHIVO
    if (!['RECEPCION', 'ADMIN', 'CAJA', 'MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para entregar documentos'
      });
    }

    // Validar datos requeridos
    if (!entregadoA) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de quien retira es obligatorio'
      });
    }

    if (!relacionTitular) {
      return res.status(400).json({
        success: false,
        message: 'Relación con titular es obligatoria'
      });
    }

    // Buscar documento con información de grupo (ajustado al esquema actual)
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        },
        documentGroup: {
          include: {
            documents: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Validar permisos específicos por rol
    if (req.user.role === 'MATRIZADOR' || req.user.role === 'ARCHIVO') {
      // Los matrizadores solo pueden entregar sus propios documentos
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes entregar documentos asignados a ti'
        });
      }
    }

    // Verificar que el documento esté LISTO o permitir entrega inmediata (EN_PROCESO)
    // ⚡ FIX: Permitir entregar documentos EN_PROCESO como "Entrega Directa"
    const { immediateDelivery } = req.body;
    const allowedStatuses = ['LISTO', 'EN_PROCESO'];

    if (!immediateDelivery && !allowedStatuses.includes(document.status)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden entregar documentos que estén LISTO o EN PROCESO (entrega directa)'
      });
    }

    // Si es entrega inmediata explícita, validar permisos y estados permitidos
    if (immediateDelivery) {
      if (!allowedStatuses.includes(document.status) && document.status !== 'PENDIENTE') {
        return res.status(400).json({
          success: false,
          message: 'No se puede realizar entrega inmediata de documentos ya entregados'
        });
      }

      console.log(`⚡ Entrega inmediata solicitada para documento ${document.protocolNumber} (estado actual: ${document.status})`);
    }

    // Verificar código de verificación si no es manual (aceptar individual o grupal)
    if (!verificacionManual) {
      // ⚡ FIX: Si está EN_PROCESO, es posible que no tenga código aún.
      // En ese caso, requerimos que el usuario confirme "Verificación Manual" en el frontend,
      // O generamos uno al vuelo si fuera necesario (pero aquí validamos contra lo que hay).
      if (document.status === 'EN_PROCESO' && !document.verificationCode && !document.codigoRetiro && !document.groupVerificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Documento en proceso sin código. Debe seleccionar "Verificación Manual" para entregar directamente.'
        });
      }

      if (!codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación es obligatorio'
        });
      }

      // Preferir el código que ve recepción en el frontend: codigoRetiro
      // Fallback a verificationCode (flujo antiguo) y groupVerificationCode
      const expectedCode = document.codigoRetiro || document.verificationCode || document.groupVerificationCode;
      if (!expectedCode || expectedCode !== codigoVerificacion) {
        return res.status(400).json({
          success: false,
          message: 'Código de verificación incorrecto'
        });
      }
    }

    // Determinar método de verificación para auditoría enriquecida
    const computedVerificationMethod = verificacionManual
      ? ((req.body?.metodoVerificacion) || (cedulaReceptor ? 'cedula' : 'manual'))
      : 'codigo_whatsapp';

    // Si el documento está agrupado, entregar todos los documentos del grupo
    let groupDocuments = [];
    if (document.documentGroup && Array.isArray(document.documentGroup.documents)) {
      const allGroupDocuments = document.documentGroup.documents;

      // Entregar todos los documentos del grupo que estén LISTO (excepto el actual)
      const documentsToDeliver = allGroupDocuments.filter(doc =>
        doc.status === 'LISTO' && doc.id !== id
      );

      if (documentsToDeliver.length > 0) {
        console.log(`🚚 Entregando ${documentsToDeliver.length + 1} documentos del grupo automáticamente`);

        // Actualizar todos los documentos del grupo
        await prisma.document.updateMany({
          where: {
            id: { in: documentsToDeliver.map(doc => doc.id) }
          },
          data: {
            status: 'ENTREGADO',
            entregadoA,
            cedulaReceptor,
            relacionTitular,
            verificacionManual: verificacionManual || false,
            facturaPresenta: facturaPresenta || false,
            fechaEntrega: new Date(),
            usuarioEntregaId: req.user.id,
            observacionesEntrega: observacionesEntrega || `Entregado grupalmente junto con ${document.protocolNumber}`
          }
        });

        // Registrar eventos para todos los documentos del grupo
        for (const doc of documentsToDeliver) {
          await prisma.documentEvent.create({
            data: {
              documentId: doc.id,
              userId: req.user.id,
              eventType: 'STATUS_CHANGED',
              description: `Documento entregado grupalmente a ${entregadoA}`,
              details: JSON.stringify({
                previousStatus: 'LISTO',
                newStatus: 'ENTREGADO',
                entregadoA,
                cedulaReceptor,
                relacionTitular,
                verificacionManual: verificacionManual || false,
                facturaPresenta: facturaPresenta || false,
                metodoVerificacion: computedVerificationMethod,
                verificationCode: verificacionManual ? undefined : (codigoVerificacion || document.codigoRetiro || document.verificationCode || document.groupVerificationCode),
                deliveredWith: document.protocolNumber,
                groupDelivery: true,
                timestamp: new Date().toISOString()
              }),
              personaRetiro: entregadoA,
              cedulaRetiro: cedulaReceptor || undefined,
              metodoVerificacion: computedVerificationMethod,
              observacionesRetiro: (observacionesEntrega || `Entregado grupalmente junto con ${document.protocolNumber}`)
            }
          });
        }

        groupDocuments = documentsToDeliver;
      }
    }

    // Actualizar documento principal con información de entrega
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'ENTREGADO',
        entregadoA,
        cedulaReceptor,
        relacionTitular,
        verificacionManual: verificacionManual || false,
        facturaPresenta: facturaPresenta || false,
        fechaEntrega: new Date(),
        usuarioEntregaId: req.user.id,
        observacionesEntrega
      },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        },
        usuarioEntrega: {
          select: { firstName: true, lastName: true }
        }
      }
    });



    // Registrar evento de auditoría
    try {
      const eventDescription = immediateDelivery
        ? `Documento entregado INMEDIATAMENTE a ${entregadoA} por ${req.user.firstName} ${req.user.lastName} (${req.user.role}) - Estado anterior: ${document.status}`
        : `Documento entregado a ${entregadoA} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`;

      await prisma.documentEvent.create({
        data: {
          documentId: id,
          userId: req.user.id,
          eventType: 'STATUS_CHANGED',
          description: eventDescription,
          details: JSON.stringify({
            previousStatus: immediateDelivery ? document.status : 'LISTO',
            newStatus: 'ENTREGADO',
            immediateDelivery: immediateDelivery || false,
            entregadoA,
            cedulaReceptor,
            relacionTitular,
            verificacionManual,
            facturaPresenta,
            observacionesEntrega,
            metodoVerificacion: computedVerificationMethod,
            verificationCode: verificacionManual ? undefined : (codigoVerificacion || updatedDocument.codigoRetiro || updatedDocument.verificationCode || updatedDocument.groupVerificationCode),
            timestamp: new Date().toISOString()
          }),
          personaRetiro: entregadoA,
          cedulaRetiro: cedulaReceptor || undefined,
          metodoVerificacion: computedVerificationMethod,
          observacionesRetiro: observacionesEntrega || undefined,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });
    } catch (auditError) {
      console.error('Error registrando evento de auditoría:', auditError);
    }

    // Preparar mensaje de respuesta
    const totalDelivered = 1 + groupDocuments.length;
    const message = immediateDelivery
      ? 'Documento entregado inmediatamente'
      : totalDelivered > 1
        ? `${totalDelivered} documentos entregados exitosamente (entrega grupal)`
        : 'Documento entregado exitosamente';

    res.json({
      success: true,
      message,
      data: {
        document: updatedDocument,
        delivery: {
          entregadoA,
          cedulaReceptor,
          relacionTitular,
          verificacionManual,
          facturaPresenta,
          fechaEntrega: updatedDocument.fechaEntrega,
          usuarioEntrega: `${req.user.firstName} ${req.user.lastName}`,
          observacionesEntrega
        },

        groupDelivery: {
          isGroupDelivery: groupDocuments.length > 0,
          totalDocuments: totalDelivered,
          groupDocuments: groupDocuments.map(doc => ({
            id: doc.id,
            protocolNumber: doc.protocolNumber,
            documentType: doc.documentType,
            status: 'ENTREGADO'
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error entregando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * ============================================================================
 * FUNCIONES DE EDICIÓN DE DOCUMENTOS
 * Implementación conservadora siguiendo estructura existente
 * ============================================================================
 */

/**
 * Validar permisos de edición según rol del usuario
 * @param {Object} user - Usuario autenticado
 * @param {Object} document - Documento a editar
 * @returns {Object} - { canEdit: boolean, editableFields: Array }
 */
// (removido) validateEditPermissions: helper interno no utilizado

/**
 * Validar datos de entrada para edición
 * @param {Object} data - Datos a validar
 * @param {Array} allowedFields - Campos permitidos para el usuario
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
// (removido) validateEditData: helper interno no utilizado


/**
 * ============================================================================
 * SISTEMA DE CONFIRMACIONES Y DESHACER
 * Implementación conservadora que mantiene auditoría completa
 * ============================================================================
 */

/**
 * Deshacer último cambio de estado de un documento
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function undoDocumentStatusChange(req, res) {
  try {
    const { documentId, changeId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del documento es obligatorio'
      });
    }

    // Buscar el documento actual
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos - solo el usuario que hizo el cambio o ADMIN puede deshacer
    let lastChangeEvent = null;

    if (changeId) {
      // Buscar evento específico por ID
      lastChangeEvent = await prisma.documentEvent.findUnique({
        where: { id: changeId },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true }
          }
        }
      });
    } else {
      // Buscar último cambio de estado del documento
      lastChangeEvent = await prisma.documentEvent.findFirst({
        where: {
          documentId: documentId,
          eventType: 'STATUS_CHANGED'
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true }
          }
        }
      });
    }

    if (!lastChangeEvent) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el cambio de estado para deshacer'
      });
    }

    // Verificar que el cambio no sea muy antiguo (máximo 10 minutos)
    const changeTime = new Date(lastChangeEvent.createdAt);
    const now = new Date();
    const timeDifference = now - changeTime;
    const maxUndoTime = 10 * 60 * 1000; // 10 minutos

    if (timeDifference > maxUndoTime) {
      return res.status(400).json({
        success: false,
        message: 'El cambio es muy antiguo para ser deshecho (máximo 10 minutos)'
      });
    }

    // Verificar permisos
    const isOwner = lastChangeEvent.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes deshacer tus propios cambios'
      });
    }

    // Extraer estado anterior del detalle del evento
    const eventDetails = lastChangeEvent.details;
    const previousStatus = eventDetails.previousStatus;

    if (!previousStatus) {
      return res.status(400).json({
        success: false,
        message: 'No se puede determinar el estado anterior'
      });
    }

    // Verificar que el estado actual del documento coincida con el evento
    if (document.status !== eventDetails.newStatus) {
      return res.status(400).json({
        success: false,
        message: 'El estado del documento ha cambiado desde el último evento registrado'
      });
    }

    // CONSERVADOR: Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Revertir estado del documento
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          status: previousStatus,
          // CONSERVADOR: Si se deshace un cambio a LISTO, limpiar código de verificación solo si se generó en ese cambio
          ...(eventDetails.newStatus === 'LISTO' && eventDetails.verificationCodeGenerated && {
            verificationCode: null
          })
        }
      });

      // Registrar evento de deshacer
      const undoEvent = await tx.documentEvent.create({
        data: {
          documentId: documentId,
          userId: req.user.id,
          eventType: 'STATUS_UNDO',
          description: `Cambio deshecho: ${eventDetails.newStatus} → ${previousStatus} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
          details: JSON.stringify({
            originalEventId: lastChangeEvent.id,
            revertedFrom: eventDetails.newStatus,
            revertedTo: previousStatus,
            originalEventTime: lastChangeEvent.createdAt,
            timeSinceChange: timeDifference,
            undoneBy: {
              id: req.user.id,
              name: `${req.user.firstName} ${req.user.lastName}`,
              role: req.user.role
            },
            originalChangedBy: {
              id: lastChangeEvent.userId,
              name: `${lastChangeEvent.user.firstName} ${lastChangeEvent.user.lastName}`,
              role: lastChangeEvent.user.role
            },
            whatsappWasSent: eventDetails.whatsappSent || false,
            verificationCodeCleared: eventDetails.newStatus === 'LISTO' && eventDetails.verificationCodeGenerated
          }),
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown'
        }
      });

      return { updatedDocument, undoEvent };
    });

    res.json({
      success: true,
      message: `Cambio deshecho exitosamente: ${eventDetails.newStatus} → ${previousStatus}`,
      data: {
        document: result.updatedDocument,
        undo: {
          revertedFrom: eventDetails.newStatus,
          revertedTo: previousStatus,
          originalEventId: lastChangeEvent.id,
          undoEventId: result.undoEvent.id,
          timeSinceOriginalChange: `${Math.round(timeDifference / 1000)} segundos`,
          whatsappWasSent: eventDetails.whatsappSent || false,
          note: eventDetails.whatsappSent ?
            'Nota: Se había enviado notificación WhatsApp que no puede ser revertida automáticamente' : null
        }
      }
    });

  } catch (error) {
    console.error('Error deshaciendo cambio de estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al deshacer cambio',
      error: error.message
    });
  }
}

/**
 * Obtener historial de cambios recientes deshacibles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getUndoableChanges(req, res) {
  try {
    const { documentId } = req.params;

    // Buscar cambios recientes (últimos 10 minutos) que pueden ser deshechos
    const recentChanges = await prisma.documentEvent.findMany({
      where: {
        documentId: documentId,
        eventType: 'STATUS_CHANGED',
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Últimos 10 minutos
        }
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Máximo 5 cambios recientes
    });

    // Filtrar cambios que el usuario puede deshacer
    const undoableChanges = recentChanges.filter(change => {
      const isOwner = change.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';
      return isOwner || isAdmin;
    });

    res.json({
      success: true,
      data: {
        undoableChanges: undoableChanges.map(change => ({
          id: change.id,
          description: change.description,
          fromStatus: change.details.previousStatus,
          toStatus: change.details.newStatus,
          createdAt: change.createdAt,
          canUndo: true,
          timeRemaining: Math.max(0, 10 * 60 * 1000 - (Date.now() - new Date(change.createdAt).getTime())),
          whatsappSent: change.details.whatsappSent || false,
          changedBy: {
            name: `${change.user.firstName} ${change.user.lastName}`,
            role: change.user.role
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error obteniendo cambios deshacibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener historial completo de un documento
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentHistory(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, eventType } = req.query;

    // Buscar documento y verificar permisos
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Control de permisos por rol
    const userRole = req.user.role;
    const userId = req.user.id;

    // MATRIZADOR: Solo SUS documentos asignados
    if (userRole === 'MATRIZADOR' && document.assignedToId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes ver el historial de documentos asignados a ti'
      });
    }

    // ADMIN/RECEPCIÓN/CAJA/ARCHIVO: Ven TODOS los documentos
    if (!['ADMIN', 'RECEPCION', 'CAJA', 'ARCHIVO', 'MATRIZADOR'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver el historial de documentos'
      });
    }

    // Construir filtros de consulta
    const whereClause = {
      documentId: id
    };

    // Validar y filtrar por eventType si se proporciona
    if (eventType) {
      // Lista de valores válidos del enum DocumentEventType
      const validEventTypes = [
        'DOCUMENT_CREATED',
        'DOCUMENT_ASSIGNED',
        'STATUS_CHANGED',
        'VERIFICATION_GENERATED',
        'WHATSAPP_SENT',
        'EXTRACTION_SNAPSHOT',
        'EXTRACTION_APPLIED',
        'STATUS_UNDO',
        'NOTE_ADDED',
        'UNKNOWN'
      ];

      if (validEventTypes.includes(eventType)) {
        whereClause.eventType = eventType;
      } else {
        console.warn(`⚠️ EventType no válido recibido: ${eventType}. Ignorando filtro.`);
      }
    }

    // Obtener eventos del historial
    const events = await prisma.documentEvent.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit)
    });

    // Obtener total de eventos para paginación
    const totalEvents = await prisma.documentEvent.count({
      where: whereClause
    });

    // Formatear eventos para respuesta con descripciones mejoradas
    const formattedEvents = events.map(event => {
      // Parsear el campo details si es un string JSON
      let parsedDetails = event.details;
      if (typeof event.details === 'string') {
        try {
          parsedDetails = JSON.parse(event.details);
        } catch (e) {
          console.warn(`⚠️ No se pudo parsear details para evento ${event.id}:`, e);
          parsedDetails = {};
        }
      }

      // Crear evento con details parseado para las funciones de formateo
      const eventWithParsedDetails = {
        ...event,
        details: parsedDetails
      };

      // Usar el formateo mejorado de descripción
      const formattedDescription = formatEventDescription(eventWithParsedDetails);

      // Obtener información contextual adicional
      const contextInfo = getEventContextInfo(eventWithParsedDetails);

      return {
        id: event.id,
        type: event.eventType,
        title: getEventTitle(event.eventType, parsedDetails),
        description: formattedDescription,
        timestamp: event.createdAt,
        user: {
          id: event.user.id,
          name: `${event.user.firstName} ${event.user.lastName}`,
          role: event.user.role
        },
        icon: getEventIcon(event.eventType, parsedDetails),
        color: getEventColor(event.eventType, parsedDetails),
        contextInfo: contextInfo, // Información adicional para mostrar
        details: parsedDetails, // Detalles técnicos parseados (solo para debug si es necesario)
        // Campos enriquecidos para UI si existen
        ...(event.personaRetiro && { personaRetiro: event.personaRetiro }),
        ...(event.cedulaRetiro && { cedulaRetiro: event.cedulaRetiro }),
        ...(event.metodoVerificacion && { metodoVerificacion: event.metodoVerificacion }),
        ...(event.observacionesRetiro && { observacionesRetiro: event.observacionesRetiro }),
        // Omitir metadata técnica innecesaria para el usuario final
        ...(userRole === 'ADMIN' && {
          metadata: {
            ipAddress: event.ipAddress,
            userAgent: event.userAgent
          }
        })
      };
    });

    // Información básica del documento para contexto
    const documentInfo = {
      id: document.id,
      protocolNumber: document.protocolNumber,
      clientName: document.clientName,
      currentStatus: document.status,
      documentType: document.documentType,
      createdAt: document.createdAt
    };

    res.json({
      success: true,
      data: {
        document: documentInfo,
        history: {
          events: formattedEvents,
          pagination: {
            total: totalEvents,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < totalEvents
          }
        },
        permissions: {
          role: userRole,
          canViewAll: ['ADMIN', 'RECEPCION', 'CAJA', 'ARCHIVO'].includes(userRole),
          canViewOwned: userRole === 'MATRIZADOR' && document.assignedToId === userId
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial del documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener todos los documentos de un grupo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
/**
 * Revertir estado de documento - Función general para todos los roles
 * Incluye manejo de grupos para ARCHIVO y otros roles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function revertDocumentStatus(req, res) {
  try {
    const { id } = req.params;
    const { newStatus, reversionReason } = req.body;

    console.log('🔄 revertDocumentStatus iniciado:', {
      documentId: id,
      newStatus,
      reversionReason,
      userId: req.user.id,
      userRole: req.user.role
    });

    // Obtener el documento con información de grupo
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        documentGroup: true,
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos según rol
    if (!['ADMIN', 'ARCHIVO', 'MATRIZADOR', 'RECEPCION'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para revertir estados'
      });
    }

    // Si es MATRIZADOR, solo puede revertir sus propios documentos
    if (req.user.role === 'MATRIZADOR' && document.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes revertir documentos asignados a ti'
      });
    }

    // Validar razón obligatoria
    if (!reversionReason || reversionReason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Razón de reversión obligatoria (mínimo 5 caracteres)'
      });
    }

    // 🔗 MANEJO DE GRUPOS: Si el documento está agrupado, revertir todo el grupo
    let updatedDocuments = [];
    let groupAffected = false;

    // Si el documento está agrupado y el rol permite operaciones grupales,
    // propagar la reversión a todo el grupo. Ahora incluye RECEPCION.
    // Reversión individual (documento no agrupado o usuario MATRIZADOR/RECEPCION)
    updatedDocuments = [await prisma.document.update({
      where: { id },
      data: {
        status: newStatus,
        // Limpiar campos específicos según el nuevo estado
        ...(newStatus === 'EN_PROCESO' && {
          verificationCode: null,
          codigoRetiro: null,
          entregadoA: null,
          fechaEntrega: null,
          usuarioEntregaId: null
        })
      },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    })];

    // Registrar evento de auditoría
    await prisma.documentEvent.create({
      data: {
        documentId: id,
        userId: req.user.id,
        eventType: 'STATUS_CHANGED',
        description: `Estado revertido de ${document.status} a ${newStatus} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
        details: JSON.stringify({
          previousStatus: document.status,
          newStatus,
          reversionReason: reversionReason.trim(),
          groupReversion: false,
          timestamp: new Date().toISOString()
        }),
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      }
    });

    // Preparar mensaje de respuesta
    const message = groupAffected
      ? `${updatedDocuments.length} documentos del grupo revertidos exitosamente de ${document.status} a ${newStatus}`
      : `Estado revertido exitosamente de ${document.status} a ${newStatus}`;

    res.json({
      success: true,
      message,
      data: {
        documents: updatedDocuments,
        reversion: {
          fromStatus: document.status,
          toStatus: newStatus,
          reason: reversionReason.trim(),
          groupAffected,
          documentsAffected: updatedDocuments.length,
          reversedBy: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
        }
      }
    });

  } catch (error) {
    console.error('Error en revertDocumentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}


/**
 * 🎯 NUEVA FUNCIONALIDAD: Obtener documentos con filtros unificados para UI Activos/Entregados
 * Endpoint principal para la nueva interfaz con pestañas y búsqueda global
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentsUnified(req, res) {
  try {
    const { tab, query, clientId, page = 1, pageSize = 25 } = req.query;

    // Validar parámetros requeridos
    if (!tab || !['ACTIVOS', 'ENTREGADOS'].includes(tab)) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro "tab" es obligatorio y debe ser "ACTIVOS" o "ENTREGADOS"'
      });
    }

    // Validar pageSize
    const validPageSizes = [25, 50, 100];
    const limit = validPageSizes.includes(parseInt(pageSize)) ? parseInt(pageSize) : 25;
    const offset = (parseInt(page) - 1) * limit;

    // Construir filtros según pestaña
    let statusFilter = [];
    if (tab === 'ACTIVOS') {
      statusFilter = ['EN_PROCESO', 'LISTO'];
    } else if (tab === 'ENTREGADOS') {
      statusFilter = ['ENTREGADO'];
    }

    // Construir where clause
    const whereClause = {
      status: { in: statusFilter },
      // 🔥 EXCLUIR Notas de Crédito de vista unificada
      NOT: {
        status: 'ANULADO_NOTA_CREDITO'
      }
    };

    // Agregar filtro por clientId si se proporciona
    if (clientId) {
      whereClause.clientId = clientId;
    }

    // Agregar búsqueda global si se proporciona query
    if (query && query.trim()) {
      const searchTerm = query.trim();
      whereClause.OR = [
        { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { clientId: { contains: searchTerm, mode: 'insensitive' } },
        { documentType: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    console.log('🔍 getDocumentsUnified - Filtros aplicados:', {
      tab,
      query: query || '(sin búsqueda)',
      clientId: clientId || '(sin filtro cliente)',
      page,
      pageSize: limit,
      whereClause
    });

    // Ejecutar consulta con optimización de índices
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.document.count({ where: whereClause })
    ]);

    // Formatear respuesta optimizada para frontend
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      code: doc.protocolNumber,
      clientId: doc.clientId,
      clientName: doc.clientName,
      clientIdentification: doc.clientId, // Para compatibilidad
      typeLabel: doc.documentType,
      statusLabel: doc.status,
      receivedAtFmt: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-EC') : '-',
      amountFmt: doc.actoPrincipalValor ? `$${doc.actoPrincipalValor.toLocaleString('es-EC')}` : '-'
    }));

    const totalPages = Math.ceil(total / limit);

    console.log(`✅ getDocumentsUnified completado: ${documents.length} documentos encontrados de ${total} total`);

    res.json({
      success: true,
      data: {
        total,
        pages: totalPages,
        items: formattedDocuments
      }
    });

  } catch (error) {
    console.error('❌ Error en getDocumentsUnified:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener documentos',
      error: error.message
    });
  }
}

/**
 * 💳 NUEVA FUNCIONALIDAD: Marcar documento como Nota de Crédito
 * Permite a CAJA anular documentos sin impactar estadísticas de entrega
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function markAsNotaCredito(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    console.log('💳 markAsNotaCredito iniciado:', {
      documentId: id,
      motivo,
      user: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
    });

    // Validar que el usuario tiene permiso (CAJA o ADMIN)
    if (req.user.role !== 'CAJA' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo CAJA y ADMIN pueden marcar documentos como Nota de Crédito'
      });
    }

    // Validar que se proporcione un motivo
    if (!motivo || motivo.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'El motivo es obligatorio y debe tener al menos 10 caracteres'
      });
    }

    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar que no esté ya anulado
    if (document.status === 'ANULADO_NOTA_CREDITO') {
      return res.status(400).json({
        success: false,
        message: 'Este documento ya está marcado como Nota de Crédito'
      });
    }

    // Verificar que no esté entregado
    if (document.status === 'ENTREGADO') {
      return res.status(400).json({
        success: false,
        message: 'No se puede marcar como Nota de Crédito un documento ya entregado. Use reversión de estado primero.'
      });
    }

    // Actualizar documento a ANULADO_NOTA_CREDITO
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'ANULADO_NOTA_CREDITO',
        notaCreditoMotivo: motivo.trim(),
        notaCreditoEstadoPrevio: document.status,
        notaCreditoFecha: new Date()
      },
      include: {
        assignedTo: true,
        createdBy: true
      }
    });

    // Registrar evento en auditoría
    await prisma.documentEvent.create({
      data: {
        documentId: id,
        userId: req.user.id,
        eventType: 'STATUS_CHANGED',
        description: `Documento marcado como NOTA DE CRÉDITO por ${req.user.firstName} ${req.user.lastName}`,
        details: JSON.stringify({
          estadoAnterior: document.status,
          estadoNuevo: 'ANULADO_NOTA_CREDITO',
          motivo: motivo.trim(),
          timestamp: new Date().toISOString()
        })
      }
    });

    console.log('✅ Documento marcado como Nota de Crédito exitosamente:', {
      documentId: id,
      protocolNumber: document.protocolNumber,
      estadoAnterior: document.status
    });

    res.json({
      success: true,
      message: 'Documento marcado como Nota de Crédito exitosamente',
      data: {
        document: updatedDocument
      }
    });

  } catch (error) {
    console.error('❌ Error en markAsNotaCredito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al marcar documento como Nota de Crédito',
      error: error.message
    });
  }
}

/**
 * 🎯 NUEVA FUNCIONALIDAD: Obtener conteos para badges de pestañas
 * Endpoint optimizado para actualizar badges en tiempo real
 * EXCLUYE documentos con Nota de Crédito de las estadísticas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDocumentsCounts(req, res) {
  try {
    const { query, clientId } = req.query;

    // Construir filtros base
    const baseWhere = {
      // 🔥 IMPORTANTE: Excluir Notas de Crédito de todos los conteos
      status: { not: 'ANULADO_NOTA_CREDITO' }
    };

    if (clientId) {
      baseWhere.clientId = clientId;
    }

    // Agregar búsqueda global si se proporciona query
    if (query && query.trim()) {
      const searchTerm = query.trim();
      baseWhere.OR = [
        { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { clientId: { contains: searchTerm, mode: 'insensitive' } },
        { documentType: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Ejecutar conteos en paralelo para mejor performance
    const [activosCount, entregadosCount] = await Promise.all([
      // Conteo para ACTIVOS (EN_PROCESO + LISTO)
      prisma.document.count({
        where: {
          ...baseWhere,
          status: { in: ['EN_PROCESO', 'LISTO'] }
        }
      }),
      // Conteo para ENTREGADOS
      prisma.document.count({
        where: {
          ...baseWhere,
          status: 'ENTREGADO'
        }
      })
    ]);

    console.log('📊 getDocumentsCounts completado:', {
      query: query || '(sin búsqueda)',
      clientId: clientId || '(sin filtro)',
      ACTIVOS: activosCount,
      ENTREGADOS: entregadosCount
    });

    res.json({
      success: true,
      data: {
        ACTIVOS: activosCount,
        ENTREGADOS: entregadosCount
      }
    });

  } catch (error) {
    console.error('❌ Error en getDocumentsCounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener conteos',
      error: error.message
    });
  }
}

/**
 * 📊 Obtener estadísticas completas para dashboard de CAJA
 * GET /api/documents/caja-stats
 * Retorna métricas de negocio: montos, trámites por tipo, tendencias
 */
async function getCajaStats(req, res) {
  try {
    // Solo CAJA y ADMIN pueden ver estas estadísticas
    if (req.user.role !== 'CAJA' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas estadísticas'
      });
    }

    // Calcular fecha de hace 7 y 30 días
    const fecha7DiasAtras = new Date();
    fecha7DiasAtras.setDate(fecha7DiasAtras.getDate() - 7);

    const fecha30DiasAtras = new Date();
    fecha30DiasAtras.setDate(fecha30DiasAtras.getDate() - 30);

    // 📊 Estadísticas generales
    const [
      totalDocumentos,
      totalFacturado,
      tramitesPorTipo,
      tramitesPorEstado,
      tramitesUltimos7Dias,
      tramitesUltimos30Dias,
      montoUltimos7Dias,
      montoUltimos30Dias
    ] = await Promise.all([
      // Total de documentos (excluyendo notas de crédito)
      prisma.document.count({
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          }
        }
      }),

      // Total facturado (excluyendo notas de crédito)
      prisma.document.aggregate({
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          }
        },
        _sum: {
          totalFactura: true
        }
      }),

      // Trámites por tipo de documento
      prisma.document.groupBy({
        by: ['documentType'],
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalFactura: true
        }
      }),

      // Trámites por estado
      prisma.document.groupBy({
        by: ['status'],
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          }
        },
        _count: {
          id: true
        }
      }),

      // Trámites últimos 7 días
      prisma.document.count({
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          },
          createdAt: {
            gte: fecha7DiasAtras
          }
        }
      }),

      // Trámites últimos 30 días
      prisma.document.count({
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          },
          createdAt: {
            gte: fecha30DiasAtras
          }
        }
      }),

      // Monto últimos 7 días
      prisma.document.aggregate({
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          },
          createdAt: {
            gte: fecha7DiasAtras
          }
        },
        _sum: {
          totalFactura: true
        }
      }),

      // Monto últimos 30 días
      prisma.document.aggregate({
        where: {
          status: {
            not: 'ANULADO_NOTA_CREDITO'
          },
          createdAt: {
            gte: fecha30DiasAtras
          }
        },
        _sum: {
          totalFactura: true
        }
      })
    ]);

    // Formatear datos de trámites por tipo
    const tramitesPorTipoFormateado = tramitesPorTipo.reduce((acc, item) => {
      acc[item.documentType] = {
        cantidad: item._count.id,
        monto: item._sum.totalFactura || 0
      };
      return acc;
    }, {});

    // Formatear datos de trámites por estado
    const tramitesPorEstadoFormateado = tramitesPorEstado.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    // Respuesta
    res.json({
      success: true,
      data: {
        general: {
          totalTramites: totalDocumentos,
          totalFacturado: totalFacturado._sum.totalFactura || 0
        },
        porTipo: tramitesPorTipoFormateado,
        porEstado: tramitesPorEstadoFormateado,
        tendencias: {
          ultimos7Dias: {
            cantidad: tramitesUltimos7Dias,
            monto: montoUltimos7Dias._sum.totalFactura || 0
          },
          ultimos30Dias: {
            cantidad: tramitesUltimos30Dias,
            monto: montoUltimos30Dias._sum.totalFactura || 0
          }
        }
      }
    });

    console.log('📊 Estadísticas de CAJA generadas exitosamente');

  } catch (error) {
    console.error('❌ Error en getCajaStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener estadísticas',
      error: error.message
    });
  }
}

/**
 * 📱 NUEVA FUNCIONALIDAD: Notificación masiva WhatsApp con agrupación por cliente
 * PUT /api/documents/bulk-notify
 * - Agrupa documentos por clientPhone (anti-spam: 1 mensaje por cliente)
 * - Genera código de retiro único para el lote
 * - Actualiza ultimoRecordatorio timestamp
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function bulkNotify(req, res) {
  try {
    const { documentIds, sendWhatsApp = true } = req.body;

    console.log('📱 bulkNotify iniciado:', {
      documentIds,
      sendWhatsApp,
      user: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
    });

    // Validar permisos
    if (!['ADMIN', 'RECEPCION', 'ARCHIVO', 'MATRIZADOR'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para enviar notificaciones'
      });
    }

    // Validar documentIds
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un ID de documento'
      });
    }

    // Obtener documentos con información necesaria
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        status: { in: ['LISTO', 'EN_PROCESO'] } // Solo documentos que pueden notificarse
      },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron documentos válidos para notificar'
      });
    }

    // Agrupar documentos por cliente (clientPhone) para anti-spam
    const groupedByClient = {};
    const documentsWithoutPhone = [];

    for (const doc of documents) {
      if (doc.clientPhone && doc.clientPhone.trim()) {
        const phone = doc.clientPhone.trim();
        if (!groupedByClient[phone]) {
          groupedByClient[phone] = {
            clientName: doc.clientName,
            clientPhone: phone,
            documents: []
          };
        }
        groupedByClient[phone].documents.push(doc);
      } else {
        documentsWithoutPhone.push(doc);
      }
    }

    // Importar servicio de código de retiro
    const CodigoRetiroService = (await import('../utils/codigo-retiro.js')).default;

    const results = {
      notificados: [],
      sinTelefono: [],
      errores: []
    };

    const now = new Date();

    // Procesar cada grupo de cliente
    for (const [phone, clientGroup] of Object.entries(groupedByClient)) {
      try {
        // Generar código único para el lote de este cliente
        const codigoRetiro = await CodigoRetiroService.generarUnico();

        // Actualizar todos los documentos del grupo con el código y timestamp
        const documentIdsToUpdate = clientGroup.documents.map(d => d.id);

        await prisma.document.updateMany({
          where: { id: { in: documentIdsToUpdate } },
          data: {
            codigoRetiro: codigoRetiro,
            ultimoRecordatorio: now,
            fechaListo: { set: now } // Solo si es la primera vez
          }
        });

        // Registrar evento de auditoría para cada documento
        for (const doc of clientGroup.documents) {
          await prisma.documentEvent.create({
            data: {
              documentId: doc.id,
              userId: req.user.id,
              eventType: 'WHATSAPP_NOTIFICATION',
              description: `Notificación WhatsApp preparada. Código: ${codigoRetiro}`,
              details: JSON.stringify({
                codigoRetiro,
                clientPhone: phone,
                documentosEnLote: documentIdsToUpdate.length,
                timestamp: now.toISOString()
              })
            }
          });

          // Registrar en tabla WhatsAppNotification para historial
          await prisma.whatsAppNotification.create({
            data: {
              documentId: doc.id,
              clientName: clientGroup.clientName,
              clientPhone: phone,
              messageType: 'DOCUMENTO_LISTO',
              messageBody: `Código de retiro: ${codigoRetiro}. Documentos en lote: ${documentIdsToUpdate.length}`,
              status: sendWhatsApp ? 'PREPARED' : 'PENDING',
              sentAt: sendWhatsApp ? now : null
            }
          });
        }

        // Generar URL wa.me si se solicita envío
        let waUrl = null;
        if (sendWhatsApp) {
          // Formatear teléfono para WhatsApp (Ecuador: 593...)
          let formattedPhone = phone.replace(/[\s\-\(\)]/g, '');
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '593' + formattedPhone.substring(1);
          } else if (!formattedPhone.startsWith('593') && !formattedPhone.startsWith('+593')) {
            formattedPhone = '593' + formattedPhone;
          }
          formattedPhone = formattedPhone.replace('+', '');

          // Construir mensaje
          const docList = clientGroup.documents.map(d =>
            `• ${d.documentType} - ${d.protocolNumber}`
          ).join('\n');

          const message = `🏛️ *NOTARÍA DÉCIMO OCTAVA*\n\nEstimado/a ${clientGroup.clientName},\n\n` +
            `Sus documentos están listos para retiro:\n${docList}\n\n` +
            `🔢 *Código de retiro:* ${codigoRetiro}\n\n` +
            `⚠️ Presente este código en ventanilla.\n📍 Azuay E2-231 y Av Amazonas, Quito`;

          waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        }

        results.notificados.push({
          clientName: clientGroup.clientName,
          clientPhone: phone,
          codigoRetiro,
          documentCount: clientGroup.documents.length,
          documentIds: documentIdsToUpdate,
          waUrl
        });

        console.log(`✅ Cliente ${clientGroup.clientName} notificado con código ${codigoRetiro}`);

      } catch (error) {
        console.error(`❌ Error procesando cliente ${clientGroup.clientName}:`, error);
        results.errores.push({
          clientName: clientGroup.clientName,
          clientPhone: phone,
          error: error.message
        });
      }
    }

    // Procesar documentos sin teléfono (generar código interno)
    for (const doc of documentsWithoutPhone) {
      try {
        const codigoRetiro = await CodigoRetiroService.generarUnico();

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            codigoRetiro,
            fechaListo: now
            // No actualizar ultimoRecordatorio porque no se envió notificación
          }
        });

        await prisma.documentEvent.create({
          data: {
            documentId: doc.id,
            userId: req.user.id,
            eventType: 'CODIGO_GENERADO',
            description: `Código interno generado (sin WhatsApp): ${codigoRetiro}`,
            details: JSON.stringify({
              codigoRetiro,
              sinTelefono: true,
              timestamp: now.toISOString()
            })
          }
        });

        results.sinTelefono.push({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          codigoRetiro,
          mensaje: 'Código generado internamente. Cliente sin teléfono - requiere verificación manual.'
        });

      } catch (error) {
        results.errores.push({
          documentId: doc.id,
          protocolNumber: doc.protocolNumber,
          error: error.message
        });
      }
    }

    console.log('📱 bulkNotify completado:', {
      notificados: results.notificados.length,
      sinTelefono: results.sinTelefono.length,
      errores: results.errores.length
    });

    res.json({
      success: true,
      message: `Notificación procesada: ${results.notificados.length} clientes notificados, ${results.sinTelefono.length} sin teléfono`,
      data: results
    });

  } catch (error) {
    console.error('❌ Error en bulkNotify:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar notificaciones',
      error: error.message
    });
  }
}

export {
  uploadXmlDocument,
  uploadXmlDocumentsBatch,
  getAllDocuments,
  assignDocument,
  getMyDocuments,
  updateDocumentStatus,
  getDocumentById,
  getAvailableMatrizadores,
  // Función de entrega completa
  deliverDocument,
  // Funciones de edición
  getEditableDocumentInfo,
  updateDocumentInfo,
  // 🔄 Sistema de confirmaciones y deshacer
  undoDocumentStatusChange,
  getUndoableChanges,
  // 📈 Sistema de historial universal
  getDocumentHistory,
  // 🔄 Reversión de estado
  revertDocumentStatus,

  // 🧪 Extracción avanzada (flag)
  extractDocumentActs,
  applyExtractionSuggestions,
  // 🎯 NUEVA FUNCIONALIDAD: UI Activos/Entregados
  getDocumentsUnified,
  getDocumentsCounts,
  // 💳 NUEVA FUNCIONALIDAD: Nota de Crédito
  markAsNotaCredito,
  // 📊 NUEVA FUNCIONALIDAD: Estadísticas de CAJA
  getCajaStats,
  // 📱 NUEVA FUNCIONALIDAD: Notificaciones WhatsApp masivas
  bulkNotify
};
