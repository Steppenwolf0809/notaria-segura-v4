import { getPrismaClient } from '../db.js';
import { Prisma } from '@prisma/client';
import { getReversionCleanupData, isValidStatus, isReversion as isReversionFn, STATUS_ORDER_LIST } from '../utils/status-transitions.js';
import logger from '../utils/logger.js';
import { buildInvoiceNumberVariants } from '../utils/billing-utils.js';
import { withRequestTenantContext } from '../utils/tenant-context.js';

const prisma = getPrismaClient();

import CodigoRetiroService from '../utils/codigo-retiro.js';
import AlertasService from '../services/alertas-service.js';
import cache from '../services/cache-service.js';

// Cache simple para soporte de unaccent
let UNACCENT_SUPPORTED = null;
async function supportsUnaccentFn() {
  if (UNACCENT_SUPPORTED !== null) return UNACCENT_SUPPORTED;
  try {
    await prisma.$queryRaw`SELECT unaccent('áéíóúÁÉÍÓÚ')`;
    UNACCENT_SUPPORTED = true;
  } catch (e) {
    logger.warn('Extensión unaccent no disponible. Búsqueda acento-insensible desactivada.');
    UNACCENT_SUPPORTED = false;
  }
  return UNACCENT_SUPPORTED;
}

function extractInvoiceSequential(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  const lastPart = parts[parts.length - 1] || '';
  return lastPart.replace(/^0+/, '') || '0';
}

function normalizeTaxId(value) {
  return String(value || '').replace(/\D/g, '').trim();
}

function pickInvoiceCandidateForDocument(candidates, doc) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const docProtocol = String(doc.protocolNumber || '').trim();
  const docVariants = new Set(buildInvoiceNumberVariants(String(doc.numeroFactura || '')));
  const docSequential = extractInvoiceSequential(doc.numeroFactura);
  const docTaxId = normalizeTaxId(doc.clientId);

  const byProtocol = docProtocol
    ? candidates.filter((inv) => String(inv.numeroProtocolo || '').trim() === docProtocol)
    : [];
  if (byProtocol.length === 1) return byProtocol[0];

  const byExactNumber = docVariants.size > 0
    ? candidates.filter((inv) => docVariants.has(inv.invoiceNumber) || docVariants.has(inv.invoiceNumberRaw))
    : [];
  if (byExactNumber.length === 1) return byExactNumber[0];

  const bySequential = (docSequential && docSequential.length >= 5)
    ? candidates.filter((inv) => extractInvoiceSequential(inv.invoiceNumberRaw || inv.invoiceNumber) === docSequential)
    : [];
  if (bySequential.length === 1) return bySequential[0];

  if (docTaxId) {
    const exactByTaxId = byExactNumber.filter((inv) => normalizeTaxId(inv.clientTaxId) === docTaxId);
    if (exactByTaxId.length === 1) return exactByTaxId[0];

    const sequentialByTaxId = bySequential.filter((inv) => normalizeTaxId(inv.clientTaxId) === docTaxId);
    if (sequentialByTaxId.length === 1) return sequentialByTaxId[0];
  }

  return null;
}

function summarizeDocumentPayment(doc, docInvoices) {
  let paymentStatus = 'SIN_FACTURA';
  let paymentInfo = null;
  let computedFechaFactura = doc.fechaFactura || null;
  let computedNumeroFactura = doc.numeroFactura || null;

  if (docInvoices.length > 0) {
    const totalFacturado = docInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalPagado = docInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const saldoPendiente = totalFacturado - totalPagado;

    if (saldoPendiente <= 0) {
      paymentStatus = 'PAGADO';
    } else if (totalPagado > 0) {
      paymentStatus = 'PARCIAL';
    } else {
      paymentStatus = 'PENDIENTE';
    }

    paymentInfo = { totalFacturado, totalPagado, saldoPendiente, facturas: docInvoices.length };

    if (!computedFechaFactura) {
      const byDateAsc = [...docInvoices]
        .filter(inv => inv.issueDate)
        .sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
      computedFechaFactura = byDateAsc[0]?.issueDate || null;
    }
    if (!computedNumeroFactura) {
      computedNumeroFactura = docInvoices[0]?.invoiceNumberRaw || docInvoices[0]?.invoiceNumber || null;
    }
  }

  return {
    paymentStatus,
    paymentInfo,
    computedFechaFactura,
    computedNumeroFactura
  };
}

async function autoHealInvoiceLinks(documents, invoicesMap, dbClient = prisma) {
  if (!Array.isArray(documents) || documents.length === 0) return;

  const reservedInvoiceIds = new Set();
  const docsToHeal = documents.filter((doc) => {
    const hasInvoices = (invoicesMap.get(doc.id) || []).length > 0;
    return !hasInvoices && (doc.numeroFactura || doc.protocolNumber);
  });

  for (const doc of docsToHeal) {
    const variants = buildInvoiceNumberVariants(String(doc.numeroFactura || ''));
    const sequential = extractInvoiceSequential(doc.numeroFactura);
    const orClauses = [];

    if (variants.length > 0) {
      orClauses.push({ invoiceNumber: { in: variants } });
      orClauses.push({ invoiceNumberRaw: { in: variants } });
    }

    if (sequential && sequential.length >= 5) {
      orClauses.push({ invoiceNumber: { endsWith: sequential } });
      orClauses.push({ invoiceNumberRaw: { endsWith: sequential } });
    }

    if (doc.protocolNumber) {
      orClauses.push({ numeroProtocolo: doc.protocolNumber });
    }

    if (orClauses.length === 0) continue;

    const candidates = await dbClient.invoice.findMany({
      where: {
        AND: [
          { OR: orClauses },
          { OR: [{ documentId: null }, { documentId: doc.id }] }
        ]
      },
      select: {
        id: true,
        documentId: true,
        invoiceNumber: true,
        invoiceNumberRaw: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        issueDate: true,
        clientTaxId: true,
        numeroProtocolo: true
      },
      orderBy: { issueDate: 'desc' },
      take: 10
    });

    if (candidates.length === 0) continue;

    const candidate = pickInvoiceCandidateForDocument(candidates, doc);
    if (!candidate || reservedInvoiceIds.has(candidate.id)) continue;
    reservedInvoiceIds.add(candidate.id);

    if (!candidate.documentId) {
      await dbClient.invoice.update({
        where: { id: candidate.id },
        data: { documentId: doc.id }
      });

      const patch = {};
      if (!doc.numeroFactura) patch.numeroFactura = candidate.invoiceNumberRaw || candidate.invoiceNumber;
      if (!doc.fechaFactura && candidate.issueDate) patch.fechaFactura = candidate.issueDate;
      if (Object.keys(patch).length > 0) {
        await dbClient.document.update({ where: { id: doc.id }, data: patch });
      }

      logger.warn(`[reception] Auto-healing invoice link: doc=${doc.id}, invoice=${candidate.invoiceNumberRaw || candidate.invoiceNumber}`);
    }

    if (!invoicesMap.has(doc.id)) invoicesMap.set(doc.id, []);
    invoicesMap.get(doc.id).push({
      documentId: doc.id,
      totalAmount: candidate.totalAmount,
      paidAmount: candidate.paidAmount,
      status: candidate.status,
      issueDate: candidate.issueDate,
      invoiceNumber: candidate.invoiceNumber,
      invoiceNumberRaw: candidate.invoiceNumberRaw
    });
  }
}

