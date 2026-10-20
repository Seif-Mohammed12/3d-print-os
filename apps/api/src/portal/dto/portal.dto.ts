import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { MAX_PORTAL_QUANTITY, PRINT_QUALITIES, type PrintQuality } from '../domain/portal-quote';

export class PortalQuoteChoicesDto {
  @IsUUID()
  materialId!: string;

  @IsIn(PRINT_QUALITIES)
  quality!: PrintQuality;

  @IsInt()
  @Min(1)
  @Max(MAX_PORTAL_QUANTITY)
  quantity!: number;
}

export class CreatePortalQuoteDto extends PortalQuoteChoicesDto {
  @IsUUID()
  modelFileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AcceptPortalQuoteDto {
  /** The total the customer was shown; the order is refused if the price has changed. */
  @IsInt()
  @Min(0)
  expectedTotalCents!: number;

  /** Anything the shop should know; saved on the quote and the order. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdatePortalSettingsDto {
  /** Printer portal quotes are priced on; null falls back to the oldest active FDM printer. */
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  printerId!: string | null;
}
