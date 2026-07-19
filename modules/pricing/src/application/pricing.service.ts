import type {
  PricingRule,
  Discount,
  RushSurcharge,
  PriceCalculationInput,
  PriceCalculationResult,
} from '../domain/types';
import { PricingCalculator } from '../domain/pricing-calculator';
import { PricingDomainError } from '../domain/types';
import type {
  PricingRulesRepository,
  DiscountsRepository,
  RushSurchargesRepository,
} from './ports';

export class PricingService {
  constructor(
    private readonly rulesRepo: PricingRulesRepository,
    private readonly discountsRepo: DiscountsRepository,
    private readonly rushSurchargesRepo: RushSurchargesRepository,
    private readonly calculator: PricingCalculator = new PricingCalculator(),
  ) {}

  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    // Find the most specific pricing rule
    const rule = await this.findApplicableRule(input);

    // Find applicable discount
    let discount: Discount | null = null;
    if (input.discountCode) {
      discount = await this.discountsRepo.findByCode(input.tenantId, input.discountCode);
      if (!discount) {
        throw new PricingDomainError('Invalid discount code', 'pricing.invalid_discount', 404);
      }
    }

    // Find applicable rush surcharge
    let rushSurcharge: RushSurcharge | null = null;
    if (input.rushHoursBeforeDeadline !== undefined) {
      rushSurcharge = await this.rushSurchargesRepo.findByDeadline(
        input.tenantId,
        input.shopId,
        input.rushHoursBeforeDeadline,
      );
    }

    // Calculate price
    const breakdown = this.calculator.calculatePrice(input, rule, discount, rushSurcharge);

    // Increment discount usage if applied
    if (discount && breakdown.discountAmount.toCents() > 0) {
      await this.discountsRepo.incrementUsage(discount.id, input.tenantId);
    }

    return {
      breakdown: breakdown.toJSON() as PriceCalculationResult['breakdown'],
      appliedRule: rule,
      appliedDiscount: discount,
      appliedRushSurcharge: rushSurcharge,
      currency: 'USD', // TODO: Make configurable per tenant
    };
  }

  private async findApplicableRule(input: PriceCalculationInput): Promise<PricingRule | null> {
    // Try to find most specific rule first (tenant + shop + material + printer)
    let rule = await this.rulesRepo.findMostSpecific(
      input.tenantId,
      input.shopId,
      input.materialId,
      input.printerId,
    );

    // If no specific rule, try tenant + shop + material
    if (!rule && input.shopId && input.materialId) {
      rule = await this.rulesRepo.findByTenantShopMaterial(
        input.tenantId,
        input.shopId,
        input.materialId,
      );
    }

    // If no rule, try tenant + shop
    if (!rule && input.shopId) {
      rule = await this.rulesRepo.findByTenantShop(input.tenantId, input.shopId);
    }

    // If no rule, try tenant + material
    if (!rule && input.materialId) {
      rule = await this.rulesRepo.findByTenantMaterial(input.tenantId, input.materialId);
    }

    // If no rule, try tenant only
    if (!rule) {
      rule = await this.rulesRepo.findByTenant(input.tenantId);
    }

    return rule;
  }
}
