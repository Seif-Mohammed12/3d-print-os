import { Controller, Get } from '@nestjs/common';

import { API_VERSION, type HealthResponse } from '@3d-print-os/contracts';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  getVersion(): { api_version: typeof API_VERSION } {
    return { api_version: API_VERSION };
  }
}
