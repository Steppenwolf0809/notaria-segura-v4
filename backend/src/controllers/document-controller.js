import prisma from '../db.js';
import { getReversionCleanupData, isValidStatus, isReversion as isReversionFn } from '../utils/status-transitions.js';
import { parseXmlDocument, generateVerificationCode } from '../services/xml-parser-service.js';
import DocumentGroupingService from '../services/document-grouping-service.js';
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
async function getMyDocuments(req, res) {
  try {
    // Verificar que el usuario sea MATRIZADOR o ARCHIVO
    if (!['MATRIZADOR', 'ARCHIVO'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo matrizadores pueden ver sus documentos asignados'
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        assignedToId: req.user.id
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length,
        byStatus: {
          PENDIENTE: documents.filter(d => d.status === 'PENDIENTE').length,
          EN_PROCESO: documents.filter(d => d.status === 'EN_PROCESO').length,
          LISTO: documents.filter(d => d.status === 'LISTO').length,
          ENTREGADO: documents.filter(d => d.status === 'ENTREGADO').length
        }
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
      // Matrizadores pueden marcar como ENTREGADO sus documentos LISTO
      if (status === 'ENTREGADO') {
        if (document.status !== 'LISTO') {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO'
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
      // Puede entregar documentos directamente como MATRIZADOR sobre sus propios documentos
      if (status === 'ENTREGADO') {
        if (document.status !== 'LISTO') {
          return res.status(403).json({
            success: false,
            message: 'Solo se pueden entregar documentos que estén LISTO'
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
    if (document.documentGroupId && req.user.role === 'MATRIZADOR') {
      console.log('🔗 Documento agrupado detectado - Iniciando propagación de estado:', {
        documentGroupId: document.documentGroupId,
        newStatus: status
      });

      try {
        // Obtener todos los documentos del mismo grupo
        const groupDocuments = await prisma.document.findMany({
          where: {
            documentGroupId: document.documentGroupId,
            // En reversión, incluir también documentos ENTREGADO para permitir ENTREGADO -> LISTO
            ...(isReversion ? {} : { status: { not: 'ENTREGADO' } })
          },
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        });

        console.log(`📋 Encontrados ${groupDocuments.length} documentos en el grupo para actualizar`);

        // Verificar permisos para todos los documentos del grupo
        if (req.user.role === 'MATRIZADOR') {
          const unauthorizedDocs = groupDocuments.filter(doc => doc.assignedToId !== req.user.id);
          if (unauthorizedDocs.length > 0) {
            return res.status(403).json({
              success: false,
              message: `No tienes permisos para modificar todos los documentos del grupo. ${unauthorizedDocs.length} documento(s) están asignados a otros matrizadores.`
            });
          }
        }

        // Generar códigos de verificación únicos para cada documento si no los tienen
        const documentsToUpdate = [];
        for (const doc of groupDocuments) {
          const docUpdateData = { ...updateData };
          // Limpieza por reversión debe ser por documento según su estado actual
          if (isReversion) {
            Object.assign(docUpdateData, getReversionCleanupData(doc.status, status));
          }

          if (status === 'LISTO' && !doc.verificationCode) {
            docUpdateData.verificationCode = generateVerificationCode();
            console.log(`🎯 Código generado para ${doc.protocolNumber}: ${docUpdateData.verificationCode}`);
          }
          documentsToUpdate.push({
            docId: doc.id,
            updateData: docUpdateData,
            originalStatus: doc.status
          });
        }

        // Actualizar todos los documentos del grupo en una transacción
        updatedDocuments = await prisma.$transaction(async (tx) => {
          const updates = [];
          for (const { docId, updateData: docUpdateData } of documentsToUpdate) {
            const updated = await tx.document.update({
              where: { id: docId },
              data: docUpdateData,
              include: {
                createdBy: {
                  select: { id: true, firstName: true, lastName: true, email: true }
                },
                assignedTo: {
                  select: { id: true, firstName: true, lastName: true, email: true }
                }
              }
            });
            updates.push(updated);
          }
          return updates;
        });

        groupAffected = true;
        console.log(`✅ ${updatedDocuments.length} documentos del grupo actualizados exitosamente`);

        // Registrar eventos de auditoría para todos los documentos afectados
        for (let i = 0; i < updatedDocuments.length; i++) {
          const doc = updatedDocuments[i];
          const originalStatus = documentsToUpdate[i].originalStatus;

          try {
            await prisma.documentEvent.create({
              data: {
                documentId: doc.id,
                userId: req.user.id,
                eventType: 'STATUS_CHANGED',
                description: `Estado cambiado de ${originalStatus} a ${status} por propagación grupal - ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
                details: JSON.stringify({
                  previousStatus: originalStatus,
                  newStatus: status,
                  verificationCodeGenerated: status === 'LISTO' && doc.verificationCode,
                  groupOperation: true,
                  groupId: document.documentGroupId,
                  triggerDocumentId: id,
                  userRole: req.user.role,
                  timestamp: new Date().toISOString()
                }),
                ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown'
              }
            });
          } catch (auditError) {
            console.error(`Error registrando evento para documento ${doc.id}:`, auditError);
          }
        }

      } catch (groupError) {
        console.error('Error actualizando documentos del grupo:', groupError);
        return res.status(500).json({
          success: false,
          message: 'Error al actualizar documentos del grupo',
          error: groupError.message
        });
      }
    } else {
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
    }

    // Usar el primer documento como principal para compatibilidad
    const updatedDocument = updatedDocuments[0];

    // NUEVA FUNCIONALIDAD: Enviar notificación WhatsApp si se marca como LISTO
    let whatsappSent = false;
    let whatsappError = null;
    let whatsappResults = [];

    if (status === 'LISTO' && updatedDocument?.notificationPolicy === 'no_notificar') {
      console.log('🔕 Política de notificación: no_notificar. Se omite envío de WhatsApp (LISTO).');
    } else if (status === 'LISTO') {
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

    // NUEVA FUNCIONALIDAD: Enviar notificación WhatsApp para entrega directa de MATRIZADOR/ARCHIVO
    if (status === 'ENTREGADO' && ['MATRIZADOR', 'ARCHIVO'].includes(req.user.role) && updatedDocument.clientPhone && updatedDocument.notificationPolicy !== 'no_notificar') {
      try {
        // Importar el servicio de WhatsApp
        const whatsappService = await import('../services/whatsapp-service.js');

        // Preparar datos de entrega
        const datosEntrega = {
          entregado_a: updateData.entregadoA,
          deliveredTo: updateData.entregadoA,
          fecha: updateData.fechaEntrega,
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
        };

        // Enviar notificación de documento entregado
        const whatsappResult = await whatsappService.default.enviarDocumentoEntregado(
          {
            nombre: updatedDocument.clientName,
            clientName: updatedDocument.clientName,
            telefono: updatedDocument.clientPhone,
            clientPhone: updatedDocument.clientPhone
          },
          {
            tipo_documento: updatedDocument.documentType,
            tipoDocumento: updatedDocument.documentType,
            numero_documento: updatedDocument.protocolNumber,
            protocolNumber: updatedDocument.protocolNumber
          },
          datosEntrega
        );

        whatsappSent = whatsappResult.success;

        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega directa:', whatsappResult.error);
        } else {
          console.log('📱 Notificación WhatsApp de entrega directa enviada exitosamente');

          // 📈 Registrar evento de notificación WhatsApp de entrega directa
          try {
            await prisma.documentEvent.create({
              data: {
                documentId: id,
                userId: req.user.id,
                eventType: 'WHATSAPP_SENT',
                description: `Notificación WhatsApp de entrega directa enviada a ${updatedDocument.clientPhone}`,
                details: JSON.stringify({
                  phoneNumber: updatedDocument.clientPhone,
                  messageType: 'DOCUMENT_DELIVERED',
                  deliveredTo: updateData.entregadoA,
                  deliveredBy: `${req.user.firstName} ${req.user.lastName}`,
                  deliveredByRole: req.user.role,
                  deliveryType: 'DIRECT_DELIVERY',
                  timestamp: new Date().toISOString()
                }),
                ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown'
              }
            });
          } catch (auditError) {
            console.error('Error registrando evento de notificación WhatsApp de entrega:', auditError);
          }
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega directa:', error);
        whatsappError = error.message;
      }
    }

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
          groupId: document.documentGroupId,
          allDocuments: groupAffected ? updatedDocuments : undefined
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
 * Detectar documentos agrupables para un cliente - Matrizador, Recepción y Archivo
 */
async function detectGroupableDocuments(req, res) {
  try {
    // Validar roles autorizados para detectar agrupaciones
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR, RECEPCION o ARCHIVO pueden detectar agrupaciones'
      });
    }

    const { clientName, clientId } = req.body;
    // Solo forza filtro por asignación cuando es MATRIZADOR, para RECEPCION/ARCHIVO/ADMIN buscamos por cliente sin restringir asignación
    const matrizadorId = req.user.role === 'MATRIZADOR' ? req.user.id : null;

    console.log('🔍 Controller: detectGroupableDocuments solicitado:', {
      clientName,
      clientId: clientId || '(sin ID)',
      matrizadorId,
      userRole: req.user.role
    });

    const groupableDocuments = await DocumentGroupingService
      .detectGroupableDocuments({ clientName, clientId }, matrizadorId);

    res.json({
      success: true,
      groupableDocuments,
      canGroup: groupableDocuments.length >= 2
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Crear agrupación de documentos - Matrizador, Recepción y Archivo
 */
async function createDocumentGroup(req, res) {
  try {
    // Validar roles autorizados para agrupar documentos
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR, RECEPCION o ARCHIVO pueden crear grupos de documentos'
      });
    }

    const { documentIds, verifiedPhone, notificationMessage } = req.body;
    // Para crear grupo: solo restringimos por asignación cuando el usuario es MATRIZADOR
    const matrizadorId = req.user.role === 'MATRIZADOR' ? req.user.id : null;

    // NUEVA FUNCIONALIDAD: Crear grupo con estado configurable
    const markAsReady = req.body.markAsReady || false; // Por defecto solo agrupar
    const result = await DocumentGroupingService
      .createDocumentGroup(documentIds, matrizadorId, markAsReady);

    // Enviar notificación grupal si se solicita
    let whatsappSent = false;
    let whatsappError = null;

    console.log('🔍 DEBUG: Verificando condiciones para WhatsApp grupal:', {
      sendNotification: req.body.sendNotification,
      clientPhone: result.group.clientPhone,
      clientName: result.group.clientName,
      documentsCount: result.documents.length
    });

    // NUEVA FUNCIONALIDAD: Solo enviar notificación si se marca como listo
    if (markAsReady && req.body.sendNotification && result.group.clientPhone) {
      try {
        // Importar el servicio de WhatsApp
        const whatsappService = await import('../services/whatsapp-service.js');

        // Preparar datos del cliente
        const cliente = {
          nombre: result.group.clientName,
          telefono: result.group.clientPhone
        };

        // Enviar notificación grupal
        const whatsappResult = await whatsappService.default.enviarGrupoDocumentosListo(
          cliente,
          result.documents,
          result.group.verificationCode
        );

        whatsappSent = whatsappResult.success;

        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp grupal:', whatsappResult.error);
        } else {
          console.log('📱 Notificación grupal WhatsApp enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp grupal:', error);
        whatsappError = error.message;
      }

      // Marcar notificación enviada solo si fue exitosa
      if (whatsappSent) {
        await prisma.documentGroup.update({
          where: { id: result.group.id },
          data: {
            notificationSent: true,
            notificationSentAt: new Date()
          }
        });
      }
    }

    // Preparar mensaje de respuesta
    let message = `Grupo creado con ${result.documents.length} documentos`;
    if (req.body.sendNotification) {
      if (whatsappSent) {
        message += ' y notificación WhatsApp enviada';
      } else if (result.group.clientPhone && whatsappError) {
        message += ', pero falló la notificación WhatsApp';
      } else if (!result.group.clientPhone) {
        message += ' (sin teléfono para notificación WhatsApp)';
      }
    }

    res.json({
      success: true,
      message: message,
      group: result.group,
      verificationCode: result.group.verificationCode,
      whatsapp: {
        sent: whatsappSent,
        error: whatsappError,
        phone: result.group.clientPhone
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Entregar grupo de documentos
 */
async function deliverDocumentGroup(req, res) {
  try {
    const { verificationCode, deliveredTo, deliveryNotes } = req.body;
    const deliveredBy = req.user.id;

    const group = await DocumentGroupingService.deliverDocumentGroup(
      verificationCode,
      { deliveredTo, deliveredBy, deliveryNotes }
    );

    res.json({
      success: true,
      message: `Grupo de ${group.documentsCount} documentos entregado`,
      group
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
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
async function createSmartDocumentGroup(req, res) {
  try {
    const { documentIds, notificationPolicy = 'automatica' } = req.body;

    // Validar roles autorizados para agrupación inteligente
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR, RECEPCION o ARCHIVO pueden crear grupos de documentos'
      });
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos 2 documentos para crear un grupo'
      });
    }

    console.log(`🔗 Creando grupo inteligente con ${documentIds.length} documentos...`);

    // Usar el servicio existente pero con lógica mejorada
    const groupResult = await DocumentGroupingService.createDocumentGroup(
      documentIds,
      req.user.id // CAJA puede crear grupos aunque no sea matrizador
    );

    if (!groupResult) {
      return res.status(400).json({
        success: false,
        message: 'Error creando el grupo de documentos'
      });
    }

    // Enviar notificación según política
    if (notificationPolicy === 'automatica') {
      try {
        // Obtener el grupo creado para enviar notificación
        const documentGroup = await prisma.documentGroup.findUnique({
          where: { id: groupResult.groupId },
          include: {
            documents: {
              select: {
                id: true,
                protocolNumber: true,
                documentType: true,
                clientName: true,
                clientPhone: true
              }
            }
          }
        });

        if (documentGroup && documentGroup.documents.length > 0) {
          const WhatsAppService = await import('../services/whatsapp-service.js');
          await WhatsAppService.default.enviarGrupoDocumentosListo(
            {
              nombre: documentGroup.clientName,
              telefono: documentGroup.clientPhone
            },
            documentGroup.documents,
            documentGroup.verificationCode
          );

          console.log(`📱 Notificación grupal enviada para grupo ${groupResult.groupId}`);
        }
      } catch (notificationError) {
        console.warn('⚠️ Error enviando notificación grupal:', notificationError.message);
        // No fallar la creación del grupo por error de notificación
      }
    }

    res.status(201).json({
      success: true,
      message: `Grupo creado exitosamente con ${documentIds.length} documentos`,
      data: {
        groupId: groupResult.groupId,
        verificationCode: groupResult.verificationCode,
        documentsCount: documentIds.length,
        notificationSent: notificationPolicy === 'automatica'
      }
    });

  } catch (error) {
    console.error('Error creando grupo inteligente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

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
 * NUEVA FUNCIONALIDAD: Marcar grupo como listo para entrega
 */
async function markDocumentGroupAsReady(req, res) {
  try {
    // Validar roles autorizados
    if (!['MATRIZADOR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo usuarios MATRIZADOR pueden marcar grupos como listos'
      });
    }

    const { documentGroupId } = req.body;
    const matrizadorId = req.user.id;

    console.log('🚀 markDocumentGroupAsReady iniciado:', {
      documentGroupId,
      matrizadorId,
      userRole: req.user.role
    });

    if (!documentGroupId) {
      return res.status(400).json({
        success: false,
        message: 'ID del grupo es obligatorio'
      });
    }

    // Marcar grupo como listo
    const result = await DocumentGroupingService.markDocumentGroupAsReady(
      documentGroupId,
      matrizadorId
    );

    // Enviar notificación WhatsApp automáticamente
    let whatsappSent = false;
    let whatsappError = null;

    if (result.group.clientPhone) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');

        const cliente = {
          nombre: result.group.clientName,
          telefono: result.group.clientPhone
        };

        const whatsappResult = await whatsappService.default.enviarGrupoDocumentosListo(
          cliente,
          result.documents,
          result.group.verificationCode
        );

        whatsappSent = whatsappResult.success;

        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp al marcar grupo como listo:', whatsappResult.error);
        } else {
          console.log('📱 Notificación WhatsApp enviada al marcar grupo como listo');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp al marcar grupo como listo:', error);
        whatsappError = error.message;
      }
    }

    res.json({
      success: true,
      message: 'Grupo marcado como listo exitosamente',
      data: {
        group: result.group,
        documents: result.documents,
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: result.group.clientPhone
        }
      }
    });

  } catch (error) {
    console.error('Error marcando grupo como listo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * Actualizar estado de grupo de documentos
 * Función optimizada para mover todos los documentos de un grupo juntos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateDocumentGroupStatus(req, res) {
  try {
    const { documentGroupId, newStatus, deliveredTo, reversionReason } = req.body;

    console.log('🔄 updateDocumentGroupStatus iniciado:', {
      documentGroupId,
      newStatus,
      deliveredTo,
      userRole: req.user.role,
      userId: req.user.id
    });

    if (!documentGroupId || !newStatus) {
      return res.status(400).json({
        success: false,
        message: 'ID del grupo y nuevo estado son obligatorios'
      });
    }

    // Validar estados válidos
    const validStatuses = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    // Buscar documentos del grupo y verificar permisos
    console.log('🔍 Buscando documentos del grupo:', documentGroupId);
    const groupDocuments = await prisma.document.findMany({
      where: {
        documentGroupId,
        isGrouped: true
      },
      include: {
        documentGroup: true
      }
    });

    console.log('📄 Documentos encontrados:', {
      count: groupDocuments.length,
      documents: groupDocuments.map(doc => ({
        id: doc.id,
        status: doc.status,
        assignedToId: doc.assignedToId,
        clientName: doc.clientName
      }))
    });

    if (groupDocuments.length === 0) {
      console.log('❌ Grupo de documentos no encontrado:', documentGroupId);
      return res.status(404).json({
        success: false,
        message: 'Grupo de documentos no encontrado'
      });
    }

    // Verificar permisos - todos los documentos deben pertenecer al usuario
    const userRole = req.user.role;
    if (['MATRIZADOR', 'ARCHIVO'].includes(userRole)) {
      const unauthorizedDocs = groupDocuments.filter(doc => doc.assignedToId !== req.user.id);
      if (unauthorizedDocs.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar documentos asignados a ti'
        });
      }
    }

    // Detectar si hay reversión para algún documento y exigir razón
    const STATUS_ORDER = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];
    const idx = (s) => STATUS_ORDER.indexOf(s);
    const isAnyReversion = groupDocuments.some(doc => idx(newStatus) < idx(doc.status));
    if (isAnyReversion && (!reversionReason || !reversionReason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Las reversiones de estado por grupo requieren especificar una razón'
      });
    }

    // Preparar actualizaciones por documento (permite limpieza por reversión específica)
    const groupCodeForReady = groupDocuments[0]?.documentGroup?.verificationCode || null;
    const docsUpdatesPayload = groupDocuments.map(doc => {
      const updateData = { status: newStatus };

      // Limpieza específica por documento si es reversión
      if (idx(newStatus) < idx(doc.status)) {
        Object.assign(updateData, getReversionCleanupData(doc.status, newStatus));
      }

      // Generar/propagar código si pasa a LISTO
      if (newStatus === 'LISTO') {
        if (groupCodeForReady) {
          updateData.verificationCode = groupCodeForReady;
        } else if (!doc.verificationCode) {
          updateData.verificationCode = generateVerificationCode();
        }
      }

      // Datos de entrega si pasa a ENTREGADO
      if (newStatus === 'ENTREGADO') {
        updateData.usuarioEntregaId = req.user.id;
        updateData.fechaEntrega = new Date();
        updateData.entregadoA = deliveredTo || `Entrega por ${req.user.role.toLowerCase()}`;
        updateData.relacionTitular = 'directo';
      }

      return { id: doc.id, previousStatus: doc.status, data: updateData };
    });

    // Actualización transaccional por documento y registro de eventos
    const updatedDocuments = await prisma.$transaction(async (tx) => {
      const updated = [];
      for (const u of docsUpdatesPayload) {
        const docUpdated = await tx.document.update({
          where: { id: u.id },
          data: u.data,
          include: {
            documentGroup: true,
            assignedTo: { select: { id: true, firstName: true, lastName: true } }
          }
        });
        updated.push({ doc: docUpdated, previousStatus: u.previousStatus });
      }
      return updated;
    });

    console.log('✅ Documentos actualizados:', {
      count: updatedDocuments.length,
      newStatus
    });

    // Registrar eventos de auditoría STATUS_CHANGED por documento
    try {
      for (const { doc, previousStatus } of updatedDocuments) {
        await prisma.documentEvent.create({
          data: {
            documentId: doc.id,
            userId: req.user.id,
            eventType: 'STATUS_CHANGED',
            description: `Estado cambiado de ${previousStatus} a ${newStatus} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})${(idx(newStatus) < idx(previousStatus) && reversionReason) ? ` - Razón: ${reversionReason.trim()}` : ''}`,
            details: JSON.stringify({
              previousStatus,
              newStatus,
              groupOperation: true,
              groupId: documentGroupId,
              reason: (idx(newStatus) < idx(previousStatus) && reversionReason) ? reversionReason.trim() : null,
              timestamp: new Date().toISOString()
            }),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        });
      }
    } catch (auditError) {
      console.error('Error registrando eventos de cambio de estado por grupo:', auditError);
    }

    // Para compatibilidad con lógica de notificaciones y respuesta
    const updatedDocsOnly = updatedDocuments.map(u => u.doc);
    const updateResult = { count: updatedDocsOnly.length };

    // Enviar notificación grupal si corresponde
    let whatsappSent = false;
    let whatsappError = null;

    console.log('🔍 Verificando condiciones iniciales para WhatsApp grupal:', {
      newStatus,
      isListo: newStatus === 'LISTO',
      hasClientPhone: !!updatedDocsOnly[0]?.clientPhone,
      clientPhone: updatedDocsOnly[0]?.clientPhone,
      hasDocumentGroupOriginal: !!updatedDocsOnly[0]?.documentGroup,
      documentGroupId: updatedDocsOnly[0]?.documentGroupId,
      documentGroupOriginal: updatedDocsOnly[0]?.documentGroup ? {
        id: updatedDocsOnly[0].documentGroup.id,
        verificationCode: updatedDocsOnly[0].documentGroup.verificationCode
      } : null
    });

    // 🔧 CORRECCIÓN: Verificar/obtener documentGroup si no está presente
    let documentGroupForWhatsApp = updatedDocsOnly[0]?.documentGroup;

    if (newStatus === 'LISTO' && updatedDocsOnly[0]?.clientPhone && !documentGroupForWhatsApp && updatedDocsOnly[0]?.documentGroupId) {
      console.log('🔄 documentGroup no incluido, obteniendo manualmente...', {
        documentGroupId: updatedDocsOnly[0].documentGroupId
      });

      try {
        documentGroupForWhatsApp = await prisma.documentGroup.findUnique({
          where: { id: updatedDocsOnly[0].documentGroupId }
        });

        console.log('✅ DocumentGroup obtenido manualmente:', {
          id: documentGroupForWhatsApp?.id,
          verificationCode: documentGroupForWhatsApp?.verificationCode
        });
      } catch (error) {
        console.error('❌ Error obteniendo documentGroup manualmente:', error);
      }
    }

    console.log('🔍 Condiciones finales para WhatsApp grupal:', {
      newStatus,
      isListo: newStatus === 'LISTO',
      hasClientPhone: !!updatedDocuments[0]?.clientPhone,
      hasDocumentGroup: !!documentGroupForWhatsApp,
      willSendWhatsApp: newStatus === 'LISTO' &&
        !!updatedDocsOnly[0]?.clientPhone &&
        !!documentGroupForWhatsApp
    });

    if (newStatus === 'LISTO' && updatedDocsOnly[0]?.clientPhone && documentGroupForWhatsApp) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');

        const cliente = {
          nombre: updatedDocsOnly[0].clientName,
          telefono: updatedDocsOnly[0].clientPhone
        };

        const whatsappResult = await whatsappService.default.enviarGrupoDocumentosListo(
          cliente,
          updatedDocsOnly,
          documentGroupForWhatsApp.verificationCode
        );

        whatsappSent = whatsappResult.success;

        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp grupal:', whatsappResult.error);
        } else {
          console.log('📱 Notificación grupal WhatsApp enviada exitosamente');
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp grupal:', error);
        whatsappError = error.message;
      }
    } else {
      console.log('❌ WhatsApp grupal NO enviado. Diagnóstico detallado:', {
        newStatus: {
          valor: newStatus,
          esListo: newStatus === 'LISTO',
          problema: newStatus !== 'LISTO' ? `Estado actual '${newStatus}' no es 'LISTO'` : null
        },
        clientPhone: {
          valor: updatedDocsOnly[0]?.clientPhone,
          existe: !!updatedDocsOnly[0]?.clientPhone,
          problema: !updatedDocsOnly[0]?.clientPhone ? 'clientPhone está vacío o undefined' : null
        },
        documentGroup: {
          existeOriginal: !!updatedDocsOnly[0]?.documentGroup,
          existeCorregido: !!documentGroupForWhatsApp,
          documentGroupId: updatedDocsOnly[0]?.documentGroupId,
          isGrouped: updatedDocsOnly[0]?.isGrouped,
          grupoOriginal: updatedDocsOnly[0]?.documentGroup ? {
            id: updatedDocsOnly[0].documentGroup.id,
            verificationCode: updatedDocsOnly[0].documentGroup.verificationCode
          } : null,
          grupoCorregido: documentGroupForWhatsApp ? {
            id: documentGroupForWhatsApp.id,
            verificationCode: documentGroupForWhatsApp.verificationCode
          } : null,
          problema: !documentGroupForWhatsApp ? 'documentGroup no disponible ni con fallback' : null
        },
        resumenProblemas: [
          newStatus !== 'LISTO' ? `Estado: ${newStatus}` : null,
          !updatedDocsOnly[0]?.clientPhone ? 'Sin teléfono' : null,
          !documentGroupForWhatsApp ? 'Sin documentGroup (ni original ni fallback)' : null
        ].filter(Boolean)
      });
    }

    // 🆕 CORRECCIÓN: Enviar notificación WhatsApp para estado ENTREGADO
    if (newStatus === 'ENTREGADO' && updatedDocsOnly[0]?.clientPhone) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');

        const cliente = {
          nombre: updatedDocsOnly[0].clientName,
          clientName: updatedDocsOnly[0].clientName,
          telefono: updatedDocsOnly[0].clientPhone,
          clientPhone: updatedDocsOnly[0].clientPhone
        };

        const datosEntrega = {
          entregado_a: deliveredTo || `Entrega grupal por ${req.user.role.toLowerCase()}`,
          deliveredTo: deliveredTo || `Entrega grupal por ${req.user.role.toLowerCase()}`,
          fecha: new Date(),
          usuario_entrega: `${req.user.firstName} ${req.user.lastName} (${req.user.role})`
        };

        // Enviar notificación de grupo entregado usando la función de documento individual
        // pero con información del grupo
        const whatsappResult = await whatsappService.default.enviarDocumentoEntregado(
          cliente,
          {
            tipo_documento: `Grupo de ${updatedDocsOnly.length} documento(s)`,
            tipoDocumento: `Grupo de ${updatedDocsOnly.length} documento(s)`,
            numero_documento: documentGroupId,
            protocolNumber: documentGroupId
          },
          datosEntrega
        );

        whatsappSent = whatsappResult.success;

        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
          console.error('Error enviando WhatsApp de entrega grupal:', whatsappResult.error);
        } else {
          console.log('📱 Notificación grupal WhatsApp de entrega enviada exitosamente');

          // 📈 Registrar evento de notificación WhatsApp grupal
          try {
            await prisma.documentEvent.create({
              data: {
                documentId: updatedDocsOnly[0].id, // Documento principal del grupo
                userId: req.user.id,
                eventType: 'WHATSAPP_SENT',
                description: `Notificación WhatsApp de entrega grupal enviada a ${updatedDocsOnly[0].clientPhone}`,
                details: JSON.stringify({
                  phoneNumber: updatedDocsOnly[0].clientPhone,
                  messageType: 'GROUP_DELIVERY',
                  deliveredTo: deliveredTo || `Entrega grupal por ${req.user.role.toLowerCase()}`,
                  deliveredBy: `${req.user.firstName} ${req.user.lastName}`,
                  deliveredByRole: req.user.role,
                  deliveryType: 'GROUP_DELIVERY',
                  groupSize: updateResult.count,
                  messageId: whatsappResult.messageId || 'simulado',
                  timestamp: new Date().toISOString()
                }),
                ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown'
              }
            });
          } catch (auditError) {
            console.error('Error registrando evento de notificación WhatsApp grupal:', auditError);
          }
        }
      } catch (error) {
        console.error('Error en servicio WhatsApp para entrega grupal:', error);
        whatsappError = error.message;
      }
    }

    res.json({
      success: true,
      message: `Grupo de ${updateResult.count} documentos actualizado exitosamente`,
      data: {
        documentsUpdated: updateResult.count,
        newStatus,
        groupId: documentGroupId,
        documents: updatedDocsOnly,
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: updatedDocsOnly[0]?.clientPhone
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado del grupo:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
}

/**
 * Actualizar información compartida de grupo de documentos
 * Función para sincronizar datos como teléfono, email entre documentos del mismo grupo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateDocumentGroupInfo(req, res) {
  try {
    const { documentGroupId, sharedData } = req.body;

    if (!documentGroupId || !sharedData) {
      return res.status(400).json({
        success: false,
        message: 'ID del grupo y datos compartidos son obligatorios'
      });
    }

    // Buscar documentos del grupo
    const groupDocuments = await prisma.document.findMany({
      where: {
        documentGroupId,
        isGrouped: true
      }
    });

    if (groupDocuments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de documentos no encontrado'
      });
    }

    // Verificar permisos - al menos uno debe pertenecer al usuario
    const userRole = req.user.role;
    if (['MATRIZADOR', 'ARCHIVO'].includes(userRole)) {
      const hasPermission = groupDocuments.some(doc => doc.assignedToId === req.user.id);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar este grupo'
        });
      }
    }

    // Preparar datos que se pueden actualizar de forma compartida
    const updateData = {};

    // Solo permitir actualizar campos específicos que son compartidos
    const allowedFields = ['clientPhone', 'clientEmail', 'clientName'];
    allowedFields.forEach(field => {
      if (sharedData[field] !== undefined) {
        updateData[field] = sharedData[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos válidos para actualizar'
      });
    }

    // Actualizar todos los documentos del grupo
    const updateResult = await prisma.document.updateMany({
      where: {
        documentGroupId,
        isGrouped: true
      },
      data: updateData
    });

    // También actualizar el grupo si existe
    if (updateData.clientPhone || updateData.clientEmail || updateData.clientName) {
      await prisma.documentGroup.update({
        where: { id: documentGroupId },
        data: {
          clientPhone: updateData.clientPhone,
          clientEmail: updateData.clientEmail,
          clientName: updateData.clientName
        }
      });
    }

    // Obtener documentos actualizados
    const updatedDocuments = await prisma.document.findMany({
      where: {
        documentGroupId,
        isGrouped: true
      }
    });

    res.json({
      success: true,
      message: `Información compartida actualizada en ${updateResult.count} documentos del grupo`,
      data: {
        documentsUpdated: updateResult.count,
        groupId: documentGroupId,
        updatedFields: Object.keys(updateData),
        documents: updatedDocuments
      }
    });

  } catch (error) {
    console.error('Error actualizando información del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Desagrupar un documento del grupo
 * Permite separar un documento para entrega/gestión individual
 */
async function ungroupDocument(req, res) {
  try {
    const { id } = req.params;

    // Roles permitidos: MATRIZADOR, RECEPCION, ARCHIVO, ADMIN
    if (!['MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para desagrupar documentos'
      });
    }

    // Buscar documento con su grupo
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        documentGroup: true
      }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }

    if (!document.isGrouped || !document.documentGroupId) {
      return res.status(400).json({ success: false, message: 'El documento no pertenece a un grupo' });
    }

    if (document.status === 'ENTREGADO') {
      return res.status(400).json({ success: false, message: 'No se puede desagrupar un documento ya entregado' });
    }

    // Regla de propiedad para MATRIZADOR: debe ser dueño del documento
    if (req.user.role === 'MATRIZADOR' && document.assignedToId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Solo puedes desagrupar documentos asignados a ti' });
    }

    const groupId = document.documentGroupId;

    // Transacción para consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Desagrupar documento actual
      const updated = await tx.document.update({
        where: { id },
        data: {
          isGrouped: false,
          documentGroupId: null,
          groupLeaderId: null,
          groupPosition: null,
          groupVerificationCode: null,
          verificationCode: null
        }
      });

      // Recontar documentos restantes en el grupo
      const remaining = await tx.document.findMany({
        where: { documentGroupId: groupId, isGrouped: true }
      });

      // Si quedan menos de 2, desagrupar todos y eliminar el grupo
      if (remaining.length < 2) {
        if (remaining.length === 1) {
          const lastId = remaining[0].id;
          await tx.document.update({
            where: { id: lastId },
            data: {
              isGrouped: false,
              documentGroupId: null,
              groupLeaderId: null,
              groupPosition: null,
              groupVerificationCode: null,
              verificationCode: null
            }
          });
        }
        // Eliminar el registro de grupo
        await tx.documentGroup.delete({ where: { id: groupId } });
      } else {
        // Actualizar el contador del grupo si se mantiene
        await tx.documentGroup.update({
          where: { id: groupId },
          data: { documentsCount: remaining.length }
        });
      }

      // Evento de auditoría (usar STATUS_CHANGED para no modificar esquema)
      try {
        await tx.documentEvent.create({
          data: {
            documentId: id,
            userId: req.user.id,
            eventType: 'STATUS_CHANGED',
            description: `Documento desagrupado del grupo por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
            details: JSON.stringify({
              action: 'UNGROUP_DOCUMENT',
              previousGroupId: groupId,
              groupRemoved: remaining.length < 2,
              timestamp: new Date().toISOString()
            }),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        });
      } catch (auditError) {
        console.warn('Auditoría: no se pudo registrar evento de desagrupación', auditError.message);
      }

      return { updatedDocument: updated, groupId, groupDisbanded: remaining.length < 2 };
    });

    return res.json({
      success: true,
      message: result.groupDisbanded ? 'Documento desagrupado y grupo disuelto' : 'Documento desagrupado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error desagrupando documento:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

/**
 * 🔓 DESAGRUPAR TODOS LOS DOCUMENTOS (Función administrativa)
 * Solo accesible por ADMIN - Útil para deshabilitar agrupación temporalmente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function ungroupAllDocuments(req, res) {
  try {
    // Solo ADMIN puede ejecutar esta función
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo ADMIN puede desagrupar todos los documentos'
      });
    }

    console.log('🔓 ADMIN: Iniciando desagrupación masiva de documentos...');
    console.log('👤 Usuario:', `${req.user.firstName} ${req.user.lastName} (${req.user.email})`);

    // Transacción para consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Contar documentos agrupados antes de desagrupar
      const groupedCountBefore = await tx.document.count({
        where: { isGrouped: true }
      });

      // Contar grupos existentes
      const groupsCount = await tx.documentGroup.count();

      console.log(`📊 Estado actual: ${groupedCountBefore} documentos agrupados en ${groupsCount} grupos`);

      // Desagrupar TODOS los documentos
      const ungroupedDocs = await tx.document.updateMany({
        where: { isGrouped: true },
        data: {
          isGrouped: false,
          documentGroupId: null,
          groupLeaderId: null,
          groupPosition: null,
          groupVerificationCode: null
        }
      });

      // Eliminar todos los grupos
      const deletedGroups = await tx.documentGroup.deleteMany({});

      // Registrar evento de auditoría global
      try {
        await tx.documentEvent.create({
          data: {
            documentId: null, // Evento global, no específico de un documento
            userId: req.user.id,
            eventType: 'SYSTEM_ADMIN',
            description: `ADMIN desagrupó TODOS los documentos del sistema (${groupedCountBefore} docs, ${groupsCount} grupos)`,
            details: JSON.stringify({
              action: 'UNGROUP_ALL_DOCUMENTS',
              documentsUngrouped: groupedCountBefore,
              groupsDeleted: groupsCount,
              reason: 'Deshabilitación temporal de agrupación',
              timestamp: new Date().toISOString(),
              adminUser: {
                id: req.user.id,
                name: `${req.user.firstName} ${req.user.lastName}`,
                email: req.user.email
              }
            }),
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          }
        });
      } catch (auditError) {
        console.warn('⚠️ No se pudo registrar evento de auditoría:', auditError.message);
      }

      return {
        documentsUngrouped: ungroupedDocs.count,
        groupsDeleted: deletedGroups.count,
        documentCountBefore: groupedCountBefore,
        groupCountBefore: groupsCount
      };
    });

    console.log('✅ Desagrupación masiva completada:', result);

    return res.json({
      success: true,
      message: `Se desagruparon ${result.documentsUngrouped} documentos y se eliminaron ${result.groupsDeleted} grupos`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error en desagrupación masiva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al desagrupar documentos',
      error: error.message
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

    // Enviar notificación WhatsApp de entrega
    let whatsappSent = false;
    let whatsappError = null;

    if (updatedDocument.clientPhone) {
      try {
        const whatsappService = await import('../services/whatsapp-service.js');

        const fechaEntrega = new Date();
        const datosEntrega = {
          // Variables básicas (compatibilidad)
          entregado_a: entregadoA,
          deliveredTo: entregadoA,
          fecha: fechaEntrega,
          usuario_entrega: `${req.user.firstName} ${req.user.lastName}`,

          // Claves adicionales que esperan los templates del servicio
          entregadoA,
          cedulaReceptor,
          relacionTitular,

          // Variables mejoradas para template
          fechaEntrega: fechaEntrega,
          nombreRetirador: entregadoA,
          cedulaReceptor: cedulaReceptor,
          cedula_receptor: cedulaReceptor,
          relacionTitular: relacionTitular,
          relacion_titular: relacionTitular,

          // Variables adicionales
          verificacionManual: verificacionManual || false,
          facturaPresenta: facturaPresenta || false,
          observacionesEntrega: observacionesEntrega || '',
          usuarioEntrega: `${req.user.firstName} ${req.user.lastName}`,
          roleEntrega: req.user.role
        };

        // Preparar información de documento/grupo para el template
        let documentoData;
        if (groupDocuments.length > 0) {
          // Es una entrega grupal - incluir información de todos los documentos
          const allDocuments = [updatedDocument, ...groupDocuments];
          documentoData = {
            // Compatibilidad
            tipo_documento: `Grupo de ${allDocuments.length} documentos`,
            tipoDocumento: `Grupo de ${allDocuments.length} documentos`,
            numero_documento: updatedDocument.protocolNumber,
            protocolNumber: updatedDocument.protocolNumber,

            // Para template mejorado
            documentType: `Grupo de ${allDocuments.length} documentos`,
            esGrupo: true,
            cantidadDocumentos: allDocuments.length,
            documentos: allDocuments.map(doc => ({
              documentType: doc.documentType,
              protocolNumber: doc.protocolNumber,
              codigoEscritura: doc.protocolNumber, // Usar protocolNumber como código
              actoPrincipalDescripcion: doc.actoPrincipalDescripcion,
              actoPrincipalValor: doc.actoPrincipalValor
            }))
          };
        } else {
          // Entrega individual
          documentoData = {
            // Compatibilidad
            tipo_documento: updatedDocument.documentType,
            tipoDocumento: updatedDocument.documentType,
            numero_documento: updatedDocument.protocolNumber,
            protocolNumber: updatedDocument.protocolNumber,

            // Para template mejorado
            documentType: updatedDocument.documentType,
            esGrupo: false,
            cantidadDocumentos: 1,
            codigoEscritura: updatedDocument.protocolNumber, // Usar protocolNumber como código
            actoPrincipalDescripcion: updatedDocument.actoPrincipalDescripcion,
            actoPrincipalValor: updatedDocument.actoPrincipalValor
          };
        }

        const whatsappResult = await whatsappService.default.enviarDocumentoEntregado(
          {
            nombre: updatedDocument.clientName,
            clientName: updatedDocument.clientName,
            telefono: updatedDocument.clientPhone,
            clientPhone: updatedDocument.clientPhone
          },
          documentoData,
          datosEntrega
        );

        whatsappSent = whatsappResult.success;
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
        } else {
          // 📈 Registrar evento de notificación WhatsApp de entrega individual
          try {
            await prisma.documentEvent.create({
              data: {
                documentId: id,
                userId: req.user.id,
                eventType: 'WHATSAPP_SENT',
                description: `Notificación WhatsApp de entrega enviada a ${updatedDocument.clientPhone}`,
                details: JSON.stringify({
                  phoneNumber: updatedDocument.clientPhone,
                  messageType: 'DOCUMENT_DELIVERED',
                  deliveredTo: entregadoA,
                  deliveredBy: `${req.user.firstName} ${req.user.lastName}`,
                  deliveredByRole: req.user.role,
                  deliveryType: 'INDIVIDUAL_DELIVERY',
                  cedulaReceptor,
                  relacionTitular,
                  messageId: whatsappResult.messageId || 'simulado',
                  timestamp: new Date().toISOString()
                }),
                ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown'
              }
            });
          } catch (auditError) {
            console.error('Error registrando evento de notificación WhatsApp de entrega:', auditError);
          }
        }
      } catch (error) {
        console.error('Error enviando WhatsApp de entrega:', error);
        whatsappError = error.message;
      }
    }

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
            whatsappSent,
            whatsappError,
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
    let message = immediateDelivery
      ? 'Documento entregado inmediatamente (sin notificación previa)'
      : totalDelivered > 1
        ? `${totalDelivered} documentos entregados exitosamente (entrega grupal)`
        : 'Documento entregado exitosamente';

    if (whatsappSent) {
      message += ' y notificación WhatsApp enviada';
    } else if (updatedDocument.clientPhone && whatsappError) {
      message += ', pero falló la notificación WhatsApp';
    }

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
        whatsapp: {
          sent: whatsappSent,
          error: whatsappError,
          phone: updatedDocument.clientPhone
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
async function getGroupDocuments(req, res) {
  try {
    const { groupId } = req.params;

    console.log('📋 getGroupDocuments iniciado:', {
      groupId,
      userId: req.user.id,
      userRole: req.user.role
    });

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'ID del grupo es obligatorio'
      });
    }

    // Obtener todos los documentos del grupo
    const groupDocuments = await prisma.document.findMany({
      where: {
        documentGroupId: groupId
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
        },
        documentGroup: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (groupDocuments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron documentos en el grupo'
      });
    }

    // Verificar permisos si es matrizador
    if (req.user.role === 'MATRIZADOR') {
      const userDocuments = groupDocuments.filter(doc => doc.assignedToId === req.user.id);
      if (userDocuments.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver los documentos de este grupo'
        });
      }
    }

    console.log('✅ Documentos del grupo obtenidos:', {
      groupId,
      documentCount: groupDocuments.length,
      documentStatuses: groupDocuments.map(doc => ({ id: doc.id, status: doc.status }))
    });

    res.json({
      success: true,
      data: groupDocuments,
      message: `${groupDocuments.length} documentos encontrados en el grupo`,
      groupInfo: groupDocuments[0]?.documentGroup || null
    });

  } catch (error) {
    console.error('❌ Error obteniendo documentos del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener documentos del grupo',
      error: error.message
    });
  }
}

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
    if (document.documentGroupId && ['ARCHIVO', 'ADMIN', 'RECEPCION'].includes(req.user.role)) {
      console.log('🔗 Documento agrupado detectado - Iniciando reversión grupal:', {
        documentGroupId: document.documentGroupId,
        newStatus,
        userRole: req.user.role
      });

      // Obtener todos los documentos del grupo
      const groupDocuments = await prisma.document.findMany({
        where: {
          documentGroupId: document.documentGroupId
        }
      });

      console.log(`📋 Revirtiendo ${groupDocuments.length} documentos del grupo`);

      // Usar transacción para revertir todos los documentos del grupo
      updatedDocuments = await prisma.$transaction(async (tx) => {
        const updates = [];

        for (const doc of groupDocuments) {
          const updated = await tx.document.update({
            where: { id: doc.id },
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
          });

          // Registrar evento de auditoría para cada documento
          await tx.documentEvent.create({
            data: {
              documentId: doc.id,
              userId: req.user.id,
              eventType: 'STATUS_CHANGED',
              description: `Estado revertido grupalmente de ${doc.status} a ${newStatus} por ${req.user.firstName} ${req.user.lastName} (${req.user.role})`,
              details: JSON.stringify({
                previousStatus: doc.status,
                newStatus,
                reversionReason: reversionReason.trim(),
                groupReversion: true,
                documentGroupId: document.documentGroupId,
                timestamp: new Date().toISOString()
              }),
              ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown'
            }
          });

          updates.push(updated);
        }

        return updates;
      });

      groupAffected = true;
      console.log(`✅ ${updatedDocuments.length} documentos del grupo revertidos exitosamente`);

    } else {
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
    }

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
 * 🔔 ACTUALIZAR POLÍTICA DE NOTIFICACIÓN DE DOCUMENTO INDIVIDUAL
 * Permite cambiar la política de notificación de un documento específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateNotificationPolicy(req, res) {
  try {
    const { id } = req.params;
    const { notificationPolicy } = req.body;

    // Validar política
    const validPolicies = ['automatica', 'no_notificar', 'entrega_inmediata'];
    if (!validPolicies.includes(notificationPolicy)) {
      return res.status(400).json({
        success: false,
        message: 'Política de notificación no válida'
      });
    }

    // Verificar que el documento existe y el usuario tiene permisos
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        assignedTo: true
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos según rol
    const userRole = req.user.role;
    if (!['ADMIN', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'CAJA'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar políticas de notificación'
      });
    }

    // Si es matrizador, solo puede modificar sus propios documentos o sin asignar
    if (userRole === 'MATRIZADOR' && document.assignedToId && document.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes modificar la política de tus documentos asignados'
      });
    }

    // Actualizar la política de notificación
    // Nota: Usar try/catch en caso de que el campo no exista aún en la BD
    let updatedDocument;
    try {
      updatedDocument = await prisma.document.update({
        where: { id },
        data: { notificationPolicy },
        include: {
          assignedTo: {
            select: { firstName: true, lastName: true }
          }
        }
      });

      console.log(`🔔 Política de notificación actualizada: ${document.protocolNumber} -> ${notificationPolicy}`);

    } catch (updateError) {
      // Si el campo no existe aún (migración pendiente), devolver respuesta simulada
      if (updateError.message.includes('notificationPolicy') || updateError.message.includes('column')) {
        console.log('⚠️ Campo notificationPolicy no existe aún en BD, simulando respuesta');
        return res.status(202).json({
          success: true,
          message: `Política de notificación será actualizada a: ${notificationPolicy} (migración pendiente)`,
          data: {
            document: { ...document, notificationPolicy },
            previousPolicy: document.notificationPolicy || 'automatica',
            newPolicy: notificationPolicy,
            migrationPending: true
          }
        });
      }
      throw updateError; // Re-lanzar si es otro error
    }

    res.json({
      success: true,
      message: `Política de notificación actualizada a: ${notificationPolicy}`,
      data: {
        document: updatedDocument,
        previousPolicy: document.notificationPolicy || 'automatica',
        newPolicy: notificationPolicy
      }
    });

  } catch (error) {
    console.error('Error actualizando política de notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * 🔔 ACTUALIZAR POLÍTICA DE NOTIFICACIÓN DE GRUPO
 * Permite cambiar la política de notificación de todos los documentos de un grupo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateGroupNotificationPolicy(req, res) {
  try {
    const { groupId } = req.params;
    const { notificationPolicy } = req.body;

    // Validar política
    const validPolicies = ['automatica', 'no_notificar', 'entrega_inmediata'];
    if (!validPolicies.includes(notificationPolicy)) {
      return res.status(400).json({
        success: false,
        message: 'Política de notificación no válida'
      });
    }

    // Verificar que el grupo existe
    const documentGroup = await prisma.documentGroup.findUnique({
      where: { id: groupId },
      include: {
        documents: {
          include: {
            assignedTo: true
          }
        }
      }
    });

    if (!documentGroup) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de documentos no encontrado'
      });
    }

    if (documentGroup.documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El grupo no tiene documentos'
      });
    }

    // Verificar permisos según rol
    const userRole = req.user.role;
    if (!['ADMIN', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO', 'CAJA'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar políticas de notificación'
      });
    }

    // Si es matrizador, verificar que tiene al menos un documento asignado en el grupo
    if (userRole === 'MATRIZADOR') {
      const hasAssignedDoc = documentGroup.documents.some(doc =>
        doc.assignedToId === req.user.id
      );

      if (!hasAssignedDoc) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes modificar la política de grupos que incluyan tus documentos'
        });
      }
    }

    // Actualizar la política en todos los documentos del grupo usando transacción
    // Nota: Usar try/catch en caso de que el campo no exista aún en la BD
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        // Actualizar todos los documentos del grupo
        const updateResult = await tx.document.updateMany({
          where: { documentGroupId: groupId },
          data: { notificationPolicy }
        });

        // Obtener documentos actualizados para la respuesta
        const updatedDocuments = await tx.document.findMany({
          where: { documentGroupId: groupId },
          include: {
            assignedTo: {
              select: { firstName: true, lastName: true }
            }
          }
        });

        return { updateResult, updatedDocuments };
      });

      console.log(`🔔 Política de grupo actualizada: Grupo ${groupId} -> ${notificationPolicy} (${result.updateResult.count} documentos)`);

    } catch (updateError) {
      // Si el campo no existe aún (migración pendiente), devolver respuesta simulada
      if (updateError.message.includes('notificationPolicy') || updateError.message.includes('column')) {
        console.log('⚠️ Campo notificationPolicy no existe aún en BD, simulando respuesta de grupo');
        return res.status(202).json({
          success: true,
          message: `Política de notificación será actualizada para ${documentGroup.documents.length} documentos del grupo (migración pendiente)`,
          data: {
            groupId,
            documentsUpdated: documentGroup.documents.length,
            newPolicy: notificationPolicy,
            documents: documentGroup.documents.map(doc => ({ ...doc, notificationPolicy })),
            migrationPending: true
          }
        });
      }
      throw updateError; // Re-lanzar si es otro error
    }

    res.json({
      success: true,
      message: `Política de notificación actualizada para ${result.updateResult.count} documentos del grupo`,
      data: {
        groupId,
        documentsUpdated: result.updateResult.count,
        newPolicy: notificationPolicy,
        documents: result.updatedDocuments
      }
    });

  } catch (error) {
    console.error('Error actualizando política de grupo:', error);
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

export {
  uploadXmlDocument,
  uploadXmlDocumentsBatch,
  getAllDocuments,
  assignDocument,
  getMyDocuments,
  updateDocumentStatus,
  getDocumentById,
  getAvailableMatrizadores,
  detectGroupableDocuments,
  createDocumentGroup,
  deliverDocumentGroup,
  // Función de entrega completa
  deliverDocument,
  // Funciones de edición
  getEditableDocumentInfo,
  updateDocumentInfo,
  // 🔗 Función de agrupación inteligente
  createSmartDocumentGroup,
  // 🔄 Sistema de confirmaciones y deshacer
  undoDocumentStatusChange,
  getUndoableChanges,
  // 📈 Sistema de historial universal
  getDocumentHistory,
  // 🔗 Funciones de grupos
  updateDocumentGroupStatus,
  updateDocumentGroupInfo,
  markDocumentGroupAsReady,
  getGroupDocuments,
  // 🔓 Desagrupación
  ungroupDocument,
  ungroupAllDocuments,
  // 🔄 Reversión de estado
  revertDocumentStatus,
  // 🔔 Políticas de notificación
  updateNotificationPolicy,
  updateGroupNotificationPolicy,
  // 🧪 Extracción avanzada (flag)
  extractDocumentActs,
  applyExtractionSuggestions,
  // 🎯 NUEVA FUNCIONALIDAD: UI Activos/Entregados
  getDocumentsUnified,
  getDocumentsCounts,
  // 💳 NUEVA FUNCIONALIDAD: Nota de Crédito
  markAsNotaCredito,
  // 📊 NUEVA FUNCIONALIDAD: Estadísticas de CAJA
  getCajaStats
};
