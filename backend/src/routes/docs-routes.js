import express from 'express';
import { authenticateToken } from '../middleware/auth-middleware.js';
import {
  getDocsList,
  updateDocState,
  updateDocsBulkState,
  searchDocs
} from '../controllers/docs-controller.js';

const router = express.Router();

// GET /api/docs?state=&search=&ownerId=&limit=&cursor=
router.get('/', authenticateToken, getDocsList);

// PATCH /api/docs/:id/state { state: 'LISTO' | 'ENTREGADO', payload? }
router.patch('/:id/state', authenticateToken, updateDocState);

// PATCH /api/docs/bulk/state { ids: string[], state: 'LISTO' }
router.patch('/bulk/state', authenticateToken, updateDocsBulkState);

// GET /api/docs/search?query=&scope=context|all&state=proceso|listo|entregado|any&ownerId=&limit=&cursor=
router.get('/search', authenticateToken, searchDocs);

export default router;

