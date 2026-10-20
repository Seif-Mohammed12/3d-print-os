import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class RecordPrintOutcomeDto {
  /** Printer-reported print duration in minutes, excluding heat-up. */
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(100_000)
  actualPrintMinutes?: number;

  /** Filament actually used, in grams (spool weight before minus after). */
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(100_000)
  actualFilamentGrams?: number;

  /** Set when the job ran on a different printer than the one it was quoted for. */
  @IsOptional()
  @IsUUID()
  printedOnPrinterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CalibrationQueryDto {
  @IsOptional()
  @IsUUID()
  printerId?: string;
}
