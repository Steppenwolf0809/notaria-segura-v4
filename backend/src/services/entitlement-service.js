const MODULE_CODE_PATTERN = /^[A-Z0-9_]+$/;

function assertNotaryId(notaryId) {
  if (!notaryId || typeof notaryId !== 'string') {
    return null;
  }

  const normalized = notaryId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeModuleCode(moduleCode) {
  if (typeof moduleCode !== 'string') {
    throw new Error('moduleCode debe ser string');
  }

  const normalized = moduleCode.trim().toUpperCase();
  if (!MODULE_CODE_PATTERN.test(normalized)) {
    throw new Error('moduleCode contiene caracteres invalidos');
  }

  return normalized;
}

/**
 * Resuelve modulos habilitados para una notaria:
 * 1) plan activo vigente
 * 2) modulos del plan
 * 3) overrides tenant
 */
export async function getEnabledModulesForNotary(dbClient, notaryId, options = {}) {
  const effectiveNotaryId = assertNotaryId(notaryId);
  if (!effectiveNotaryId) {
    return [];
  }

  const now = options.now instanceof Date ? options.now : new Date();

  const activeSubscription = await dbClient.notarySubscription.findFirst({
    where: {
      notaryId: effectiveNotaryId,
      isActive: true,
      startedAt: { lte: now },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: now } }
      ]
    },
    select: {
      id: true,
      planId: true,
      plan: {
        select: {
          isActive: true
        }
      }
    },
    orderBy: [
      { startedAt: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  if (!activeSubscription || !activeSubscription.plan?.isActive) {
    return [];
  }

  const [planModules, overrides] = await Promise.all([
    dbClient.planModule.findMany({
      where: {
        planId: activeSubscription.planId
      },
      select: {
        module: {
          select: {
            code: true,
            isActive: true
          }
        }
      }
    }),
    dbClient.notaryModuleOverride.findMany({
      where: {
        notaryId: effectiveNotaryId
      },
      select: {
        enabled: true,
        module: {
          select: {
            code: true,
            isActive: true
          }
        }
      }
    })
  ]);

  const enabledModules = new Set();

  for (const item of planModules) {
    if (!item?.module?.code || !item.module.isActive) {
      continue;
    }
    enabledModules.add(item.module.code);
  }

  for (const override of overrides) {
    if (!override?.module?.code || !override.module.isActive) {
      continue;
    }

    if (override.enabled) {
      enabledModules.add(override.module.code);
    } else {
      enabledModules.delete(override.module.code);
    }
  }

  return Array.from(enabledModules).sort();
}

export async function isModuleEnabledForNotary(dbClient, notaryId, moduleCode, options = {}) {
  const normalizedModuleCode = normalizeModuleCode(moduleCode);
  const enabledModules = await getEnabledModulesForNotary(dbClient, notaryId, options);
  return enabledModules.includes(normalizedModuleCode);
}
