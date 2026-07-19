import type { PricingService } from '../application/pricing.service';
import { PricingDomainError } from '../domain/types';
import type {
  CalculatePriceRequest,
  CreatePricingRuleRequest,
  UpdatePricingRuleRequest,
  CreateDiscountRequest,
  CreateRushSurchargeRequest,
} from './dto';
import type {
  PricingRulesRepository,
  DiscountsRepository,
  RushSurchargesRepository,
} from '../application/ports';
import type { PricingRule, Discount, RushSurcharge } from '../domain/types';

export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly rulesRepo: PricingRulesRepository,
    private readonly discountsRepo: DiscountsRepository,
    private readonly rushSurchargesRepo: RushSurchargesRepository,
  ) {}

  async calculatePrice(request: CalculatePriceRequest) {
    try {
      const result = await this.pricingService.calculatePrice(request);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof PricingDomainError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
          },
        };
      }
      throw error;
    }
  }

  async createPricingRule(request: CreatePricingRuleRequest): Promise<PricingRule> {
    return this.rulesRepo.create({
      tenantId: request.tenantId,
      shopId: request.shopId || null,
      materialId: request.materialId || null,
      printerId: request.printerId || null,
      priority: request.priority || 0,
      materialCostPerGram: request.materialCostPerGram || 0,
      materialCostPerMm3: request.materialCostPerMm3 || 0,
      machineTimeCostPerMinute: request.machineTimeCostPerMinute || 0,
      electricityCostPerHour: request.electricityCostPerHour || 0,
      maintenanceCostPerHour: request.maintenanceCostPerHour || 0,
      failureRiskPercentage: request.failureRiskPercentage || 0,
      postProcessingCostPerUnit: request.postProcessingCostPerUnit || 0,
      postProcessingFixedCost: request.postProcessingFixedCost || 0,
      profitMarginPercentage: request.profitMarginPercentage || 20,
      minimumPrice: request.minimumPrice || 0,
      isActive: request.isActive !== undefined ? request.isActive : true,
      deletedAt: null,
    });
  }

  async updatePricingRule(
    id: string,
    tenantId: string,
    request: UpdatePricingRuleRequest,
  ): Promise<PricingRule> {
    return this.rulesRepo.update(id, tenantId, request);
  }

  async deletePricingRule(id: string, tenantId: string): Promise<void> {
    return this.rulesRepo.delete(id, tenantId);
  }

  async listPricingRules(tenantId: string): Promise<PricingRule[]> {
    return this.rulesRepo.listByTenant(tenantId);
  }

  async createDiscount(request: CreateDiscountRequest): Promise<Discount> {
    return this.discountsRepo.create({
      tenantId: request.tenantId,
      shopId: request.shopId || null,
      code: request.code,
      discountType: request.discountType,
      discountValue: request.discountValue,
      maxUses: request.maxUses || null,
      currentUses: 0,
      validFrom: request.validFrom ? new Date(request.validFrom) : new Date(),
      validUntil: request.validUntil ? new Date(request.validUntil) : null,
      minimumOrderValue: request.minimumOrderValue || null,
      applicableMaterials: request.applicableMaterials || null,
      applicablePrinters: request.applicablePrinters || null,
      isActive: request.isActive !== undefined ? request.isActive : true,
      deletedAt: null,
    });
  }

  async listDiscounts(tenantId: string): Promise<Discount[]> {
    return this.discountsRepo.listByTenant(tenantId);
  }

  async deleteDiscount(id: string, tenantId: string): Promise<void> {
    return this.discountsRepo.delete(id, tenantId);
  }

  async createRushSurcharge(request: CreateRushSurchargeRequest): Promise<RushSurcharge> {
    return this.rushSurchargesRepo.create({
      tenantId: request.tenantId,
      shopId: request.shopId || null,
      tierName: request.tierName,
      hoursBeforeDeadline: request.hoursBeforeDeadline,
      surchargeType: request.surchargeType,
      surchargeValue: request.surchargeValue,
      isActive: request.isActive !== undefined ? request.isActive : true,
      deletedAt: null,
    });
  }

  async listRushSurcharges(tenantId: string): Promise<RushSurcharge[]> {
    return this.rushSurchargesRepo.listByTenant(tenantId);
  }

  async deleteRushSurcharge(id: string, tenantId: string): Promise<void> {
    return this.rushSurchargesRepo.delete(id, tenantId);
  }
}
