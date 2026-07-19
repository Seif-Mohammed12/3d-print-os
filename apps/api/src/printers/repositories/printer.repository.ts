import type { Pool, QueryResult } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

export interface Printer {
  id: string;
  tenant_id: string;
  shop_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  technology: string;
  build_volume_x_mm: number;
  build_volume_y_mm: number;
  build_volume_z_mm: number;
  nozzle_diameter_mm: number | null;
  laser_wavelength_nm: number | null;
  layer_resolution_min_mm: number | null;
  layer_resolution_max_mm: number | null;
  max_speed_mm_per_min: number | null;
  typical_speed_mm_per_min: number | null;
  supported_materials: unknown[];
  status: string;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PrinterProfile {
  id: string;
  printer_id: string;
  name: string;
  description: string | null;
  material_type: string;
  layer_height_mm: number;
  infill_percentage: number;
  wall_count: number | null;
  top_layers: number | null;
  bottom_layers: number | null;
  nozzle_temperature_celsius: number | null;
  bed_temperature_celsius: number | null;
  chamber_temperature_celsius: number | null;
  print_speed_mm_per_min: number | null;
  travel_speed_mm_per_min: number | null;
  retraction_distance_mm: number | null;
  retraction_speed_mm_per_min: number | null;
  support_enabled: boolean;
  support_type: string | null;
  support_density_percentage: number | null;
  support_angle_degrees: number | null;
  post_process_steps: unknown[];
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PrinterCapability {
  id: string;
  printer_id: string;
  capability_type: string;
  capability_name: string;
  description: string | null;
  is_supported: boolean;
  specifications: unknown;
  created_at: Date;
}

export interface PrinterListParams {
  shopId?: string;
  status?: string;
  technology?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export class PrinterRepository {
  constructor(private pool: Pool) {}

  async create(
    data: Omit<Printer, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & { tenantId: string },
  ): Promise<Printer> {
    const result = await withTenantSession(
      this.pool,
      { tenantId: data.tenantId },
      async (client) => {
        const insertResult = await client.query<Printer>(
          `INSERT INTO printers (
            tenant_id, shop_id, name, manufacturer, model, serial_number, technology,
            build_volume_x_mm, build_volume_y_mm, build_volume_z_mm,
            nozzle_diameter_mm, laser_wavelength_nm, layer_resolution_min_mm, layer_resolution_max_mm,
            max_speed_mm_per_min, typical_speed_mm_per_min, supported_materials,
            status, location, notes, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          RETURNING *`,
          [
            data.tenantId,
            data.shop_id,
            data.name,
            data.manufacturer ?? null,
            data.model ?? null,
            data.serial_number ?? null,
            data.technology,
            data.build_volume_x_mm,
            data.build_volume_y_mm,
            data.build_volume_z_mm,
            data.nozzle_diameter_mm ?? null,
            data.laser_wavelength_nm ?? null,
            data.layer_resolution_min_mm ?? null,
            data.layer_resolution_max_mm ?? null,
            data.max_speed_mm_per_min ?? null,
            data.typical_speed_mm_per_min ?? null,
            JSON.stringify(data.supported_materials ?? []),
            data.status ?? 'active',
            data.location ?? null,
            data.notes ?? null,
            data.created_by ?? null,
            data.updated_by ?? null,
          ],
        );

        return insertResult.rows[0];
      },
    );

    if (!result) {
      throw new Error('Failed to create printer');
    }

    return result;
  }

  async findById(id: string, tenantId: string): Promise<Printer | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<Printer>('SELECT * FROM printers WHERE id = $1', [id]);
      return queryResult.rows[0] ?? null;
    });

    return result;
  }

