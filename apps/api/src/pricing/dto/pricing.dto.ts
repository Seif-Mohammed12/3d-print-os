import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePricingRuleDto {
  @IsOptional()
  @IsString()
  shop_id?: string;

  @IsOptional()
  @IsString()
  material_id?: string;

  @IsOptional()
  @IsString()
  printer_id?: string;

  @IsInt()
  @Min(0)
  priority?: number = 0;

  @IsInt()
  @Min(0)
  material_cost_per_gram?: number = 0;

  @IsInt()
  @Min(0)
  material_cost_per_mm3?: number = 0;

  @IsInt()
  @Min(0)
  machine_time_cost_per_minute?: number = 0;

  @IsInt()
  @Min(0)
  electricity_cost_per_hour?: number = 0;

  @IsInt()
  @Min(0)
  maintenance_cost_per_hour?: number = 0;

  @IsInt()
  @Min(0)
  @Max(100)
  failure_risk_percentage?: number = 0;

  @IsInt()
  @Min(0)
  post_processing_cost_per_unit?: number = 0;

  @IsInt()
  @Min(0)
  post_processing_fixed_cost?: number = 0;

  @IsInt()
  @Min(0)
  @Max(100)
  profit_margin_percentage?: number = 20;

  @IsInt()
  @Min(0)
  minimum_price?: number = 0;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}

export class UpdatePricingRuleDto {
  @IsOptional()
  @IsString()
  shop_id?: string;

  @IsOptional()
  @IsString()
  material_id?: string;

  @IsOptional()
  @IsString()
  printer_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  material_cost_per_gram?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  material_cost_per_mm3?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  machine_time_cost_per_minute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  electricity_cost_per_hour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maintenance_cost_per_hour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  failure_risk_percentage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  post_processing_cost_per_unit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  post_processing_fixed_cost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  profit_margin_percentage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimum_price?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class PricingRuleListQueryDto {
  @IsOptional()
  @IsString()
  shop_id?: string;

  @IsOptional()
  @IsString()
  material_id?: string;

  @IsOptional()
  @IsString()
  printer_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

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
