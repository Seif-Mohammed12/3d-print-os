import { Injectable, NotFoundException } from '@nestjs/common';

import type { Material, MaterialListParams } from '../repositories/material.repository';
import { MaterialRepository } from '../repositories/material.repository';

@Injectable()
export class MaterialService {
  constructor(private repo: MaterialRepository) {}

  async create(
    data: Omit<Material, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'price_per_kg_cents'> & { tenantId: string },
  ): Promise<Material> {
    return this.repo.create(data);
  }

  async findById(id: string, tenantId: string): Promise<Material> {
    const material = await this.repo.findById(id, tenantId);
    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }
    return material;
  }

  async list(params: MaterialListParams, tenantId: string) {
    return this.repo.list(params, tenantId);
  }

  async update(
    id: string,
    data: Partial<Omit<Material, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'price_per_kg_cents'>>,
    tenantId: string,
  ): Promise<Material> {
    const updated = await this.repo.update(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const deleted = await this.repo.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }
  }

  // Compatibility methods
  async createCompatibility(
    materialId: string,
    data: Parameters<typeof this.repo.createCompatibility>[1],
    tenantId: string,
  ) {
    await this.findById(materialId, tenantId);
    return this.repo.createCompatibility(materialId, data, tenantId);
  }

  async getCompatibilitiesByMaterial(materialId: string, tenantId: string) {
    await this.findById(materialId, tenantId);
    return this.repo.getCompatibilitiesByMaterial(materialId, tenantId);
  }

  async updateCompatibility(
    id: string,
    data: Parameters<typeof this.repo.updateCompatibility>[1],
    tenantId: string,
  ) {
    const updated = await this.repo.updateCompatibility(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Material compatibility with ID ${id} not found`);
    }
    return updated;
  }

  async deleteCompatibility(id: string, tenantId: string): Promise<void> {
    const deleted = await this.repo.deleteCompatibility(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Material compatibility with ID ${id} not found`);
    }
  }
}
