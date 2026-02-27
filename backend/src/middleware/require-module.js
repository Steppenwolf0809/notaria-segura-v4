import prisma from '../db.js';
import { withRequestTenantContext } from '../utils/tenant-context.js';
import { isModuleEnabledForNotary, normalizeModuleCode } from '../services/entitlement-service.js';

function toForbiddenResponse(res, moduleCode) {
  return res.status(403).json({
    success: false,
    message: `Modulo no habilitado para esta notaria: ${moduleCode}`,
    moduleCode
  });
}

export function requireModule(moduleCode) {
  const normalizedModuleCode = normalizeModuleCode(moduleCode);

  return async function requireModuleMiddleware(req, res, next) {
    if (!req?.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    try {
      const enabled = await withRequestTenantContext(prisma, req, async (tx, tenantContext) => {
        if (!tenantContext?.notaryId) {
          return false;
        }

        return isModuleEnabledForNotary(tx, tenantContext.notaryId, normalizedModuleCode);
      }, {
        missingNotaryMessage: 'No existe contexto de notaria para validar modulos'
      });

      if (!enabled) {
        return toForbiddenResponse(res, normalizedModuleCode);
      }

      return next();
    } catch (error) {
      if (error?.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }

      console.error('Error validating module entitlement:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validando habilitacion de modulo'
      });
    }
  };
}
