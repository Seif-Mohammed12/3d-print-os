import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import {
  CreatePrinterCapabilityDto,
  CreatePrinterDto,
  CreatePrinterProfileDto,
  PrinterListQueryDto,
  UpdatePrinterCapabilityDto,
  UpdatePrinterDto,
  UpdatePrinterProfileDto,
} from './dto/printer.dto';
import { PrinterService } from './services/printer.service';

@Controller('printers')
export class PrintersController {
  constructor(private printerService: PrinterService) {}

  @Post()
  async create(@Body() dto: CreatePrinterDto, @CurrentAuth() auth: RequestAuthContext) {
    const printer = await this.printerService.create({
      tenantId: auth.tenantId,
      shop_id: dto.shopId,
      name: dto.name,
      manufacturer: dto.manufacturer ?? null,
      model: dto.model ?? null,
      serial_number: dto.serialNumber ?? null,
      technology: dto.technology,
      build_volume_x_mm: dto.buildVolumeXMm,
      build_volume_y_mm: dto.buildVolumeYMm,
      build_volume_z_mm: dto.buildVolumeZMm,
      nozzle_diameter_mm: dto.nozzleDiameterMm ?? null,
      laser_wavelength_nm: dto.laserWavelengthNm ?? null,
      layer_resolution_min_mm: dto.layerResolutionMinMm ?? null,
      layer_resolution_max_mm: dto.layerResolutionMaxMm ?? null,
      max_speed_mm_per_min: dto.maxSpeedMmPerMin ?? null,
      typical_speed_mm_per_min: dto.typicalSpeedMmPerMin ?? null,
      gcode_flavor: dto.gcodeFlavor,
      max_acceleration_mm_s2: dto.maxAccelerationMmS2,
      max_feedrate_mm_s: dto.maxFeedrateMmS,
      job_overhead_minutes: dto.jobOverheadMinutes,
      slicer_overrides: dto.slicerOverrides,
      supported_materials: dto.supportedMaterials ?? [],
      status: dto.status ?? 'active',
      location: dto.location ?? null,
      notes: dto.notes ?? null,
      created_by: auth.userId ?? null,
      updated_by: auth.userId ?? null,
    });
    return { data: printer };
  }

