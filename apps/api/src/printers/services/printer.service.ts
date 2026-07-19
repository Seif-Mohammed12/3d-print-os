import { Injectable, NotFoundException } from '@nestjs/common';

import type { Printer, PrinterListParams } from '../repositories/printer.repository';
import { PrinterRepository } from '../repositories/printer.repository';

@Injectable()
export class PrinterService {
  constructor(private repo: PrinterRepository) {}

  async create(
    data: Omit<Printer, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & { tenantId: string },
  ): Promise<Printer> {
    return this.repo.create(data);
  }

  async findById(id: string, tenantId: string): Promise<Printer> {
    const printer = await this.repo.findById(id, tenantId);
    if (!printer) {
      throw new NotFoundException(`Printer with ID ${id} not found`);
    }
    return printer;
  }

  async list(params: PrinterListParams, tenantId: string) {
    return this.repo.list(params, tenantId);
  }

  async update(
    id: string,
    data: Partial<Omit<Printer, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
  ): Promise<Printer> {
    const updated = await this.repo.update(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Printer with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const deleted = await this.repo.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Printer with ID ${id} not found`);
    }
  }

  // Profile methods
  async createProfile(
    printerId: string,
    data: Parameters<typeof this.repo.createProfile>[1],
    tenantId: string,
  ) {
    await this.findById(printerId, tenantId);
    return this.repo.createProfile(printerId, data, tenantId);
  }

  async getProfilesByPrinter(printerId: string, tenantId: string) {
    await this.findById(printerId, tenantId);
    return this.repo.getProfilesByPrinter(printerId, tenantId);
  }

  async updateProfile(
    id: string,
    data: Parameters<typeof this.repo.updateProfile>[1],
    tenantId: string,
  ) {
    const updated = await this.repo.updateProfile(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Printer profile with ID ${id} not found`);
    }
    return updated;
  }

  async deleteProfile(id: string, tenantId: string): Promise<void> {
    const deleted = await this.repo.deleteProfile(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Printer profile with ID ${id} not found`);
    }
  }

  // Capability methods
  async createCapability(
    printerId: string,
    data: Parameters<typeof this.repo.createCapability>[1],
    tenantId: string,
  ) {
    await this.findById(printerId, tenantId);
    return this.repo.createCapability(printerId, data, tenantId);
  }

  async getCapabilitiesByPrinter(printerId: string, tenantId: string) {
    await this.findById(printerId, tenantId);
    return this.repo.getCapabilitiesByPrinter(printerId, tenantId);
  }

  async updateCapability(
    id: string,
    data: Parameters<typeof this.repo.updateCapability>[1],
    tenantId: string,
  ) {
    const updated = await this.repo.updateCapability(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Printer capability with ID ${id} not found`);
    }
    return updated;
  }

  async deleteCapability(id: string, tenantId: string): Promise<void> {
    const deleted = await this.repo.deleteCapability(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Printer capability with ID ${id} not found`);
    }
  }
}
