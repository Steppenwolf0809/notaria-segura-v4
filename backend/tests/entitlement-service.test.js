import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  normalizeModuleCode,
  getEnabledModulesForNotary,
  isModuleEnabledForNotary
} from '../src/services/entitlement-service.js';

function createDbClientMocks() {
  return {
    notarySubscription: {
      findFirst: jest.fn()
    },
    planModule: {
      findMany: jest.fn()
    },
    notaryModuleOverride: {
      findMany: jest.fn()
    }
  };
}

describe('entitlement-service', () => {
  let dbClient;

  beforeEach(() => {
    dbClient = createDbClientMocks();
    jest.clearAllMocks();
  });

  describe('normalizeModuleCode', () => {
    it('normalizes to uppercase and trims', () => {
      expect(normalizeModuleCode('  facturacion  ')).toBe('FACTURACION');
    });

    it('throws for invalid module code', () => {
      expect(() => normalizeModuleCode('facturacion-web')).toThrow('moduleCode contiene caracteres invalidos');
    });
  });

  describe('getEnabledModulesForNotary', () => {
    it('returns empty array when notary id is missing', async () => {
      const result = await getEnabledModulesForNotary(dbClient, null);
      expect(result).toEqual([]);
      expect(dbClient.notarySubscription.findFirst).not.toHaveBeenCalled();
    });

    it('returns empty array when no active subscription exists', async () => {
      dbClient.notarySubscription.findFirst.mockResolvedValue(null);

      const result = await getEnabledModulesForNotary(dbClient, 'notary-1');

      expect(result).toEqual([]);
      expect(dbClient.notarySubscription.findFirst).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when plan is inactive', async () => {
      dbClient.notarySubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        planId: 'plan-1',
        plan: { isActive: false }
      });

      const result = await getEnabledModulesForNotary(dbClient, 'notary-1');
      expect(result).toEqual([]);
    });

    it('resolves modules from plan plus overrides', async () => {
      dbClient.notarySubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        planId: 'plan-1',
        plan: { isActive: true }
      });

      dbClient.planModule.findMany.mockResolvedValue([
        { module: { code: 'DOCUMENTOS', isActive: true } },
        { module: { code: 'FACTURACION', isActive: true } },
        { module: { code: 'WHATSAPP', isActive: false } }
      ]);

      dbClient.notaryModuleOverride.findMany.mockResolvedValue([
        { enabled: false, module: { code: 'FACTURACION', isActive: true } },
        { enabled: true, module: { code: 'ESCRITURAS_QR', isActive: true } }
      ]);

      const result = await getEnabledModulesForNotary(dbClient, 'notary-1');

      expect(result).toEqual(['DOCUMENTOS', 'ESCRITURAS_QR']);
    });
  });

  describe('isModuleEnabledForNotary', () => {
    it('returns true when module is enabled', async () => {
      dbClient.notarySubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        planId: 'plan-1',
        plan: { isActive: true }
      });
      dbClient.planModule.findMany.mockResolvedValue([
        { module: { code: 'FACTURACION', isActive: true } }
      ]);
      dbClient.notaryModuleOverride.findMany.mockResolvedValue([]);

      const result = await isModuleEnabledForNotary(dbClient, 'notary-1', 'facturacion');
      expect(result).toBe(true);
    });
  });
});
