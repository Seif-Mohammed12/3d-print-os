import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PrinterTechnology {
  FDM = 'FDM',
  SLA = 'SLA',
  SLS = 'SLS',
  DLP = 'DLP',
  MJ = 'MJ',
  PolyJet = 'PolyJet',
}

export enum PrinterStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  RETIRED = 'retired',
}

export class CreatePrinterDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsEnum(PrinterTechnology)
  technology!: PrinterTechnology;

  @IsNumber()
  @Min(0)
  buildVolumeXMm!: number;

  @IsNumber()
  @Min(0)
  buildVolumeYMm!: number;

  @IsNumber()
  @Min(0)
  buildVolumeZMm!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  nozzleDiameterMm?: number;

  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(500)
  laserWavelengthNm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  layerResolutionMinMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  layerResolutionMaxMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  typicalSpeedMmPerMin?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedMaterials?: string[];

  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePrinterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsEnum(PrinterTechnology)
  technology?: PrinterTechnology;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buildVolumeXMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buildVolumeYMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buildVolumeZMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  nozzleDiameterMm?: number;

  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(500)
  laserWavelengthNm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  layerResolutionMinMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  layerResolutionMaxMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  typicalSpeedMmPerMin?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedMaterials?: string[];

  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PrinterListQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @IsOptional()
  @IsEnum(PrinterTechnology)
  technology?: PrinterTechnology;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 20;
}

export class CreatePrinterProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  materialType!: string;

  @IsNumber()
  @Min(0.01)
  layerHeightMm!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  infillPercentage!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  wallCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  topLayers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bottomLayers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  nozzleTemperatureCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedTemperatureCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  chamberTemperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  printSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  travelSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retractionDistanceMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retractionSpeedMmPerMin?: number;

  @IsOptional()
  @IsBoolean()
  supportEnabled?: boolean;

  @IsOptional()
  @IsString()
  supportType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  supportDensityPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  supportAngleDegrees?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postProcessSteps?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePrinterProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  materialType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  layerHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  infillPercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  wallCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  topLayers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bottomLayers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  nozzleTemperatureCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedTemperatureCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  chamberTemperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  printSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  travelSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retractionDistanceMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retractionSpeedMmPerMin?: number;

  @IsOptional()
  @IsBoolean()
  supportEnabled?: boolean;

  @IsOptional()
  @IsString()
  supportType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  supportDensityPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  supportAngleDegrees?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postProcessSteps?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePrinterCapabilityDto {
  @IsString()
  @IsNotEmpty()
  capabilityType!: string;

  @IsString()
  @IsNotEmpty()
  capabilityName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  isSupported!: boolean;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown>;
}

export class UpdatePrinterCapabilityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  capabilityType?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  capabilityName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSupported?: boolean;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown>;
}
