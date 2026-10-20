import { Body, Controller, Get, Put } from '@nestjs/common';

import { CurrentAuth, RequirePermissions } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { UpdatePortalSettingsDto } from './dto/portal.dto';
import { PortalService } from './portal.service';

/** Staff: how the customer portal quotes (which printer prices portal quotes). */
@Controller('portal-settings')
export class PortalSettingsController {
  constructor(private readonly portalService: PortalService) {}

  @Get()
  @RequirePermissions('settings:read')
  async get(@CurrentAuth() auth: RequestAuthContext) {
    return { data: await this.portalService.getSettings(auth.tenantId) };
  }

  @Put()
  @RequirePermissions('settings:write')
  async update(@CurrentAuth() auth: RequestAuthContext, @Body() body: UpdatePortalSettingsDto) {
    return { data: await this.portalService.updateSettings(auth.tenantId, body.printerId) };
  }
}
