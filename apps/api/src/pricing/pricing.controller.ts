import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { PricingService } from './services/pricing.service';
import { CreatePricingRuleDto, UpdatePricingRuleDto, PricingRuleListQueryDto } from './dto/pricing.dto';

@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Post('rules')
  async createRule(@Body() dto: CreatePricingRuleDto, @CurrentAuth() auth: RequestAuthContext) {
    const rule = await this.pricingService.create({
      ...dto,
      tenantId: auth.tenantId,
    });
    return { data: rule };
  }

  @Get('rules')
  async listRules(@Query() query: PricingRuleListQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    const result = await this.pricingService.list(
      {
        shop_id: query.shop_id,
        material_id: query.material_id,
        printer_id: query.printer_id,
        is_active: query.is_active,
        search: query.search,
        page: query.page,
        per_page: query.per_page,
      },
      auth.tenantId,
    );
    return { data: result.data, meta: { total: result.total, page: result.page, per_page: result.per_page, total_pages: Math.ceil(result.total / result.per_page) } };
  }

  @Get('rules/:id')
  async getRule(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const rule = await this.pricingService.findById(id, auth.tenantId);
    return { data: rule };
  }

  @Patch('rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto, @CurrentAuth() auth: RequestAuthContext) {
    const rule = await this.pricingService.update(id, dto, auth.tenantId);
    return { data: rule };
  }
}