  @Get()
  async list(@Query() query: PrinterListQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    const result = await this.printerService.list(
      {
        shopId: query.shopId,
        status: query.status,
        technology: query.technology,
        search: query.search,
        page: query.page,
        perPage: query.per_page,
      },
      auth.tenantId,
    );
    return {
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: Math.ceil(result.total / result.perPage),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const printer = await this.printerService.findById(id, auth.tenantId);
    return { data: printer };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePrinterDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const printer = await this.printerService.update(
      id,
      {
        name: dto.name,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serial_number: dto.serialNumber,
        technology: dto.technology,
        build_volume_x_mm: dto.buildVolumeXMm,
        build_volume_y_mm: dto.buildVolumeYMm,
        build_volume_z_mm: dto.buildVolumeZMm,
        nozzle_diameter_mm: dto.nozzleDiameterMm,
        laser_wavelength_nm: dto.laserWavelengthNm,
        layer_resolution_min_mm: dto.layerResolutionMinMm,
        layer_resolution_max_mm: dto.layerResolutionMaxMm,
        max_speed_mm_per_min: dto.maxSpeedMmPerMin,
        typical_speed_mm_per_min: dto.typicalSpeedMmPerMin,
        gcode_flavor: dto.gcodeFlavor,
        max_acceleration_mm_s2: dto.maxAccelerationMmS2,
        max_feedrate_mm_s: dto.maxFeedrateMmS,
        job_overhead_minutes: dto.jobOverheadMinutes,
        slicer_overrides: dto.slicerOverrides,
        supported_materials: dto.supportedMaterials,
        status: dto.status,
        location: dto.location,
        notes: dto.notes,
        updated_by: auth.userId,
      },
      auth.tenantId,
    );
    return { data: printer };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    await this.printerService.delete(id, auth.tenantId);
    return { success: true };
  }

  // Profile endpoints
  @Post(':printerId/profiles')
  async createProfile(
    @Param('printerId') printerId: string,
    @Body() dto: CreatePrinterProfileDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const profile = await this.printerService.createProfile(
      printerId,
      {
        name: dto.name,
        description: dto.description ?? null,
        material_type: dto.materialType,
        layer_height_mm: dto.layerHeightMm,
        infill_percentage: dto.infillPercentage,
        wall_count: dto.wallCount ?? null,
        top_layers: dto.topLayers ?? null,
        bottom_layers: dto.bottomLayers ?? null,
        nozzle_temperature_celsius: dto.nozzleTemperatureCelsius ?? null,
        bed_temperature_celsius: dto.bedTemperatureCelsius ?? null,
        chamber_temperature_celsius: dto.chamberTemperatureCelsius ?? null,
        print_speed_mm_per_min: dto.printSpeedMmPerMin ?? null,
        travel_speed_mm_per_min: dto.travelSpeedMmPerMin ?? null,
        retraction_distance_mm: dto.retractionDistanceMm ?? null,
        retraction_speed_mm_per_min: dto.retractionSpeedMmPerMin ?? null,
        support_enabled: dto.supportEnabled ?? false,
        support_type: dto.supportType ?? null,
        support_density_percentage: dto.supportDensityPercentage ?? null,
        support_angle_degrees: dto.supportAngleDegrees ?? null,
        post_process_steps: dto.postProcessSteps ?? [],
        infill_pattern: dto.infillPattern ?? null,
        slicer_overrides: dto.slicerOverrides ?? {},
        is_default: dto.isDefault ?? false,
        is_active: dto.isActive ?? true,
      },
      auth.tenantId,
    );
    return { data: profile };
  }

  @Get(':printerId/profiles')
  async getProfiles(
    @Param('printerId') printerId: string,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const profiles = await this.printerService.getProfilesByPrinter(printerId, auth.tenantId);
    return { data: profiles };
  }

  @Patch('profiles/:profileId')
  async updateProfile(
    @Param('profileId') profileId: string,
    @Body() dto: UpdatePrinterProfileDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const profile = await this.printerService.updateProfile(
      profileId,
      {
        name: dto.name,
        description: dto.description,
        material_type: dto.materialType,
        layer_height_mm: dto.layerHeightMm,
        infill_percentage: dto.infillPercentage,
        wall_count: dto.wallCount,
        top_layers: dto.topLayers,
        bottom_layers: dto.bottomLayers,
        nozzle_temperature_celsius: dto.nozzleTemperatureCelsius,
        bed_temperature_celsius: dto.bedTemperatureCelsius,
        chamber_temperature_celsius: dto.chamberTemperatureCelsius,
        print_speed_mm_per_min: dto.printSpeedMmPerMin,
        travel_speed_mm_per_min: dto.travelSpeedMmPerMin,
        retraction_distance_mm: dto.retractionDistanceMm,
        retraction_speed_mm_per_min: dto.retractionSpeedMmPerMin,
        support_enabled: dto.supportEnabled,
        support_type: dto.supportType,
        support_density_percentage: dto.supportDensityPercentage,
        support_angle_degrees: dto.supportAngleDegrees,
        post_process_steps: dto.postProcessSteps,
        infill_pattern: dto.infillPattern,
        slicer_overrides: dto.slicerOverrides,
        is_default: dto.isDefault,
        is_active: dto.isActive,
      },
      auth.tenantId,
    );
    return { data: profile };
  }

  @Delete('profiles/:profileId')
  async deleteProfile(
    @Param('profileId') profileId: string,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    await this.printerService.deleteProfile(profileId, auth.tenantId);
    return { success: true };
  }

  // Capability endpoints
  @Post(':printerId/capabilities')
  async createCapability(
    @Param('printerId') printerId: string,
    @Body() dto: CreatePrinterCapabilityDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const capability = await this.printerService.createCapability(
      printerId,
      {
        capability_type: dto.capabilityType,
        capability_name: dto.capabilityName,
        description: dto.description ?? null,
        is_supported: dto.isSupported,
        specifications: dto.specifications ?? {},
      },
      auth.tenantId,
    );
    return { data: capability };
  }

  @Get(':printerId/capabilities')
  async getCapabilities(
    @Param('printerId') printerId: string,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const capabilities = await this.printerService.getCapabilitiesByPrinter(
      printerId,
      auth.tenantId,
    );
    return { data: capabilities };
  }

  @Patch('capabilities/:capabilityId')
  async updateCapability(
    @Param('capabilityId') capabilityId: string,
    @Body() dto: UpdatePrinterCapabilityDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const capability = await this.printerService.updateCapability(
      capabilityId,
      {
        capability_type: dto.capabilityType,
        capability_name: dto.capabilityName,
        description: dto.description,
        is_supported: dto.isSupported,
        specifications: dto.specifications,
      },
      auth.tenantId,
    );
    return { data: capability };
  }

  @Delete('capabilities/:capabilityId')
  async deleteCapability(
    @Param('capabilityId') capabilityId: string,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    await this.printerService.deleteCapability(capabilityId, auth.tenantId);
    return { success: true };
  }
}
