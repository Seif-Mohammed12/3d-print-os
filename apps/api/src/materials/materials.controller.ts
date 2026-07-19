import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import {
  CreateMaterialCompatibilityDto,
  CreateMaterialDto,
  MaterialListQueryDto,
  UpdateMaterialCompatibilityDto,
  UpdateMaterialDto,
} from './dto/material.dto';
import { MaterialService } from './services/material.service';

@Controller('materials')
export class MaterialsController {
  constructor(private materialService: MaterialService) {}

  @Post()
  async create(@Body() dto: CreateMaterialDto, @CurrentAuth() auth: RequestAuthContext) {
    const material = await this.materialService.create({
      tenantId: auth.tenantId,
      name: dto.name,
      brand: dto.brand ?? null,
      material_type: dto.materialType,
      color: dto.color ?? null,
      color_code: dto.colorCode ?? null,
      density_g_per_cm3: dto.densityGPerCm3,
      price_per_gram_cents: dto.pricePerGramCents,
      nozzle_temperature_min_celsius: dto.nozzleTemperatureMinCelsius ?? null,
      nozzle_temperature_max_celsius: dto.nozzleTemperatureMaxCelsius ?? null,
      bed_temperature_min_celsius: dto.bedTemperatureMinCelsius ?? null,
      bed_temperature_max_celsius: dto.bedTemperatureMaxCelsius ?? null,
      chamber_temperature_celsius: dto.chamberTemperatureCelsius ?? null,
      recommended_layer_height_mm: dto.recommendedLayerHeightMm ?? null,
      recommended_infill_percentage: dto.recommendedInfillPercentage ?? null,
      print_speed_mm_per_min: dto.printSpeedMmPerMin ?? null,
      tensile_strength_mpa: dto.tensileStrengthMpa ?? null,
      flexural_strength_mpa: dto.flexuralStrengthMpa ?? null,
      impact_strength_j_per_m: dto.impactStrengthJPerM ?? null,
      elongation_at_break_percentage: dto.elongationAtBreakPercentage ?? null,
      storage_conditions: dto.storageConditions ?? null,
      shelf_life_months: dto.shelfLifeMonths ?? null,
      is_active: dto.isActive ?? true,
      notes: dto.notes ?? null,
      created_by: auth.userId ?? null,
      updated_by: auth.userId ?? null,
    });
    return { data: material };
  }

  @Get()
  async list(@Query() query: MaterialListQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    return this.materialService.list(
      {
        materialType: query.materialType,
        brand: query.brand,
        isActive: query.isActive,
        search: query.search,
        page: query.page,
        perPage: query.perPage,
      },
      auth.tenantId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const material = await this.materialService.findById(id, auth.tenantId);
    return { data: material };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const material = await this.materialService.update(
      id,
      {
        name: dto.name,
        brand: dto.brand,
        material_type: dto.materialType,
        color: dto.color,
        color_code: dto.colorCode,
        density_g_per_cm3: dto.densityGPerCm3,
        price_per_gram_cents: dto.pricePerGramCents,
        is_active: dto.isActive,
        updated_by: auth.userId,
      },
      auth.tenantId,
    );
    return { data: material };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    await this.materialService.delete(id, auth.tenantId);
    return { success: true };
  }

  // Compatibility endpoints
  @Post(':materialId/compatibilities')
  async createCompatibility(
    @Param('materialId') materialId: string,
    @Body() dto: CreateMaterialCompatibilityDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const compatibility = await this.materialService.createCompatibility(
      materialId,
      {
        printer_id: dto.printerId,
        is_compatible: dto.isCompatible,
        override_nozzle_temperature_celsius: dto.overrideNozzleTemperatureCelsius ?? null,
        override_bed_temperature_celsius: dto.overrideBedTemperatureCelsius ?? null,
        override_print_speed_mm_per_min: dto.overridePrintSpeedMmPerMin ?? null,
        notes: dto.notes ?? null,
      },
      auth.tenantId,
    );
    return { data: compatibility };
  }

  @Get(':materialId/compatibilities')
  async getCompatibilities(@Param('materialId') materialId: string, @CurrentAuth() auth: RequestAuthContext) {
    const compatibilities = await this.materialService.getCompatibilitiesByMaterial(materialId, auth.tenantId);
    return { data: compatibilities };
  }

  @Patch('compatibilities/:compatibilityId')
  async updateCompatibility(
    @Param('compatibilityId') compatibilityId: string,
    @Body() dto: UpdateMaterialCompatibilityDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const compatibility = await this.materialService.updateCompatibility(
      compatibilityId,
      {
        printer_id: dto.printerId,
        is_compatible: dto.isCompatible,
        override_nozzle_temperature_celsius: dto.overrideNozzleTemperatureCelsius,
        override_bed_temperature_celsius: dto.overrideBedTemperatureCelsius,
        override_print_speed_mm_per_min: dto.overridePrintSpeedMmPerMin,
        notes: dto.notes,
      },
      auth.tenantId,
    );
    return { data: compatibility };
  }

  @Delete('compatibilities/:compatibilityId')
  async deleteCompatibility(@Param('compatibilityId') compatibilityId: string, @CurrentAuth() auth: RequestAuthContext) {
    await this.materialService.deleteCompatibility(compatibilityId, auth.tenantId);
    return { success: true };
  }
}
