import { Body, Controller, Get, Post, Put } from '@nestjs/common';

import { CurrentAuth, RequirePermissions } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { UpdateEmbedSettingsDto } from './dto/embed.dto';
import { EmbedService } from './embed.service';

/** Staff: the website quoter's key, allowed websites, printers and look. */
@Controller('embed-settings')
export class EmbedSettingsController {
  constructor(private readonly embed: EmbedService) {}

  @Get()
  @RequirePermissions('settings:read')
  async get(@CurrentAuth() auth: RequestAuthContext) {
    return { data: await this.embed.getSettings(auth.tenantId) };
  }

  @Put()
  @RequirePermissions('settings:write')
  async update(@CurrentAuth() auth: RequestAuthContext, @Body() body: UpdateEmbedSettingsDto) {
    return {
      data: await this.embed.updateSettings(auth.tenantId, {
        ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
        ...(body.allowedOrigins !== undefined ? { allowedOrigins: body.allowedOrigins } : {}),
        ...(body.printerIds !== undefined ? { printerIds: body.printerIds } : {}),
        ...(body.theme !== undefined ? { theme: { ...body.theme } } : {}),
      }),
    };
  }

  /** Issue a new publishable key; the old one stops working at once. */
  @Post('rotate-key')
  @RequirePermissions('settings:write')
  async rotateKey(@CurrentAuth() auth: RequestAuthContext) {
    return { data: await this.embed.rotateKey(auth.tenantId) };
  }
}
