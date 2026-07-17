import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class StartModelUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsInt()
  @Min(1)
  @Max(104_857_600)
  byteSize!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;

  @IsOptional()
  @IsUUID()
  shopId?: string;
}

export class CompleteModelUploadDto {
  @IsOptional()
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  checksumSha256?: string;
}
