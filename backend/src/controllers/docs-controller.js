import prisma from '../db.js';
import { isValidStatus } from '../utils/status-transitions.js';
import { authenticateToken } from '../middleware/auth-middleware.js';

// Helpers
const mapUiStateToDb = (state) => {
  // UI states may come as 'proceso'|'listo'|'entregado'
  if (!state) return undefined;
  const s = String(state).toLowerCase();
  if (s.startsWith('proc')) return 'EN_PROCESO';
  if (s.startsWith('list')) return 'LISTO';
  if (s.startsWith('entre')) return 'ENTREGADO';
  if (s.startsWith('pend')) return 'PENDIENTE';
  return state; // assume already db value
};

const selectMinimal = {
  id: true,
  protocolNumber: true,
  clientName: true,
  status: true,
  updatedAt: true,
};

export async function getDocsList(req, res) {
  try {
    const { state, search, ownerId, limit = '25', cursor } = req.query;
    const take = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));

    const where = {};
    if (state) where.status = mapUiStateToDb(state);
    if (ownerId) where.assignedToId = Number(ownerId);
    if (search && search.length >= 1) {
      where.OR = [
        { protocolNumber: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = [{ updatedAt: 'desc' }, { id: 'desc' }];

    const query = {
      where,
      select: selectMinimal,
      orderBy,
      take,
    };
    if (cursor) query.cursor = { id: cursor };

    const docs = await prisma.document.findMany(query);

    const nextCursor = docs.length === take ? docs[docs.length - 1].id : null;
    res.json({ success: true, data: { documents: docs, nextCursor } });
  } catch (e) {
    console.error('getDocsList error:', e);
    res.status(500).json({ success: false, error: 'Error obteniendo documentos' });
  }
}

// Bridge to existing controller logic for state change
export async function updateDocState(req, res, next) {
  try {
    const { id } = req.params;
    const { state, payload } = req.body || {};
    const newStatus = mapUiStateToDb(state);
    if (!newStatus || !isValidStatus(newStatus)) {
      return res.status(400).json({ success: false, error: 'Estado no válido' });
    }

    // Reuse existing controller behavior
    const { updateDocumentStatus } = await import('./document-controller.js');
    // Map payload (deliver validations)
    req.params.id = id;
    req.body = {
      status: newStatus,
      deliveredTo: payload?.receiverName,
      verificationCode: payload?.verificationCode,
      receiverIdNumber: payload?.receiverIdNumber,
      receiverRelation: payload?.receiverRelation,
      deliveryNotes: payload?.deliveryNotes,
      reversionReason: payload?.reversionReason,
    };
    return updateDocumentStatus(req, res, next);
  } catch (e) {
    console.error('updateDocState error:', e);
    res.status(500).json({ success: false, error: 'Error actualizando estado' });
  }
}

export async function updateDocsBulkState(req, res) {
  try {
    const { ids, state } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids requerido' });
    }
    const newStatus = mapUiStateToDb(state);
    if (!newStatus || !['LISTO'].includes(newStatus)) {
      return res.status(400).json({ success: false, error: 'Estado masivo no permitido' });
    }

    // Reuse bulk controller
    const { bulkStatusChange } = await import('./../controllers/bulk-operations-controller.js');
    // Adapt request body for existing controller
    req.body = { ids, targetStatus: newStatus };
    return bulkStatusChange(req, res);
  } catch (e) {
    console.error('updateDocsBulkState error:', e);
    res.status(500).json({ success: false, error: 'Error en cambio masivo' });
  }
}

export async function searchDocs(req, res) {
  try {
    const { query = '', scope = 'context', state = 'any', ownerId, limit = '25' } = req.query;
    const take = Math.max(1, Math.min(parseInt(limit, 10) || 25, 50));
    const normQuery = String(query || '').trim();

    const stateDb = mapUiStateToDb(state);
    const whereBase = normQuery
      ? {
          OR: [
            { protocolNumber: { contains: normQuery, mode: 'insensitive' } },
            { clientName: { contains: normQuery, mode: 'insensitive' } },
          ],
        }
      : {};

    // Context scope: filter by provided state
    const contextWhere = { ...whereBase };
    if (stateDb && stateDb !== 'any') contextWhere.status = stateDb;
    if (ownerId) contextWhere.assignedToId = Number(ownerId);

    const contextHits = await prisma.document.findMany({
      where: contextWhere,
      select: selectMinimal,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take,
    });

    // If fallback needed or explicit scope=all, compute global groups (top 3 each)
    let groups = [];
    const needGlobal = scope === 'all' || contextHits.length <= 2;
    if (needGlobal) {
      const states = ['EN_PROCESO', 'LISTO', 'ENTREGADO'];
      for (const s of states) {
        const where = { ...whereBase, status: s };
        const hits = await prisma.document.findMany({
          where,
          select: selectMinimal,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 3,
        });
        const count = await prisma.document.count({ where });
        groups.push({
          state: s.toLowerCase() === 'en_proceso' ? 'proceso' : s.toLowerCase(),
          count,
          hits,
        });
      }
    }

    res.json({
      success: true,
      data: {
        context: {
          state: stateDb ? (stateDb === 'EN_PROCESO' ? 'proceso' : stateDb.toLowerCase()) : 'mixed',
          hits: contextHits,
          nextCursor: null,
        },
        global: needGlobal ? { groups } : null,
      },
    });
  } catch (e) {
    console.error('searchDocs error:', e);
    res.status(500).json({ success: false, error: 'Error en búsqueda' });
  }
}

