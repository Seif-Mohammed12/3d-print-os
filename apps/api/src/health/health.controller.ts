import { Controller, Get, Inject, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import type { HealthResponse, ReadyHealthResponse } from '@3d-print-os/contracts';

import { HealthService } from './health.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  /** Liveness probe — process is running. Response shape is stable. */
  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getLiveness();
  }

  @Get('version')
  getVersion(): ReturnType<HealthService['getVersion']> {
    return this.healthService.getVersion();
  }

  /**
   * Readiness probe — dependency status.
   * 200 when ok; 503 when degraded (body still includes checks).
   */
  @Get('ready')
  async getReady(@Res({ passthrough: true }) res: Response): Promise<ReadyHealthResponse> {
    const result = await this.healthService.getReadiness();
    if (result.status === 'degraded') {
      res.status(503);
    }
    return result;
  }
}
