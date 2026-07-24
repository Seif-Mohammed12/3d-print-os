import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuoteRequestDto {
  @IsOptional()
  @IsUUID()
  modelFileId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
