/**
 * Sync Routes
 * API routes for Koinor Sync Agent communication
 *
 * All routes require Sync API Key authentication (X-Sync-Api-Key header)
 *
 * Routes:
 * - POST /api/sync/billing - Receive billing data from Sync Agent
 * - GET /api/sync/billing/status - Get last sync status
 * - GET /api/sync/billing/history - Get sync history
 * - POST /api/sync/cxc - Receive CXC (accounts receivable) data from Sync Agent
 */

import express from 'express';
import { requireSyncApiKey } from '../middleware/sync-api-key-middleware.js';
import * as syncBillingController from '../controllers/sync-billing-controller.js';

const router = express.Router();

// All sync routes require API key authentication
router.use(requireSyncApiKey);

// ============================================================================
// BILLING SYNC ENDPOINTS
// ============================================================================

/**
 * POST /api/sync/billing
 * Receive billing data from Koinor Sync Agent
 * 
 * Body: {
 *   agentVersion: string,
 *   syncStartedAt: ISO date string,
 *   data: Invoice[]
 * }
 */
router.post('/billing', syncBillingController.syncBilling);

/**
 * GET /api/sync/billing/status
 * Get status of the last sync operation
 */
router.get('/billing/status', syncBillingController.getSyncStatus);

/**
 * GET /api/sync/billing/history
 * Get history of sync operations
 * 
 * Query params:
 * - limit: number (default: 20, max: 50)
 */
router.get('/billing/history', syncBillingController.getSyncHistory);

// ============================================================================
// CXC (CUENTAS POR COBRAR) SYNC ENDPOINTS
// ============================================================================

/**
 * POST /api/sync/cxc
 * Receive CXC (accounts receivable) data from Koinor Sync Agent
 *
 * Body: {
 *   type: "cxc",
 *   fullSync: boolean,
 *   timestamp: ISO date string,
 *   data: CxcRecord[]
 * }
 */
router.post('/cxc', syncBillingController.syncCxc);

export default router;
