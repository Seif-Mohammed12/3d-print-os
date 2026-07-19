import { Injectable, NotFoundException } from '@nestjs/common';

import type { Order, OrderListParams } from '../repositories/order.repository';
import { OrderRepository } from '../repositories/order.repository';

@Injectable()
export class OrderService {
  constructor(private repo: OrderRepository) {}

  async createFromQuote(
    data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'order_number'> & { tenantId: string },
  ): Promise<Order> {
    return this.repo.createFromQuote(data);
  }

  async findById(id: string, tenantId: string): Promise<Order> {
    const order = await this.repo.findById(id, tenantId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async findByQuoteId(quoteId: string, tenantId: string): Promise<Order | null> {
    return this.repo.findByQuoteId(quoteId, tenantId);
  }

  async list(params: OrderListParams, tenantId: string) {
    return this.repo.list(params, tenantId);
  }

  async update(
    id: string,
    data: Partial<Omit<Order, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'order_number'>>,
    tenantId: string,
  ): Promise<Order> {
    const updated = await this.repo.update(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return updated;
  }

  // History methods
  async createHistory(
    orderId: string,
    data: Parameters<typeof this.repo.createHistory>[1],
    tenantId: string,
  ) {
    await this.findById(orderId, tenantId);
    return this.repo.createHistory(orderId, data, tenantId);
  }

  async getHistoryByOrder(orderId: string, tenantId: string) {
    await this.findById(orderId, tenantId);
    return this.repo.getHistoryByOrder(orderId, tenantId);
  }

  // Order items methods
  async createItem(
    orderId: string,
    data: Parameters<typeof this.repo.createItem>[1],
    tenantId: string,
  ) {
    await this.findById(orderId, tenantId);
    return this.repo.createItem(orderId, data, tenantId);
  }

  async getItemsByOrder(orderId: string, tenantId: string) {
    await this.findById(orderId, tenantId);
    return this.repo.getItemsByOrder(orderId, tenantId);
  }

  async updateItem(
    id: string,
    data: Parameters<typeof this.repo.updateItem>[1],
    tenantId: string,
  ) {
    const updated = await this.repo.updateItem(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Order item with ID ${id} not found`);
    }
    return updated;
  }
}
