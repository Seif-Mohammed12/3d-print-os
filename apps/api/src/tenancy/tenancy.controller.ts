import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';

import { TenancyDomainError, type TenancyService } from '@3d-print-os/tenancy';

import { AppError } from '../shared/errors/app.error';
import { CurrentAuth, RequirePermissions } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { TENANCY_SERVICE } from '../identity/identity.tokens';
import { CreateShopDto, UpdateShopDto, UpdateTenantDto } from './dto/tenancy.dto';

function mapError(error: unknown): never {
  if (error instanceof TenancyDomainError) {
    throw new AppError({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
  }
  throw error;
}

@Controller()
export class TenancyController {
  constructor(@Inject(TENANCY_SERVICE) private readonly tenancyService: TenancyService) {}

  @Get('tenants/current')
  @RequirePermissions('settings:read')
  async getCurrent(@CurrentAuth() auth: RequestAuthContext) {
    try {
      const tenant = await this.tenancyService.getCurrentTenant(auth.tenantId);
      return {
        data: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          default_currency: tenant.defaultCurrency,
          timezone: tenant.timezone,
          tax_rate_bps: tenant.taxRateBps,
        },
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Patch('tenants/current')
  @RequirePermissions('settings:write')
  async updateCurrent(@CurrentAuth() auth: RequestAuthContext, @Body() body: UpdateTenantDto) {
    try {
      const tenant = await this.tenancyService.updateCurrentTenant(auth.tenantId, {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.defaultCurrency !== undefined ? { defaultCurrency: body.defaultCurrency } : {}),
        ...(body.taxRateBps !== undefined ? { taxRateBps: body.taxRateBps } : {}),
      });
      return {
        data: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          default_currency: tenant.defaultCurrency,
          timezone: tenant.timezone,
          tax_rate_bps: tenant.taxRateBps,
        },
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Get('shops')
  @RequirePermissions('shops:read')
  async listShops(@CurrentAuth() auth: RequestAuthContext) {
    try {
      const shops = await this.tenancyService.listShops(auth.tenantId);
      return {
        data: shops.map((shop) => ({
          id: shop.id,
          code: shop.code,
          name: shop.name,
          timezone: shop.timezone,
          is_active: shop.isActive,
        })),
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Post('shops')
  @RequirePermissions('shops:write')
  async createShop(@CurrentAuth() auth: RequestAuthContext, @Body() body: CreateShopDto) {
    try {
      const shop = await this.tenancyService.createShop(auth.tenantId, {
        code: body.code,
        name: body.name,
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      });
      return {
        data: {
          id: shop.id,
          code: shop.code,
          name: shop.name,
          timezone: shop.timezone,
          is_active: shop.isActive,
        },
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Get('shops/:id')
  @RequirePermissions('shops:read')
  async getShop(@CurrentAuth() auth: RequestAuthContext, @Param('id') shopId: string) {
    try {
      const shop = await this.tenancyService.getShop(auth.tenantId, shopId);
      return {
        data: {
          id: shop.id,
          code: shop.code,
          name: shop.name,
          timezone: shop.timezone,
          is_active: shop.isActive,
        },
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Patch('shops/:id')
  @RequirePermissions('shops:write')
  async updateShop(
    @CurrentAuth() auth: RequestAuthContext,
    @Param('id') shopId: string,
    @Body() body: UpdateShopDto,
  ) {
    try {
      const shop = await this.tenancyService.updateShop(auth.tenantId, shopId, {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      });
      return {
        data: {
          id: shop.id,
          code: shop.code,
          name: shop.name,
          timezone: shop.timezone,
          is_active: shop.isActive,
        },
      };
    } catch (error) {
      mapError(error);
    }
  }
}