async function getDashboardStats(req, res) {
  try {
    const result = await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
      // 🔄 CONSERVADOR: Estadísticas básicas para dashboard de recepción
      // 🔥 EXCLUYE Notas de Crédito de todas las estadísticas
      const baseFilter = { status: { not: 'ANULADO_NOTA_CREDITO' } };

      // Fechas de referencia
      const now = new Date();
      const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const hace7Dias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const hace15Dias = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const hace3Dias = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const inicioSemana = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = await Promise.all([
        // Total de documentos (sin NC)
        tx.document.count({ where: { status: { not: 'ANULADO_NOTA_CREDITO' } } }),
        // Documentos en proceso
        tx.document.count({ where: { status: 'EN_PROCESO' } }),
        // Documentos listos para entrega
        tx.document.count({ where: { status: 'LISTO' } }),
        // Documentos entregados
        tx.document.count({ where: { status: 'ENTREGADO' } }),
        // Documentos creados hoy (sin NC)
        tx.document.count({
          where: {
            status: { not: 'ANULADO_NOTA_CREDITO' },
            createdAt: {
              gte: hoy
            }
          }
        }),
        // Documentos entregados hoy
        tx.document.count({
          where: {
            status: 'ENTREGADO',
            fechaEntrega: {
              gte: hoy
            }
          }
        }),
        // 📊 MÉTRICAS AVANZADAS
        // Documentos no retirados hace más de 7 días
        tx.document.count({
          where: {
            status: 'LISTO',
            updatedAt: {
              lt: hace7Dias
            }
          }
        }),
        // Documentos no retirados hace más de 15 días
        tx.document.count({
          where: {
            status: 'LISTO',
            updatedAt: {
              lt: hace15Dias
            }
          }
        }),
        // Documentos atrasados en proceso (más de 3 días)
        tx.document.count({
          where: {
            status: 'EN_PROCESO',
            createdAt: {
              lt: hace3Dias
            }
          }
        }),
        // Documentos entregados esta semana
        tx.document.count({
          where: {
            status: 'ENTREGADO',
            fechaEntrega: {
              gte: inicioSemana
            }
          }
        }),
        // Grupos de documentos listos (contar códigos únicos en documentos LISTO)
        tx.document.groupBy({
          by: ['codigoRetiro'],
          where: {
            status: 'LISTO',
            codigoRetiro: { not: null }
          },
          _count: true
        })
      ]);

      const [
        total,
        enProceso,
        listos,
        entregados,
        creadosHoy,
        entregadosHoy,
        noRetirados7Dias,
        noRetirados15Dias,
        atrasados3Dias,
        entregadosSemana,
        gruposListosData
      ] = stats;

      // Contar grupos únicos
      const gruposListos = gruposListosData.length;

      // Calcular tiempo promedio de entrega (documentos entregados en la última semana)
      // Nota: El filtro gte ya excluye valores null, no es necesario agregar isNot: null
      const documentosEntregadosRecientes = await tx.document.findMany({
        where: {
          status: 'ENTREGADO',
          fechaEntrega: {
            gte: inicioSemana
          }
        },
        select: {
          createdAt: true,
          fechaEntrega: true
        }
      });

      let tiempoPromedioEntregaDias = 0;
      if (documentosEntregadosRecientes.length > 0) {
        const tiemposTotales = documentosEntregadosRecientes.reduce((sum, doc) => {
          const diff = new Date(doc.fechaEntrega).getTime() - new Date(doc.createdAt).getTime();
          const dias = diff / (1000 * 60 * 60 * 24);
          return sum + dias;
        }, 0);
        tiempoPromedioEntregaDias = parseFloat((tiemposTotales / documentosEntregadosRecientes.length).toFixed(1));
      }

      // Calcular tasa de retiro (documentos entregados vs listos en la semana)
      const totalActivosSemana = listos + entregadosSemana;
      const tasaRetiroPorcentaje = totalActivosSemana > 0
        ? Math.round((entregadosSemana / totalActivosSemana) * 100)
        : 100;

      return {
        total,
        enProceso,
        listos,
        entregados,
        creadosHoy,
        entregadosHoy,
        entregadosSemana,
        gruposListos,
        noRetirados7Dias,
        noRetirados15Dias,
        atrasados3Dias,
        tiempoPromedioEntregaDias,
        tasaRetiroPorcentaje
      };
    });

    res.json({
      success: true,
      data: {
        stats: {
          // Métricas básicas
          total: result.total,
          documentosEnProceso: result.enProceso,
          documentosListos: result.listos,
          documentosEntregados: result.entregados,
          creadosHoy: result.creadosHoy,
          documentosEntregadosHoy: result.entregadosHoy,
          documentosEntregadosSemana: result.entregadosSemana,
          gruposListos: result.gruposListos,

          // 📊 Métricas avanzadas
          documentosNoRetirados7Dias: result.noRetirados7Dias,
          documentosNoRetirados15Dias: result.noRetirados15Dias,
          documentosAtrasados3Dias: result.atrasados3Dias,
          tiempoPromedioEntregaDias: result.tiempoPromedioEntregaDias,
          tasaRetiroPorcentaje: result.tasaRetiroPorcentaje,

          // Compatibilidad con versión anterior
          enProceso: result.enProceso,
          listos: result.listos,
          entregados: result.entregados,
          entregadosHoy: result.entregadosHoy,
          pendientesEntrega: result.listos,
          eficienciaHoy: result.creadosHoy > 0 ? Math.round((result.entregadosHoy / result.creadosHoy) * 100) : 0
        }
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function getMatrizadores(req, res) {
  try {
    const matrizadores = await prisma.user.findMany({
      where: {
        role: { in: ['MATRIZADOR', 'ARCHIVO'] },
        isActive: true
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: 'asc' }
    });
    res.json({
      success: true,
      data: { matrizadores }
    });
  } catch (error) {
    logger.error('Error obteniendo matrizadores:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function listarTodosDocumentos(req, res) {
  try {
    await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    const { search, matrizador, estado, fechaDesde, fechaHasta, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    // Normalizar y mapear campo de ordenamiento permitido
    const mapSortField = (field) => {
      switch ((field || '').toString()) {
        case 'createdAt':
        case 'fechaCreacion':
          return 'createdAt';
        case 'updatedAt':
          return 'updatedAt';
        case 'clientName':
          return 'clientName';
        case 'protocolNumber':
          return 'protocolNumber';
        case 'documentType':
          return 'documentType';
        case 'status':
          return 'status';
        case 'fechaEntrega':
          return 'fechaEntrega';
        default:
          return 'createdAt';
      }
    };
    const mappedSortField = mapSortField(sortBy);
    const mappedSortOrder = (sortOrder === 'asc') ? 'asc' : 'desc';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    // PostgreSQL - Búsqueda case-insensitive y acento-insensitive (si hay extensión unaccent)
    const searchTerm = (search || '').trim();

    if (matrizador) {
      where.assignedToId = parseInt(matrizador);
    }

    if (estado) {
      where.status = estado;
    }



    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) {
        where.createdAt.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setDate(hasta.getDate() + 1);
        where.createdAt.lt = hasta;
      }
    }
    // Clave de caché (incluye filtros y orden)
    const cacheKey = cache.key({
      scope: 'reception:todos',
      page: parseInt(page),
      limit: take,
      search: searchTerm,
      matrizador: matrizador ? parseInt(matrizador) : null,
      estado,
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      sortBy: mappedSortField,
      sortBy: mappedSortField,
      sortOrder: mappedSortOrder
    });


    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Si hay término de búsqueda, intentar búsqueda acento-insensible con unaccent
    if (searchTerm) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        const pattern = `%${searchTerm}%`;
        // Construir cláusulas adicionales según filtros
        const filterClauses = [];
        if (estado) filterClauses.push(Prisma.sql`d."status"::text = ${estado}`);

        if (matrizador) filterClauses.push(Prisma.sql`d."assignedToId" = ${parseInt(matrizador)}`);
        if (fechaDesde) filterClauses.push(Prisma.sql`d."createdAt" >= ${new Date(fechaDesde)}`);
        if (fechaHasta) {
          const hasta = new Date(fechaHasta); hasta.setDate(hasta.getDate() + 1);
          filterClauses.push(Prisma.sql`d."createdAt" < ${hasta}`);
        }

        let whereSql = Prisma.sql`(
            unaccent(COALESCE(d."clientName", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."clientEmail", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."clientId", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."protocolNumber", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."actoPrincipalDescripcion", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."numeroFactura", '')::text) ILIKE unaccent(${pattern}) OR
            COALESCE(d."clientPhone", '')::text ILIKE ${pattern}
          )`;

        for (const clause of filterClauses) {
          whereSql = Prisma.sql`${whereSql} AND ${clause}`;
        }

        // Preparar ORDER BY seguro (solo campos permitidos) - usar Prisma.raw para strings
        const fieldName = (() => {
          switch (mappedSortField) {
            case 'createdAt': return 'd."createdAt"';
            case 'updatedAt': return 'd."updatedAt"';
            case 'clientName': return 'd."clientName"';
            case 'protocolNumber': return 'd."protocolNumber"';
            case 'documentType': return 'd."documentType"';
            case 'status': return 'd."status"';
            case 'fechaEntrega': return 'd."fechaEntrega"';
            default: return 'd."createdAt"';
          }
        })();
        // Use string for direction since ASC/DESC are safe SQL keywords
        const direction = mappedSortOrder === 'asc' ? 'ASC' : 'DESC';

        const documents = await tx.$queryRaw`
          SELECT d.*, u.id as "_assignedToId", u."firstName" as "_assignedToFirstName", u."lastName" as "_assignedToLastName"
          FROM "documents" d
          LEFT JOIN "users" u ON u.id = d."assignedToId"
          WHERE ${whereSql}
          ORDER BY ${Prisma.raw(fieldName)} ${Prisma.raw(direction)}
          OFFSET ${skip} LIMIT ${take}
        `;
        const countRows = await tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${whereSql}`;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        // 💰 Obtener facturas para los documentos encontrados
        const docIds = documents.map(d => d.id);
        const invoicesMap = new Map();
        if (docIds.length > 0) {
        const invoices = await tx.invoice.findMany({
          where: { documentId: { in: docIds } },
          select: { documentId: true, totalAmount: true, paidAmount: true, status: true, issueDate: true, invoiceNumber: true, invoiceNumberRaw: true }
        });
          invoices.forEach(inv => {
            if (!invoicesMap.has(inv.documentId)) {
              invoicesMap.set(inv.documentId, []);
            }
            invoicesMap.get(inv.documentId).push(inv);
          });
        }

        await autoHealInvoiceLinks(documents, invoicesMap, tx);

        const formattedDocuments = documents.map(doc => {
          // 💰 Calcular estado de pago
          const docInvoices = invoicesMap.get(doc.id) || [];
          const {
            paymentStatus,
            paymentInfo,
            computedFechaFactura,
            computedNumeroFactura
          } = summarizeDocumentPayment(doc, docInvoices);

          return {
            id: doc.id,
            protocolNumber: doc.protocolNumber,
            clientName: doc.clientName,
            clientPhone: doc.clientPhone,
            clientEmail: doc.clientEmail,
            clientId: doc.clientId,
            documentType: doc.documentType,
            status: doc.status,
            matrizador: doc._assignedToFirstName ? `${doc._assignedToFirstName} ${doc._assignedToLastName}` : 'No asignado',
            matrizadorId: doc.assignedToId,
            codigoRetiro: doc.codigoRetiro,
            verificationCode: doc.verificationCode,
            fechaFactura: computedFechaFactura,
            fechaCreacion: doc.createdAt,
            fechaEntrega: doc.fechaEntrega,
            actoPrincipalDescripcion: doc.actoPrincipalDescripcion,
            actoPrincipalValor: doc.totalFactura,
            totalFactura: doc.totalFactura,
            numeroFactura: computedNumeroFactura || doc.numeroFactura || null,
            matrizadorName: doc.matrizadorName,
            detalle_documento: doc.detalle_documento,
            comentarios_recepcion: doc.comentarios_recepcion,
            // 💰 NUEVO: Estado de pago
            paymentStatus,
            paymentInfo
          };
        });

        const totalPages = Math.ceil(total / take);

        // 📊 Calcular estadísticas globales (con búsqueda unaccent)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Construir where clauses para stats
        const statsWhere = (status, includeDate = false) => {
          let sql = Prisma.sql`(
              unaccent(COALESCE(d."clientName", '')::text) ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."clientEmail", '')::text) ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."clientId", '')::text) ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."protocolNumber", '')::text) ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."actoPrincipalDescripcion", '')::text) ILIKE unaccent(${pattern}) OR
              unaccent(COALESCE(d."detalle_documento", '')::text) ILIKE unaccent(${pattern}) OR
              COALESCE(d."clientPhone", '')::text ILIKE ${pattern}
            )`;

          for (const clause of filterClauses) {
            sql = Prisma.sql`${sql} AND ${clause}`;
          }

          sql = Prisma.sql`${sql} AND d."status"::text = ${status}`;

          if (includeDate) {
            sql = Prisma.sql`${sql} AND d."fechaEntrega" >= ${hoy}`;
          }
          return sql;
        };

        const [enProceso, listos, entregados, entregadosHoy] = await Promise.all([
          tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${statsWhere('EN_PROCESO')}`,
          tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${statsWhere('LISTO')}`,
          tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${statsWhere('ENTREGADO')}`,
          tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${statsWhere('ENTREGADO', true)}`
        ]);

        const stats = {
          enProceso: Array.isArray(enProceso) ? (enProceso[0]?.count || 0) : (enProceso?.count || 0),
          listos: Array.isArray(listos) ? (listos[0]?.count || 0) : (listos?.count || 0),
          entregados: Array.isArray(entregados) ? (entregados[0]?.count || 0) : (entregados?.count || 0),
          entregadosHoy: Array.isArray(entregadosHoy) ? (entregadosHoy[0]?.count || 0) : (entregadosHoy?.count || 0),
          total
        };

        const payload = {
          documents: formattedDocuments,
          pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages
          },
          stats
        };
        await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:todos'] });
        return res.json({ success: true, data: payload });
      } else {
        // Si no hay unaccent, usar filtros compatibles con todos los proveedores (sin 'mode')
        // Nota: Esto puede ser sensible a mayúsculas/minúsculas en algunos motores (p.ej. SQLite)
        where.OR = [
          { clientName: { contains: searchTerm } },
          { clientPhone: { contains: searchTerm } },
          { clientEmail: { contains: searchTerm } },
          { clientId: { contains: searchTerm } },
          { protocolNumber: { contains: searchTerm } },
          { actoPrincipalDescripcion: { contains: searchTerm } },
          { detalle_documento: { contains: searchTerm } }
        ];
      }
    }

    const [documents, total] = await Promise.all([
      tx.document.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          // 💰 NUEVO: Incluir facturas para estado de pago
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceNumberRaw: true,
              totalAmount: true,
              paidAmount: true,
              status: true,
              issueDate: true
            }
          }
        },
        orderBy: { [mappedSortField]: mappedSortOrder },
        skip,
        take
      }),
      tx.document.count({ where })
    ]);

    const invoicesMap = new Map();
    documents.forEach((doc) => {
      invoicesMap.set(doc.id, Array.isArray(doc.invoices) ? doc.invoices : []);
    });
    await autoHealInvoiceLinks(documents, invoicesMap, tx);

    const formattedDocuments = documents.map(doc => {
      // 💰 Calcular estado de pago
      const docInvoices = invoicesMap.get(doc.id) || [];
      const {
        paymentStatus,
        paymentInfo,
        computedFechaFactura,
        computedNumeroFactura
      } = summarizeDocumentPayment(doc, docInvoices);
      
      return {
        id: doc.id,
        protocolNumber: doc.protocolNumber,
        clientName: doc.clientName,
        clientPhone: doc.clientPhone,
        clientEmail: doc.clientEmail,
        clientId: doc.clientId,
        documentType: doc.documentType,
        status: doc.status,
        matrizador: doc.assignedTo ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'No asignado',
        matrizadorId: doc.assignedToId,
        codigoRetiro: doc.codigoRetiro,
        verificationCode: doc.verificationCode,
        fechaFactura: computedFechaFactura,
        fechaCreacion: doc.createdAt,
        fechaEntrega: doc.fechaEntrega,
        actoPrincipalDescripcion: doc.actoPrincipalDescripcion,
        actoPrincipalValor: doc.totalFactura,
        totalFactura: doc.totalFactura,
        numeroFactura: computedNumeroFactura || doc.numeroFactura || null,
        matrizadorName: doc.matrizadorName,
        detalle_documento: doc.detalle_documento,
        comentarios_recepcion: doc.comentarios_recepcion,
        // 💰 NUEVO: Estado de pago
        paymentStatus,
        paymentInfo
      };
    });

    const totalPages = Math.ceil(total / take);

    // 📊 Calcular estadísticas globales (con los mismos filtros aplicados)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const statsPromises = [
      // Contar por estado (respetando los filtros where)
      tx.document.count({ where: { ...where, status: 'EN_PROCESO' } }),
      tx.document.count({ where: { ...where, status: 'LISTO' } }),
      tx.document.count({ where: { ...where, status: 'ENTREGADO' } }),
      // Entregados hoy (respetando los filtros where)
      tx.document.count({
        where: {
          ...where,
          status: 'ENTREGADO',
          fechaEntrega: { gte: hoy }
        }
      })
    ];

    const [enProceso, listos, entregados, entregadosHoy] = await Promise.all(statsPromises);

    const stats = {
      enProceso,
      listos,
      entregados,
      entregadosHoy,
      total
    };

    const payload = {
      documents: formattedDocuments,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages
      },
      stats
    };
    await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:todos'] });
    res.json({ success: true, data: payload });

    }); // end withRequestTenantContext
  } catch (error) {
    logger.error('Error listando todos los documentos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function getDocumentosEnProceso(req, res) {
  try {
    await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    const { search, matrizador, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      status: 'EN_PROCESO'
    };

    // PostgreSQL - Búsqueda case-insensitive y acento-insensitive (si hay extensión unaccent)
    const searchTerm2 = (search || '').trim();

    // Clave de caché (incluye filtros)
    const cacheKey = cache.key({
      scope: 'reception:en_proceso',
      page: parseInt(page),
      limit: take,
      search: searchTerm2,
      matrizador: matrizador ? parseInt(matrizador) : null
    });
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }
    if (searchTerm2) {
      const supportsUnaccent = await supportsUnaccentFn();
      if (supportsUnaccent) {
        const pattern = `%${searchTerm2}%`;
        const baseFilter = Prisma.sql`d."status" = 'EN_PROCESO'`;
        let whereSql = baseFilter;
        whereSql = Prisma.sql`${whereSql} AND (
            unaccent(COALESCE(d."clientName", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."clientEmail", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."clientId", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."protocolNumber", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."actoPrincipalDescripcion", '')::text) ILIKE unaccent(${pattern}) OR
            unaccent(COALESCE(d."detalle_documento", '')::text) ILIKE unaccent(${pattern}) OR
            COALESCE(d."clientPhone", '')::text ILIKE ${pattern}
          )`;

        const documents = await tx.$queryRaw`
          SELECT d.*, u.id as "_assignedToId", u."firstName" as "_assignedToFirstName", u."lastName" as "_assignedToLastName"
          FROM "documents" d
          LEFT JOIN "users" u ON u.id = d."assignedToId"
          WHERE ${whereSql}
          ORDER BY d."updatedAt" DESC
          OFFSET ${skip} LIMIT ${take}
        `;
        const countRows = await tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "documents" d WHERE ${whereSql}`;
        const total = Array.isArray(countRows) ? (countRows[0]?.count || 0) : (countRows?.count || 0);

        const formattedDocuments = documents.map(doc => ({
          id: doc.id,
          protocolNumber: doc.protocolNumber,
          clientName: doc.clientName,
          clientPhone: doc.clientPhone,
          clientId: doc.clientId,
          documentType: doc.documentType,
          status: doc.status,
          matrizador: doc._assignedToFirstName ? `${doc._assignedToFirstName} ${doc._assignedToLastName}` : 'No asignado',
          matrizadorId: doc.assignedToId,
          fechaCreacion: doc.createdAt,
          fechaActualizacion: doc.updatedAt
        }));

        const totalPages = Math.ceil(total / take);
        const payload = {
          documents: formattedDocuments,
          pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages
          }
        };
        await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:en_proceso'] });
        return res.json({ success: true, data: payload });
      } else {
        // Filtros compatibles con todos los proveedores (sin 'mode')
        where.OR = [
          { clientName: { contains: searchTerm2 } },
          { clientPhone: { contains: searchTerm2 } },
          { clientEmail: { contains: searchTerm2 } },
          { clientId: { contains: searchTerm2 } },
          { protocolNumber: { contains: searchTerm2 } },
          { actoPrincipalDescripcion: { contains: searchTerm2 } },
          { detalle_documento: { contains: searchTerm2 } }
        ];
      }
    }

    if (matrizador) {
      where.assignedToId = parseInt(matrizador);
    }

    const [documents, total] = await Promise.all([
      tx.document.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take
      }),
      tx.document.count({ where })
    ]);

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      protocolNumber: doc.protocolNumber,
      clientName: doc.clientName,
      clientPhone: doc.clientPhone,
      clientId: doc.clientId,
      documentType: doc.documentType,
      status: doc.status,
      matrizador: doc.assignedTo ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'No asignado',
      matrizadorId: doc.assignedToId,
      fechaCreacion: doc.createdAt,
      fechaActualizacion: doc.updatedAt
    }));

    const totalPages = Math.ceil(total / take);

    const payload = {
      documents: formattedDocuments,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages
      }
    };
    await cache.set(cacheKey, payload, { ttlMs: parseInt(process.env.CACHE_TTL_MS || '60000', 10), tags: ['documents', 'search:reception:en_proceso'] });
    res.json({ success: true, data: payload });

    }); // end withRequestTenantContext
  } catch (error) {
    logger.error('Error obteniendo documentos en proceso:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function marcarComoListo(req, res) {
  try {
    const { id } = req.params;

    logger.debug('marcarComoListo iniciado para documento:', id);

    const transactionResult = await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {

    const document = await tx.document.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!document) {
      logger.warn('Documento no encontrado:', id);
      return { earlyResponse: { status: 404, body: { success: false, message: 'Documento no encontrado' } } };
    }

    logger.debug('Documento encontrado con estado:', document.status);

    if (document.status !== 'EN_PROCESO') {
      logger.warn('Estado incorrecto para marcar como listo:', document.status);
      return { earlyResponse: { status: 400, body: { success: false, message: `El documento no está en proceso. Estado actual: ${document.status}` } } };
    }

    // 🔄 NUEVA LÓGICA: Verificar si el cliente tiene notificación pendiente para agrupar
    let codigoRetiro = null;
    let notificacionExistente = null;
    let documentosAgrupados = [];

    if (document.clientPhone && document.clientPhone.trim()) {
      const phoneNormalized = document.clientPhone.trim();

      // Buscar notificación pendiente del mismo cliente (no enviada aún)
      // Una notificación está "pendiente de envío" si tiene status PENDING o PREPARED pero no ha sido enviada por WhatsApp
      notificacionExistente = await tx.whatsAppNotification.findFirst({
        where: {
          clientPhone: phoneNormalized,
          messageType: 'DOCUMENTO_LISTO',
          status: { in: ['PENDING', 'PREPARED'] },
          // Solo considerar notificaciones recientes (últimas 24 horas) para evitar agrupar con muy antiguas
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          document: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (notificacionExistente && notificacionExistente.document?.codigoRetiro) {
        // Usar el mismo código de retiro de la notificación existente
        codigoRetiro = notificacionExistente.document.codigoRetiro;
        logger.info(`📦 Agrupando documento ${document.protocolNumber} con notificación existente. Código: ${codigoRetiro}`);

        // Buscar todos los documentos del mismo cliente con el mismo código
        documentosAgrupados = await tx.document.findMany({
          where: {
            codigoRetiro: codigoRetiro,
            status: 'LISTO'
          },
          select: { id: true, protocolNumber: true, documentType: true }
        });
      }
    }

    // Si no hay notificación existente, generar nuevo código
    if (!codigoRetiro) {
      logger.debug('Generando código de retiro para documento individual');
      codigoRetiro = await CodigoRetiroService.generarUnico();
    }

    const currentDoc = await tx.document.findUnique({ where: { id } });

    if (!currentDoc || currentDoc.status !== 'EN_PROCESO') {
      throw new Error(`El documento ya no está en proceso. Estado actual: ${currentDoc?.status || 'NO_ENCONTRADO'}`);
    }

    const now = new Date();

    // Registro de evento de cambio de estado
    await tx.documentEvent.create({
      data: {
        documentId: id,
        userId: req.user.id,
        eventType: 'STATUS_CHANGED',
        description: `Estado cambiado de EN_PROCESO a LISTO - ${req.user.firstName} ${req.user.lastName}`,
        details: JSON.stringify({
          previousStatus: 'EN_PROCESO',
          newStatus: 'LISTO',
          codigoRetiro: codigoRetiro,
          agrupadoConExistente: !!notificacionExistente,
          timestamp: now.toISOString()
        })
      }
    });

    // Actualizar documento con código de retiro y estado LISTO
    const docActualizado = await tx.document.update({
      where: { id },
      data: {
        status: 'LISTO',
        codigoRetiro: codigoRetiro,
        fechaListo: now,
        updatedAt: now
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // 📱 CREAR NOTIFICACIÓN AUTOMÁTICAMENTE
    // Siempre crear WhatsAppNotification para que aparezca en el Centro de Notificaciones
    // (matrizador/archivo pueden agregar el teléfono después si falta)
    let notificacion = null;
    const cantidadDocumentos = documentosAgrupados.length + 1;
    const clientPhone = (document.clientPhone || '').trim();

    notificacion = await tx.whatsAppNotification.create({
      data: {
        documentId: id,
        clientName: document.clientName,
        clientPhone: clientPhone,
        messageType: 'DOCUMENTO_LISTO',
        messageBody: `Código de retiro: ${codigoRetiro}. Documentos en lote: ${cantidadDocumentos}`,
        status: 'PENDING',
        sentAt: null
      }
    });

    // Registrar evento de notificación preparada
    await tx.documentEvent.create({
      data: {
        documentId: id,
        userId: req.user.id,
        eventType: clientPhone ? 'WHATSAPP_NOTIFICATION' : 'CODIGO_GENERADO',
        description: clientPhone
          ? (notificacionExistente
            ? `Documento agregado a notificación existente. Código: ${codigoRetiro}`
            : `Notificación WhatsApp preparada automáticamente. Código: ${codigoRetiro}`)
          : `Notificación preparada (cliente sin teléfono). Código: ${codigoRetiro}`,
        details: JSON.stringify({
          codigoRetiro,
          clientPhone: clientPhone || null,
          documentosEnLote: cantidadDocumentos,
          agrupadoConExistente: !!notificacionExistente,
          notificacionId: notificacion.id,
          sinTelefono: !clientPhone,
          timestamp: now.toISOString()
        })
      }
    });

    logger.info(`📱 Notificación creada para documento ${docActualizado.protocolNumber}. Código: ${codigoRetiro}${notificacionExistente ? ' (agrupado)' : ''}${!clientPhone ? ' (sin teléfono)' : ''}`);

    return { docActualizado, notificacion, notificacionExistente, documentosAgrupados, codigoRetiro };
    }); // end withRequestTenantContext

    if (transactionResult.earlyResponse) {
      return res.status(transactionResult.earlyResponse.status).json(transactionResult.earlyResponse.body);
    }

    const updatedDocument = transactionResult.docActualizado;
    const notificacionCreada = transactionResult.notificacion;
    const updatedDocuments = [updatedDocument];
    logger.debug('Documento actualizado exitosamente');

    // Variables para la respuesta
    const mainDocument = updatedDocument;
    const groupAffected = !!transactionResult.notificacionExistente;
    const cantidadEnLote = transactionResult.documentosAgrupados.length + 1;

    let responseMessage = `Documento ${mainDocument.protocolNumber} marcado como listo exitosamente`;
    if (transactionResult.notificacionExistente) {
      responseMessage += `. Agrupado con ${transactionResult.documentosAgrupados.length} documento(s) del mismo cliente`;
    }
    if (notificacionCreada) {
      responseMessage += `. Notificación preparada - Código: ${transactionResult.codigoRetiro}`;
    }

    logger.debug('Proceso completado exitosamente');

    // Headers para evitar cache del navegador
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      message: responseMessage,
      data: {
        document: mainDocument,
        documents: updatedDocuments,
        codigoRetiro: mainDocument.codigoRetiro,
        groupAffected: groupAffected,
        documentsUpdated: updatedDocuments.length,
        // Nuevos campos para el frontend
        notificacionCreada: !!notificacionCreada,
        agrupadoConExistente: !!transactionResult.notificacionExistente,
        cantidadEnLote: cantidadEnLote,
        documentosAgrupados: transactionResult.documentosAgrupados.map(d => ({
          id: d.id,
          protocolNumber: d.protocolNumber,
          documentType: d.documentType
        }))
      }
    });
  } catch (error) {
    logger.error('Error marcando como listo:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function getAlertasRecepcion(req, res) {
  try {
    const alertas = await withRequestTenantContext(prisma, req, async (tx) => {
      return AlertasService.getAlertasRecepcion(tx);
    });
    res.json(alertas);
  } catch (error) {
    logger.error('Error obteniendo alertas de recepción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      data: {
        alertas: [],
        stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosListo: 0 }
      }
    });
  }
}

async function revertirEstadoDocumento(req, res) {
  try {
    // Importar la función central de reversión
    const { revertDocumentStatus } = await import('./document-controller.js');

    // Delegar a la función central que ya maneja toda la lógica de grupos
    return await revertDocumentStatus(req, res);

  } catch (error) {
    logger.error('Error en revertirEstadoDocumento (recepción):', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtener historial de notificaciones WhatsApp para recepción
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getNotificationHistoryReception(req, res) {
  try {
    await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      type = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    const take = Math.min(parseInt(limit), 50);
    const skip = (parseInt(page) - 1) * take;

    // Mostrar historial sin restringir por usuario creador,
    // ya que las notificaciones pueden ser generadas por diferentes roles/servicios
    const where = {};

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { messageBody: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.messageType = type;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const notifications = await tx.whatsAppNotification.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        messageType: true,
        messageBody: true,
        status: true,
        messageId: true,
        errorMessage: true,
        createdAt: true,
        sentAt: true
      }
    });

    const totalCount = await tx.whatsAppNotification.count({ where });

    logger.debug('Historial de notificaciones obtenido:', totalCount);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: take,
          total: totalCount,
          totalPages: Math.ceil(totalCount / take)
        }
      }
    });

    }); // end withRequestTenantContext
  } catch (error) {
    logger.error('Error obteniendo historial de notificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

/**
 * 🎯 NUEVA FUNCIONALIDAD: Obtener recepciones con filtros unificados para UI Activos/Entregados
 * Endpoint principal para la nueva interfaz de recepción con pestañas y búsqueda global
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getReceptionsUnified(req, res) {
  try {
    await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    const { tab, query, clientId, matrizadorId, page = 1, pageSize = 25 } = req.query;

    // Logs de diagnóstico
    logger.debug('[RECEPTION][QUERY]', tab, query || '');

    // Validación de pestaña
    if (!tab || !['ACTIVOS', 'ENTREGADOS'].includes(tab)) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro "tab" es obligatorio y debe ser "ACTIVOS" o "ENTREGADOS"'
      });
    }

    // Normalizar pageSize
    const validPageSizes = [25, 50, 100];
    const limit = validPageSizes.includes(parseInt(pageSize)) ? parseInt(pageSize) : 25;

    // Filtro por estados según pestaña
    const statusFilter = tab === 'ENTREGADOS' ? ['ENTREGADO'] : ['EN_PROCESO', 'LISTO'];

    // Construir where
    const whereClause = {
      status: { in: statusFilter },
      // 🔥 EXCLUIR Notas de Crédito
      NOT: { status: 'ANULADO_NOTA_CREDITO' }
    };
    if (clientId) whereClause.clientId = clientId;
    if (matrizadorId) whereClause.assignedToId = parseInt(matrizadorId);
    if (query && query.trim()) {
      const searchTerm = query.trim();
      whereClause.OR = [
        { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { clientId: { contains: searchTerm, mode: 'insensitive' } },
        { documentType: { contains: searchTerm, mode: 'insensitive' } },
        { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } },
        { numeroFactura: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Obtener documentos (sin paginar) para agrupar por "acto principal" por cliente
    const docs = await tx.document.findMany({
      where: whereClause,
      select: {
        id: true,
        protocolNumber: true,
        clientId: true,
        clientName: true,
        clientPhone: true,
        documentType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        fechaFactura: true,
        numeroFactura: true,
        actoPrincipalDescripcion: true,
        actoPrincipalValor: true,
        totalFactura: true,
        verificationCode: true,
        codigoRetiro: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalizador simple
    const normalize = (s) => (s || '').toString().trim().toLowerCase();

    // Clave de agrupación: cliente + acto principal (paridad con la intención de "acto principal")
    const makeGroupKey = (d) => {
      const cKey = normalize(d.clientId) || `${normalize(d.clientName)}__${normalize(d.clientPhone)}`;
      const act = normalize(d.actoPrincipalDescripcion) || 'sin_acto';
      return `${cKey}::${act}`;
    };

    // Agrupar
    const groups = new Map();
    for (const d of docs) {
      const k = makeGroupKey(d);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    }

    // Convertir grupos a items y paginar por grupo
    const allGroups = Array.from(groups.values());

    // Estado del grupo: si todos ENTREGADO => ENTREGADO; si alguno LISTO => LISTO; si no => EN_PROCESO
    const computeGroupStatus = (arr) => {
      if (arr.length === 0) return 'EN_PROCESO';
      const allDelivered = arr.every(x => x.status === 'ENTREGADO');
      if (allDelivered) return 'ENTREGADO';
      const anyReady = arr.some(x => x.status === 'LISTO');
      return anyReady ? 'LISTO' : 'EN_PROCESO';
    };

    const toCurrency = (n) => {
      try {
        const v = Number(n || 0);
        return isNaN(v) ? '-' : `$${v.toLocaleString('es-EC')}`;
      } catch { return '-'; }
    };

    const totalGroups = allGroups.length;
    const pages = Math.max(1, Math.ceil(totalGroups / limit));
    const currentPage = Math.max(1, Math.min(parseInt(page), pages));
    const start = (currentPage - 1) * limit;
    const pageGroups = allGroups.slice(start, start + limit);

    const items = pageGroups.map(arr => {
      // Ordenar por fechaFactura desc (fallback createdAt) para elegir líder estable
      const sorted = [...arr].sort((a, b) => {
        const ad = new Date(a.fechaFactura || a.createdAt);
        const bd = new Date(b.fechaFactura || b.createdAt);
        return bd - ad;
      });
      const leader = sorted[0];

      // Monto del grupo (suma de totalFactura o actoPrincipalValor)
      const sumAmount = arr.reduce((acc, x) => acc + (Number(x.totalFactura ?? x.actoPrincipalValor ?? 0) || 0), 0);

      return {
        id: leader.id,
        code: leader.protocolNumber,
        clientId: leader.clientId,
        clientName: leader.clientName,
        clientIdentification: leader.clientId,
        typeLabel: leader.documentType,
        mainAct: leader.actoPrincipalDescripcion || '—',
        groupSize: arr.length,
        statusLabel: computeGroupStatus(arr),
        receivedAtFmt: leader.fechaFactura
          ? new Date(leader.fechaFactura).toLocaleDateString('es-EC')
          : '-',
        amountFmt: toCurrency(sumAmount),
        matrizador: leader.assignedTo
          ? `${leader.assignedTo.firstName} ${leader.assignedTo.lastName}`
          : 'Sin asignar',
        matrizadorId: leader.assignedToId,
        documents: arr.map(x => ({
          id: x.id,
          code: x.protocolNumber,
          status: x.status,
          verificationCode: x.verificationCode || x.codigoRetiro || null,
          act: x.actoPrincipalDescripcion || null,
          amount: Number(x.totalFactura ?? x.actoPrincipalValor ?? 0) || 0,
          matrizador: x.assignedTo
            ? `${x.assignedTo.firstName} ${x.assignedTo.lastName}`
            : 'Sin asignar',
          documentType: x.documentType
        }))
      };
    });

    logger.debug('[RECEPTION][UNIFIED_RESULT]', totalGroups, pages);

    return res.json({
      success: true,
      data: {
        total: totalGroups,
        pages,
        items
      }
    });

    }); // end withRequestTenantContext
  } catch (error) {
    logger.error('Error en getReceptionsUnified:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener recepciones',
      error: error?.message || 'Unknown error'
    });
  }
}

/**
 * 🎯 NUEVA FUNCIONALIDAD: Obtener conteos para badges de pestañas de recepción
 * Endpoint optimizado para actualizar badges en tiempo real
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getReceptionsCounts(req, res) {
  try {
    await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    const { query, clientId } = req.query;

    // Filtro base
    const baseWhere = {
      // 🔥 EXCLUIR Notas de Crédito
      NOT: { status: 'ANULADO_NOTA_CREDITO' }
    };
    if (clientId) baseWhere.clientId = clientId;
    if (query && query.trim()) {
      const searchTerm = query.trim();
      baseWhere.OR = [
        { protocolNumber: { contains: searchTerm, mode: 'insensitive' } },
        { clientName: { contains: searchTerm, mode: 'insensitive' } },
        { clientId: { contains: searchTerm, mode: 'insensitive' } },
        { documentType: { contains: searchTerm, mode: 'insensitive' } },
        { actoPrincipalDescripcion: { contains: searchTerm, mode: 'insensitive' } },
        { numeroFactura: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Traer documentos filtrados (sin paginar) para contar por grupos
    const docs = await tx.document.findMany({
      where: baseWhere,
      select: {
        id: true,
        protocolNumber: true,
        clientId: true,
        clientName: true,
        clientPhone: true,
        status: true,
        actoPrincipalDescripcion: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const normalize = (s) => (s || '').toString().trim().toLowerCase();
    const makeGroupKey = (d) => {
      const cKey = normalize(d.clientId) || `${normalize(d.clientName)}__${normalize(d.clientPhone)}`;
      const act = normalize(d.actoPrincipalDescripcion) || 'sin_acto';
      return `${cKey}::${act}`;
    };

    // Agrupar
    const groups = new Map();
    for (const d of docs) {
      const k = makeGroupKey(d);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    }

    // Clasificar grupos a ACTIVOS o ENTREGADOS
    let activos = 0;
    let entregados = 0;
    for (const arr of groups.values()) {
      const allDelivered = arr.length > 0 && arr.every(x => x.status === 'ENTREGADO');
      if (allDelivered) entregados += 1;
      else activos += 1; // Si no todos entregados, el grupo sigue activo
    }

    logger.debug('[RECEPTION][COUNTS]', activos, entregados);

    return res.json({
      success: true,
      data: { ACTIVOS: activos, ENTREGADOS: entregados }
    });

    }); // end withRequestTenantContext
  } catch (error) {
    logger.error('Error en getReceptionsCounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener conteos de recepción',
      error: error?.message || 'Unknown error'
    });
  }
}

/**
 * 🎯 NUEVA FUNCIONALIDAD: Sugerencias para typeahead en Recepción
 * Busca clientes y códigos por término con soporte unaccent cuando está disponible.
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getReceptionSuggestions(req, res) {
  try {
    const term = (req.query.term || req.query.query || '').trim();
    if (!term) {
      return res.json({ success: true, data: { clients: [], codes: [] } });
    }

    await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    const supportsUnaccent = await supportsUnaccentFn();
    let rows;
    if (supportsUnaccent) {
      const pattern = `%${term}%`;
      rows = await tx.$queryRaw`
        SELECT d.id, d."protocolNumber", d."clientId", d."clientName", d."clientPhone", d."createdAt"
        FROM "documents" d
        WHERE (
          unaccent(d."clientName") ILIKE unaccent(${pattern}) OR
          unaccent(COALESCE(d."clientId", '')) ILIKE unaccent(${pattern}) OR
          unaccent(d."protocolNumber") ILIKE unaccent(${pattern})
        )
        ORDER BY d."createdAt" DESC
        LIMIT 50
      `;
    } else {
      rows = await tx.document.findMany({
        where: {
          OR: [
            { clientName: { contains: term, mode: 'insensitive' } },
            { clientId: { contains: term, mode: 'insensitive' } },
            { protocolNumber: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          protocolNumber: true,
          clientId: true,
          clientName: true,
          clientPhone: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    }

    const clientMap = new Map();
    const codeSet = new Set();
    const codes = [];

    for (const r of rows) {
      const cKey = (r.clientId && r.clientId.trim())
        ? `id:${r.clientId}`
        : `name:${(r.clientName || '').trim().toLowerCase()}__${(r.clientPhone || '').trim()}`;

      if (!clientMap.has(cKey)) {
        clientMap.set(cKey, {
          clientId: r.clientId || null,
          clientName: r.clientName,
          clientPhone: r.clientPhone || null
        });
      }

      if (r.protocolNumber && !codeSet.has(r.protocolNumber)) {
        codeSet.add(r.protocolNumber);
        codes.push({ code: r.protocolNumber, id: r.id });
      }
    }

    const clients = Array.from(clientMap.values()).slice(0, 10);
    const topCodes = codes.slice(0, 10);

    logger.debug('[RECEPTION][SUGGEST]', clients.length, topCodes.length);

    return res.json({
      success: true,
      data: { clients, codes: topCodes }
    });

    }); // end withRequestTenantContext
  } catch (error) {
    logger.error('Error en getReceptionSuggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor en sugerencias',
      error: error?.message || 'Unknown error'
    });

  }
}


/**
 * Entregar múltiples documentos en bloque (mismo cliente)
 * POST /api/reception/bulk-delivery
 */
async function bulkDelivery(req, res) {
  try {
    const { documentIds, deliveryData } = req.body;

    // Validaciones
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un documento'
      });
    }

    if (documentIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 50 documentos por entrega'
      });
    }

    // Validar datos de entrega
    const {
      personaRetira,
      cedulaRetira,
      verificationType,
      verificationCode
    } = deliveryData;

    if (!personaRetira || !cedulaRetira) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar nombre y cédula de quien retira'
      });
    }

    const result = await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    // Buscar todos los documentos
    const documents = await tx.document.findMany({
      where: {
        id: { in: documentIds },
        status: 'LISTO' // Solo documentos listos
      }
    });

    if (documents.length === 0) {
      return { earlyResponse: { status: 404, body: { success: false, message: 'No se encontraron documentos listos para entrega' } } };
    }

    if (documents.length !== documentIds.length) {
      return { earlyResponse: { status: 400, body: { success: false, message: `Solo ${documents.length} de ${documentIds.length} documentos están listos para entrega` } } };
    }

    // Verificar que todos sean del mismo cliente
    const uniqueClients = new Set(documents.map(d => d.clientId));
    if (uniqueClients.size > 1) {
      return { earlyResponse: { status: 400, body: { success: false, message: 'Todos los documentos deben ser del mismo cliente' } } };
    }

    // Actualizar estado de todos (already inside withRequestTenantContext transaction)
    const updated = await tx.document.updateMany({
      where: { id: { in: documentIds } },
      data: {
        status: 'ENTREGADO',
        fechaEntrega: new Date(),
        entregadoA: personaRetira,
        cedulaReceptor: cedulaRetira,
        usuarioEntregaId: req.user.id,
        verificacionManual: verificationType === 'manual' || !verificationCode
      }
    });

    // Crear eventos de auditoría para cada documento
    const events = documents.map(doc => ({
      documentId: doc.id,
      userId: req.user.id,
      eventType: 'ENTREGA_BLOQUE',
      description: `Entregado en bloque (${documents.length} docs) a ${personaRetira}`,
      details: JSON.stringify({
        personaRetira,
        cedulaRetira,
        verificationType,
        totalDocuments: documents.length,
        documentIds: documentIds,
        deliveredBy: req.user.id,
        timestamp: new Date().toISOString()
      }),
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }));

    await tx.documentEvent.createMany({
      data: events
    });

    return { updated: updated.count };
    }); // end withRequestTenantContext

    if (result.earlyResponse) {
      return res.status(result.earlyResponse.status).json(result.earlyResponse.body);
    }

    return res.json({
      success: true,
      message: `${result.updated} documentos entregados exitosamente`,
      data: {
        deliveredCount: result.updated,
        personaRetira,
        cedulaRetira
      }
    });

  } catch (error) {
    logger.error('Error en entrega en bloque:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al realizar entrega en bloque',
      error: error.message
    });
  }
}

