import type { Pool, PoolClient } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

export interface Material {
  id: string;
  tenant_id: string;
  name: string;
  brand: string | null;
  material_type: string;
  color: string | null;
  color_code: string | null;
  density_g_per_cm3: number;
  price_per_gram_cents: number;
  price_per_kg_cents: number;
  nozzle_temperature_min_celsius: number | null;
  nozzle_temperature_max_celsius: number | null;
  bed_temperature_min_celsius: number | null;
  bed_temperature_max_celsius: number | null;
  chamber_temperature_celsius: number | null;
  recommended_layer_height_mm: number | null;
  recommended_infill_percentage: number | null;
  print_speed_mm_per_min: number | null;
  tensile_strength_mpa: number | null;
  flexural_strength_mpa: number | null;
  impact_strength_j_per_m: number | null;
  elongation_at_break_percentage: number | null;
  storage_conditions: string | null;
  shelf_life_months: number | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaterialCompatibility {
  id: string;
  material_id: string;
  printer_id: string;
  is_compatible: boolean;
  override_nozzle_temperature_celsius: number | null;
  override_bed_temperature_celsius: number | null;
  override_print_speed_mm_per_min: number | null;
  notes: string | null;
  created_at: Date;
}

export interface MaterialListParams {
  materialType?: string;
  brand?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

/**
 * Compatibility rows have no tenant_id; both the material and the printer they link
 * must belong to the tenant. `tenantParam` is the placeholder index holding the tenant id.
 */
function compatibilityInTenant(tenantParam: number): string {
  return `material_id IN (SELECT id FROM materials WHERE tenant_id = $${tenantParam})
    AND printer_id IN (SELECT id FROM printers WHERE tenant_id = $${tenantParam})`;
}

async function belongsToTenant(
  client: PoolClient,
  table: 'materials' | 'printers',
  id: string,
  tenantId: string,
): Promise<boolean> {
  const result = await client.query(`SELECT 1 FROM ${table} WHERE id = $1 AND tenant_id = $2`, [
    id,
    tenantId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export class MaterialRepository {
  constructor(private pool: Pool) {}

  async create(
    data: Omit<Material, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'price_per_kg_cents'> & { tenantId: string },
  ): Promise<Material> {
    const result = await withTenantSession(this.pool, { tenantId: data.tenantId }, async (client) => {
      const insertResult = await client.query<Material>(
        `INSERT INTO materials (
          tenant_id, name, brand, material_type, color, color_code, density_g_per_cm3, price_per_gram_cents,
          nozzle_temperature_min_celsius, nozzle_temperature_max_celsius,
          bed_temperature_min_celsius, bed_temperature_max_celsius, chamber_temperature_celsius,
          recommended_layer_height_mm, recommended_infill_percentage, print_speed_mm_per_min,
          tensile_strength_mpa, flexural_strength_mpa, impact_strength_j_per_m, elongation_at_break_percentage,
          storage_conditions, shelf_life_months, is_active, notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *`,
        [
          data.tenantId,
          data.name,
          data.brand ?? null,
          data.material_type,
          data.color ?? null,
          data.color_code ?? null,
          data.density_g_per_cm3,
          data.price_per_gram_cents,
          data.nozzle_temperature_min_celsius ?? null,
          data.nozzle_temperature_max_celsius ?? null,
          data.bed_temperature_min_celsius ?? null,
          data.bed_temperature_max_celsius ?? null,
          data.chamber_temperature_celsius ?? null,
          data.recommended_layer_height_mm ?? null,
          data.recommended_infill_percentage ?? null,
          data.print_speed_mm_per_min ?? null,
          data.tensile_strength_mpa ?? null,
          data.flexural_strength_mpa ?? null,
          data.impact_strength_j_per_m ?? null,
          data.elongation_at_break_percentage ?? null,
          data.storage_conditions ?? null,
          data.shelf_life_months ?? null,
          data.is_active ?? true,
          data.notes ?? null,
          data.created_by ?? null,
          data.updated_by ?? null,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create material');
    }

    return result;
  }

  async findById(id: string, tenantId: string): Promise<Material | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<Material>(
        'SELECT * FROM materials WHERE id = $1 AND tenant_id = $2',
        [id, tenantId],
      );
      return queryResult.rows[0] ?? null;
    });

    return result;
  }

  async list(params: MaterialListParams, tenantId: string): Promise<{
    data: Material[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (params.materialType) {
      conditions.push(`material_type = $${paramIndex}`);
      values.push(params.materialType);
      paramIndex++;
    }

    if (params.brand) {
      conditions.push(`brand = $${paramIndex}`);
      values.push(params.brand);
      paramIndex++;
    }

    if (params.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(params.isActive);
      paramIndex++;
    }

    if (params.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex} OR material_type ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const [dataResult, countResult] = await Promise.all([
        client.query<Material>(
          `SELECT * FROM materials ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...values, perPage, offset],
        ),
        client.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM materials ${whereClause}`,
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
    data: Partial<Omit<Material, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'price_per_kg_cents'>>,
    tenantId: string,
  ): Promise<Material | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }
      if (data.brand !== undefined) {
        updates.push(`brand = $${paramIndex}`);
        values.push(data.brand);
        paramIndex++;
      }
      if (data.material_type !== undefined) {
        updates.push(`material_type = $${paramIndex}`);
        values.push(data.material_type);
        paramIndex++;
      }
      if (data.color !== undefined) {
        updates.push(`color = $${paramIndex}`);
        values.push(data.color);
        paramIndex++;
      }
      if (data.color_code !== undefined) {
        updates.push(`color_code = $${paramIndex}`);
        values.push(data.color_code);
        paramIndex++;
      }
      if (data.density_g_per_cm3 !== undefined) {
        updates.push(`density_g_per_cm3 = $${paramIndex}`);
        values.push(data.density_g_per_cm3);
        paramIndex++;
      }
      if (data.price_per_gram_cents !== undefined) {
        updates.push(`price_per_gram_cents = $${paramIndex}`);
        values.push(data.price_per_gram_cents);
        paramIndex++;
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
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

      const updateResult = await client.query<Material>(
        `UPDATE materials SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const deleteResult = await client.query(
        'DELETE FROM materials WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, tenantId],
      );
      return Boolean(deleteResult.rowCount && deleteResult.rowCount > 0);
    });

    return result;
  }

  // Compatibility methods
  async createCompatibility(
    materialId: string,
    data: Omit<MaterialCompatibility, 'id' | 'material_id' | 'created_at'>,
    tenantId: string,
  ): Promise<MaterialCompatibility> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const [materialOwned, printerOwned] = await Promise.all([
        belongsToTenant(client, 'materials', materialId, tenantId),
        belongsToTenant(client, 'printers', data.printer_id, tenantId),
      ]);
      if (!materialOwned || !printerOwned) {
        return undefined;
      }
      const insertResult = await client.query<MaterialCompatibility>(
        `INSERT INTO material_printer_compatibility (material_id, printer_id, is_compatible, override_nozzle_temperature_celsius, override_bed_temperature_celsius, override_print_speed_mm_per_min, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          materialId,
          data.printer_id,
          data.is_compatible,
          data.override_nozzle_temperature_celsius ?? null,
          data.override_bed_temperature_celsius ?? null,
          data.override_print_speed_mm_per_min ?? null,
          data.notes ?? null,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create material compatibility');
    }

    return result;
  }

  async getCompatibilitiesByMaterial(materialId: string, tenantId: string): Promise<MaterialCompatibility[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<MaterialCompatibility>(
        `SELECT * FROM material_printer_compatibility
         WHERE material_id = $1 AND ${compatibilityInTenant(2)}
         ORDER BY is_compatible DESC, printer_id`,
        [materialId, tenantId],
      );
      return queryResult.rows;
    });

    return result;
  }

  async updateCompatibility(
    id: string,
    data: Partial<Omit<MaterialCompatibility, 'id' | 'material_id' | 'created_at'>>,
    tenantId: string,
  ): Promise<MaterialCompatibility | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.is_compatible !== undefined) {
        updates.push(`is_compatible = $${paramIndex}`);
        values.push(data.is_compatible);
        paramIndex++;
      }
      if (data.override_nozzle_temperature_celsius !== undefined) {
        updates.push(`override_nozzle_temperature_celsius = $${paramIndex}`);
        values.push(data.override_nozzle_temperature_celsius);
        paramIndex++;
      }
      if (data.override_bed_temperature_celsius !== undefined) {
        updates.push(`override_bed_temperature_celsius = $${paramIndex}`);
        values.push(data.override_bed_temperature_celsius);
        paramIndex++;
      }
      if (data.override_print_speed_mm_per_min !== undefined) {
        updates.push(`override_print_speed_mm_per_min = $${paramIndex}`);
        values.push(data.override_print_speed_mm_per_min);
        paramIndex++;
      }
      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        values.push(data.notes);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      const updateResult = await client.query<MaterialCompatibility>(
        `UPDATE material_printer_compatibility SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND ${compatibilityInTenant(paramIndex + 1)}
         RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async deleteCompatibility(id: string, tenantId: string): Promise<boolean> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const deleteResult = await client.query(
        `DELETE FROM material_printer_compatibility
         WHERE id = $1 AND ${compatibilityInTenant(2)}
         RETURNING id`,
        [id, tenantId],
      );
      return Boolean(deleteResult.rowCount && deleteResult.rowCount > 0);
    });

    return result;
  }
}
