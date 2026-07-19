import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export enum MaterialType {
  PLA = 'PLA',
  ABS = 'ABS',
  PETG = 'PETG',
  TPU = 'TPU',
  NYLON = 'Nylon',
  RESIN = 'Resin',
  ASA = 'ASA',
  POLYCARBONATE = 'Polycarbonate',
  PVA = 'PVA',
  HIPS = 'HIPS',
  WOOD = 'Wood',
  CARBON_FIBER = 'Carbon Fiber',
  METAL_FILLED = 'Metal Filled',
  FLEXIBLE = 'Flexible',
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsEnum(MaterialType)
  materialType!: MaterialType;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorCode?: string;

  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  densityGPerCm3!: number;

  @IsInt()
  @Min(1)
  pricePerGramCents!: number;

  @IsOptional()
  @IsInt()
  @Min(150)
  @Max(350)
  nozzleTemperatureMinCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(150)
  @Max(350)
  nozzleTemperatureMaxCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bedTemperatureMinCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bedTemperatureMaxCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  chamberTemperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  recommendedLayerHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  recommendedInfillPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  printSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tensileStrengthMpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flexuralStrengthMpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  impactStrengthJPerM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  elongationAtBreakPercentage?: number;

  @IsOptional()
  @IsString()
  storageConditions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  shelfLifeMonths?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  densityGPerCm3?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pricePerGramCents?: number;

  @IsOptional()
  @IsInt()
  @Min(150)
  @Max(350)
  nozzleTemperatureMinCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(150)
  @Max(350)
  nozzleTemperatureMaxCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bedTemperatureMinCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bedTemperatureMaxCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  chamberTemperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  recommendedLayerHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  recommendedInfillPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  printSpeedMmPerMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tensileStrengthMpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flexuralStrengthMpa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  impactStrengthJPerM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  elongationAtBreakPercentage?: number;

  @IsOptional()
  @IsString()
  storageConditions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  shelfLifeMonths?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MaterialListQueryDto {
  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export class CreateMaterialCompatibilityDto {
  @IsString()
  @IsNotEmpty()
  printerId!: string;

  @IsBoolean()
  isCompatible!: boolean;

  @IsOptional()
  @IsInt()
  @Min(150)
  @Max(350)
  overrideNozzleTemperatureCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  overrideBedTemperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  overridePrintSpeedMmPerMin?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaterialCompatibilityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  printerId?: string;

  @IsOptional()
  @IsBoolean()
  isCompatible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(150)
  @Max(350)
  overrideNozzleTemperatureCelsius?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  overrideBedTemperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  overridePrintSpeedMmPerMin?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
