/**
 * Sync API Key Middleware
 * Authentication for machine-to-machine communication (Sync Agent → Railway)
 * 
 * Uses a separate API key from the regular API_SECRET_KEY to:
 * - Allow independent key rotation
 * - Enable specific logging/monitoring
 * - Avoid confusion with user-facing API keys
 */

/**
 * Middleware that validates the X-Sync-Api-Key header
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export function requireSyncApiKey(req, res, next) {
    try {
        // Read API key from header (preferred) or query param (fallback for testing)
        const provided = req.header('X-Sync-Api-Key') || req.query.sync_api_key || '';
        const expected = process.env.SYNC_API_KEY || '';

        // Check if key is configured
        if (!expected) {
            console.error('[sync-api-key-middleware] SYNC_API_KEY not configured in environment');
            return res.status(500).json({
                success: false,
                message: 'SYNC_API_KEY no configurada en el servidor'
            });
        }

        // Validate key
        if (!provided) {
            console.warn('[sync-api-key-middleware] No API key provided in request');
            return res.status(401).json({
                success: false,
                message: 'API key requerida. Incluir header X-Sync-Api-Key'
            });
        }

        if (provided !== expected) {
            console.warn('[sync-api-key-middleware] Invalid API key attempt');
            return res.status(401).json({
                success: false,
                message: 'API key inválida'
            });
        }

        // Key is valid, proceed
        next();
    } catch (err) {
        console.error('[sync-api-key-middleware] Unexpected error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error validando API key'
        });
    }
}

export default requireSyncApiKey;
