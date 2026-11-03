import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  MAX_PORTAL_QUANTITY,
  PRINT_QUALITIES,
  type PrintQuality,
} from '../../portal/domain/portal-quote';
import { MAX_ALLOWED_ORIGINS } from '../domain/embed-rules';

// ---------------------------------------------------------------------------
// Visitor (public) side
// ---------------------------------------------------------------------------

export class StartEmbedSessionDto {
  /** The host page's origin, as the browser reported it to the quoter frame. */
  @IsString()
  @MaxLength(255)
  parentOrigin!: string;
}

export class StartEmbedUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsInt()
  @Min(1)
  byteSize!: number;
}

export class CompleteEmbedUploadDto {
  @IsOptional()
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  checksumSha256?: string;
}

export class EmbedQuoteChoicesDto {
  @IsUUID()
  printerId!: string;

  @IsUUID()
  materialId!: string;

  @IsIn(PRINT_QUALITIES)
  quality!: PrintQuality;

  @IsInt()
  @Min(1)
  @Max(MAX_PORTAL_QUANTITY)
  quantity!: number;
}

export class CreateEmbedQuoteDto extends EmbedQuoteChoicesDto {
  @IsUUID()
  modelFileId!: string;
}

export class PlaceEmbedOrderDto {
  /** The total the visitor was shown; the order is refused if the price has changed. */
  @IsInt()
  @Min(0)
  expectedTotalCents!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  /** Email or phone (or both): the shop needs one way to reach the visitor. */
  @ValidateIf((o: PlaceEmbedOrderDto) => !o.phone || o.email !== undefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ValidateIf((o: PlaceEmbedOrderDto) => !o.email || o.phone !== undefined)
  @Matches(/^\+?[0-9 ()-]{6,30}$/, { message: 'phone must be a phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ---------------------------------------------------------------------------
// Staff side
// ---------------------------------------------------------------------------

export class EmbedThemeDto {
  @IsOptional()
  @Matches(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  accent?: string;

  @IsOptional()
  @Matches(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  background?: string;

  @IsOptional()
  @Matches(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  foreground?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  radius?: number;

  @IsOptional()
  @Matches(/^[A-Za-z0-9 ,'"-]{1,80}$/, { message: 'font_family must be a list of font names' })
  font_family?: string;
}

export class UpdateEmbedSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ALLOWED_ORIGINS)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  allowedOrigins?: string[];

  /** Printers visitors may pick; null for every active FDM printer. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  printerIds?: string[] | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmbedThemeDto)
  theme?: EmbedThemeDto;
}
