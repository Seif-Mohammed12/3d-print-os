import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum QuoteSupportsMode {
  AUTO = 'auto',
  BUILDPLATE_ONLY = 'buildplate_only',
  OFF = 'off',
}

export enum QuoteOrientationMode {
  AUTO = 'auto',
  AS_IS = 'as_is',
}

export class CreateQuoteDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  modelId!: string;

  @IsUUID()
  shopId!: string;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  @IsOptional()
  @IsUUID()
  printerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  technology?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(1.0)
  layerHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  infillPercentage?: number;

  /** `auto` lets the slicer add supports only where overhangs need them. */
  @IsOptional()
  @IsEnum(QuoteSupportsMode)
  supportsMode?: QuoteSupportsMode;

  /** `auto` slices several stable resting poses and prices the cheapest. */
  @IsOptional()
  @IsEnum(QuoteOrientationMode)
  orientationMode?: QuoteOrientationMode;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  @IsOptional()
  @IsUUID()
  printerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  technology?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(1.0)
  layerHeightMm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  infillPercentage?: number;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class QuoteListQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  shopId?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class ApproveQuoteDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectQuoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
