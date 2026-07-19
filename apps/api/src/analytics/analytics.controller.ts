import { Controller, Get, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { AnalyticsService } from './services/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('revenue')
  async getRevenue(
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    const data = await this.analyticsService.getRevenue(
      auth?.tenantId ?? '',
      shopId,
      parsedStartDate,
      parsedEndDate,
    );
    return { data };
  }

  @Get('materials')
  async getMaterialUsage(
    @Query('shopId') shopId?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const data = await this.analyticsService.getMaterialUsage(auth?.tenantId ?? '', shopId);
    return { data };
  }

  @Get('printers')
  async getPrinterUtilization(
    @Query('shopId') shopId?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const data = await this.analyticsService.getPrinterUtilization(auth?.tenantId ?? '', shopId);
    return { data };
  }

  @Get('orders')
  async getOrderStatus(
    @Query('shopId') shopId?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const data = await this.analyticsService.getOrderStatus(auth?.tenantId ?? '', shopId);
    return { data };
  }

  @Get('customers')
  async getCustomers(
    @Query('shopId') shopId?: string,
    @Query('limit') limit?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const data = await this.analyticsService.getCustomers(auth?.tenantId ?? '', shopId, parsedLimit);
    return { data };
  }

  @Get('profitability')
  async getProfitability(
    @Query('shopId') shopId?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const data = await this.analyticsService.getProfitability(auth?.tenantId ?? '', shopId);
    return { data };
  }

  @Get('daily-summary')
  async getDailySummary(
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : 90;

    const data = await this.analyticsService.getDailySummary(
      auth?.tenantId ?? '',
      shopId,
      parsedStartDate,
      parsedEndDate,
      parsedLimit,
    );
    return { data };
  }
}
