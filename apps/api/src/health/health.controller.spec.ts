import { describe, expect, it, vi } from 'vitest';

import { HealthController } from './health.controller';
import type { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns stable liveness payload', () => {
    const healthService = {
      getLiveness: vi.fn().mockReturnValue({
        status: 'ok',
        service: 'api',
        timestamp: '2026-07-17T00:00:00.000Z',
      }),
      getVersion: vi.fn(),
      getReadiness: vi.fn(),
    } as unknown as HealthService;

    const controller = new HealthController(healthService);
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: '2026-07-17T00:00:00.000Z',
    });
  });

  it('sets 503 when readiness is degraded', async () => {
    const healthService = {
      getLiveness: vi.fn(),
      getVersion: vi.fn(),
      getReadiness: vi.fn().mockResolvedValue({
        status: 'degraded',
        service: 'api',
        timestamp: '2026-07-17T00:00:00.000Z',
        checks: { database: 'down', redis: 'skipped' },
      }),
    } as unknown as HealthService;

    const res = { status: vi.fn() };
    const controller = new HealthController(healthService);
    const body = await controller.getReady(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(body.status).toBe('degraded');
  });
});
