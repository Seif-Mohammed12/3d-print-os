import type { TenancyRepository } from '../infrastructure/tenancy.repository';

export class TenancyDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'TenancyDomainError';
  }
}

export class TenancyService {
  constructor(private readonly repo: TenancyRepository) {}

  async getCurrentTenant(tenantId: string) {
    const tenant = await this.repo.withTenant(tenantId, (client) =>
      this.repo.getTenant(client, tenantId),
    );
    if (!tenant) {
      throw new TenancyDomainError('Tenant not found', 'tenant.not_found', 404);
    }
    return tenant;
  }

  async updateCurrentTenant(
    tenantId: string,
    input: { name?: string; timezone?: string; defaultCurrency?: string; taxRateBps?: number },
  ) {
    const tenant = await this.repo.withTenant(tenantId, (client) =>
      this.repo.updateTenant(client, tenantId, input),
    );
    if (!tenant) {
      throw new TenancyDomainError('Tenant not found', 'tenant.not_found', 404);
    }
    return tenant;
  }

  listShops(tenantId: string) {
    return this.repo.withTenant(tenantId, (client) => this.repo.listShops(client, tenantId));
  }

  async createShop(tenantId: string, input: { code: string; name: string; timezone?: string }) {
    try {
      return await this.repo.withTenant(tenantId, (client) =>
        this.repo.createShop(client, { tenantId, ...input }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('shops') && message.toLowerCase().includes('unique')) {
        throw new TenancyDomainError('Shop code already exists', 'shop.code_taken', 409);
      }
      throw error;
    }
  }

  async getShop(tenantId: string, shopId: string) {
    const shop = await this.repo.withTenant(tenantId, (client) =>
      this.repo.getShop(client, tenantId, shopId),
    );
    if (!shop) {
      throw new TenancyDomainError('Shop not found', 'shop.not_found', 404);
    }
    return shop;
  }

  async updateShop(
    tenantId: string,
    shopId: string,
    input: { name?: string; timezone?: string; isActive?: boolean },
  ) {
    const shop = await this.repo.withTenant(tenantId, (client) =>
      this.repo.updateShop(client, tenantId, shopId, input),
    );
    if (!shop) {
      throw new TenancyDomainError('Shop not found', 'shop.not_found', 404);
    }
    return shop;
  }
}
