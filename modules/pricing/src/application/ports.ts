import type { PricingRule, Discount, RushSurcharge } from '../domain/types';

export interface PricingRulesRepository {
  findMostSpecific(
    tenantId: string,
    shopId: string | undefined,
    materialId: string | undefined,
    printerId: string | undefined
  ): Promise<PricingRule | null>;
  findByTenantShopMaterial(
    tenantId: string,
    shopId: string,
    materialId: string
  ): Promise<PricingRule | null>;
  findByTenantShop(tenantId: string, shopId: string): Promise<PricingRule | null>;
  findByTenantMaterial(tenantId: string, materialId: string): Promise<PricingRule | null>;
  findByTenant(tenantId: string): Promise<PricingRule | null>;
  create(rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule>;
  update(id: string, tenantId: string, updates: Partial<PricingRule>): Promise<PricingRule>;
  delete(id: string, tenantId: string): Promise<void>;
  listByTenant(tenantId: string): Promise<PricingRule[]>;
}

export interface DiscountsRepository {
  findByCode(tenantId: string, code: string): Promise<Discount | null>;
  incrementUsage(id: string, tenantId: string): Promise<void>;
  create(discount: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>): Promise<Discount>;
  update(id: string, tenantId: string, updates: Partial<Discount>): Promise<Discount>;
  delete(id: string, tenantId: string): Promise<void>;
  listByTenant(tenantId: string): Promise<Discount[]>;
}

export interface RushSurchargesRepository {
  findByDeadline(
    tenantId: string,
    shopId: string | undefined,
    hoursBeforeDeadline: number
  ): Promise<RushSurcharge | null>;
  create(surcharge: Omit<RushSurcharge, 'id' | 'createdAt' | 'updatedAt'>): Promise<RushSurcharge>;
  update(id: string, tenantId: string, updates: Partial<RushSurcharge>): Promise<RushSurcharge>;
  delete(id: string, tenantId: string): Promise<void>;
  listByTenant(tenantId: string): Promise<RushSurcharge[]>;
}
