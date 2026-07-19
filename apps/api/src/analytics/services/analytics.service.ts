import { Injectable } from '@nestjs/common';

import { AnalyticsRepository } from '../repositories/analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private repo: AnalyticsRepository) {}

  async getRevenue(tenantId: string, shopId?: string, startDate?: Date, endDate?: Date) {
    return this.repo.getRevenueAnalytics(tenantId, shopId, startDate, endDate);
  }

  async getMaterialUsage(tenantId: string, shopId?: string) {
    return this.repo.getMaterialUsageAnalytics(tenantId, shopId);
  }

  async getPrinterUtilization(tenantId: string, shopId?: string) {
    return this.repo.getPrinterUtilizationAnalytics(tenantId, shopId);
  }

  async getOrderStatus(tenantId: string, shopId?: string) {
    return this.repo.getOrderStatusAnalytics(tenantId, shopId);
  }

  async getCustomers(tenantId: string, shopId?: string, limit: number = 50) {
    return this.repo.getCustomerAnalytics(tenantId, shopId, limit);
  }

  async getProfitability(tenantId: string, shopId?: string) {
    return this.repo.getProfitabilityAnalytics(tenantId, shopId);
  }

  async getDailySummary(tenantId: string, shopId?: string, startDate?: Date, endDate?: Date, limit: number = 90) {
    return this.repo.getDailySummaryAnalytics(tenantId, shopId, startDate, endDate, limit);
  }
}
