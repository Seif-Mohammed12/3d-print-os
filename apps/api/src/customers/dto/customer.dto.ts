import { IsString, IsOptional, IsEnum, IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export enum CustomerType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export class CreateCustomerDto {
  @IsUUID()
  shop_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address_line1?: string;

  @IsString()
  @IsOptional()
  address_line2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEnum(CustomerType)
  @IsOptional()
  customer_type?: CustomerType;

  @IsString()
  @IsOptional()
  business_name?: string;

  @IsString()
  @IsOptional()
  tax_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address_line1?: string;

  @IsString()
  @IsOptional()
  address_line2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEnum(CustomerType)
  @IsOptional()
  customer_type?: CustomerType;

  @IsString()
  @IsOptional()
  business_name?: string;

  @IsString()
  @IsOptional()
  tax_id?: string;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CustomerListQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: CustomerStatus;

  @IsString()
  @IsOptional()
  customer_type?: CustomerType;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  per_page?: string;
}
