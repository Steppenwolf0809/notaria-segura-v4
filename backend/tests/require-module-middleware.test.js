import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockWithRequestTenantContext = jest.fn();
const mockIsModuleEnabledForNotary = jest.fn();

jest.unstable_mockModule('../src/db.js', () => ({
  default: {}
}));

jest.unstable_mockModule('../src/utils/tenant-context.js', () => ({
  withRequestTenantContext: mockWithRequestTenantContext
}));

jest.unstable_mockModule('../src/services/entitlement-service.js', () => ({
  normalizeModuleCode: (code) => String(code || '').trim().toUpperCase(),
  isModuleEnabledForNotary: mockIsModuleEnabledForNotary
}));

const { requireModule } = await import('../src/middleware/require-module.js');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

describe('require-module middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is missing', async () => {
    const middleware = requireModule('FACTURACION');
    const req = {};
    const res = createMockResponse();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when module is not enabled for tenant', async () => {
    const middleware = requireModule('FACTURACION');
    const req = { user: { id: 1, role: 'ADMIN' } };
    const res = createMockResponse();
    const next = jest.fn();

    mockWithRequestTenantContext.mockImplementation(async (_prisma, _req, operation) => {
      return operation({}, { notaryId: 'notary-1', isSuperAdmin: false });
    });
    mockIsModuleEnabledForNotary.mockResolvedValue(false);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      moduleCode: 'FACTURACION'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when module is enabled', async () => {
    const middleware = requireModule('FACTURACION');
    const req = { user: { id: 1, role: 'ADMIN' } };
    const res = createMockResponse();
    const next = jest.fn();

    mockWithRequestTenantContext.mockImplementation(async (_prisma, _req, operation) => {
      return operation({}, { notaryId: 'notary-1', isSuperAdmin: false });
    });
    mockIsModuleEnabledForNotary.mockResolvedValue(true);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('propagates tenant-context status error', async () => {
    const middleware = requireModule('FACTURACION');
    const req = { user: { id: 1, role: 'ADMIN' } };
    const res = createMockResponse();
    const next = jest.fn();

    const error = new Error('No existe contexto de notaria para validar modulos');
    error.status = 403;
    mockWithRequestTenantContext.mockRejectedValue(error);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