/**
 * Entregar múltiples documentos (compatible con ModalEntregaGrupal)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function entregaGrupal(req, res) {
  try {
    const {
      documentIds,
      entregadoA,
      cedulaReceptor,
      relacionTitular,
      observaciones,
      verificacionManual,
      codigoVerificacion,
      facturaPresenta
    } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere una lista válida de IDs de documentos' });
    }

    if (!entregadoA) {
      return res.status(400).json({ success: false, message: 'Nombre de quien retira es obligatorio' });
    }

    const result = await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
    // Buscar documentos
    const documents = await tx.document.findMany({
      where: { id: { in: documentIds } }
    });

    if (documents.length === 0) {
      return { earlyResponse: { status: 404, body: { success: false, message: 'Documentos no encontrados' } } };
    }

    // Validar estados (LISTO o EN_PROCESO)
    const invalidDocs = documents.filter(d => !['LISTO', 'EN_PROCESO', 'PAGADO'].includes(d.status));
    if (invalidDocs.length > 0) {
      return { earlyResponse: { status: 400, body: { success: false, message: `Algunos documentos no están listos para entrega (Estado inválido: ${invalidDocs[0].status})` } } };
    }

    // Validar cliente único
    const uniqueClients = new Set(documents.map(d => d.clientId));
    if (uniqueClients.size > 1) {
      return { earlyResponse: { status: 400, body: { success: false, message: 'Todos los documentos deben ser del mismo cliente' } } };
    }

    // Validar código si no es manual y alguno está LISTO
    const anyReady = documents.some(d => d.status === 'LISTO');
    if (anyReady && !verificacionManual && !codigoVerificacion) {
      // Intentar obtener código del grupo o individual
      const groupCode = documents[0].codigoRetiro || documents[0].verificationCode;
      if (!groupCode) {
        return { earlyResponse: { status: 400, body: { success: false, message: 'Se requiere código de verificación para documentos listos' } } };
      }
    }

    // Actualizar documentos (already inside withRequestTenantContext transaction)
    const now = new Date();

    // Actualizar a ENTREGADO
    await tx.document.updateMany({
      where: { id: { in: documentIds } },
      data: {
        status: 'ENTREGADO',
        fechaEntrega: now,
        entregadoA: entregadoA,
        cedulaReceptor: cedulaReceptor || null,
        relacionTitular: relacionTitular || null,
        observacionesEntrega: observaciones || null,
        usuarioEntregaId: req.user.id,
        verificacionManual: !!verificacionManual,
        facturaPresenta: !!facturaPresenta
      }
    });

    // Eventos
    const events = documentIds.map(id => ({
      documentId: id,
      userId: req.user.id,
      eventType: 'ENTREGA_GRUPAL',
      description: `Entrega grupal a ${entregadoA} (${relacionTitular || 'N/A'})`,
      details: JSON.stringify({
        entregadoA,
        cedulaReceptor,
        relacionTitular,
        observaciones,
        verificacionManual,
        facturaPresenta,
        docsCount: documentIds.length
      }),
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }));

    await tx.documentEvent.createMany({ data: events });

    return { documentsCount: documents.length };
    }); // end withRequestTenantContext

    if (result.earlyResponse) {
      return res.status(result.earlyResponse.status).json(result.earlyResponse.body);
    }

    logger.info(`Entrega grupal exitosa: ${documentIds.length} documentos por usuario ${req.user.id}`);

    return res.json({
      success: true,
      message: `${result.documentsCount} documentos entregados exitosamente`,
      data: { deliveredCount: result.documentsCount }
    });

  } catch (error) {
    logger.error('Error en entrega grupal:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al procesar entrega grupal',
      message: error.message
    });
  }
}

export {
  getDashboardStats,
  getMatrizadores,
  listarTodosDocumentos,
  getDocumentosEnProceso,
  marcarComoListo,
  getAlertasRecepcion,
  revertirEstadoDocumento,
  getNotificationHistoryReception,
  // 🎯 NUEVA FUNCIONALIDAD: UI Activos/Entregados para Recepción
  getReceptionsUnified,
  getReceptionsCounts,
  getReceptionSuggestions,
  // 🎯 NUEVA FUNCIONALIDAD: Entrega en bloque
  bulkDelivery,
  entregaGrupal
};