  async list(
    params: PrinterListParams,
    tenantId: string,
  ): Promise<{
    data: Printer[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.shopId) {
      conditions.push(`shop_id = $${paramIndex}`);
      values.push(params.shopId);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.technology) {
      conditions.push(`technology = $${paramIndex}`);
      values.push(params.technology);
      paramIndex++;
    }

    if (params.search) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR manufacturer ILIKE $${paramIndex} OR model ILIKE $${paramIndex})`,
      );
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const [dataResult, countResult] = await Promise.all([
        client.query<Printer>(
          `SELECT * FROM printers ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...values, perPage, offset],
        ),
        client.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM printers ${whereClause}`,
          values,
        ),
      ]);

      return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      };
    });

    return {
      ...result,
      page,
      perPage,
    };
  }

  async update(
    id: string,
    data: Partial<Omit<Printer, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
  ): Promise<Printer | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }
      if (data.manufacturer !== undefined) {
        updates.push(`manufacturer = $${paramIndex}`);
        values.push(data.manufacturer);
        paramIndex++;
      }
      if (data.model !== undefined) {
        updates.push(`model = $${paramIndex}`);
        values.push(data.model);
        paramIndex++;
      }
      if (data.serial_number !== undefined) {
        updates.push(`serial_number = $${paramIndex}`);
        values.push(data.serial_number);
        paramIndex++;
      }
      if (data.technology !== undefined) {
        updates.push(`technology = $${paramIndex}`);
        values.push(data.technology);
        paramIndex++;
      }
      if (data.build_volume_x_mm !== undefined) {
        updates.push(`build_volume_x_mm = $${paramIndex}`);
        values.push(data.build_volume_x_mm);
        paramIndex++;
      }
      if (data.build_volume_y_mm !== undefined) {
        updates.push(`build_volume_y_mm = $${paramIndex}`);
        values.push(data.build_volume_y_mm);
        paramIndex++;
      }
      if (data.build_volume_z_mm !== undefined) {
        updates.push(`build_volume_z_mm = $${paramIndex}`);
        values.push(data.build_volume_z_mm);
        paramIndex++;
      }
      if (data.nozzle_diameter_mm !== undefined) {
        updates.push(`nozzle_diameter_mm = $${paramIndex}`);
        values.push(data.nozzle_diameter_mm);
        paramIndex++;
      }
      if (data.laser_wavelength_nm !== undefined) {
        updates.push(`laser_wavelength_nm = $${paramIndex}`);
        values.push(data.laser_wavelength_nm);
        paramIndex++;
      }
      if (data.layer_resolution_min_mm !== undefined) {
        updates.push(`layer_resolution_min_mm = $${paramIndex}`);
        values.push(data.layer_resolution_min_mm);
        paramIndex++;
      }
      if (data.layer_resolution_max_mm !== undefined) {
        updates.push(`layer_resolution_max_mm = $${paramIndex}`);
        values.push(data.layer_resolution_max_mm);
        paramIndex++;
      }
      if (data.max_speed_mm_per_min !== undefined) {
        updates.push(`max_speed_mm_per_min = $${paramIndex}`);
        values.push(data.max_speed_mm_per_min);
        paramIndex++;
      }
      if (data.typical_speed_mm_per_min !== undefined) {
        updates.push(`typical_speed_mm_per_min = $${paramIndex}`);
        values.push(data.typical_speed_mm_per_min);
        paramIndex++;
      }
      if (data.supported_materials !== undefined) {
        updates.push(`supported_materials = $${paramIndex}`);
        values.push(JSON.stringify(data.supported_materials));
        paramIndex++;
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }
      if (data.location !== undefined) {
        updates.push(`location = $${paramIndex}`);
        values.push(data.location);
        paramIndex++;
      }
      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        values.push(data.notes);
        paramIndex++;
      }
      if (data.updated_by !== undefined) {
        updates.push(`updated_by = $${paramIndex}`);
        values.push(data.updated_by);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      updates.push(`updated_at = NOW()`);

      const updateResult = await client.query<Printer>(
        `UPDATE printers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        [...values, id],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const deleteResult = await client.query('DELETE FROM printers WHERE id = $1 RETURNING id', [
        id,
      ]);
      return (deleteResult.rowCount ?? 0) > 0;
    });

    return result;
  }

  // Profile methods
  async createProfile(
    printerId: string,
    data: Omit<PrinterProfile, 'id' | 'printer_id' | 'created_at' | 'updated_at'>,
    tenantId: string,
  ): Promise<PrinterProfile> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const insertResult = await client.query<PrinterProfile>(
        `INSERT INTO printer_profiles (
          printer_id, name, description, material_type, layer_height_mm, infill_percentage,
          wall_count, top_layers, bottom_layers, nozzle_temperature_celsius, bed_temperature_celsius,
          chamber_temperature_celsius, print_speed_mm_per_min, travel_speed_mm_per_min,
          retraction_distance_mm, retraction_speed_mm_per_min, support_enabled, support_type,
          support_density_percentage, support_angle_degrees, post_process_steps, is_default, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *`,
        [
          printerId,
          data.name,
          data.description ?? null,
          data.material_type,
          data.layer_height_mm,
          data.infill_percentage,
          data.wall_count ?? null,
          data.top_layers ?? null,
          data.bottom_layers ?? null,
          data.nozzle_temperature_celsius ?? null,
          data.bed_temperature_celsius ?? null,
          data.chamber_temperature_celsius ?? null,
          data.print_speed_mm_per_min ?? null,
          data.travel_speed_mm_per_min ?? null,
          data.retraction_distance_mm ?? null,
          data.retraction_speed_mm_per_min ?? null,
          data.support_enabled ?? false,
          data.support_type ?? null,
          data.support_density_percentage ?? null,
          data.support_angle_degrees ?? null,
          JSON.stringify(data.post_process_steps ?? []),
          data.is_default ?? false,
          data.is_active ?? true,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create printer profile');
    }

    return result;
  }

  async getProfilesByPrinter(printerId: string, tenantId: string): Promise<PrinterProfile[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<PrinterProfile>(
        'SELECT * FROM printer_profiles WHERE printer_id = $1 ORDER BY is_default DESC, name',
        [printerId],
      );
      return queryResult.rows;
    });

    return result;
  }

  async updateProfile(
    id: string,
    data: Partial<Omit<PrinterProfile, 'id' | 'printer_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
  ): Promise<PrinterProfile | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }
      if (data.material_type !== undefined) {
        updates.push(`material_type = $${paramIndex}`);
        values.push(data.material_type);
        paramIndex++;
      }
      if (data.layer_height_mm !== undefined) {
        updates.push(`layer_height_mm = $${paramIndex}`);
        values.push(data.layer_height_mm);
        paramIndex++;
      }
      if (data.infill_percentage !== undefined) {
        updates.push(`infill_percentage = $${paramIndex}`);
        values.push(data.infill_percentage);
        paramIndex++;
      }
      if (data.is_default !== undefined) {
        updates.push(`is_default = $${paramIndex}`);
        values.push(data.is_default);
        paramIndex++;
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      updates.push(`updated_at = NOW()`);

      const updateResult = await client.query<PrinterProfile>(
        `UPDATE printer_profiles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        [...values, id],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async deleteProfile(id: string, tenantId: string): Promise<boolean> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const deleteResult = await client.query(
        'DELETE FROM printer_profiles WHERE id = $1 RETURNING id',
        [id],
      );
      return Boolean(deleteResult.rowCount && deleteResult.rowCount > 0);
    });

    return result;
  }

  // Capability methods
  async createCapability(
    printerId: string,
    data: Omit<PrinterCapability, 'id' | 'printer_id' | 'created_at'>,
    tenantId: string,
  ): Promise<PrinterCapability> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const insertResult = await client.query<PrinterCapability>(
        `INSERT INTO printer_capabilities (printer_id, capability_type, capability_name, description, is_supported, specifications)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          printerId,
          data.capability_type,
          data.capability_name,
          data.description ?? null,
          data.is_supported,
          JSON.stringify(data.specifications ?? {}),
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create printer capability');
    }

    return result;
  }

  async getCapabilitiesByPrinter(
    printerId: string,
    tenantId: string,
  ): Promise<PrinterCapability[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<PrinterCapability>(
        'SELECT * FROM printer_capabilities WHERE printer_id = $1 ORDER BY capability_type',
        [printerId],
      );
      return queryResult.rows;
    });

    return result;
  }

  async updateCapability(
    id: string,
    data: Partial<Omit<PrinterCapability, 'id' | 'printer_id' | 'created_at'>>,
    tenantId: string,
  ): Promise<PrinterCapability | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.capability_type !== undefined) {
        updates.push(`capability_type = $${paramIndex}`);
        values.push(data.capability_type);
        paramIndex++;
      }
      if (data.capability_name !== undefined) {
        updates.push(`capability_name = $${paramIndex}`);
        values.push(data.capability_name);
        paramIndex++;
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }
      if (data.is_supported !== undefined) {
        updates.push(`is_supported = $${paramIndex}`);
        values.push(data.is_supported);
        paramIndex++;
      }
      if (data.specifications !== undefined) {
        updates.push(`specifications = $${paramIndex}`);
        values.push(JSON.stringify(data.specifications));
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      const updateResult = await client.query<PrinterCapability>(
        `UPDATE printer_capabilities SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        [...values, id],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async deleteCapability(id: string, tenantId: string): Promise<boolean> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const deleteResult = await client.query(
        'DELETE FROM printer_capabilities WHERE id = $1 RETURNING id',
        [id],
      );
      return Boolean(deleteResult.rowCount && deleteResult.rowCount > 0);
    });

    return result;
  }
}
