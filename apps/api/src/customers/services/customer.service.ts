import { Injectable, NotFoundException } from '@nestjs/common';

import type { Customer, CustomerListParams } from '../repositories/customer.repository';
import { CustomerRepository } from '../repositories/customer.repository';

@Injectable()
export class CustomerService {
  constructor(private repo: CustomerRepository) {}

  async create(data: {
    tenantId: string;
    shop_id: string;
    name: string;
    email?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    customer_type?: string;
    business_name?: string;
    tax_id?: string;
    notes?: string;
    created_by?: string;
    updated_by?: string;
  }): Promise<Customer> {
    return this.repo.create(data);
  }

  async findById(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.repo.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async list(params: CustomerListParams, tenantId: string) {
    return this.repo.list(params, tenantId);
  }

  async update(
    id: string,
    data: Partial<Omit<Customer, 'id' | 'tenant_id' | 'shop_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
  ): Promise<Customer> {
    const updated = await this.repo.update(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.repo.delete(id, tenantId);
  }
}
